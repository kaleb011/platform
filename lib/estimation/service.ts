import type {
  DrawingExtractionCandidateRecord,
  DrawingFileRecord,
  DrawingFileStatus,
  EstimateItemMatchRecord,
  EstimateItemRecord,
  ScheduleCategorySummary,
  ScheduleForecastItemRecord,
  StandardItemKeywordRecord,
  StandardItemRecord,
  SupportedDrawingFileType
} from "@/lib/estimation/types";
export { extractPdfTextFromFile } from "@/lib/estimation/pdf-parser";
export {
  createCandidatesFromPdfText,
  extractDrawingMetadataCandidates,
  extractWorkItemCandidates
} from "@/lib/estimation/pdf-extraction-rules";
export {
  filterExtractionCandidates,
  getApprovedEstimateCandidates,
  getCandidateDisplayTitle,
  getCandidateGroup,
  getCandidateReviewSummary
} from "@/lib/estimation/candidate-review";
import { rankStandardMatches } from "@/lib/estimation/standard-match";

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : 1;

  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function getDrawingFileType(file: File): SupportedDrawingFileType {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type.toLowerCase();

  if (mimeType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (mimeType === "image/png" || extension === "png") {
    return "png";
  }

  if (mimeType === "image/jpeg" || extension === "jpg" || extension === "jpeg") {
    return "jpg";
  }

  if (
    extension === "dwg" ||
    mimeType === "application/acad" ||
    mimeType === "application/x-acad" ||
    mimeType === "image/vnd.dwg"
  ) {
    return "dwg";
  }

  return "unsupported";
}

function buildUploadMessage(fileType: SupportedDrawingFileType): string {
  if (fileType === "pdf") {
    return "PDF가 업로드되었습니다. 다음 단계에서 페이지별 PNG 변환 및 도면 분석이 진행됩니다.";
  }

  if (fileType === "png" || fileType === "jpg") {
    return "이미지 도면이 업로드되었습니다. 다음 단계에서 도면 분석이 진행됩니다.";
  }

  if (fileType === "dwg") {
    return "DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한 뒤 업로드해주세요.";
  }

  return "지원하지 않는 파일 형식입니다. PDF, PNG, JPG 도면을 업로드해주세요.";
}

function buildConversionStatus(fileType: SupportedDrawingFileType): string {
  if (fileType === "pdf") {
    return "PNG 변환 대기";
  }

  if (fileType === "png" || fileType === "jpg") {
    return "이미지 분석 대기";
  }

  if (fileType === "dwg") {
    return "자동 변환 미지원";
  }

  return "지원하지 않음";
}

export function createDrawingFileRecordFromFile(file: File): DrawingFileRecord {
  const fileType = getDrawingFileType(file);

  return {
    id: `upload-${crypto.randomUUID()}`,
    fileName: file.name,
    fileType,
    mimeType: file.type || undefined,
    fileSize: file.size,
    fileSizeLabel: formatFileSize(file.size),
    status: "uploaded",
    conversionStatus: buildConversionStatus(fileType),
    pageCount: fileType === "png" || fileType === "jpg" ? 1 : null,
    uploadedAt: new Date().toISOString(),
    storagePath: null,
    message: buildUploadMessage(fileType)
  };
}

export function createLocalDrawingUpload(file: File): DrawingFileRecord {
  return createDrawingFileRecordFromFile(file);
}

function findStandardItemById(
  standardItems: StandardItemRecord[],
  itemId: string
): StandardItemRecord | undefined {
  return standardItems.find((item) => item.id === itemId);
}

function pickStandardItemForCandidate(
  candidate: DrawingExtractionCandidateRecord,
  standardItems: StandardItemRecord[]
): { standardItem: StandardItemRecord; confidence: number; reason: string } | null {
  const value = [
    candidate.normalizedValue,
    candidate.extractedText,
    candidate.sourceTextSnippet,
    candidate.sourceNote
  ]
    .filter(Boolean)
    .join(" ");

  const rules: Array<{
    standardItemId: string;
    confidence: number;
    keywords: string[];
    reason: string;
  }> = [
    {
      standardItemId: "std-wall",
      confidence: 0.72,
      keywords: ["석고보드", "벽체", "wall"],
      reason: "PDF 승인 후보 기반 / 벽체·석고보드 키워드 매칭"
    },
    {
      standardItemId: "std-door",
      confidence: 0.72,
      keywords: ["방화문", "문", "door"],
      reason: "PDF 승인 후보 기반 / 문·방화문 키워드 매칭"
    },
    {
      standardItemId: "std-rc-beam",
      confidence: 0.7,
      keywords: ["철근", "콘크리트", "슬라브", "보", "기둥", "rc"],
      reason: "PDF 승인 후보 기반 / 철근콘크리트 구조 키워드 매칭"
    },
    {
      standardItemId: "std-waterproof",
      confidence: 0.74,
      keywords: ["방수", "우레탄", "waterproof"],
      reason: "PDF 승인 후보 기반 / 방수 공종 키워드 매칭"
    },
    {
      standardItemId: "std-steel",
      confidence: 0.68,
      keywords: ["철골", "steel"],
      reason: "PDF 승인 후보 기반 / 철골 키워드 매칭"
    },
    {
      standardItemId: "std-demolition",
      confidence: 0.68,
      keywords: ["철거", "demolition"],
      reason: "PDF 승인 후보 기반 / 철거 키워드 매칭"
    },
    {
      standardItemId: "std-paving",
      confidence: 0.66,
      keywords: [
        "아스콘",
        "포장",
        "경계석",
        "우수관",
        "오수관",
        "pvc",
        "맨홀",
        "집수정",
        "빗물받이"
      ],
      reason: "PDF 승인 후보 기반 / 포장·배수 계열 키워드 매칭"
    }
  ];

  const normalizedValue = value.toLowerCase();
  const matchedRule = rules.find((rule) =>
    rule.keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()))
  );

  if (matchedRule) {
    const standardItem = findStandardItemById(standardItems, matchedRule.standardItemId);

    if (standardItem) {
      return {
        standardItem,
        confidence: matchedRule.confidence,
        reason: matchedRule.reason
      };
    }
  }

  const fallbackItem = standardItems[0];

  if (!fallbackItem) {
    return null;
  }

  return {
    standardItem: fallbackItem,
    confidence: 0.35,
    reason: "PDF 승인 후보 기반 / 키워드 매칭 필요"
  };
}

