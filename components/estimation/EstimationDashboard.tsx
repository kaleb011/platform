"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Database,
  FileSearch,
  Layers3,
  LoaderCircle,
  Sparkles,
  UserRound
} from "lucide-react";

import { DrawingExtractionTable } from "@/components/estimation/DrawingExtractionTable";
import { DrawingIntelligencePanel } from "@/components/estimation/DrawingIntelligencePanel";
import { DrawingUploadPanel } from "@/components/estimation/DrawingUploadPanel";
import { EstimateItemsTable } from "@/components/estimation/EstimateItemsTable";
import { EstimateStatementTable } from "@/components/estimation/EstimateStatementTable";
import { EstimationDataStrategyCard } from "@/components/estimation/EstimationDataStrategyCard";
import { IfcExpansionNotice } from "@/components/estimation/IfcExpansionNotice";
import { ManualEstimateStatementTable } from "@/components/estimation/ManualEstimateStatementTable";
import { ManualStandardMatchReview } from "@/components/estimation/ManualStandardMatchReview";
import { PdfTextExtractionSummary } from "@/components/estimation/PdfTextExtractionSummary";
import { RebarQuantityReview } from "@/components/estimation/RebarQuantityReview";
import { RebarStandardEstimatePanel } from "@/components/estimation/RebarStandardEstimatePanel";
import { ScheduleForecastDashboard } from "@/components/estimation/ScheduleForecastDashboard";
import { StandardMatchTable } from "@/components/estimation/StandardMatchTable";
import { UnitPriceUploadPanel } from "@/components/estimation/UnitPriceUploadPanel";
import { UploadedDrawingFilesTable } from "@/components/estimation/UploadedDrawingFilesTable";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  attachDrawingReferencesToSheets,
  buildDrawingReferences,
  buildQuantityRoadmap,
  extractDrawingSheetIndexesFromPdfResults
} from "@/lib/estimation/drawing-intelligence";
import {
  exportEstimateStatementToExcel,
  exportEstimateToCsv,
  exportEstimateToExcel,
  exportManualEstimateStatementToExcel,
  exportRebarQuantityCandidatesToExcel
} from "@/lib/estimation/export-estimate";
import {
  applyRebarCandidateReviewStatus,
  buildRebarQuantityCandidates,
  createEstimateItemsFromAcceptedRebarCandidates,
  extractRebarSpecsFromPdfResults,
  getRebarUnitWeight,
  recalculateRebarQuantityCandidate
} from "@/lib/estimation/rebar-quantity";
import {
  getDefaultReviewReason,
  resolveReviewCompleteness
} from "@/lib/estimation/rebar-evidence";
import {
  createEstimationSampleData,
  createSampleProjectEstimateStates
} from "@/lib/estimation/sample-data";
import {
  buildEstimateStatementItems,
  createCandidatesFromPdfText,
  createDrawingFileRecordFromFile,
  createManualStandardMatchOptions,
  createStandardMatchesFromApprovedCandidates,
  deriveEstimateItems,
  extractPdfTextFromFile,
  getApprovedEstimateCandidates,
  getDrawingFileType,
  isManualStandardMatchTarget,
  summarizeEstimateStatementItems
} from "@/lib/estimation/service";
import { buildScheduleForecastFromEstimateItems } from "@/lib/estimation/schedule-forecast";
import { parseArchitectureUnitPriceWorkbook } from "@/lib/estimation/unit-price-parser";
import type {
  DrawingFileRecord,
  EstimateItemRecord,
  EstimateItemMatchRecord,
  ManualEstimateStatementItemRecord,
  ManualEstimateStatementSummary,
  PdfTextExtractionResult,
  RebarMemberType,
  ProjectEstimateState,
  RebarQuantityCandidateRecord,
  RebarReviewStatus,
  ReviewStatus,
  UnitPriceRecord
} from "@/lib/estimation/types";

const summaryIcons = {
  uploaded: Layers3,
  extracted: LoaderCircle,
  indexed: FileSearch,
  rebar: BarChart3,
  candidates: FileSearch,
  approved: CheckCircle2,
  amountReady: Database,
  matchingNeeded: BarChart3
} as const;

type SummaryCardKey = keyof typeof summaryIcons;
type UnitPriceParseStatus = "idle" | "parsing" | "success" | "failed";

