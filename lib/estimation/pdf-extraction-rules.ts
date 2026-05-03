import type {
  DrawingExtractionCandidateRecord,
  ExtractionCandidateGroup,
  PdfTextExtractionResult
} from "@/lib/estimation/types";

type CandidateDraft = Partial<DrawingExtractionCandidateRecord> & {
  priority: number;
};

type DrawingListItem = {
  drawingNo: string;
  drawingTitle: string;
  scale?: string | null;
  sourcePage?: number | null;
  sourceTextSnippet: string;
};

type CandidateOptions = {
  maxCandidates?: number;
};

const drawingNoPattern = /\b[ASME]-\d{3}\b/g;
const scalePattern = /\b(?:NONE|NTS|1\s*\/\s*\d+|1\s*:\s*\d+)\b/i;
const titleBlockNoisePattern =
  /DRAWN BY|CHECKED BY|APPROVED BY|PROJECT NO|PROJECT TITLE|SCALE DATE|DATE PROJECT|REV\.?|SHEET NO/i;
const drawingTitleKeywordPattern =
  /도면목록표|설계개요|위치도|우수계획도|오수계획도|옥외포장계획도|바닥면적 산출도|단열계획도|실내재료 마감표|구조 일반사항|구조일람표|평면도|입면도|단면도|창호도|마감표|방수계획도|철거평면도|구조평면도/;
const materialKeywordPattern =
  /아스콘포장|콘크리트\s*경계석|보도블럭|우수관|오수관|PVC\s*이중벽관|우수맨홀|오수맨홀|집수정|빗물받이|THK\s*\d+|경질우레탄|글라스울\s*패널|석고보드|방화문|창호|철근콘크리트\s*보|철근|콘크리트|슬라브|철골|방수|철거|기둥/gi;
const specPattern = /\b(?:D\d{2,4}|THK\s*\d+|T\d{2,4}|\d{2,4}\s*[xX×]\s*\d{2,4}(?:\s*[xX×]\s*\d{2,4})?)\b/gi;
const symbolPattern = /\b(?:D-\d{2,4}|W-\d{1,3}|FSD-\d{1,3}|NF\d[A-Z]?|IF\d[A-Z]?|R\d|SD-\d{1,3}|WD-\d{1,3})\b/gi;

const workItemTitles = [
  "우수계획도",
  "오수계획도",
  "옥외포장계획도",
  "철거평면도",
  "단열계획도",
  "방수계획도",
  "실내재료 마감표",
  "구조일람표",
  "구조평면도"
];

const preferredDrawingNumbers = new Set([
  "A-001",
  "A-002",
  "A-101",
  "A-106",
  "A-107",
  "A-108",
  "S-001",
  "S-201",
  "S-301",
  "S-401"
]);

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncateCandidateValue(value: string, maxLength = 100): string {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

function cleanTitle(value: string): string {
  return normalizeWhitespace(value)
    .replace(/^[-:\s]+/, "")
    .replace(/\b(?:NONE|NTS|1\s*\/\s*\d+|1\s*:\s*\d+)\b.*$/i, "")
    .replace(/\bSCALE\b.*$/i, "")
    .replace(/\bDATE\b.*$/i, "")
    .trim();
}

function isGoodDrawingTitle(value: string): boolean {
  const title = cleanTitle(value);

  return (
    title.length >= 2 &&
    title.length <= 100 &&
    drawingTitleKeywordPattern.test(title) &&
    !titleBlockNoisePattern.test(title)
  );
}

function isDrawingListPage(text: string): boolean {
  return (
    text.includes("도면목록표") ||
    (text.includes("도면번호") && text.includes("SCALE")) ||
    (text.includes("도 면 명") && text.includes("SCALE"))
  );
}

function createDraft(args: {
  extractedType: string;
  extractedText: string;
  confidence: number;
  priority: number;
  sourcePage?: number | null;
  sourceNote: string;
  sourceTextSnippet?: string | null;
  drawingNo?: string | null;
  drawingTitle?: string | null;
  scale?: string | null;
  quantity?: number | null;
  unit?: string | null;
  candidateGroup?: ExtractionCandidateGroup;
}): CandidateDraft {
  const extractedText = truncateCandidateValue(args.extractedText);

  return {
    priority: args.priority,
    extractedType: args.extractedType,
    extractedText,
    normalizedValue: extractedText,
    confidence: args.confidence,
    reviewStatus: "pending",
    sourcePage: args.sourcePage ?? null,
    sourceNote: args.sourceNote,
    sourceTextSnippet: args.sourceTextSnippet
      ? truncateCandidateValue(args.sourceTextSnippet, 160)
      : extractedText,
    sourceLabel: "uploaded_pdf",
    extractionMethod: "pdf_text_rule",
    candidateGroup: args.candidateGroup ?? getCandidateGroupFromType(args.extractedType),
    drawingNo: args.drawingNo ?? null,
    drawingTitle: args.drawingTitle ?? null,
    scale: args.scale ?? null,
    quantity: args.quantity ?? null,
    unit: args.unit ?? null
  };
}

function getCandidateGroupFromType(extractedType: string): ExtractionCandidateGroup {
  if (["drawing_no", "drawing_title", "scale", "floor", "symbol"].includes(extractedType)) {
    return "drawing_metadata";
  }

  return "estimate_candidate";
}

function getTextWindow(text: string, index: number, length: number, radius = 55): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);

  return normalizeWhitespace(text.slice(start, end));
}

