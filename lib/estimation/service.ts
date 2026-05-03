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

type UploadedPdfMatchPresentation = {
  standardItem: StandardItemRecord;
  confidence: number;
  reason: string;
  displayWorkCategory: string;
  displayStandardItemName: string;
  displayUnit?: string | null;
};

function getCandidateSearchText(candidate: DrawingExtractionCandidateRecord): string {
  return [
    candidate.normalizedValue,
    candidate.extractedText,
    candidate.sourceTextSnippet,
    candidate.sourceNote,
    candidate.drawingTitle
  ]
    .filter(Boolean)
    .join(" ");
}

function includesAny(value: string, keywords: string[]): boolean {
  const normalizedValue = value.toLowerCase();

  return keywords.some((keyword) => normalizedValue.includes(keyword.toLowerCase()));
}

function pickStandardItemForCandidate(
  candidate: DrawingExtractionCandidateRecord,
  standardItems: StandardItemRecord[]
): UploadedPdfMatchPresentation | null {
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
    displayWorkCategory: string;
    displayStandardItemName: string;
    displayUnit?: string;
  }> = [
    {
      standardItemId: "std-wall",
      confidence: 0.72,
      keywords: ["석고보드", "벽체", "wall"],
      reason: "PDF 텍스트 후보 기반, 벽체 마감 항목",
      displayWorkCategory: "수장공사",
      displayStandardItemName: "석고보드벽체 설치",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-door",
      confidence: 0.72,
      keywords: ["방화문", "창호", "문", "door", "window"],
      reason: "PDF 텍스트 후보 기반, 창호·문 항목",
      displayWorkCategory: "창호공사",
      displayStandardItemName: "방화문/창호 설치",
      displayUnit: "EA"
    },
    {
      standardItemId: "std-rc-beam",
      confidence: 0.7,
      keywords: ["철근콘크리트", "콘크리트 보", "슬라브", "기둥", "rc"],
      reason: "PDF 텍스트 후보 기반, 철근콘크리트 구조 항목",
      displayWorkCategory: "철근콘크리트공사",
      displayStandardItemName: "철근콘크리트 구조체",
      displayUnit: "m3"
    },
    {
      standardItemId: "std-waterproof",
      confidence: 0.74,
      keywords: ["방수", "우레탄", "waterproof"],
      reason: "PDF 텍스트 후보 기반, 방수 관련 항목",
      displayWorkCategory: "방수공사",
      displayStandardItemName: "우레탄 도막방수",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-paving",
      confidence: 0.68,
      keywords: ["우수관", "오수관", "pvc이중벽관", "pvc", "맨홀", "집수정", "빗물받이"],
      reason: "PDF 텍스트 후보 기반, 배수관·맨홀 항목",
      displayWorkCategory: "배수공사",
      displayStandardItemName: "배수관 설치",
      displayUnit: "m"
    },
    {
      standardItemId: "std-paving",
      confidence: 0.68,
      keywords: ["아스콘", "포장", "경계석", "보도블럭"],
      reason: "PDF 텍스트 후보 기반, 포장 관련 항목",
      displayWorkCategory: "포장공사",
      displayStandardItemName: "아스콘포장",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-wall",
      confidence: 0.62,
      keywords: ["thk", "경질우레탄", "글라스울", "단열재"],
      reason: "PDF 텍스트 후보 기반, 단열재 두께 정보 확인",
      displayWorkCategory: "단열공사",
      displayStandardItemName: "단열재 설치",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-steel",
      confidence: 0.68,
      keywords: ["철골", "steel"],
      reason: "PDF 텍스트 후보 기반, 철골 항목",
      displayWorkCategory: "철골공사",
      displayStandardItemName: "철골 제작 및 설치",
      displayUnit: "ton"
    },
    {
      standardItemId: "std-demolition",
      confidence: 0.68,
      keywords: ["철거", "demolition"],
      reason: "PDF 텍스트 후보 기반, 철거 항목",
      displayWorkCategory: "철거공사",
      displayStandardItemName: "철거공사",
      displayUnit: "m2"
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
        reason: matchedRule.reason,
        displayWorkCategory: matchedRule.displayWorkCategory,
        displayStandardItemName: buildUploadedPdfStandardItemName(candidate, matchedRule.displayStandardItemName),
        displayUnit: candidate.unit ?? matchedRule.displayUnit
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
    reason: "PDF 텍스트 후보 기반, 표준품셈 키워드 매칭 필요",
    displayWorkCategory: "검토 필요",
    displayStandardItemName: "품셈 매칭 필요",
    displayUnit: candidate.unit ?? "검토 필요"
  };
}