function parseManualUnitPrice(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildManualEstimateStatementItems(
  estimateItems: EstimateItemRecord[],
  unitPriceInputs: Record<string, string>
): ManualEstimateStatementItemRecord[] {
  return estimateItems.map((item) => {
    const manualUnitPrice = parseManualUnitPrice(unitPriceInputs[item.id]);
    const quantityReviewRequired = Boolean(item.quantityReviewRequired) || item.quantity <= 0;
    const status = quantityReviewRequired
      ? "quantity_review_required"
      : manualUnitPrice === null
        ? "unit_price_required"
        : "calculated";

    return {
      id: `manual-statement-${item.id}`,
      sourceEstimateItemId: item.id,
      workCategory: item.workCategory,
      itemName: item.itemName,
      specification: item.specification ?? "",
      quantity: item.quantity,
      unit: item.unit,
      quantityReviewRequired,
      manualUnitPrice,
      amount:
        !quantityReviewRequired && manualUnitPrice !== null
          ? item.quantity * manualUnitPrice
          : null,
      status,
      sourceDrawingNo: item.drawingNo,
      sourceDrawingName: item.drawingTitle,
      calculationBasis: item.calculationBasis,
      remark: item.remark ?? item.sourceNote ?? null
    };
  });
}

function summarizeManualEstimateStatementItems(
  items: ManualEstimateStatementItemRecord[]
): ManualEstimateStatementSummary {
  return items.reduce<ManualEstimateStatementSummary>(
    (summary, item) => {
      summary.totalCount += 1;

      if (item.status === "calculated") {
        summary.calculatedCount += 1;
        summary.totalAmount += item.amount ?? 0;
      } else if (item.status === "quantity_review_required") {
        summary.quantityReviewRequiredCount += 1;
      } else {
        summary.unitPriceRequiredCount += 1;
      }

      return summary;
    },
    {
      totalCount: 0,
      calculatedCount: 0,
      unitPriceRequiredCount: 0,
      quantityReviewRequiredCount: 0,
      totalAmount: 0
    }
  );
}

export function EstimationDashboard() {
  const seed = useMemo(() => createEstimationSampleData(), []);
  const [projectStates, setProjectStates] = useState<ProjectEstimateState[]>(() =>
    createSampleProjectEstimateStates(seed)
  );
  const [selectedProjectId, setSelectedProjectId] = useState(seed.projectId);
  const [candidates, setCandidates] = useState(() => seed.extractionCandidates);
  const [matches, setMatches] = useState(() => seed.estimateItemMatches);
  const [pdfTextResults, setPdfTextResults] = useState<PdfTextExtractionResult[]>([]);
  const [rebarCandidates, setRebarCandidates] = useState<RebarQuantityCandidateRecord[]>([]);
  const [unitPrices, setUnitPrices] = useState<UnitPriceRecord[]>([]);
  const [unitPriceFileName, setUnitPriceFileName] = useState<string | null>(null);
  const [unitPriceParseStatus, setUnitPriceParseStatus] =
    useState<UnitPriceParseStatus>("idle");
  const [unitPriceErrorMessage, setUnitPriceErrorMessage] = useState<string | null>(null);
  const [manualUnitPriceInputs, setManualUnitPriceInputs] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(
    "샘플 도면/적산 데이터가 있는 프로젝트와 도면 데이터가 없는 프로젝트 흐름을 함께 확인할 수 있습니다."
  );

  const selectedProject = projectStates.find((project) => project.projectId === selectedProjectId);
  const activeProject = selectedProject ?? projectStates[0];
  const drawingFiles = activeProject.drawingFiles;
  const activeDrawingFileIds = new Set(drawingFiles.map((file) => file.id));
  const activePdfTextResults = pdfTextResults.filter((result) =>
    result.pages.some((page) => activeDrawingFileIds.has(page.drawingFileId))
  );
  const drawingDataExists =
    activeProject.drawingDataStatus === "exists" || activeProject.drawingFiles.length > 0;
  const visibleCandidates = candidates.filter((candidate) => {
    if (candidate.sourceLabel === "uploaded_pdf") {
      return activeDrawingFileIds.has(candidate.drawingFileId);
    }

    return activeProject.projectId === seed.projectId;
  });
  const approvedEstimateCandidates = useMemo(
    () => getApprovedEstimateCandidates(visibleCandidates),
    [visibleCandidates]
  );
  const approvedEstimateCandidateIds = useMemo(
    () => new Set(approvedEstimateCandidates.map((candidate) => candidate.id)),
    [approvedEstimateCandidates]
  );
  const uploadedPdfCandidateMatches = useMemo(
    () => createStandardMatchesFromApprovedCandidates(approvedEstimateCandidates, seed.standardItems),
    [approvedEstimateCandidates, seed.standardItems]
  );
  const displayedMatches = useMemo(() => {
    const visibleStoredMatches = matches.filter(
      (match) =>
        match.matchSource !== "uploaded_pdf" ||
        approvedEstimateCandidateIds.has(match.drawingExtractionId)
    );
    const storedMatchIds = new Set(visibleStoredMatches.map((match) => match.id));

    return [
      ...visibleStoredMatches,
      ...uploadedPdfCandidateMatches.filter((match) => !storedMatchIds.has(match.id))
    ];
  }, [approvedEstimateCandidateIds, matches, uploadedPdfCandidateMatches]);
  const manualMatchOptions = useMemo(
    () => createManualStandardMatchOptions(seed.standardItems),
    [seed.standardItems]
  );
  const manualReviewMatches = useMemo(
    () => displayedMatches.filter((match) => isManualStandardMatchTarget(match)),
    [displayedMatches]
  );
  const automaticReviewMatches = useMemo(
    () => displayedMatches.filter((match) => !isManualStandardMatchTarget(match)),
    [displayedMatches]
  );
  const activePdfFileNames = useMemo(
    () => new Set(activePdfTextResults.map((result) => result.fileName)),
    [activePdfTextResults]
  );
  const activeRebarCandidates = useMemo(
    () =>
      rebarCandidates.filter((candidate) =>
        candidate.sourceFileName ? activePdfFileNames.has(candidate.sourceFileName) : true
      ),
    [activePdfFileNames, rebarCandidates]
  );
  const rawDrawingSheetIndexes = useMemo(
    () => extractDrawingSheetIndexesFromPdfResults(activePdfTextResults),
    [activePdfTextResults]
  );
  const drawingReferences = useMemo(
    () => buildDrawingReferences(rawDrawingSheetIndexes),
    [rawDrawingSheetIndexes]
  );
  const drawingSheetIndexes = useMemo(
    () => attachDrawingReferencesToSheets(rawDrawingSheetIndexes, drawingReferences),
    [drawingReferences, rawDrawingSheetIndexes]
  );
  const quantityRoadmaps = useMemo(
    () => buildQuantityRoadmap(drawingSheetIndexes),
    [drawingSheetIndexes]
  );
  const standardEstimateItems = useMemo<EstimateItemRecord[]>(
    () =>
      deriveEstimateItems({
        candidates: visibleCandidates,
        matches: displayedMatches,
        standardItems: seed.standardItems
      }),
    [displayedMatches, seed.standardItems, visibleCandidates]
  );
  const approvedRebarEstimateItems = useMemo(
    () => createEstimateItemsFromAcceptedRebarCandidates(activeRebarCandidates),
    [activeRebarCandidates]
  );
  const estimateItems = useMemo<EstimateItemRecord[]>(
    () => [...standardEstimateItems, ...approvedRebarEstimateItems],
    [approvedRebarEstimateItems, standardEstimateItems]
  );
  const manualEstimateStatementItems = useMemo(
    () => buildManualEstimateStatementItems(estimateItems, manualUnitPriceInputs),
    [estimateItems, manualUnitPriceInputs]
  );
  const manualEstimateStatementSummary = useMemo(
    () => summarizeManualEstimateStatementItems(manualEstimateStatementItems),
    [manualEstimateStatementItems]
  );
  const estimateStatementItems = useMemo(
    () => buildEstimateStatementItems(estimateItems, unitPrices),
    [estimateItems, unitPrices]
  );
  const estimateStatementSummary = useMemo(
    () => summarizeEstimateStatementItems(estimateStatementItems),
    [estimateStatementItems]
  );
  const uploadedPdfPendingMatchCount = displayedMatches.filter(
    (match) =>
      match.matchSource === "uploaded_pdf" &&
      approvedEstimateCandidateIds.has(match.drawingExtractionId) &&
      match.reviewStatus !== "accepted" &&
      match.reviewStatus !== "edited" &&
      match.reviewStatus !== "rejected"
  ).length;
  const uploadedPdfAcceptedMatchCount = displayedMatches.filter(
    (match) =>
      match.matchSource === "uploaded_pdf" &&
      approvedEstimateCandidateIds.has(match.drawingExtractionId) &&
      (match.reviewStatus === "accepted" || match.reviewStatus === "edited")
  ).length;
  const reflectedUploadedPdfEstimateCount = estimateItems.filter(
    (item) => item.matchSource === "uploaded_pdf"
  ).length;
  const scheduleForecast = useMemo(
    () => buildScheduleForecastFromEstimateItems(manualEstimateStatementItems),
    [manualEstimateStatementItems]
  );

  const extractedSuccessPageCount = activePdfTextResults.reduce(
    (count, result) =>
      count +
      result.pages.filter((page) => page.extractionStatus === "success").length,
    0
  );

  const summaryCards: Array<{
    key: SummaryCardKey;
    label: string;
    value: string;
    footnote: string;
    tone: "blue" | "green" | "amber";
  }> = [
    {
      key: "uploaded",
      label: "업로드 도면 수",
      value: `${drawingFiles.length}`,
      footnote: "프로젝트에 연결된 PDF/PNG/JPG 도면 수",
      tone: "blue"
    },
    {
      key: "extracted",
      label: "추출 성공 페이지",
      value: `${extractedSuccessPageCount}`,
      footnote: "PDF 텍스트를 읽어 도면 데이터로 활용 가능한 페이지",
      tone: "green"
    },
    {
      key: "indexed",
      label: "도면 인덱스 수",
      value: `${drawingSheetIndexes.length}`,
      footnote: "도면번호, 공종, 층, 도면종류가 분류된 페이지",
      tone: "blue"
    },
    {
      key: "rebar",
      label: "철근 수량 후보",
      value: `${activeRebarCandidates.length}`,
      footnote: "구조일람표 기반 산출 후보와 검토 대상",
      tone: "amber"
    },
    {
      key: "approved",
      label: "승인 물량내역",
      value: `${estimateItems.length}`,
      footnote: "승인 또는 수정 승인된 항목만 반영",
      tone: "green"
    },
    {
      key: "amountReady",
      label: "금액 산출 후보",
      value: `${manualEstimateStatementSummary.calculatedCount}`,
      footnote: "수량과 사용자가 입력한 공사단가로 검토 후 금액 산출 가능한 항목",
      tone: "green"
    }
  ];

  const updateRelatedMatches = (candidateId: string, reviewStatus: ReviewStatus) => {
    const relatedMatches = matches
      .filter((match) => match.drawingExtractionId === candidateId)
      .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));

    if (relatedMatches.length === 0) {
      return;
    }

    const primaryMatchId = relatedMatches[0].id;

    setMatches((current) =>
      current.map((match) => {
        if (match.drawingExtractionId !== candidateId) {
          return match;
        }

        if (reviewStatus === "accepted" || reviewStatus === "edited") {
          return {
            ...match,
            reviewStatus: match.id === primaryMatchId ? "accepted" : "rejected"
          };
        }

        return {
          ...match,
          reviewStatus
        };
      })
    );
  };

  const handleCandidateStatusChange = (candidateId: string, reviewStatus: ReviewStatus) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, reviewStatus } : candidate
      )
    );
    updateRelatedMatches(candidateId, reviewStatus);
    setNotice(
      "검토 상태가 반영되었습니다. 승인된 적산 후보는 아래 표준품셈 후보 매칭 영역에서 검토할 수 있습니다."
    );
  };

  const handleMatchStatusChange = (matchId: string, reviewStatus: ReviewStatus) => {
    const match = displayedMatches.find((item) => item.id === matchId);

    if (!match) {
      return;
    }

    setMatches((current) => {
      const baseMatches = current.some((item) => item.id === matchId) ? current : [...current, match];

      return baseMatches.map((item) => {
        if (item.drawingExtractionId !== match.drawingExtractionId) {
          return item;
        }

        if (reviewStatus === "accepted" || reviewStatus === "edited") {
          return {
            ...item,
            reviewStatus: item.id === matchId ? "accepted" : "rejected",
            standardMatchStatus: item.id === matchId ? "accepted" : "rejected"
          };
        }

        return item.id === matchId
          ? {
              ...item,
              reviewStatus,
              standardMatchStatus:
                reviewStatus === "rejected"
                  ? "rejected"
                  : reviewStatus === "pending" || reviewStatus === "needs_standard_match"
                    ? "pending"
                    : item.standardMatchStatus
            }
          : item;
      });
    });

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === match.drawingExtractionId
          ? {
              ...candidate,
              reviewStatus
            }
          : candidate
      )
    );

    setNotice("표준품셈 검토 결과를 반영했습니다. 필요하면 품셈 매칭 필요 상태로 다시 돌릴 수 있습니다.");
  };

  const handleManualMatchApprove = (matchId: string, optionId: string) => {
    const match = displayedMatches.find((item) => item.id === matchId);
    const option = manualMatchOptions.find((item) => item.id === optionId);

    if (!match || !option) {
      return;
    }

    const approvedManualMatch: EstimateItemMatchRecord = {
      ...match,
      standardItemId: option.standardItemId,
      matchReason: option.calculationBasis,
      confidence: option.confidence,
      reviewStatus: "accepted",
      standardMatchStatus: "accepted",
      matchSource: "manual",
      displayWorkCategory: option.workCategory,
      displayStandardItemName: option.standardItemName,
      displayUnit: option.unit,
      quantityReviewRequired: match.quantityReviewRequired
    };

    setMatches((current) => {
      const baseMatches = current.some((item) => item.id === matchId)
        ? current
        : [...current, match];

      return baseMatches.map((item) => {
        if (item.drawingExtractionId !== match.drawingExtractionId) {
          return item;
        }

        if (item.id === matchId) {
          return approvedManualMatch;
        }

        return {
          ...item,
          reviewStatus: "rejected",
          standardMatchStatus: "rejected"
        };
      });
    });

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === match.drawingExtractionId
          ? {
              ...candidate,
              reviewStatus: "accepted"
            }
          : candidate
      )
    );

    setNotice(
      "수동 품셈 매칭을 승인했습니다. 승인된 적산내역과 CSV/Excel 내보내기에 manual_match로 반영됩니다."
    );
  };

  const handleManualMatchReviewStatusChange = (
    matchId: string,
    reviewStatus: ReviewStatus
  ) => {
    const match = displayedMatches.find((item) => item.id === matchId);

    if (!match) {
      return;
    }

    setMatches((current) => {
      const baseMatches = current.some((item) => item.id === matchId)
        ? current
        : [...current, match];

      return baseMatches.map((item) =>
        item.id === matchId
          ? {
              ...item,
              reviewStatus,
              standardMatchStatus:
                reviewStatus === "rejected"
                  ? "rejected"
                  : reviewStatus === "accepted" || reviewStatus === "edited"
                    ? "accepted"
                    : "pending"
            }
          : item
      );
    });

    setNotice("수동 품셈 매칭 검토 상태를 변경했습니다. 후보 승인 상태는 유지됩니다.");
  };

  const handleManualUnitPriceChange = (estimateItemId: string, value: string) => {
    setManualUnitPriceInputs((current) => ({
      ...current,
      [estimateItemId]: value
    }));
  };

  const handleRebarCandidateChange = (
    candidateId: string,
    updates: Partial<RebarQuantityCandidateRecord>
  ) => {
    setRebarCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? recalculateRebarQuantityCandidate({ ...candidate, ...updates })
          : candidate
      )
    );
    setNotice("철근 수량 산출 후보 값을 보정했습니다. 수정된 값으로 수량을 다시 계산했습니다.");
  };

  const handleAddRebarCandidate = (memberType: Exclude<RebarMemberType, "unknown">) => {
    const id = `manual-rebar-${memberType}-${Date.now().toString(36)}`;
    const diameter = "D16";
    const unitWeightKgPerM = getRebarUnitWeight(diameter) ?? 1.56;
    const baseCandidate: RebarQuantityCandidateRecord = {
      id,
      memberName: `직접추가-${memberType}`,
      memberType,
      position:
        memberType === "footing"
          ? "x"
          : memberType === "column"
            ? "main"
            : memberType === "beam"
              ? "main"
              : memberType === "slab"
                ? "x_bottom"
                : "vertical",
      workCategory: "철근콘크리트공사",
      itemName: "철근 가공 및 조립",
      specification: `${diameter} / 직접 추가`,
      diameter,
      unitWeightKgPerM,
      barCount: memberType === "column" ? 8 : memberType === "beam" ? 4 : undefined,
      spacingMm: ["footing", "slab", "wall"].includes(memberType) ? 200 : undefined,
      memberLengthMm:
        memberType === "beam"
          ? 6000
          : memberType === "slab"
            ? 6300
            : memberType === "wall"
              ? 3900
              : undefined,
      memberHeightMm: memberType === "column" ? 3000 : memberType === "wall" ? 4100 : undefined,
      sectionWidthMm:
        memberType === "beam"
          ? 300
          : memberType === "column"
            ? 500
            : memberType === "slab"
              ? 3900
              : undefined,
      sectionDepthMm:
        memberType === "beam"
          ? 600
          : memberType === "column"
            ? 500
            : memberType === "slab"
              ? 300
              : memberType === "wall"
                ? 400
                : undefined,
      footingWidthMm: memberType === "footing" ? 3000 : undefined,
      footingLengthMm: memberType === "footing" ? 3000 : undefined,
      slabLengthMm: memberType === "slab" ? 6300 : undefined,
      slabWidthMm: memberType === "slab" ? 3900 : undefined,
      slabThicknessMm: memberType === "slab" ? 300 : undefined,
      wallLengthMm: memberType === "wall" ? 3900 : undefined,
      wallHeightMm: memberType === "wall" ? 4100 : undefined,
      wallThicknessMm: memberType === "wall" ? 400 : undefined,
      coverMm: memberType === "slab" ? 30 : 40,
      anchorageLengthMm: 0,
      spliceLengthMm: 0,
      hookLengthMm: 0,
      bendCorrectionMm: 0,
      lossRate: 0.03,
      faceCount: memberType === "wall" ? 2 : 1,
      barCountRule: "floor_plus_one",
      manualBarCount: memberType === "column" ? 8 : memberType === "beam" ? 4 : undefined,
      footingLayer: "top",
      memberCount: 1,
      quantityKg: 0,
      quantityTon: 0,
      materialQuantityKg: 0,
      materialQuantityTon: 0,
      unit: "kg",
      calculationFormula: "실무식 산출값 입력 대기",
      calculationBasis: "직접 추가한 철근 부재입니다.",
      confidence: 1,
      reviewStatus: "pending",
      quantityReviewRequired: true,
      note: "직접 추가"
    };

    const nextCandidate = recalculateRebarQuantityCandidate(baseCandidate);

    setRebarCandidates((current) => [nextCandidate, ...current]);
    setNotice("직접 철근 부재를 추가했습니다. 부재 치수와 보정값을 확인한 뒤 승인하세요.");

    return id;
  };

  const handleRemoveRebarCandidate = (candidateId: string) => {
    setRebarCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
    setNotice("선택한 철근 후보를 제거했습니다. 제거된 후보는 승인 물량과 품셈 산출에 반영되지 않습니다.");
  };

  const handleRebarCandidateStatusChange = (
    candidateId: string,
    reviewStatus: RebarReviewStatus
  ) => {
    setRebarCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? applyRebarCandidateReviewStatus(
              {
                ...candidate,
                approvedReason: candidate.approvedReason ?? getDefaultReviewReason(reviewStatus),
                reviewerComment: candidate.reviewerComment ?? candidate.reviewNote,
                reviewCompleteness: resolveReviewCompleteness(candidate)
              },
              reviewStatus
            )
          : candidate
      )
    );
    setNotice(
      reviewStatus === "accepted"
        ? "철근 수량 산출 후보를 최신 보정값으로 재계산한 뒤 승인했습니다. 계산 가능한 수량은 승인된 물량내역과 품셈 산출에 반영됩니다."
        : "철근 수량 산출 후보 검토 상태를 변경했습니다."
    );
  };

  const addDrawingFileToActiveProject = (record: DrawingFileRecord) => {
    setProjectStates((current) =>
      current.map((project) =>
        project.projectId === activeProject.projectId
          ? {
              ...project,
              drawingDataStatus: "exists",
              drawingFiles: [{ ...record, projectId: project.projectId }, ...project.drawingFiles]
            }
          : project
      )
    );
  };

  const updateDrawingFileInActiveProject = (
    fileId: string,
    updates: Partial<DrawingFileRecord>
  ) => {
    setProjectStates((current) =>
      current.map((project) =>
        project.projectId === activeProject.projectId
          ? {
              ...project,
              drawingFiles: project.drawingFiles.map((file) =>
                file.id === fileId ? { ...file, ...updates } : file
              )
            }
          : project
      )
    );
  };

  const handleDrawingUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const acceptedRecords: DrawingFileRecord[] = [];
    const messages: string[] = [];

    for (const file of Array.from(files)) {
      const fileType = getDrawingFileType(file);

      if (fileType === "dwg") {
        messages.push(
          "DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한 뒤 업로드해주세요."
        );
        continue;
      }

      if (fileType === "unsupported") {
        messages.push(`${file.name}: 지원하지 않는 파일 형식입니다. PDF, PNG, JPG 도면을 업로드해주세요.`);
        continue;
      }

      const record = createDrawingFileRecordFromFile(file);
      acceptedRecords.push(record);
      addDrawingFileToActiveProject(record);

      if (fileType !== "pdf") {
        continue;
      }

      setNotice(`${file.name} PDF 텍스트를 추출하는 중입니다.`);

      try {
        const result = await extractPdfTextFromFile(file);
        const resultPages =
          result.pages.length > 0
            ? result.pages
            : [
                {
                  id: `${record.id}-text-page-failed`,
                  drawingFileId: record.id,
                  pageNumber: 1,
                  text: "",
                  textLength: 0,
                  extractionStatus: "failed" as const
                }
              ];
        const linkedResult: PdfTextExtractionResult = {
          ...result,
          pages: resultPages.map((page) => ({
            ...page,
            id: `${record.id}-text-page-${page.pageNumber}`,
            drawingFileId: record.id
          }))
        };
        const pdfCandidates = createCandidatesFromPdfText(linkedResult, record.id);
        const rebarSpecs = extractRebarSpecsFromPdfResults([linkedResult]);
        const nextRebarCandidates = buildRebarQuantityCandidates(rebarSpecs);

        setPdfTextResults((current) => [
          linkedResult,
          ...current.filter((item) => item.pages[0]?.drawingFileId !== record.id)
        ]);
        setCandidates((current) => [
          ...pdfCandidates,
          ...current.filter((candidate) => candidate.drawingFileId !== record.id)
        ]);
        setRebarCandidates((current) => [
          ...nextRebarCandidates,
          ...current.filter((candidate) => candidate.sourceFileName !== linkedResult.fileName)
        ]);
        updateDrawingFileInActiveProject(record.id, {
          pageCount: linkedResult.pageCount,
          conversionStatus:
            linkedResult.status === "failed" ? "텍스트 추출 실패" : "텍스트 추출 완료",
          message: linkedResult.message,
          debugMessage: linkedResult.debugMessage
        });

        if (linkedResult.pageCount <= 0) {
          messages.push(
            `${file.name}: PDF 로딩에 실패해 페이지 수를 확인하지 못했습니다. ${linkedResult.debugMessage ?? ""}`
          );
        } else if (linkedResult.status === "failed") {
          messages.push(
            `${file.name}: ${linkedResult.pageCount}페이지를 확인했지만 텍스트 추출에 실패했습니다. 이미지 기반 분석이 필요합니다.`
          );
        } else {
          messages.push(
            `${file.name}: ${linkedResult.pageCount}페이지를 확인했고 PDF 텍스트 후보 ${pdfCandidates.length}건, 철근 수량 산출 후보 ${nextRebarCandidates.length}건을 생성했습니다.`
          );
        }
      } catch {
        updateDrawingFileInActiveProject(record.id, {
          conversionStatus: "텍스트 추출 실패",
          message: "PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다."
        });
        messages.push(
          `${file.name}: PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다.`
        );
      }
    }

    if (acceptedRecords.length > 0) {
      const lastMessage = acceptedRecords[acceptedRecords.length - 1].message;
      messages.unshift(lastMessage ?? "도면 파일이 업로드 목록에 추가되었습니다.");
    }

    setNotice(messages.join(" "));
  };

  const handleUnitPriceUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setUnitPriceFileName(file.name);
    setUnitPriceParseStatus("parsing");
    setUnitPriceErrorMessage(null);

    try {
      const records = await parseArchitectureUnitPriceWorkbook(file);
      setUnitPrices(records);
      setUnitPriceParseStatus("success");
      setNotice(
        `${file.name} 일위대가 ${records.length}건을 참고용 단가자료로 읽었습니다. 최종 금액은 수기 입력 공사단가를 우선 사용합니다.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "일위대가 Excel 파싱에 실패했습니다.";
      setUnitPrices([]);
      setUnitPriceParseStatus("failed");
      setUnitPriceErrorMessage(message);
      setNotice(message);
    }
  };

  const handleProjectChange = (projectId: string) => {
    const nextProject = projectStates.find((project) => project.projectId === projectId);

    setSelectedProjectId(projectId);
    setNotice(
      nextProject?.drawingDataStatus === "exists"
        ? "저장된 도면/적산 데이터가 있습니다. 도면 추출 후보와 적산내역을 확인할 수 있습니다."
        : "이 프로젝트에는 아직 도면 데이터가 없습니다. PDF 도면을 업로드하면 적산내역 초안 생성 흐름을 시작할 수 있습니다."
    );
  };

  const projectFlowMessage = drawingDataExists
    ? "저장된 도면/적산 데이터가 있습니다. 도면 추출 후보와 적산내역을 확인할 수 있습니다."
    : "이 프로젝트에는 아직 도면 데이터가 없습니다. PDF 도면을 업로드하면 적산내역 초안 생성 흐름을 시작할 수 있습니다.";

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <header className="mb-6 rounded-[20px] border border-border bg-white px-4 py-4 shadow-sm lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate">
              Business Site Console
            </p>
            <h1 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-foreground">
              현장 관리 플랫폼
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
              프로젝트
              <select
                className="h-10 min-w-[220px] rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
                onChange={(event) => handleProjectChange(event.target.value)}
                value={activeProject.projectId}
              >
                {projectStates.map((project) => (
                  <option key={project.projectId} value={project.projectId}>
                    {project.projectName}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={drawingDataExists ? "green" : "amber"}>
                {drawingDataExists ? "DB 연결 준비됨" : "도면 업로드 필요"}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-slate">
                <UserRound className="h-3.5 w-3.5" />
                {activeProject.projectName}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-[#f8fafc] px-3 py-2 text-[12px] font-semibold text-slate">
                <Bell className="h-3.5 w-3.5" />
                상태 알림 2
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-[22px] border border-border bg-white px-5 py-5 shadow-sm lg:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[12px] font-semibold text-primary">도면 기반 적산 보조</p>
            <h2 className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-foreground">
              적산내역 보조
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate">
              도면 기반 수량산출과 견적서 기반 예상공정 초안을 확인합니다.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 rounded-[14px] border border-border bg-[#f8fafc] px-4 py-3 text-[13px] leading-5 text-slate">
          <span className="font-semibold text-foreground">도면 업로드 및 분석 상태: </span>
          {projectFlowMessage}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = summaryIcons[card.key];

          return (
            <Card key={card.key} className="bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#eef6f1] text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone={card.tone}>{card.value}</Badge>
              </div>
              <p className="mt-4 text-[12px] font-semibold text-foreground">{card.label}</p>
              <p className="mt-2 text-[11px] leading-4 text-slate">{card.footnote}</p>
            </Card>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <aside className="space-y-5 lg:col-span-4">
          <DrawingUploadPanel
            drawingDataExists={drawingDataExists}
            notice={notice}
            onSelectFiles={handleDrawingUpload}
          />
          <UploadedDrawingFilesTable drawingFiles={drawingFiles} />
          <PdfTextExtractionSummary results={activePdfTextResults} />
          <DrawingIntelligencePanel
            references={drawingReferences}
            roadmaps={quantityRoadmaps}
            sheets={drawingSheetIndexes}
          />
        </aside>

        <main className="space-y-5 lg:col-span-8">
              {drawingDataExists ? (
                <>
                  <RebarQuantityReview
                    candidates={activeRebarCandidates}
                    drawingSheets={drawingSheetIndexes}
                    onAddCandidate={handleAddRebarCandidate}
                    onChangeCandidate={handleRebarCandidateChange}
                    onChangeStatus={handleRebarCandidateStatusChange}
                    onExportExcel={() => exportRebarQuantityCandidatesToExcel(activeRebarCandidates)}
                    onRemoveCandidate={handleRemoveRebarCandidate}
                  />
                  <RebarStandardEstimatePanel approvedRebarItems={approvedRebarEstimateItems} />
                  <DrawingExtractionTable
                    candidates={visibleCandidates}
                    onChangeStatus={handleCandidateStatusChange}
                  />
                  <Card className="bg-white shadow-sm">
                    <SectionHeading
                      title="승인 후보 연결 상태"
                      description="승인된 적산 후보는 표준품셈 후보 매칭 영역에서 한 번 더 검토한 뒤 승인된 적산내역에 반영됩니다."
                    />
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className="rounded-[14px] border border-border bg-[#f8fafc] px-3 py-3">
                        <p className="text-[11px] font-medium text-slate">승인된 적산 후보</p>
                        <p className="mt-1 text-[18px] font-bold text-foreground">
                          {approvedEstimateCandidates.length}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-border bg-[#f8fafc] px-3 py-3">
                        <p className="text-[11px] font-medium text-slate">표준품셈 매칭 대기</p>
                        <p className="mt-1 text-[18px] font-bold text-foreground">
                          {uploadedPdfPendingMatchCount}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-border bg-[#f8fafc] px-3 py-3">
                        <p className="text-[11px] font-medium text-slate">표준품셈 매칭 승인</p>
                        <p className="mt-1 text-[18px] font-bold text-foreground">
                          {uploadedPdfAcceptedMatchCount}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-border bg-[#f8fafc] px-3 py-3">
                        <p className="text-[11px] font-medium text-slate">적산내역 반영</p>
                        <p className="mt-1 text-[18px] font-bold text-foreground">
                          {reflectedUploadedPdfEstimateCount}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <StandardMatchTable
                    candidates={visibleCandidates}
                    matches={automaticReviewMatches}
                    onChangeStatus={handleMatchStatusChange}
                    standardItems={seed.standardItems}
                  />
                  <ManualStandardMatchReview
                    candidates={visibleCandidates}
                    matches={manualReviewMatches}
                    onApproveManualMatch={handleManualMatchApprove}
                    onChangeStatus={handleManualMatchReviewStatusChange}
                    options={manualMatchOptions}
                  />
                  <EstimateItemsTable
                    items={estimateItems}
                    onExportCsv={() => exportEstimateToCsv(estimateItems)}
                    onExportExcel={() => exportEstimateToExcel(estimateItems)}
                  />
                  <ManualEstimateStatementTable
                    items={manualEstimateStatementItems}
                    onChangeUnitPrice={handleManualUnitPriceChange}
                    onExportExcel={() =>
                      exportManualEstimateStatementToExcel(manualEstimateStatementItems)
                    }
                    summary={manualEstimateStatementSummary}
                    unitPriceInputs={manualUnitPriceInputs}
                  />
                  <ScheduleForecastDashboard
                    items={scheduleForecast.items}
                    summary={scheduleForecast.summary}
                  />
                  <details className="rounded-[20px] border border-border bg-white px-4 py-4 shadow-sm">
                    <summary className="cursor-pointer text-[14px] font-bold text-foreground">
                      참고용 일위대가 자료
                    </summary>
                    <p className="mt-2 text-[12px] leading-5 text-slate">
                      표준일위대가 Excel 파서는 보존하지만, 메인 적산내역서 금액 계산은 사용자가
                      직접 입력한 공사단가를 우선 사용합니다.
                    </p>
                    <div className="mt-4">
                      <UnitPriceUploadPanel
                        errorMessage={unitPriceErrorMessage}
                        fileName={unitPriceFileName}
                        itemCount={unitPrices.length}
                        onSelectFile={handleUnitPriceUpload}
                        parseStatus={unitPriceParseStatus}
                      />
                    </div>
                    {unitPrices.length > 0 ? (
                      <div className="mt-4">
                        <EstimateStatementTable
                          items={estimateStatementItems}
                          onExportExcel={() => exportEstimateStatementToExcel(estimateStatementItems)}
                          summary={estimateStatementSummary}
                        />
                      </div>
                    ) : null}
                  </details>
                </>
              ) : (
                <Card className="bg-white shadow-sm">
                  <SectionHeading
                    title="도면 업로드 대기"
                    description="PDF 도면을 업로드하면 도면 인덱스, 후보 검수, 표준품셈 매칭, 공사단가 입력 흐름이 이 영역에 표시됩니다."
                  />
                  <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-6 text-[13px] leading-6 text-slate">
                    이 프로젝트에는 아직 도면 데이터가 없습니다. 왼쪽 업로드 패널에서 PDF 도면을
                    선택해 적산내역 초안 생성 흐름을 시작하세요.
                  </div>
                </Card>
              )}
              {!drawingDataExists ? (
                <ScheduleForecastDashboard
                  items={scheduleForecast.items}
                  summary={scheduleForecast.summary}
                />
              ) : null}
        </main>
      </div>

      <details className="mt-5 rounded-[20px] border border-border bg-white px-4 py-4 shadow-sm">
        <summary className="cursor-pointer text-[14px] font-bold text-foreground">
          참고용 기능
        </summary>
        <section className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <EstimationDataStrategyCard />
          <IfcExpansionNotice />
        </section>
      </details>
    </div>
  );
}