function extractQuantityAndUnit(text: string): { quantity?: number | null; unit?: string | null } {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(m2|m3|㎡|㎥|EA|개소|개|본|m|M)\b/i);

  if (!match) {
    return {};
  }

  return {
    quantity: Number(match[1]),
    unit: match[2]
  };
}

function parseDrawingListItemFromSegment(segment: string): Omit<DrawingListItem, "drawingNo"> | null {
  const cleaned = normalizeWhitespace(segment)
    .replace(/^[-:\s]+/, "")
    .replace(/^(도면번호|도 면 명|도면명|SCALE|축척)\s*/i, "");
  const scaleMatch = cleaned.match(scalePattern);
  const scale = scaleMatch?.[0] ?? null;
  const titlePart = scaleMatch ? cleaned.slice(0, scaleMatch.index).trim() : cleaned;
  const title = cleanTitle(titlePart);

  if (!isGoodDrawingTitle(title)) {
    return null;
  }

  return {
    drawingTitle: title,
    scale,
    sourceTextSnippet: truncateCandidateValue(cleaned, 160)
  };
}

export function extractDrawingListItemsFromText(
  text: string,
  sourcePage?: number | null
): DrawingListItem[] {
  if (!isDrawingListPage(text)) {
    return [];
  }

  const normalized = normalizeWhitespace(text);
  const matches = Array.from(normalized.matchAll(drawingNoPattern));
  const items: DrawingListItem[] = [];

  matches.forEach((match, index) => {
    const drawingNo = match[0];
    const currentEnd = (match.index ?? 0) + drawingNo.length;
    const nextStart = matches[index + 1]?.index ?? Math.min(normalized.length, currentEnd + 120);
    const segment = normalized.slice(currentEnd, nextStart);
    const parsed = parseDrawingListItemFromSegment(segment);

    if (!parsed) {
      return;
    }

    items.push({
      drawingNo,
      drawingTitle: parsed.drawingTitle,
      scale: parsed.scale,
      sourcePage: sourcePage ?? null,
      sourceTextSnippet: `${drawingNo} ${parsed.sourceTextSnippet}`
    });
  });

  return items;
}

export function extractDrawingNumbersFromText(
  text: string,
  sourcePage?: number | null
): CandidateDraft[] {
  const matches = Array.from(normalizeWhitespace(text).matchAll(drawingNoPattern));

  return matches.map((match) =>
    createDraft({
      extractedType: "drawing_no",
      extractedText: match[0],
      confidence: 0.84,
      priority: 40,
      sourcePage,
      sourceNote: "PDF 텍스트 도면번호 패턴 후보",
      sourceTextSnippet: match[0],
      drawingNo: match[0]
    })
  );
}

function extractDrawingTitleCandidatesFromText(
  text: string,
  sourcePage?: number | null
): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);
  const candidates: CandidateDraft[] = [];
  const titleRegex =
    /([가-힣0-9A-Za-z\s()_-]{0,32}(?:도면목록표|설계개요|위치도|우수계획도|오수계획도|옥외포장계획도|바닥면적 산출도|단열계획도|실내재료 마감표|구조 일반사항|구조일람표|평면도|입면도|단면도|창호도|마감표|방수계획도|철거평면도|구조평면도)[가-힣0-9A-Za-z\s()_-]{0,32})/g;

  for (const match of normalized.matchAll(titleRegex)) {
    const title = cleanTitle(match[1]);

    if (!isGoodDrawingTitle(title)) {
      continue;
    }

    candidates.push(
      createDraft({
        extractedType: "drawing_title",
        extractedText: title,
        confidence: 0.72,
        priority: 55,
        sourcePage,
        sourceNote: "PDF 텍스트 도면명 키워드 후보",
        sourceTextSnippet: getTextWindow(normalized, match.index ?? 0, match[0].length),
        drawingTitle: title
      })
    );
  }

  return candidates;
}