function buildUploadedPdfStandardItemName(
  candidate: DrawingExtractionCandidateRecord,
  fallbackName: string
): string {
  const source = getCandidateSearchText(candidate);
  const displayValue = candidate.normalizedValue ?? candidate.extractedText;
  const diameter = source.match(/\bD\s*\d{2,4}\b/i)?.[0]?.replace(/\s+/g, "");
  const thickness = source.match(/\bTHK\s*\d{1,4}\b/i)?.[0]?.replace(/\s+/g, "");

  if (includesAny(source, ["우수관"])) {
    return diameter ? `우수관 설치 (${diameter})` : "우수관 설치";
  }

  if (includesAny(source, ["오수관"])) {
    return diameter ? `오수관 설치 (${diameter})` : "오수관 설치";
  }

  if (includesAny(source, ["pvc이중벽관", "pvc"])) {
    return diameter ? `PVC이중벽관 설치 (${diameter})` : "PVC이중벽관 설치";
  }

  if (includesAny(source, ["경계석"])) {
    return "콘크리트 경계석 설치";
  }

  if (includesAny(source, ["보도블럭"])) {
    return "보도블럭 포장";
  }

  if (includesAny(source, ["thk", "경질우레탄", "글라스울", "단열재"])) {
    return thickness ? `단열재 설치 (${thickness})` : "단열재 설치";
  }

  if (includesAny(source, ["아스콘"])) {
    return "아스콘포장";
  }

  if (displayValue.length > 0 && displayValue.length <= 30) {
    return displayValue;
  }

  return fallbackName;
}

function getUploadedPdfDrawingNo(candidate: DrawingExtractionCandidateRecord): string {
  if (candidate.sourcePage) {
    return `PDF p.${candidate.sourcePage}`;
  }

  return "PDF 텍스트";
}

function getUploadedPdfDrawingTitle(candidate: DrawingExtractionCandidateRecord): string {
  const source = getCandidateSearchText(candidate);

  if (includesAny(source, ["우수관", "오수관", "pvc이중벽관", "맨홀", "집수정", "빗물받이"])) {
    return "옥외계획/포장·배수 관련 도면";
  }

  if (includesAny(source, ["아스콘", "포장", "경계석", "보도블럭"])) {
    return "포장계획 관련 도면";
  }

  if (includesAny(source, ["thk", "경질우레탄", "글라스울", "단열재"])) {
    return "단열계획 관련 도면";
  }

  if (includesAny(source, ["철근", "콘크리트", "슬라브", "보", "기둥", "철골"])) {
    return "구조 관련 도면";
  }

  if (includesAny(source, ["방수", "우레탄"])) {
    return "방수계획 관련 도면";
  }

  if (includesAny(source, ["석고보드", "벽체", "방화문", "창호", "마감"])) {
    return "건축 마감/창호 관련 도면";
  }

  return "PDF 텍스트 추출 후보";
}

function buildUploadedPdfRemark(
  candidate: DrawingExtractionCandidateRecord,
  quantityReviewRequired: boolean
): string {
  const details = [
    "uploaded_pdf",
    candidate.sourceFileName ? `출처파일: ${candidate.sourceFileName}` : null,
    candidate.sourcePage ? `p.${candidate.sourcePage}` : null,
    quantityReviewRequired ? "수량 검토 필요" : null,
    "사용자 승인"
  ].filter(Boolean);

  return details.join(" / ");
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
      standardMatchStatus: "pending",
      displayWorkCategory: picked.displayWorkCategory,
      displayStandardItemName: picked.displayStandardItemName,
      displayUnit: picked.displayUnit ?? null,
      quantityReviewRequired: candidate.quantity == null
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
  const isUploadedPdf = matchSource === "uploaded_pdf";
  const fallbackUnit =
    quantityReviewRequired && isUploadedPdf ? "검토 필요" : (standardItem.unit ?? "식");
  const displayUnit = candidate.unit ?? match.displayUnit ?? fallbackUnit;

  return {
    id: `estimate-${candidate.id}-${standardItem.id}`,
    projectId: match.projectId,
    drawingFileId: candidate.drawingFileId,
    drawingPageId: candidate.drawingPageId,
    standardItemId: standardItem.id,
    workCategory: isUploadedPdf
      ? match.displayWorkCategory ?? standardItem.workCategory
      : standardItem.workCategory,
    itemName: candidate.normalizedValue ?? match.displayStandardItemName ?? standardItem.itemName,
    specification:
      candidate.extractedText === candidate.normalizedValue
        ? standardItem.description ?? standardItem.section ?? ""
        : candidate.extractedText,
    quantity,
    unit: displayUnit,
    calculationBasis:
      isUploadedPdf
        ? match.matchReason ?? "PDF 텍스트 후보 기반, 수량 검토 필요"
        : candidate.sourceNote ??
          candidate.sourceTextSnippet ??
          standardItem.measurementRule ??
          "도면 후보값을 기준으로 산출, 최종 검토 필요",
    sourceNote: match.matchReason ?? "",
    reviewStatus: match.reviewStatus,
    standardItemName: isUploadedPdf
      ? match.displayStandardItemName ?? standardItem.itemName
      : standardItem.itemName,
    drawingNo: isUploadedPdf ? getUploadedPdfDrawingNo(candidate) : candidate.drawingNo ?? "",
    drawingTitle: isUploadedPdf
      ? getUploadedPdfDrawingTitle(candidate)
      : candidate.drawingTitle ?? "",
    remark:
      isUploadedPdf
        ? buildUploadedPdfRemark(candidate, quantityReviewRequired)
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
