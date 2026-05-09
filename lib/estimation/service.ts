import type {
  DrawingExtractionCandidateRecord,
  DrawingFileRecord,
  DrawingFileStatus,
  EstimateItemMatchRecord,
  EstimateItemRecord,
  EstimateStatementItemRecord,
  EstimateStatementSummary,
  ManualStandardMatchOption,
  ScheduleCategorySummary,
  ScheduleForecastItemRecord,
  StandardItemKeywordRecord,
  StandardItemRecord,
  StatementReviewStatus,
  SupportedDrawingFileType,
  UnitPriceRecord
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
  const primaryValue = [candidate.normalizedValue, candidate.extractedText]
    .filter(Boolean)
    .join(" ");
  const matchTarget = primaryValue || value;

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
      displayStandardItemName: "창호 설치",
      displayUnit: "EA"
    },
    {
      standardItemId: "std-paving",
      confidence: 0.72,
      keywords: ["아스콘", "아스콘포장", "보도블럭", "경계석", "포장"],
      reason: "PDF 텍스트 후보 기반, 포장 관련 항목",
      displayWorkCategory: "포장공사",
      displayStandardItemName: "아스콘포장",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-paving",
      confidence: 0.7,
      keywords: ["우수관", "오수관", "pvc이중벽관", "pvc", "빗물받이", "맨홀", "집수정"],
      reason: "PDF 텍스트 후보 기반, 배수관·맨홀 항목",
      displayWorkCategory: "배수공사",
      displayStandardItemName: "배수관 설치",
      displayUnit: "m"
    },
    {
      standardItemId: "std-wall",
      confidence: 0.68,
      keywords: ["경질우레탄", "글라스울", "단열재", "패널"],
      reason: "PDF 텍스트 후보 기반, 단열재 두께 정보 확인",
      displayWorkCategory: "단열공사",
      displayStandardItemName: "단열재 설치",
      displayUnit: "m2"
    },
    {
      standardItemId: "std-waterproof",
      confidence: 0.74,
      keywords: ["방수", "우레탄 방수", "옥상 방수", "waterproof"],
      reason: "PDF 텍스트 후보 기반, 방수 관련 항목",
      displayWorkCategory: "방수공사",
      displayStandardItemName: "방수층 시공",
      displayUnit: "m2"
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

  const normalizedValue = matchTarget.toLowerCase();
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
        displayStandardItemName: buildUploadedPdfStandardItemName(
          candidate,
          matchedRule.displayStandardItemName
        ),
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
  const primarySource = [candidate.normalizedValue, candidate.extractedText]
    .filter(Boolean)
    .join(" ");
  const displayValue = candidate.normalizedValue ?? candidate.extractedText;
  const diameter = primarySource.match(/\bD\s*\d{2,4}\b/i)?.[0]?.replace(/\s+/g, "");
  const thickness = primarySource.match(/\bTHK\s*\d{1,4}\b/i)?.[0]?.replace(/\s+/g, "");

  if (includesAny(primarySource, ["석고보드", "석고보드벽체"])) {
    return "석고보드벽체 설치";
  }

  if (includesAny(primarySource, ["방화문"])) {
    return "방화문 설치";
  }

  if (includesAny(primarySource, ["창호"])) {
    return "창호 설치";
  }

  if (includesAny(primarySource, ["아스콘"])) {
    return "아스콘포장";
  }

  if (includesAny(primarySource, ["경계석"])) {
    return "콘크리트 경계석 설치";
  }

  if (includesAny(primarySource, ["보도블럭"])) {
    return "보도블럭 포장";
  }

  if (includesAny(primarySource, ["우수관"])) {
    return diameter ? `우수관 설치 (${diameter})` : "우수관 설치";
  }

  if (includesAny(primarySource, ["오수관"])) {
    return diameter ? `오수관 설치 (${diameter})` : "오수관 설치";
  }

  if (includesAny(primarySource, ["pvc이중벽관", "pvc"])) {
    return diameter ? `PVC이중벽관 설치 (${diameter})` : "PVC이중벽관 설치";
  }

  if (includesAny(primarySource, ["빗물받이"])) {
    return "빗물받이 설치";
  }

  if (includesAny(primarySource, ["맨홀"])) {
    return "맨홀 설치";
  }

  if (includesAny(primarySource, ["경질우레탄", "글라스울", "단열재", "패널"])) {
    return thickness ? `단열재 설치 (${thickness})` : "단열재 설치";
  }

  if (includesAny(primarySource, ["우레탄 방수"])) {
    return "우레탄 방수";
  }

  if (includesAny(primarySource, ["방수"])) {
    return "방수층 시공";
  }

  if (includesAny(primarySource, ["슬라브"])) {
    return "슬라브 콘크리트 타설";
  }

  if (includesAny(primarySource, ["기둥"])) {
    return "철근콘크리트 기둥 타설";
  }

  if (includesAny(primarySource, ["콘크리트 보", "철근콘크리트 보"])) {
    return "철근콘크리트 보 타설";
  }

  if (includesAny(primarySource, ["철골"])) {
    return "철골 설치";
  }

  if (includesAny(primarySource, ["철거"])) {
    return "철거 작업";
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
  quantityReviewRequired: boolean,
  source: "uploaded_pdf" | "manual_match" = "uploaded_pdf"
): string {
  const quantityReviewLabel =
    candidate.quantity === 0 ? "수량 0 추출값 검토 필요" : "수량 검토 필요";
  const details = [
    source,
    source === "manual_match" ? "uploaded_pdf" : null,
    candidate.sourceFileName ? `출처파일: ${candidate.sourceFileName}` : null,
    candidate.sourcePage ? `p.${candidate.sourcePage}` : null,
    quantityReviewRequired ? quantityReviewLabel : null,
    source === "manual_match" ? "사용자 수동 매칭 승인" : "사용자 승인"
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
      quantityReviewRequired: candidate.quantity == null || candidate.quantity <= 0
    });

    return matches;
  }, []);
}

