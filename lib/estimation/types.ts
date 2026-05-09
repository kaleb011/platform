export type ReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "edited"
  | "needs_standard_match";

export type DrawingFileStatus =
  | "uploaded"
  | "converting"
  | "converted"
  | "analyzed"
  | "failed";

export type ScheduleForecastStatus = "draft" | "linked" | "review_needed";

export type SupportedDrawingFileType = "pdf" | "png" | "jpg" | "dwg" | "unsupported";

export type PdfTextExtractionStatus = "success" | "empty" | "failed";

export type PdfTextExtractionResultStatus = "success" | "partial" | "failed";

export type ExtractionCandidateGroup = "drawing_metadata" | "estimate_candidate";

export type ExtractionCandidateFilter =
  | "all"
  | "drawing_metadata"
  | "estimate_candidate"
  | "drawing_no"
  | "drawing_title"
  | "scale"
  | "material"
  | "work_item"
  | "uploaded_pdf"
  | "sample"
  | "accepted"
  | "rejected"
  | "needs_standard_match";

export type DrawingDataStatus = "empty" | "exists";

export type EstimateDataStatus = "none" | "sample_ready" | "ready";

export type EstimationTabKey = "drawing-estimate" | "schedule-forecast";

export type StatementReviewStatus =
  | "calculated"
  | "quantity_review_required"
  | "unit_price_match_required"
  | "unit_check_required"
  | "match_review_required";

export interface DrawingFileRecord {
  id: string;
  projectId?: string | null;
  fileName: string;
  fileType: SupportedDrawingFileType;
  mimeType?: string;
  fileSize: number;
  fileSizeLabel: string;
  status: DrawingFileStatus;
  conversionStatus: string;
  pageCount?: number | null;
  uploadedAt: string;
  storagePath?: string | null;
  message?: string;
  debugMessage?: string;
}

export type UploadedDrawingFile = DrawingFileRecord;

export interface ProjectEstimateState {
  projectId: string;
  projectName: string;
  drawingDataStatus: DrawingDataStatus;
  estimateDataStatus: EstimateDataStatus;
  drawingFiles: DrawingFileRecord[];
}

export interface PdfPageTextRecord {
  id: string;
  drawingFileId: string;
  pageNumber: number;
  text: string;
  textLength: number;
  extractionStatus: PdfTextExtractionStatus;
}

export interface PdfTextExtractionResult {
  fileName: string;
  pageCount: number;
  pages: PdfPageTextRecord[];
  status: PdfTextExtractionResultStatus;
  message?: string;
  debugMessage?: string;
}

export interface DrawingPageRecord {
  id: string;
  drawingFileId: string;
  pageNumber: number;
  drawingNo?: string | null;
  drawingTitle?: string | null;
  scale?: string | null;
  pngPath?: string | null;
  overviewImagePath?: string | null;
  status: DrawingFileStatus;
}

export interface DrawingExtractionCandidateRecord {
  id: string;
  drawingFileId: string;
  drawingPageId: string;
  extractedType: string;
  extractedText: string;
  normalizedValue?: string | null;
  quantity?: number | null;
  unit?: string | null;
  sourcePage?: number | null;
  sourceBbox?: Record<string, number> | null;
  confidence?: number | null;
  reviewStatus: ReviewStatus;
  drawingNo?: string | null;
  drawingTitle?: string | null;
  scale?: string | null;
  sourceNote?: string | null;
  sourceFileName?: string | null;
  sourceTextSnippet?: string | null;
  sourceLabel?: "sample" | "uploaded_pdf";
  extractionMethod?: string | null;
  candidateGroup?: ExtractionCandidateGroup;
}

export interface StandardDocumentRecord {
  id: string;
  title: string;
  sourceYear: number;
  filePath?: string | null;
  pageCount?: number | null;
  description?: string | null;
}

export interface StandardItemRecord {
  id: string;
  standardDocumentId: string;
  sourceYear: number;
  division: string;
  chapter: string;
  section?: string | null;
  itemCode?: string | null;
  itemName: string;
  unit?: string | null;
  measurementRule?: string | null;
  description?: string | null;
  notes?: string | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  workCategory: string;
}

export interface StandardItemKeywordRecord {
  id: string;
  standardItemId: string;
  keyword: string;
  drawingTerm?: string | null;
}

export interface EstimateItemMatchRecord {
  id: string;
  projectId?: string | null;
  drawingExtractionId: string;
  standardItemId: string;
  matchReason?: string | null;
  confidence?: number | null;
  reviewStatus: ReviewStatus;
  sourceCandidateId?: string;
  sourceFileName?: string | null;
  sourcePage?: number | null;
  matchSource?: "sample" | "uploaded_pdf" | "manual";
  standardMatchStatus?: "pending" | "accepted" | "rejected";
  displayWorkCategory?: string;
  displayStandardItemName?: string;
  displayUnit?: string | null;
  quantityReviewRequired?: boolean;
}

