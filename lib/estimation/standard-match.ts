import type {
  DrawingExtractionCandidateRecord,
  StandardItemKeywordRecord,
  StandardItemRecord
} from "@/lib/estimation/types";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function scoreStandardItem(
  candidate: DrawingExtractionCandidateRecord,
  standardItem: StandardItemRecord,
  keywords: StandardItemKeywordRecord[]
) {
  const source = normalize(
    [
      candidate.extractedText,
      candidate.normalizedValue ?? "",
      candidate.sourceNote ?? "",
      candidate.drawingTitle ?? ""
    ].join(" ")
  );

  let score = 0;

  if (source.includes(normalize(standardItem.itemName))) {
    score += 55;
  }

  if (candidate.extractedType.toLowerCase().includes("material")) {
    score += 5;
  }

  for (const keyword of keywords) {
    const term = normalize(keyword.keyword);
    const drawingTerm = normalize(keyword.drawingTerm ?? "");

    if (term && source.includes(term)) {
      score += 18;
    }

    if (drawingTerm && source.includes(drawingTerm)) {
      score += 12;
    }
  }

  if (candidate.unit && standardItem.unit && candidate.unit === standardItem.unit) {
    score += 10;
  }

  return Math.min(score / 100, 0.99);
}

export function rankStandardMatches(
  candidate: DrawingExtractionCandidateRecord,
  standardItems: StandardItemRecord[],
  allKeywords: StandardItemKeywordRecord[]
) {
  return standardItems
    .map((standardItem) => {
      const keywords = allKeywords.filter((item) => item.standardItemId === standardItem.id);

      return {
        standardItem,
        score: scoreStandardItem(candidate, standardItem, keywords)
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);
}