export function extractMaterialCandidatesFromText(
  text: string,
  sourcePage?: number | null
): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);
  const candidates: CandidateDraft[] = [];

  for (const match of normalized.matchAll(materialKeywordPattern)) {
    const keyword = normalizeWhitespace(match[0]);
    const windowText = getTextWindow(normalized, match.index ?? 0, match[0].length);
    const specs = Array.from(windowText.matchAll(specPattern))
      .map((specMatch) => normalizeWhitespace(specMatch[0]))
      .slice(0, 2);
    const value = specs.length > 0 ? `${keyword} ${specs.join(" ")}` : keyword;
    const quantity = extractQuantityAndUnit(windowText);

    candidates.push(
      createDraft({
        extractedType: "material",
        extractedText: value,
        confidence: 0.7,
        priority: 22,
        sourcePage,
        sourceNote: `PDF 텍스트 자재 키워드 '${keyword}' 기반 후보`,
        sourceTextSnippet: windowText,
        quantity: quantity.quantity,
        unit: quantity.unit
      })
    );
  }

  return candidates;
}

export function extractDrawingMetadataCandidates(
  text: string
): Partial<DrawingExtractionCandidateRecord>[] {
  return [
    ...extractDrawingNumbersFromText(text),
    ...extractDrawingTitleCandidatesFromText(text),
    ...extractScaleCandidatesFromText(text),
    ...extractSymbolCandidatesFromText(text),
    ...extractDimensionCandidatesFromText(text)
  ];
}

export function extractWorkItemCandidates(
  text: string
): Partial<DrawingExtractionCandidateRecord>[] {
  return [...extractMaterialCandidatesFromText(text), ...extractWorkItemTitlesFromText(text)];
}

function extractScaleCandidatesFromText(text: string, sourcePage?: number | null): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);

  return Array.from(normalized.matchAll(/\b(?:SCALE|축척)\s*[:：]?\s*(NONE|NTS|1\s*\/\s*\d+|1\s*:\s*\d+)/gi))
    .slice(0, 5)
    .map((match) =>
      createDraft({
        extractedType: "scale",
        extractedText: match[1],
        confidence: 0.76,
        priority: 45,
        sourcePage,
        sourceNote: "PDF 텍스트 축척 후보",
        sourceTextSnippet: getTextWindow(normalized, match.index ?? 0, match[0].length),
        scale: match[1]
      })
    );
}

function extractSymbolCandidatesFromText(text: string, sourcePage?: number | null): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);
  const candidates: CandidateDraft[] = [];

  for (const match of normalized.matchAll(symbolPattern)) {
    const symbol = match[0];

    if (/^[ASME]-\d{3}$/.test(symbol) || /^[AXY]\d{1,2}$/.test(symbol) || /^\d+$/.test(symbol)) {
      continue;
    }

    candidates.push(
      createDraft({
        extractedType: "symbol",
        extractedText: symbol,
        confidence: 0.58,
        priority: 80,
        sourcePage,
        sourceNote: "PDF 텍스트 창호/문/부재 기호 후보",
        sourceTextSnippet: getTextWindow(normalized, match.index ?? 0, match[0].length)
      })
    );
  }

  return candidates;
}

function extractDimensionCandidatesFromText(
  text: string,
  sourcePage?: number | null
): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);
  const dimensionPattern =
    /\b\d{2,4}\s*[xX×]\s*\d{2,4}(?:\s*[xX×]\s*\d{2,4})?\b|\b(?:D\d{2,4}|THK\s*\d+)\b/gi;

  return Array.from(normalized.matchAll(dimensionPattern))
    .slice(0, 8)
    .map((match) =>
      createDraft({
        extractedType: "dimension",
        extractedText: match[0],
        confidence: 0.62,
        priority: 85,
        sourcePage,
        sourceNote: "PDF 텍스트 치수/규격 후보",
        sourceTextSnippet: getTextWindow(normalized, match.index ?? 0, match[0].length)
      })
    );
}

function extractWorkItemTitlesFromText(text: string, sourcePage?: number | null): CandidateDraft[] {
  const normalized = normalizeWhitespace(text);

  return workItemTitles
    .filter((title) => normalized.includes(title))
    .map((title) =>
      createDraft({
        extractedType: "work_item",
        extractedText: title,
        confidence: 0.66,
        priority: 70,
        sourcePage,
        sourceNote: "PDF 텍스트 공종/도면명 키워드 후보",
        sourceTextSnippet: title,
        drawingTitle: title
      })
    );
}