export function createStandardMatchesFromApprovedCandidates(
  approvedCandidates: DrawingExtractionCandidateRecord[],
  standardItems: StandardItemRecord[]
): EstimateItemMatchRecord[] {
  return approvedCandidates.reduce<EstimateItemMatchRecord[]>((matches, candidate) => {
    const picked = pickStandardItemForCandidate(candidate, standardItems);

    if (!picked) {
      return matches;
    }

    matches.push({
      id: `uploaded-match-${candidate.id}-${picked.standardItem.id}`,
      projectId: candidate.drawingFileId.startsWith("upload-") ? undefined : null,
      drawingExtractionId: candidate.id,
      standardItemId: picked.standardItem.id,
      matchReason: picked.reason,
      confidence: picked.confidence,
      reviewStatus: picked.confidence >= 0.6 ? "pending" : "needs_standard_match",
      sourceCandidateId: candidate.id,
      sourceFileName: candidate.sourceFileName ?? null,
      sourcePage: candidate.sourcePage ?? null,
      matchSource: "uploaded_pdf",
      standardMatchStatus: "pending"
    });

    return matches;
  }, []);
}

export function createEstimateItemFromMatch(
  match: EstimateItemMatchRecord,
  candidate: DrawingExtractionCandidateRecord,
  standardItem: StandardItemRecord
): EstimateItemRecord {
  const quantity = candidate.quantity ?? 1;
  const quantityReviewRequired = candidate.quantity == null;
  const matchSource = match.matchSource ?? candidate.sourceLabel ?? "sample";

  return {
    id: `estimate-${candidate.id}-${standardItem.id}`,
    projectId: match.projectId,
    drawingFileId: candidate.drawingFileId,
    drawingPageId: candidate.drawingPageId,
    standardItemId: standardItem.id,
    workCategory: standardItem.workCategory,
    itemName: candidate.normalizedValue ?? standardItem.itemName,
    specification:
      candidate.extractedText === candidate.normalizedValue
        ? standardItem.description ?? standardItem.section ?? ""
        : candidate.extractedText,
    quantity,
    unit: candidate.unit ?? standardItem.unit ?? "식",
    calculationBasis:
      candidate.sourceNote ??
      candidate.sourceTextSnippet ??
      standardItem.measurementRule ??
      "PDF 승인 후보 기반, 수량 검토 필요",
    sourceNote: match.matchReason ?? "",
    reviewStatus: match.reviewStatus,
    standardItemName: standardItem.itemName,
    drawingNo: candidate.drawingNo ?? "",
    drawingTitle: candidate.drawingTitle ?? "",
    remark:
      matchSource === "uploaded_pdf"
        ? "PDF 승인 후보 기반 / 수량 검토 필요"
        : candidate.reviewStatus === "edited"
          ? "사용자 수정 후 승인"
          : "샘플 데이터 기반 승인",
    sourceCandidateId: candidate.id,
    sourceFileName: candidate.sourceFileName ?? null,
    sourcePage: candidate.sourcePage ?? null,
    quantityReviewRequired,
    matchSource,
    standardCode: standardItem.itemCode ?? null
  };
}

