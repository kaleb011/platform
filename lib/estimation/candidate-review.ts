import type {
  DrawingExtractionCandidateRecord,
  ExtractionCandidateFilter,
  ExtractionCandidateGroup
} from "@/lib/estimation/types";

const metadataTypes = new Set(["drawing_no", "drawing_title", "scale", "floor", "symbol"]);
const estimateTypes = new Set([
  "material",
  "work_item",
  "dimension",
  "quantity",
  "unit",
  "wall",
  "door",
  "window",
  "slab",
  "beam",
  "column",
  "finish"
]);

export function getCandidateGroup(
  candidate: DrawingExtractionCandidateRecord
): ExtractionCandidateGroup {
  if (candidate.candidateGroup) {
    return candidate.candidateGroup;
  }

  if (metadataTypes.has(candidate.extractedType)) {
    return "drawing_metadata";
  }

  if (estimateTypes.has(candidate.extractedType)) {
    return "estimate_candidate";
  }

  return "estimate_candidate";
}

export function getCandidateDisplayTitle(candidate: DrawingExtractionCandidateRecord): string {
  if (candidate.normalizedValue) {
    return candidate.normalizedValue;
  }

  if (candidate.extractedText) {
    return candidate.extractedText;
  }

  return candidate.drawingTitle ?? candidate.drawingNo ?? "후보";
}

function shouldHideByDefault(candidate: DrawingExtractionCandidateRecord): boolean {
  if (
    candidate.extractedType === "scale" &&
    (candidate.normalizedValue?.toUpperCase() === "NONE" ||
      candidate.extractedText.toUpperCase() === "NONE")
  ) {
    return true;
  }

  if (
    candidate.extractedType === "material" &&
    (candidate.normalizedValue ?? candidate.extractedText).trim().length <= 2
  ) {
    return true;
  }

  return false;
}

export function filterExtractionCandidates(
  candidates: DrawingExtractionCandidateRecord[],
  filter: ExtractionCandidateFilter
): DrawingExtractionCandidateRecord[] {
  return candidates.filter((candidate) => {
    if (filter === "scale") {
      return candidate.extractedType === "scale";
    }

    if (filter === "all" && shouldHideByDefault(candidate)) {
      return false;
    }

    if (filter === "all") {
      return true;
    }

    if (filter === "drawing_metadata" || filter === "estimate_candidate") {
      return getCandidateGroup(candidate) === filter && !shouldHideByDefault(candidate);
    }

    if (filter === "uploaded_pdf" || filter === "sample") {
      return (candidate.sourceLabel ?? "sample") === filter && !shouldHideByDefault(candidate);
    }

    if (filter === "accepted") {
      return (
        (candidate.reviewStatus === "accepted" || candidate.reviewStatus === "edited") &&
        !shouldHideByDefault(candidate)
      );
    }

    if (filter === "rejected" || filter === "needs_standard_match") {
      return candidate.reviewStatus === filter && !shouldHideByDefault(candidate);
    }

    return candidate.extractedType === filter && !shouldHideByDefault(candidate);
  });
}

export function getApprovedEstimateCandidates(
  candidates: DrawingExtractionCandidateRecord[]
): DrawingExtractionCandidateRecord[] {
  return candidates.filter(
    (candidate) =>
      getCandidateGroup(candidate) === "estimate_candidate" &&
      (candidate.reviewStatus === "accepted" || candidate.reviewStatus === "edited")
  );
}

export function getCandidateReviewSummary(candidates: DrawingExtractionCandidateRecord[]) {
  const visibleCandidates = filterExtractionCandidates(candidates, "all");
  const approvedEstimateCandidates = getApprovedEstimateCandidates(candidates);

  return {
    total: visibleCandidates.length,
    drawingMetadata: visibleCandidates.filter(
      (candidate) => getCandidateGroup(candidate) === "drawing_metadata"
    ).length,
    estimateCandidates: visibleCandidates.filter(
      (candidate) => getCandidateGroup(candidate) === "estimate_candidate"
    ).length,
    approvedEstimateCandidates: approvedEstimateCandidates.length,
    matchingNeeded: visibleCandidates.filter(
      (candidate) => candidate.reviewStatus === "needs_standard_match"
    ).length,
    rejected: visibleCandidates.filter((candidate) => candidate.reviewStatus === "rejected").length
  };
}