export interface ManualStandardMatchOption {
  id: string;
  label: string;
  standardItemId: string;
  workCategory: string;
  standardItemName: string;
  unit: string;
  calculationBasis: string;
  confidence: number;
}

export interface UnitPriceRecord {
  id: string;
  code: string;
  itemName: string;
  specification: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  expenseCost: number;
  unitPrice: number;
  note?: string;
  source: "uploaded_architecture_unit_price";
}

export interface EstimateItemRecord {
  id: string;
  projectId?: string | null;
  drawingFileId: string;
  drawingPageId: string;
  standardItemId: string;
  workCategory: string;
  itemName: string;
  specification?: string | null;
  quantity: number;
  unit: string;
  calculationBasis?: string | null;
  sourceNote?: string | null;
  reviewStatus: ReviewStatus;
  standardItemName: string;
  drawingNo?: string | null;
  drawingTitle?: string | null;
  remark?: string | null;
  sourceCandidateId?: string;
  sourceFileName?: string | null;
  sourcePage?: number | null;
  quantityReviewRequired?: boolean;
  matchSource?: "sample" | "uploaded_pdf" | "manual";
  standardCode?: string | null;
}

export interface EstimateStatementItemRecord {
  id: string;
  sourceEstimateItemId: string;
  workCategory: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  quantityReviewRequired: boolean;
  unitPriceMatched: boolean;
  unitPriceCode?: string;
  unitPriceItemName?: string;
  unitPriceSpecification?: string;
  unitPriceUnit?: string;
  unitPriceMatchReason?: string;
  materialCost: number;
  laborCost: number;
  expenseCost: number;
  unitPrice: number;
  amount: number;
  amountReviewRequired: boolean;
  statementReviewStatus: StatementReviewStatus;
  reviewMessage: string;
  unitCheckRequired: boolean;
  matchReviewRequired: boolean;
  sourceDrawingNo?: string;
  sourceDrawingName?: string;
  remark?: string;
}

export interface EstimateStatementSummary {
  totalCount: number;
  matchedCount: number;
  amountReadyCount: number;
  reviewNeededCount: number;
  totalAmount: number;
  calculatedCount: number;
  quantityReviewRequiredCount: number;
  unitPriceMatchRequiredCount: number;
  unitCheckRequiredCount: number;
  matchReviewRequiredCount: number;
}

export interface ScheduleForecastItemRecord {
  id: string;
  projectId?: string | null;
  estimateItemId?: string | null;
  workCategory: string;
  taskName: string;
  plannedQuantity?: number | null;
  unit?: string | null;
  plannedOrder?: number | null;
  estimatedDurationDays?: number | null;
  dependencyNote?: string | null;
  status: ScheduleForecastStatus;
}

export interface EstimationSampleData {
  projectId: string;
  drawingFiles: DrawingFileRecord[];
  drawingPages: DrawingPageRecord[];
  extractionCandidates: DrawingExtractionCandidateRecord[];
  standardDocuments: StandardDocumentRecord[];
  standardItems: StandardItemRecord[];
  standardItemKeywords: StandardItemKeywordRecord[];
  estimateItemMatches: EstimateItemMatchRecord[];
  scheduleForecastItems: ScheduleForecastItemRecord[];
}

export interface EstimateExportRow {
  workCategory: string;
  itemName: string;
  specification: string;
  quantity: number | string;
  unit: string;
  calculationBasis: string;
  standardItemName: string;
  drawingNo: string;
  drawingTitle: string;
  reviewStatus: ReviewStatus;
  remark: string;
}

export interface ScheduleCategorySummary {
  workCategory: string;
  totalQuantity: number;
  itemCount: number;
  linkedCount: number;
}

export interface DrawingAnalysisService {
  queueDrawingUpload(file: File): Promise<DrawingFileRecord>;
  convertDrawingToImages(drawingFileId: string): Promise<void>;
  extractCandidates(drawingFileId: string): Promise<DrawingExtractionCandidateRecord[]>;
}

export interface StandardMatchService {
  suggestMatches(
    candidate: DrawingExtractionCandidateRecord,
    standardItems: StandardItemRecord[],
    keywords: StandardItemKeywordRecord[]
  ): Promise<EstimateItemMatchRecord[]>;
}

export interface EstimationRepository {
  listDashboardData(projectId?: string | null): Promise<EstimationSampleData>;
  updateCandidateStatus(candidateId: string, reviewStatus: ReviewStatus): Promise<void>;
  updateMatchStatus(matchId: string, reviewStatus: ReviewStatus): Promise<void>;
}