function findFallbackStandardItemId(
  standardItems: StandardItemRecord[],
  preferredId: string
): string {
  return standardItems.find((item) => item.id === preferredId)?.id ?? standardItems[0]?.id ?? "";
}

export function createManualStandardMatchOptions(
  standardItems: StandardItemRecord[]
): ManualStandardMatchOption[] {
  return [
    {
      id: "manual-gypsum-wall",
      label: "석고보드벽체 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-wall"),
      workCategory: "수장공사",
      standardItemName: "석고보드벽체 설치",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 벽체 마감 항목",
      confidence: 0.9
    },
    {
      id: "manual-fire-door",
      label: "방화문 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-door"),
      workCategory: "창호공사",
      standardItemName: "방화문 설치",
      unit: "EA",
      calculationBasis: "사용자 수동 매칭, 창호·문 항목",
      confidence: 0.9
    },
    {
      id: "manual-rc-beam",
      label: "철근콘크리트 보 타설",
      standardItemId: findFallbackStandardItemId(standardItems, "std-rc-beam"),
      workCategory: "철근콘크리트공사",
      standardItemName: "철근콘크리트 보 타설",
      unit: "m3",
      calculationBasis: "사용자 수동 매칭, 철근콘크리트 구조 항목",
      confidence: 0.88
    },
    {
      id: "manual-rc-slab",
      label: "슬라브 콘크리트 타설",
      standardItemId: findFallbackStandardItemId(standardItems, "std-rc-beam"),
      workCategory: "철근콘크리트공사",
      standardItemName: "슬라브 콘크리트 타설",
      unit: "m3",
      calculationBasis: "사용자 수동 매칭, 슬라브 구조 항목",
      confidence: 0.88
    },
    {
      id: "manual-waterproof",
      label: "우레탄 방수",
      standardItemId: findFallbackStandardItemId(standardItems, "std-waterproof"),
      workCategory: "방수공사",
      standardItemName: "우레탄 방수",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 방수 관련 항목",
      confidence: 0.9
    },
    {
      id: "manual-ascon",
      label: "아스콘포장",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "포장공사",
      standardItemName: "아스콘포장",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 포장 관련 항목",
      confidence: 0.9
    },
    {
      id: "manual-block",
      label: "보도블럭 포장",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "포장공사",
      standardItemName: "보도블럭 포장",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 보도블럭 포장 항목",
      confidence: 0.88
    },
    {
      id: "manual-curb",
      label: "콘크리트 경계석 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "포장공사",
      standardItemName: "콘크리트 경계석 설치",
      unit: "m",
      calculationBasis: "사용자 수동 매칭, 경계석 설치 항목",
      confidence: 0.88
    },
    {
      id: "manual-rain-pipe",
      label: "우수관 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "배수공사",
      standardItemName: "우수관 설치",
      unit: "m",
      calculationBasis: "사용자 수동 매칭, 배수관 항목",
      confidence: 0.88
    },
    {
      id: "manual-sewer-pipe",
      label: "오수관 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "배수공사",
      standardItemName: "오수관 설치",
      unit: "m",
      calculationBasis: "사용자 수동 매칭, 배수관 항목",
      confidence: 0.88
    },
    {
      id: "manual-pvc-pipe",
      label: "PVC이중벽관 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "배수공사",
      standardItemName: "PVC이중벽관 설치",
      unit: "m",
      calculationBasis: "사용자 수동 매칭, PVC 배수관 항목",
      confidence: 0.88
    },
    {
      id: "manual-manhole",
      label: "맨홀 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "배수공사",
      standardItemName: "맨홀 설치",
      unit: "EA",
      calculationBasis: "사용자 수동 매칭, 맨홀 항목",
      confidence: 0.86
    },
    {
      id: "manual-catch-basin",
      label: "빗물받이 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-paving"),
      workCategory: "배수공사",
      standardItemName: "빗물받이 설치",
      unit: "EA",
      calculationBasis: "사용자 수동 매칭, 빗물받이 항목",
      confidence: 0.86
    },
    {
      id: "manual-insulation",
      label: "단열재 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-wall"),
      workCategory: "단열공사",
      standardItemName: "단열재 설치",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 단열재 항목",
      confidence: 0.88
    },
    {
      id: "manual-steel",
      label: "철골 설치",
      standardItemId: findFallbackStandardItemId(standardItems, "std-steel"),
      workCategory: "철골공사",
      standardItemName: "철골 설치",
      unit: "ton",
      calculationBasis: "사용자 수동 매칭, 철골 항목",
      confidence: 0.88
    },
    {
      id: "manual-demolition",
      label: "철거 작업",
      standardItemId: findFallbackStandardItemId(standardItems, "std-demolition"),
      workCategory: "철거공사",
      standardItemName: "철거 작업",
      unit: "m2",
      calculationBasis: "사용자 수동 매칭, 철거 항목",
      confidence: 0.86
    }
  ].filter((option) => option.standardItemId);
}

