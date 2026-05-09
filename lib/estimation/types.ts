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

export type RebarMemberType = "beam" | "column" | "footing" | "slab" | "unknown";

export type RebarPosition =
  | "top"
  | "bottom"
  | "main"
  | "stirrup"
  | "tie"
  | "x"
  | "y"
  | "unknown";

export type RebarReviewStatus = "pending" | "accepted" | "rejected";

export type DrawingDiscipline =
  | "architecture"
  | "structure"
  | "rebar_concrete"
  | "steel"
  | "finish"
  | "window_door"
  | "waterproof"
  | "civil_drainage"
  | "mechanical"
  | "electrical"
  | "unknown";

export type DrawingSheetType =
  | "drawing_list"
  | "architectural_plan"
  | "structural_plan"
  | "structural_schedule"
  | "section"
  | "elevation"
  | "detail"
  | "finish_schedule"
  | "window_door_schedule"
  | "legend"
  | "quantity_table"
  | "general_note"
  | "unknown";

export type QuantityReadinessStatus =
  | "direct_table_available"
  | "schedule_based_calculation"
  | "plan_link_required"
  | "image_geometry_required"
  | "review_required";

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
  matchSource?: "sample" | "uploaded_pdf" | "manual" | "rebar";
  standardCode?: string | null;
}

export interface RebarSpecRecord {
  id: string;
  sourcePage?: number;
  sourceFileName?: string;
  drawingNo?: string;
  memberName?: string;
  memberType: RebarMemberType;
  sectionWidthMm?: number;
  sectionDepthMm?: number;
  sectionHeightMm?: number;
  lengthMm?: number;
  heightMm?: number;
  footingWidthMm?: number;
  footingLengthMm?: number;
  footingDepthMm?: number;
  memberCount?: number;
  diameter?: string;
  barCount?: number;
  spacingMm?: number;
  position: RebarPosition;
  rawText: string;
  sourceTextSnippet?: string;
  confidence: number;
}

export interface RebarQuantityCandidateRecord {
  id: string;
  sourceRebarSpecId?: string;
  sourcePage?: number;
  sourceFileName?: string;
  drawingNo?: string;
  memberName?: string;
  memberType: RebarMemberType;
  position: RebarPosition;
  workCategory: string;
  itemName: string;
  specification: string;
  diameter: string;
  unitWeightKgPerM: number;
  barCount?: number;
  spacingMm?: number;
  memberLengthMm?: number;
  memberHeightMm?: number;
  sectionWidthMm?: number;
  sectionDepthMm?: number;
  footingWidthMm?: number;
  footingLengthMm?: number;
  memberCount: number;
  quantityKg: number;
  quantityTon: number;
  unit: "kg" | "ton";
  calculationFormula: string;
  calculationBasis: string;
  confidence: number;
  reviewStatus: RebarReviewStatus;
  quantityReviewRequired: boolean;
  note?: string;
  rawText?: string;
  sourceTextSnippet?: string;
}

export interface RebarQuantitySummary {
  totalCandidates: number;
  calculatedCandidates: number;
  reviewRequiredCandidates: number;
  acceptedCandidates: number;
  totalKg: number;
  totalTon: number;
}

export interface DrawingSheetIndexRecord {
  id: string;
  sourcePage: number;
  sourceFileName?: string;
  drawingNo?: string;
  drawingTitle?: string;
  discipline: DrawingDiscipline;
  sheetType: DrawingSheetType;
  floor?: string;
  scale?: string;
  detectedKeywords: string[];
  quantityReadinessStatus: QuantityReadinessStatus;
  quantityReadinessReason: string;
  relatedSheetIds: string[];
  confidence: number;
  sourceTextSnippet?: string;
}

export interface DrawingReferenceRecord {
  id: string;
  fromSheetId: string;
  toSheetId: string;
  relationType:
    | "plan_to_schedule"
    | "plan_to_legend"
    | "schedule_to_quantity"
    | "symbol_to_schedule"
    | "floor_related"
    | "same_discipline"
    | "unknown";
  reason: string;
  confidence: number;
}

export interface DrawingQuantityRoadmapRecord {
  id: string;
  discipline: DrawingDiscipline;
  workCategory: string;
  targetQuantity: string;
  requiredSheets: string[];
  availableSheets: string[];
  missingData: string[];
  nextAction: string;
  readiness: QuantityReadinessStatus;
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

export type ManualEstimateStatementStatus =
  | "calculated"
  | "unit_price_required"
  | "quantity_review_required";

export interface ManualEstimateStatementItemRecord {
  id: string;
  sourceEstimateItemId: string;
  workCategory: string;
  itemName: string;
  specification: string;
  quantity: number;
  unit: string;
  quantityReviewRequired: boolean;
  manualUnitPrice: number | null;
  amount: number | null;
  status: ManualEstimateStatementStatus;
  sourceDrawingNo?: string | null;
  sourceDrawingName?: string | null;
  calculationBasis?: string | null;
  remark?: string | null;
}

export interface ManualEstimateStatementSummary {
  totalCount: number;
  calculatedCount: number;
  unitPriceRequiredCount: number;
  quantityReviewRequiredCount: number;
  totalAmount: number;
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
