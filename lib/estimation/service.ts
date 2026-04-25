import type {
  DrawingExtractionCandidateRecord,
  DrawingFileRecord,
  EstimateItemRecord,
  EstimateItemMatchRecord,
  ScheduleCategorySummary,
  ScheduleForecastItemRecord,
  StandardItemKeywordRecord,
  StandardItemRecord
} from "@/lib/estimation/types";
import { rankStandardMatches } from "@/lib/estimation/standard-match";

export function createLocalDrawingUpload(file: File): DrawingFileRecord {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const fileType =
    extension === "dwg"
      ? "dwg"
      : extension === "png" || extension === "jpg" || extension === "jpeg"
        ? "png"
        : "pdf";

  return {
    id: `upload-${crypto.randomUUID()}`,
    fileName: file.name,
    fileType,
    status: "uploaded",
    pageCount: fileType === "png" ? 1 : 0,
    uploadedAt: new Date().toISOString()
  };
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

    items.push({
      id: `estimate-${candidate.id}-${standardItem.id}`,
      drawingFileId: candidate.drawingFileId,
      drawingPageId: candidate.drawingPageId,
      standardItemId: standardItem.id,
      workCategory: standardItem.workCategory,
      itemName: candidate.normalizedValue ?? standardItem.itemName,
      specification:
        candidate.extractedText === candidate.normalizedValue
          ? standardItem.description ?? standardItem.section ?? ""
          : candidate.extractedText,
      quantity: candidate.quantity ?? 0,
      unit: candidate.unit ?? standardItem.unit ?? "식",
      calculationBasis:
        candidate.sourceNote ??
        standardItem.measurementRule ??
        "도면 후보값을 기준으로 산출, 최종 검수 필요",
      sourceNote: match.matchReason ?? "",
      reviewStatus: candidate.reviewStatus,
      standardItemName: standardItem.itemName,
      drawingNo: candidate.drawingNo ?? "",
      drawingTitle: candidate.drawingTitle ?? "",
      remark:
        candidate.reviewStatus === "edited"
          ? "사용자 수정 후 승인"
          : "샘플 데이터 기반 승인"
    });

    return items;
  });
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