export function isEstimateItemDuplicate(
  existingItems: EstimateItemRecord[],
  newItem: EstimateItemRecord
): boolean {
  return existingItems.some((item) => {
    if (item.sourceCandidateId && item.sourceCandidateId === newItem.sourceCandidateId) {
      return true;
    }

    return (
      item.itemName === newItem.itemName &&
      item.specification === newItem.specification &&
      item.sourcePage === newItem.sourcePage
    );
  });
}

export function mergeEstimateItems(
  existingItems: EstimateItemRecord[],
  newItem: EstimateItemRecord
): EstimateItemRecord[] {
  if (isEstimateItemDuplicate(existingItems, newItem)) {
    return existingItems;
  }

  return [...existingItems, newItem];
}

export function deriveEstimateItems(args: {
  candidates: DrawingExtractionCandidateRecord[];
  matches: EstimateItemMatchRecord[];
  standardItems: StandardItemRecord[];
}): EstimateItemRecord[] {
  const { candidates, matches, standardItems } = args;

  const acceptedMatches = matches.filter((match) => match.reviewStatus === "accepted");

  return acceptedMatches.reduce<EstimateItemRecord[]>((items, match) => {
    const candidate = candidates.find((item) => item.id === match.drawingExtractionId);
    const standardItem = standardItems.find((item) => item.id === match.standardItemId);

    if (!candidate || !standardItem || candidate.reviewStatus === "rejected") {
      return items;
    }

    return mergeEstimateItems(items, createEstimateItemFromMatch(match, candidate, standardItem));
  }, []);
}

export function buildScheduleCategorySummaries(scheduleItems: ScheduleForecastItemRecord[]) {
  const map = new Map<string, ScheduleCategorySummary>();

  for (const item of scheduleItems) {
    const current = map.get(item.workCategory) ?? {
      workCategory: item.workCategory,
      totalQuantity: 0,
      itemCount: 0,
      linkedCount: 0
    };

    current.totalQuantity += item.plannedQuantity ?? 0;
    current.itemCount += 1;

    if (item.status === "linked") {
      current.linkedCount += 1;
    }

    map.set(item.workCategory, current);
  }

  return Array.from(map.values()).sort((left, right) =>
    left.workCategory.localeCompare(right.workCategory, "ko-KR")
  );
}

export function suggestMatchesFromKeywords(args: {
  candidate: DrawingExtractionCandidateRecord;
  standardItems: StandardItemRecord[];
  standardItemKeywords: StandardItemKeywordRecord[];
}) {
  const ranked = rankStandardMatches(
    args.candidate,
    args.standardItems,
    args.standardItemKeywords
  );

  return ranked.map((entry, index) => ({
    id: `suggested-${args.candidate.id}-${entry.standardItem.id}-${index}`,
    drawingExtractionId: args.candidate.id,
    standardItemId: entry.standardItem.id,
    matchReason: `키워드 기반 후보 추천 (${Math.round(entry.score * 100)}점)`,
    confidence: Number(entry.score.toFixed(2)),
    reviewStatus: "pending" as const
  }));
}

// TODO: replace these local helpers with Supabase-backed actions and server-side services.
export async function uploadDrawingFileToStorage(_file: File): Promise<string> {
  throw new Error("TODO: Supabase Storage 또는 외부 저장소 업로드를 연결해야 합니다.");
}

export async function createDrawingFileRow(_record: DrawingFileRecord): Promise<DrawingFileRecord> {
  throw new Error("TODO: drawing_files 테이블 insert를 연결해야 합니다.");
}

export async function updateDrawingFileStatus(
  _id: string,
  _status: DrawingFileStatus
): Promise<void> {
  throw new Error("TODO: drawing_files 상태 업데이트를 연결해야 합니다.");
}

export async function createDrawingPagesFromPdf(
  _fileId: string,
  _pages: Array<{ pageNumber: number; drawingNo?: string; drawingTitle?: string }>
): Promise<void> {
  throw new Error("TODO: PDF 페이지 메타데이터를 drawing_pages에 저장해야 합니다.");
}

export async function convertPdfPagesToPng(_fileId: string): Promise<void> {
  throw new Error("TODO: PDF 페이지별 PNG 변환 서비스를 연결해야 합니다.");
}

export async function analyzeDrawingImages(
  _fileId: string
): Promise<DrawingExtractionCandidateRecord[]> {
  throw new Error("TODO: 도면 이미지 분석 및 후보 추출 서비스를 연결해야 합니다.");
}

export async function importIfcModel(_file: File): Promise<string> {
  throw new Error("TODO: IFC 모델 업로드/등록 서비스를 연결해야 합니다.");
}

export async function extractQuantitiesFromIfc(_modelId: string): Promise<EstimateItemRecord[]> {
  throw new Error("TODO: IFC 부재 물량 추출 서비스를 연결해야 합니다.");
}

export async function mapIfcElementsToEstimateItems(
  _modelId: string
): Promise<EstimateItemRecord[]> {
  throw new Error("TODO: IFC 부재와 estimate_items 매핑 서비스를 연결해야 합니다.");
}