function createDrawingListCandidates(item: DrawingListItem): CandidateDraft[] {
  const preferred = preferredDrawingNumbers.has(item.drawingNo);
  const candidates: CandidateDraft[] = [
    createDraft({
      extractedType: "drawing_no",
      extractedText: item.drawingNo,
      confidence: 0.9,
      priority: preferred ? 10 : 30,
      sourcePage: item.sourcePage,
      sourceNote: "도면목록표 기반 도면번호 후보",
      sourceTextSnippet: item.sourceTextSnippet,
      drawingNo: item.drawingNo,
      drawingTitle: item.drawingTitle,
      scale: item.scale ?? null
    }),
    createDraft({
      extractedType: "drawing_title",
      extractedText: item.drawingTitle,
      confidence: 0.86,
      priority: preferred ? 12 : 32,
      sourcePage: item.sourcePage,
      sourceNote: "도면목록표 기반 도면명 후보",
      sourceTextSnippet: item.sourceTextSnippet,
      drawingNo: item.drawingNo,
      drawingTitle: item.drawingTitle,
      scale: item.scale ?? null
    })
  ];

  if (item.scale) {
    candidates.push(
      createDraft({
        extractedType: "scale",
        extractedText: item.scale,
        confidence: 0.82,
        priority: preferred ? 14 : 34,
        sourcePage: item.sourcePage,
        sourceNote: "도면목록표 기반 축척 후보",
        sourceTextSnippet: item.sourceTextSnippet,
        drawingNo: item.drawingNo,
        drawingTitle: item.drawingTitle,
        scale: item.scale
      })
    );
  }

  return candidates;
}

export function dedupeExtractionCandidates(candidates: CandidateDraft[]): CandidateDraft[] {
  const seenByPage = new Set<string>();
  const seenGlobal = new Set<string>();
  const sorted = [...candidates].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    if ((right.confidence ?? 0) !== (left.confidence ?? 0)) {
      return (right.confidence ?? 0) - (left.confidence ?? 0);
    }

    return (left.sourcePage ?? 9999) - (right.sourcePage ?? 9999);
  });

  return sorted.filter((candidate) => {
    const type = candidate.extractedType ?? "unknown";
    const value = normalizeWhitespace(candidate.normalizedValue ?? candidate.extractedText ?? "");

    if (!value) {
      return false;
    }

    const pageKey = `${type}:${value}:${candidate.sourcePage ?? "na"}`;
    if (seenByPage.has(pageKey)) {
      return false;
    }
    seenByPage.add(pageKey);

    if (type === "drawing_no" || type === "drawing_title" || type === "material") {
      const globalKey = `${type}:${value}`;
      if (seenGlobal.has(globalKey)) {
        return false;
      }
      seenGlobal.add(globalKey);
    }

    return true;
  });
}

export function createCandidatesFromPdfText(
  result: PdfTextExtractionResult,
  drawingFileId: string,
  options: CandidateOptions = {}
): DrawingExtractionCandidateRecord[] {
  const maxCandidates = options.maxCandidates ?? 50;
  const drafts = result.pages.flatMap((page) => {
    if (page.extractionStatus !== "success") {
      return [];
    }

    const drawingListCandidates = extractDrawingListItemsFromText(page.text, page.pageNumber).flatMap(
      createDrawingListCandidates
    );
    const metadata = [
      ...extractDrawingNumbersFromText(page.text, page.pageNumber),
      ...extractDrawingTitleCandidatesFromText(page.text, page.pageNumber),
      ...extractScaleCandidatesFromText(page.text, page.pageNumber),
      ...extractSymbolCandidatesFromText(page.text, page.pageNumber),
      ...extractDimensionCandidatesFromText(page.text, page.pageNumber)
    ];
    const workItems = [
      ...extractMaterialCandidatesFromText(page.text, page.pageNumber),
      ...extractWorkItemTitlesFromText(page.text, page.pageNumber)
    ];

    return [...drawingListCandidates, ...metadata, ...workItems];
  });

  return dedupeExtractionCandidates(drafts)
    .slice(0, maxCandidates)
    .map((candidate, index) => ({
      id: `pdf-candidate-${drawingFileId}-${index + 1}`,
      drawingFileId,
      drawingPageId: `pdf-page-${drawingFileId}-${candidate.sourcePage ?? 1}`,
      extractedType: candidate.extractedType ?? "note",
      extractedText: candidate.extractedText ?? "",
      normalizedValue: candidate.normalizedValue ?? candidate.extractedText ?? "",
      quantity: candidate.quantity ?? null,
      unit: candidate.unit ?? null,
      sourcePage: candidate.sourcePage ?? null,
      confidence: candidate.confidence ?? 0.55,
      reviewStatus: "pending",
      drawingNo: candidate.drawingNo ?? result.fileName,
      drawingTitle: candidate.drawingTitle ?? "업로드 PDF 텍스트",
      scale: candidate.scale ?? null,
      sourceNote: candidate.sourceNote ?? "PDF 텍스트 규칙 기반 후보",
      sourceFileName: result.fileName,
      sourceTextSnippet: candidate.sourceTextSnippet ?? candidate.extractedText ?? "",
      sourceLabel: "uploaded_pdf",
      extractionMethod: "pdf_text_rule",
      candidateGroup:
        candidate.candidateGroup ?? getCandidateGroupFromType(candidate.extractedType ?? "note")
    }));
}