export function isManualStandardMatchTarget(match: EstimateItemMatchRecord): boolean {
  if (match.reviewStatus === "accepted" || match.reviewStatus === "edited" || match.reviewStatus === "rejected") {
    return false;
  }

  if (match.matchSource !== "uploaded_pdf") {
    return false;
  }

  return (
    match.reviewStatus === "needs_standard_match" ||
    match.displayWorkCategory === "검토 필요" ||
    match.displayStandardItemName === "품셈 매칭 필요" ||
    (match.confidence ?? 1) < 0.45
  );
}

export function createEstimateItemFromMatch(
  match: EstimateItemMatchRecord,
  candidate: DrawingExtractionCandidateRecord,
  standardItem: StandardItemRecord
): EstimateItemRecord {
  const quantity = candidate.quantity ?? 1;
  const quantityReviewRequired = candidate.quantity == null || candidate.quantity <= 0;
  const matchSource = match.matchSource ?? candidate.sourceLabel ?? "sample";
  const isManualMatch = matchSource === "manual";
  const isUploadedPdf = matchSource === "uploaded_pdf" || isManualMatch;
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
        ? buildUploadedPdfRemark(
            candidate,
            quantityReviewRequired,
            isManualMatch ? "manual_match" : "uploaded_pdf"
          )
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

function normalizeMatchText(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

function getUnitPriceSearchTexts(item: EstimateItemRecord): string[] {
  return [
    item.standardItemName,
    item.itemName,
    item.specification ?? "",
    item.calculationBasis ?? ""
  ].map(normalizeMatchText);
}

type UnitPriceMatchKind = "exact" | "contains" | "keyword";

type UnitPriceMatchResult = {
  unitPrice: UnitPriceRecord;
  matchKind: UnitPriceMatchKind;
  matchReason: string;
  matchReviewRequired: boolean;
};

type UnitPriceKeywordRule = {
  keywords: string[];
  unitPriceKeywords: string[];
  reason: string;
  weak?: boolean;
};

const unitPriceKeywordRules: UnitPriceKeywordRule[] = [
  {
    keywords: ["아스콘포장", "아스콘"],
    unitPriceKeywords: ["아스콘포장", "아스콘"],
    reason: "아스콘/포장 키워드 매칭"
  },
  {
    keywords: ["보도블럭"],
    unitPriceKeywords: ["보도블럭"],
    reason: "보도블럭 키워드 매칭"
  },
  {
    keywords: ["경계석"],
    unitPriceKeywords: ["경계석"],
    reason: "경계석 키워드 매칭"
  },
  {
    keywords: ["오수관"],
    unitPriceKeywords: ["오수관"],
    reason: "오수관 키워드 매칭"
  },
  {
    keywords: ["우수관"],
    unitPriceKeywords: ["우수관"],
    reason: "우수관 키워드 매칭"
  },
  {
    keywords: ["pvc이중벽관"],
    unitPriceKeywords: ["pvc이중벽관", "pvc"],
    reason: "PVC이중벽관 키워드 매칭"
  },
  {
    keywords: ["pvc"],
    unitPriceKeywords: ["pvc"],
    reason: "PVC 단일 키워드 매칭",
    weak: true
  },
  {
    keywords: ["빗물받이"],
    unitPriceKeywords: ["빗물받이"],
    reason: "빗물받이 키워드 매칭"
  },
  {
    keywords: ["맨홀"],
    unitPriceKeywords: ["맨홀"],
    reason: "맨홀 키워드 매칭"
  },
  {
    keywords: ["경질우레탄", "글라스울", "단열재"],
    unitPriceKeywords: ["단열", "경질우레탄", "글라스울"],
    reason: "단열재 키워드 매칭"
  },
  {
    keywords: ["thk"],
    unitPriceKeywords: ["단열", "경질우레탄", "글라스울"],
    reason: "THK 두께 키워드 매칭",
    weak: true
  },
  {
    keywords: ["석고보드벽체", "석고보드"],
    unitPriceKeywords: ["석고보드"],
    reason: "석고보드 키워드 매칭"
  },
  {
    keywords: ["방화문"],
    unitPriceKeywords: ["방화문"],
    reason: "방화문 키워드 매칭"
  },
  {
    keywords: ["우레탄방수", "방수"],
    unitPriceKeywords: ["우레탄방수", "방수"],
    reason: "방수 키워드 매칭"
  },
  {
    keywords: ["슬라브", "콘크리트보", "기둥"],
    unitPriceKeywords: ["콘크리트", "철근콘크리트"],
    reason: "철근콘크리트 구조 키워드 매칭"
  },
  {
    keywords: ["콘크리트"],
    unitPriceKeywords: ["콘크리트", "철근콘크리트"],
    reason: "콘크리트 단일 키워드 매칭",
    weak: true
  }
];

function getUnitPriceText(unitPrice: UnitPriceRecord): string {
  return normalizeMatchText(
    `${unitPrice.itemName} ${unitPrice.specification} ${unitPrice.note ?? ""}`
  );
}

function hasKeyword(source: string, keywords: string[]): boolean {
  return keywords.some((keyword) => source.includes(normalizeMatchText(keyword)));
}

function isWeakContainsMatch(item: EstimateItemRecord, unitPrice: UnitPriceRecord): boolean {
  const source = getUnitPriceSearchTexts(item).join(" ");
  const unitPriceText = getUnitPriceText(unitPrice);
  const sourceTerms = [item.standardItemName, item.itemName]
    .map(normalizeMatchText)
    .filter(Boolean);
  const weakStandaloneTerms = ["pvc", "thk", "보", "문", "창", "벽"];

  if (sourceTerms.some((term) => weakStandaloneTerms.includes(term))) {
    return true;
  }

  if (source.includes("pvc") && !source.includes("pvc이중벽관")) {
    return true;
  }

  if (
    source.includes("콘크리트") &&
    unitPriceText.includes("콘크리트") &&
    !hasKeyword(source, ["슬라브", "콘크리트보", "기둥", "철근콘크리트"])
  ) {
    return true;
  }

  if (
    item.workCategory.includes("수장") &&
    hasKeyword(unitPriceText, ["단열", "경질우레탄", "글라스울"])
  ) {
    return true;
  }

  return false;
}

function findUnitPriceByKeywords(
  item: EstimateItemRecord,
  unitPrices: UnitPriceRecord[]
): UnitPriceMatchResult | undefined {
  const source = getUnitPriceSearchTexts(item).join(" ");

  const matchedRule = unitPriceKeywordRules.find((rule) =>
    rule.keywords.some((keyword) => source.includes(normalizeMatchText(keyword)))
  );

  if (!matchedRule) {
    return undefined;
  }

  const unitPrice = unitPrices.find((record) => {
    const unitPriceText = getUnitPriceText(record);

    return matchedRule.unitPriceKeywords.some((keyword) =>
      unitPriceText.includes(normalizeMatchText(keyword))
    );
  });

  if (!unitPrice) {
    return undefined;
  }

  return {
    unitPrice,
    matchKind: "keyword",
    matchReason: matchedRule.reason,
    matchReviewRequired: matchedRule.weak === true
  };
}

function matchUnitPriceForEstimateItemResult(
  item: EstimateItemRecord,
  unitPrices: UnitPriceRecord[]
): UnitPriceMatchResult | null {
  const standardItemName = normalizeMatchText(item.standardItemName);
  const itemName = normalizeMatchText(item.itemName);

  const exactMatch = unitPrices.find(
    (unitPrice) => normalizeMatchText(unitPrice.itemName) === standardItemName
  );

  if (exactMatch) {
    return {
      unitPrice: exactMatch,
      matchKind: "exact",
      matchReason: "표준품셈 항목명과 일위대가 품명 정확 일치",
      matchReviewRequired: false
    };
  }

  const containsMatch = unitPrices.find((unitPrice) => {
    const unitPriceName = normalizeMatchText(unitPrice.itemName);

    return (
      Boolean(itemName && unitPriceName.includes(itemName)) ||
      Boolean(itemName && itemName.includes(unitPriceName)) ||
      Boolean(standardItemName && unitPriceName.includes(standardItemName)) ||
      Boolean(standardItemName && standardItemName.includes(unitPriceName))
    );
  });

  if (containsMatch) {
    return {
      unitPrice: containsMatch,
      matchKind: "contains",
      matchReason: "품명 포함 관계 기반 매칭",
      matchReviewRequired: isWeakContainsMatch(item, containsMatch)
    };
  }

  return findUnitPriceByKeywords(item, unitPrices) ?? null;
}

export function matchUnitPriceForEstimateItem(
  item: EstimateItemRecord,
  unitPrices: UnitPriceRecord[]
): UnitPriceRecord | null {
  return matchUnitPriceForEstimateItemResult(item, unitPrices)?.unitPrice ?? null;
}

export function normalizeUnit(unit: string): string {
  const value = unit.trim().toLowerCase().replace(/\s+/g, "");

  if (!value) {
    return "";
  }

  if (["㎡", "m2", "m²", "m^2", "제곱미터"].includes(value)) {
    return "m2";
  }

  if (["㎥", "m3", "m³", "m^3", "세제곱미터"].includes(value)) {
    return "m3";
  }

  if (["m", "meter", "미터"].includes(value)) {
    return "m";
  }

  if (["ea", "개"].includes(value)) {
    return "ea";
  }

  if (value === "식") {
    return "set";
  }

  return value;
}

export function areUnitsCompatible(quantityUnit: string, unitPriceUnit: string): boolean {
  const left = normalizeUnit(quantityUnit);
  const right = normalizeUnit(unitPriceUnit);

  if (!left || !right || left === "set" || right === "set") {
    return false;
  }

  return left === right;
}

export function getStatementReviewStatus(args: {
  quantityReviewRequired: boolean;
  unitPriceMatched: boolean;
  unitPrice: number;
  unitCheckRequired: boolean;
  matchReviewRequired: boolean;
}): StatementReviewStatus {
  if (!args.unitPriceMatched || args.unitPrice <= 0) {
    return "unit_price_match_required";
  }

  if (args.quantityReviewRequired) {
    return "quantity_review_required";
  }

  if (args.unitCheckRequired) {
    return "unit_check_required";
  }

  if (args.matchReviewRequired) {
    return "match_review_required";
  }

  return "calculated";
}

function getStatementReviewMessage(status: StatementReviewStatus): string {
  const messages: Record<StatementReviewStatus, string> = {
    calculated: "산출 가능",
    quantity_review_required: "수량 확인 필요",
    unit_price_match_required: "일위대가 매칭 필요",
    unit_check_required: "단위 확인 필요",
    match_review_required: "매칭 검토 필요"
  };

  return messages[status];
}

export function buildEstimateStatementItems(
  estimateItems: EstimateItemRecord[],
  unitPrices: UnitPriceRecord[]
): EstimateStatementItemRecord[] {
  return estimateItems.map((item) => {
    const unitPriceMatch = matchUnitPriceForEstimateItemResult(item, unitPrices);
    const matchedUnitPrice = unitPriceMatch?.unitPrice ?? null;
    const quantityReviewRequired = item.quantityReviewRequired === true || item.quantity <= 0;
    const unitPriceMatched = Boolean(matchedUnitPrice);
    const unitPrice = matchedUnitPrice?.unitPrice ?? 0;
    const unitCheckRequired = matchedUnitPrice
      ? !areUnitsCompatible(item.unit, matchedUnitPrice.unit)
      : false;
    const matchReviewRequired = unitPriceMatch?.matchReviewRequired ?? false;
    const statementReviewStatus = getStatementReviewStatus({
      quantityReviewRequired,
      unitPriceMatched,
      unitPrice,
      unitCheckRequired,
      matchReviewRequired
    });
    const amountReviewRequired = statementReviewStatus !== "calculated";
    const amount = amountReviewRequired ? 0 : item.quantity * unitPrice;
    const reviewMessage = getStatementReviewMessage(statementReviewStatus);
    const reviewNotes = [
      item.remark,
      unitPriceMatch?.matchReason,
      !unitPriceMatched ? "일위대가 매칭 필요" : null,
      quantityReviewRequired ? "수량 확인 필요" : null,
      unitCheckRequired ? `단위 확인 필요: 물량 ${item.unit || "-"} / 일위대가 ${matchedUnitPrice?.unit || "-"}` : null,
      matchReviewRequired ? "자동 매칭 신뢰도 확인 필요" : null
    ].filter(Boolean);

    return {
      id: `statement-${item.id}`,
      sourceEstimateItemId: item.id,
      workCategory: item.workCategory,
      itemName: item.itemName,
      specification: item.specification ?? "",
      quantity: item.quantity,
      unit: item.unit,
      quantityReviewRequired,
      unitPriceMatched,
      unitPriceCode: matchedUnitPrice?.code,
      unitPriceItemName: matchedUnitPrice?.itemName,
      unitPriceSpecification: matchedUnitPrice?.specification,
      unitPriceUnit: matchedUnitPrice?.unit,
      unitPriceMatchReason: unitPriceMatch?.matchReason,
      materialCost: matchedUnitPrice?.materialCost ?? 0,
      laborCost: matchedUnitPrice?.laborCost ?? 0,
      expenseCost: matchedUnitPrice?.expenseCost ?? 0,
      unitPrice,
      amount,
      amountReviewRequired,
      statementReviewStatus,
      reviewMessage,
      unitCheckRequired,
      matchReviewRequired,
      sourceDrawingNo: item.drawingNo ?? "",
      sourceDrawingName: item.drawingTitle ?? "",
      remark: reviewNotes.join(" / ")
    };
  });
}

export function summarizeEstimateStatementItems(
  statementItems: EstimateStatementItemRecord[]
): EstimateStatementSummary {
  return statementItems.reduce<EstimateStatementSummary>(
    (summary, item) => {
      summary.totalCount += 1;

      if (item.unitPriceMatched) {
        summary.matchedCount += 1;
      }

      if (!item.amountReviewRequired) {
        summary.amountReadyCount += 1;
        summary.totalAmount += item.amount;
      } else {
        summary.reviewNeededCount += 1;
      }

      if (item.statementReviewStatus === "calculated") {
        summary.calculatedCount += 1;
      } else if (item.statementReviewStatus === "quantity_review_required") {
        summary.quantityReviewRequiredCount += 1;
      } else if (item.statementReviewStatus === "unit_price_match_required") {
        summary.unitPriceMatchRequiredCount += 1;
      } else if (item.statementReviewStatus === "unit_check_required") {
        summary.unitCheckRequiredCount += 1;
      } else if (item.statementReviewStatus === "match_review_required") {
        summary.matchReviewRequiredCount += 1;
      }

      return summary;
    },
    {
      totalCount: 0,
      matchedCount: 0,
      amountReadyCount: 0,
      reviewNeededCount: 0,
      totalAmount: 0,
      calculatedCount: 0,
      quantityReviewRequiredCount: 0,
      unitPriceMatchRequiredCount: 0,
      unitCheckRequiredCount: 0,
      matchReviewRequiredCount: 0
    }
  );
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
