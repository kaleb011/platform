import type {
  DrawingExtractionCandidateRecord,
  PdfTextExtractionResult
} from "@/lib/estimation/types";

const metadataRules: Array<{
  type: string;
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    type: "drawing_no",
    patterns: [
      /(?:도면번호|DRAWING\s*NO\.?)\s*[:：]?\s*([A-Z]{0,3}[-\s]?\d{1,4}[A-Z]?)/gi
    ],
    confidence: 0.78
  },
  {
    type: "drawing_title",
    patterns: [
      /(?:도면명|DRAWING\s*TITLE)\s*[:：]?\s*([^\n\r]{2,60})/gi,
      /([^\n\r]{0,24}(?:평면도|단면도|입면도|마감표)[^\n\r]{0,24})/gi
    ],
    confidence: 0.72
  },
  {
    type: "scale",
    patterns: [/(?:축척|SCALE)\s*[:：]?\s*(1\s*\/\s*\d+|1\s*:\s*\d+|NTS)/gi],
    confidence: 0.76
  },
  {
    type: "floor",
    patterns: [/(\d+\s*층|지하\s*\d+\s*층|옥상층|ROOF|B\d+F|\d+F)/gi],
    confidence: 0.62
  },
  {
    type: "room_name",
    patterns: [/(?:실명|ROOM)\s*[:：]?\s*([^\n\r]{2,30})/gi],
    confidence: 0.58
  },
  {
    type: "symbol",
    patterns: [/\b([A-Z]{1,3}[-]?\d{1,4})\b/g, /(D-\d{1,4}|W-\d{1,4}|C-\d{1,4}|B\d+)/gi],
    confidence: 0.55
  },
  {
    type: "dimension",
    patterns: [/(\d+(?:\.\d+)?\s*(?:mm|㎜|m|M)\s*[xX×]\s*\d+(?:\.\d+)?\s*(?:mm|㎜|m|M)?)/g],
    confidence: 0.6
  }
];

const workItemKeywords = [
  "벽체",
  "창호",
  "방화문",
  "석고보드",
  "콘크리트",
  "철근",
  "슬라브",
  "보",
  "기둥",
  "아스콘",
  "경계석",
  "우수",
  "오수",
  "철거",
  "지붕",
  "방수"
];

function normalizeSnippet(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function createPartialCandidate(args: {
  extractedType: string;
  extractedText: string;
  confidence: number;
  sourcePage?: number | null;
  sourceNote: string;
}): Partial<DrawingExtractionCandidateRecord> {
  const extractedText = normalizeSnippet(args.extractedText);

  return {
    extractedType: args.extractedType,
    extractedText,
    normalizedValue: extractedText,
    confidence: args.confidence,
    reviewStatus: "pending",
    sourcePage: args.sourcePage ?? null,
    sourceNote: args.sourceNote,
    sourceTextSnippet: extractedText,
    sourceLabel: "uploaded_pdf",
    extractionMethod: "pdf_text_rule"
  };
}

export function extractDrawingMetadataCandidates(
  text: string
): Partial<DrawingExtractionCandidateRecord>[] {
  const candidates: Partial<DrawingExtractionCandidateRecord>[] = [];

  for (const rule of metadataRules) {
    for (const pattern of rule.patterns) {
      const matches = Array.from(text.matchAll(pattern)).slice(0, 8);

      for (const match of matches) {
        const value = match[1] ?? match[0];

        if (value.trim().length < 2) {
          continue;
        }

        candidates.push(
          createPartialCandidate({
            extractedType: rule.type,
            extractedText: value,
            confidence: rule.confidence,
            sourceNote: "PDF 텍스트 규칙 기반 메타데이터 후보"
          })
        );
      }
    }
  }

  return candidates;
}

export function extractWorkItemCandidates(
  text: string
): Partial<DrawingExtractionCandidateRecord>[] {
  const candidates: Partial<DrawingExtractionCandidateRecord>[] = [];
  const lines = text
    .split(/(?<=[.。])|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const keyword of workItemKeywords) {
    const matchedLine = lines.find((line) => line.includes(keyword));

    if (!matchedLine) {
      continue;
    }

    candidates.push(
      createPartialCandidate({
        extractedType: keyword.length <= 2 ? "material" : "work_item",
        extractedText: matchedLine,
        confidence: 0.64,
        sourceNote: `PDF 텍스트 키워드 '${keyword}' 기반 후보`
      })
    );
  }

  const noteLines = lines
    .filter((line) => /주의|참조|NOTE|비고|특기/i.test(line))
    .slice(0, 5);

  for (const line of noteLines) {
    candidates.push(
      createPartialCandidate({
        extractedType: "note",
        extractedText: line,
        confidence: 0.52,
        sourceNote: "PDF 텍스트 주석 후보"
      })
    );
  }

  return candidates;
}

function dedupeCandidates(
  candidates: Partial<DrawingExtractionCandidateRecord>[]
): Partial<DrawingExtractionCandidateRecord>[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.extractedType}:${candidate.extractedText}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function createCandidatesFromPdfText(
  result: PdfTextExtractionResult,
  drawingFileId: string
): DrawingExtractionCandidateRecord[] {
  const partialCandidates = result.pages.flatMap((page) => {
    if (page.extractionStatus !== "success") {
      return [];
    }

    const metadata = extractDrawingMetadataCandidates(page.text);
    const workItems = extractWorkItemCandidates(page.text);

    return [...metadata, ...workItems].map((candidate) => ({
      ...candidate,
      sourcePage: page.pageNumber
    }));
  });

  return dedupeCandidates(partialCandidates)
    .slice(0, 30)
    .map((candidate, index) => ({
      id: `pdf-candidate-${drawingFileId}-${index + 1}`,
      drawingFileId,
      drawingPageId: `pdf-page-${drawingFileId}-${candidate.sourcePage ?? 1}`,
      extractedType: candidate.extractedType ?? "note",
      extractedText: candidate.extractedText ?? "",
      normalizedValue: candidate.normalizedValue ?? candidate.extractedText ?? "",
      sourcePage: candidate.sourcePage ?? null,
      confidence: candidate.confidence ?? 0.55,
      reviewStatus: "pending",
      drawingNo: result.fileName,
      drawingTitle: "업로드 PDF 텍스트",
      sourceNote: candidate.sourceNote ?? "PDF 텍스트 규칙 기반 후보",
      sourceFileName: result.fileName,
      sourceTextSnippet: candidate.sourceTextSnippet ?? candidate.extractedText ?? "",
      sourceLabel: "uploaded_pdf",
      extractionMethod: "pdf_text_rule"
    }));
}
