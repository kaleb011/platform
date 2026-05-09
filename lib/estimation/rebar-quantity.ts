import type {
  EstimateItemRecord,
  PdfTextExtractionResult,
  PdfPageTextRecord,
  RebarMemberType,
  RebarPosition,
  RebarQuantityCandidateRecord,
  RebarQuantitySummary,
  RebarSpecRecord
} from "@/lib/estimation/types";

const REBAR_UNIT_WEIGHTS_KG_PER_M: Record<string, number> = {
  D10: 0.56,
  D13: 0.995,
  D16: 1.56,
  D19: 2.25,
  D22: 3.04,
  D25: 3.98,
  D29: 5.04,
  D32: 6.23
};

const coverMm = 40;
const rebarDiameterPattern = "(?:H?D)\\s*-?\\s*(10|13|16|19|22|25|29|32)";
const rebarCountRegex = new RegExp(`\\b(\\d{1,3})\\s*[- ]\\s*${rebarDiameterPattern}\\b`, "gi");
const rebarSpacingRegex = new RegExp(`\\b${rebarDiameterPattern}\\s*@\\s*(\\d{2,4})\\b`, "gi");

const memberTypeLabel: Record<RebarMemberType, string> = {
  beam: "보",
  column: "기둥",
  footing: "기초",
  slab: "슬라브",
  unknown: "부재 미확정"
};

const positionLabel: Record<RebarPosition, string> = {
  top: "상부",
  bottom: "하부",
  main: "주근",
  stirrup: "늑근/전단근",
  tie: "띠철근",
  x: "X방향",
  y: "Y방향",
  unknown: "위치 미확정"
};

export function normalizeRebarDiameter(value: string): string | null {
  const normalized = value.toUpperCase().replace(/\s+/g, "").replaceAll("-", "");
  const matched = normalized.match(/(?:HD|D)?(10|13|16|19|22|25|29|32)$/);

  return matched ? `D${matched[1]}` : null;
}

export function getRebarUnitWeight(diameter: string): number | null {
  const normalized = normalizeRebarDiameter(diameter);

  return normalized ? REBAR_UNIT_WEIGHTS_KG_PER_M[normalized] ?? null : null;
}

export function parseRebarCountPattern(text: string) {
  const matches: Array<{
    type: "count";
    count: number;
    diameter: string;
    rawText: string;
    index: number;
  }> = [];

  for (const match of text.matchAll(rebarCountRegex)) {
    const diameter = normalizeRebarDiameter(match[2] ?? "");

    if (!diameter) {
      continue;
    }

    matches.push({
      type: "count",
      count: Number(match[1]),
      diameter,
      rawText: match[0].trim(),
      index: match.index ?? 0
    });
  }

  return matches;
}

export function parseRebarSpacingPattern(text: string) {
  const matches: Array<{
    type: "spacing";
    diameter: string;
    spacingMm: number;
    rawText: string;
    index: number;
  }> = [];

  for (const match of text.matchAll(rebarSpacingRegex)) {
    const diameter = normalizeRebarDiameter(match[1] ?? "");

    if (!diameter) {
      continue;
    }

    matches.push({
      type: "spacing",
      diameter,
      spacingMm: Number(match[2]),
      rawText: match[0].trim(),
      index: match.index ?? 0
    });
  }

  return matches;
}

export function parseSectionSize(text: string):
  | { widthMm: number; depthMm: number; lengthMm?: number }
  | null {
  const bHMatch = text.match(/B\s*(\d{3,5})\s*[xX×*]\s*H\s*(\d{3,5})/i);

  if (bHMatch) {
    return { widthMm: Number(bHMatch[1]), depthMm: Number(bHMatch[2]) };
  }

  const genericMatch = text.match(
    /\b(\d{3,5})\s*[xX×*]\s*(\d{3,5})(?:\s*[xX×*]\s*(\d{2,5}))?\b/
  );

  if (!genericMatch) {
    return null;
  }

  return {
    widthMm: Number(genericMatch[1]),
    depthMm: Number(genericMatch[3] ?? genericMatch[2]),
    lengthMm: genericMatch[3] ? Number(genericMatch[2]) : undefined
  };
}

function toMm(value: string, unit?: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return unit?.toLowerCase() === "m" ? Math.round(parsed * 1000) : Math.round(parsed);
}

export function parseLengthCandidate(text: string): number | undefined {
  const keywordMatch = text.match(/(?:\bL\b|길이|부재길이)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|mm)?/i);

  if (keywordMatch) {
    return toMm(keywordMatch[1], keywordMatch[2]);
  }

  const metricMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(m|mm)\b/i);

  if (!metricMatch) {
    return undefined;
  }

  const lengthMm = toMm(metricMatch[1], metricMatch[2]);

  return lengthMm >= 1000 ? lengthMm : undefined;
}

export function parseHeightCandidate(text: string): number | undefined {
  if (/B\s*\d{3,5}\s*[xX×*]\s*H\s*\d{3,5}/i.test(text)) {
    return undefined;
  }

  const match = text.match(/(?:\bH\b|층고|높이)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(m|mm)?/i);

  return match ? toMm(match[1], match[2]) : undefined;
}

export function parseMemberCountCandidate(text: string): number | undefined {
  const match =
    text.match(/\b(\d{1,3})\s*(?:EA|개)\b/i) ??
    text.match(/(?:반복)\s*[:=]?\s*(\d{1,3})/i) ??
    text.match(/(?:^|\s)[x×]\s*(\d{1,2})(?:\s|$)/i);

  return match ? Number(match[1]) : undefined;
}

function inferRebarPosition(text: string): RebarPosition {
  const normalized = text.toUpperCase();

  if (/상부|상단|\bTOP\b/.test(normalized)) return "top";
  if (/하부|하단|\bBOT\b|\bBOTTOM\b/.test(normalized)) return "bottom";
  if (/주근|\bMAIN\b/.test(normalized)) return "main";
  if (/전단|늑근|\bSTIRRUP\b/.test(normalized)) return "stirrup";
  if (/띠철근|\bTIE\b/.test(normalized)) return "tie";
  if (/X방향|\bX\b/.test(normalized)) return "x";
  if (/Y방향|\bY\b/.test(normalized)) return "y";

  return "unknown";
}

function inferMemberName(text: string): string | undefined {
  const match = text.match(/\b(?:[1-9]?[A-Z]{0,2}[BCFGS]\d+[A-Z]?|[1-9]N?FG\d+)\b/i);

  return match?.[0];
}

function inferMemberType(text: string, memberName?: string): RebarMemberType {
  const normalized = text.toUpperCase();
  const member = memberName?.toUpperCase() ?? "";

  if (/보|BEAM|GIRDER/.test(normalized) || /^[0-9]?[BG]\d/.test(member)) return "beam";
  if (/기둥|COLUMN/.test(normalized) || /^[0-9]?C\d/.test(member)) return "column";
  if (/기초|FOOTING/.test(normalized) || /^[0-9]?F\d/.test(member) || /FG\d/.test(member)) {
    return "footing";
  }
  if (/슬라브|SLAB/.test(normalized) || /^[0-9]?S\d/.test(member)) return "slab";

  return "unknown";
}

function hasRebarAnalysisKeyword(text: string): boolean {
  return /구조일람표|보|기둥|기초|BEAM|COLUMN|FOOTING|D10|D13|D16|D19|D22|D25|D29|D32|@\s*(150|200)/i.test(
    text
  );
}

function createStableId(parts: Array<string | number | undefined>): string {
  const source = parts.filter(Boolean).join("|");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `rebar-${hash.toString(36)}`;
}

function createBaseSpec(args: {
  line: string;
  context: string;
  sourceFileName?: string;
  sourcePage?: number;
  pattern: { diameter: string; rawText: string; count?: number; spacingMm?: number };
}): RebarSpecRecord {
  const section = parseSectionSize(args.context);
  const memberName = inferMemberName(args.context);
  const memberType = inferMemberType(args.context, memberName);
  const memberCount = parseMemberCountCandidate(args.context);

  return {
    id: createStableId([
      args.sourceFileName,
      args.sourcePage,
      args.pattern.rawText,
      memberName,
      args.context
    ]),
    sourcePage: args.sourcePage,
    sourceFileName: args.sourceFileName,
    drawingNo: args.sourcePage ? `PDF p.${args.sourcePage}` : undefined,
    memberName,
    memberType,
    sectionWidthMm: section?.widthMm,
    sectionDepthMm: section?.lengthMm ? undefined : section?.depthMm,
    sectionHeightMm: section?.lengthMm ? section.depthMm : undefined,
    lengthMm: parseLengthCandidate(args.context),
    heightMm: parseHeightCandidate(args.context),
    footingWidthMm: section?.lengthMm ? section.widthMm : undefined,
    footingLengthMm: section?.lengthMm,
    footingDepthMm: section?.lengthMm ? section.depthMm : undefined,
    memberCount,
    diameter: args.pattern.diameter,
    barCount: args.pattern.count,
    spacingMm: args.pattern.spacingMm,
    position: inferRebarPosition(args.context),
    rawText: args.pattern.rawText,
    sourceTextSnippet: args.context,
    confidence: memberType === "unknown" ? 0.52 : 0.68
  };
}

function getPatternContext(line: string, fallbackContext: string, patternIndex: number): string {
  if (line.length <= 800) {
    return fallbackContext;
  }

  const start = Math.max(0, patternIndex - 220);
  const end = Math.min(line.length, patternIndex + 220);

  return line.slice(start, end).trim();
}

export function extractRebarSpecsFromText(
  text: string,
  options?: { sourceFileName?: string; sourcePage?: number }
): RebarSpecRecord[] {
  if (!hasRebarAnalysisKeyword(text)) {
    return [];
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const specs: RebarSpecRecord[] = [];

  lines.forEach((line, index) => {
    const countPatterns = parseRebarCountPattern(line);
    const spacingPatterns = parseRebarSpacingPattern(line);

    if (countPatterns.length === 0 && spacingPatterns.length === 0) {
      return;
    }

    const context = lines.slice(Math.max(0, index - 2), index + 3).join(" ");

    countPatterns.forEach((pattern) => {
      specs.push(
        createBaseSpec({
          line,
          context: getPatternContext(line, context, pattern.index),
          sourceFileName: options?.sourceFileName,
          sourcePage: options?.sourcePage,
          pattern
        })
      );
    });

    spacingPatterns.forEach((pattern) => {
      specs.push(
        createBaseSpec({
          line,
          context: getPatternContext(line, context, pattern.index),
          sourceFileName: options?.sourceFileName,
          sourcePage: options?.sourcePage,
          pattern
        })
      );
    });
  });

  const seen = new Set<string>();

  return specs.filter((spec) => {
    const key = [
      spec.sourceFileName,
      spec.sourcePage,
      spec.rawText,
      spec.memberName,
      spec.position,
      spec.sourceTextSnippet
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function extractRebarSpecsFromPdfPages(
  pages: PdfPageTextRecord[],
  sourceFileName?: string
): RebarSpecRecord[] {
  return pages.reduce<RebarSpecRecord[]>((records, page) => {
    return [
      ...records,
      ...extractRebarSpecsFromText(page.text, {
        sourceFileName,
        sourcePage: page.pageNumber
      })
    ];
  }, []);
}

export function extractRebarSpecsFromPdfResults(
  results: PdfTextExtractionResult[]
): RebarSpecRecord[] {
  return results.reduce<RebarSpecRecord[]>((records, result) => {
    return [...records, ...extractRebarSpecsFromPdfPages(result.pages, result.fileName)];
  }, []);
}

function createReviewCandidate(
  spec: RebarSpecRecord,
  unitWeightKgPerM: number,
  note: string,
  formula = "수량 산출 조건 부족"
): RebarQuantityCandidateRecord {
  const diameter = spec.diameter ?? "";

  return {
    id: createStableId([spec.id, "quantity"]),
    sourceRebarSpecId: spec.id,
    sourcePage: spec.sourcePage,
    sourceFileName: spec.sourceFileName,
    drawingNo: spec.drawingNo,
    memberName: spec.memberName,
    memberType: spec.memberType,
    position: spec.position,
    workCategory: "철근콘크리트공사",
    itemName: "철근 가공 및 조립",
    specification: [diameter, memberTypeLabel[spec.memberType], spec.memberName].filter(Boolean).join(" / "),
    diameter,
    unitWeightKgPerM,
    barCount: spec.barCount,
    spacingMm: spec.spacingMm,
    memberLengthMm: spec.lengthMm,
    memberHeightMm: spec.heightMm,
    sectionWidthMm: spec.sectionWidthMm,
    sectionDepthMm: spec.sectionDepthMm,
    footingWidthMm: spec.footingWidthMm,
    footingLengthMm: spec.footingLengthMm,
    memberCount: spec.memberCount ?? 1,
    quantityKg: 0,
    quantityTon: 0,
    unit: "kg",
    calculationFormula: formula,
    calculationBasis:
      `${note} 정착·이음·갈고리 길이는 별도 검토 필요. 구조일람표 기반 추정 후보입니다.`,
    confidence: Math.min(spec.confidence, 0.58),
    reviewStatus: "pending",
    quantityReviewRequired: true,
    note,
    rawText: spec.rawText,
    sourceTextSnippet: spec.sourceTextSnippet
  };
}

function roundQuantity(value: number, fractionDigits: number) {
  return Number(value.toFixed(fractionDigits));
}

export function recalculateRebarQuantityCandidate(
  candidate: RebarQuantityCandidateRecord
): RebarQuantityCandidateRecord {
  const unitWeight = getRebarUnitWeight(candidate.diameter) ?? candidate.unitWeightKgPerM;
  const memberCount = candidate.memberCount > 0 ? candidate.memberCount : 1;
  const base = {
    ...candidate,
    unitWeightKgPerM: unitWeight,
    memberCount,
    specification: [candidate.diameter, memberTypeLabel[candidate.memberType], candidate.memberName]
      .filter(Boolean)
      .join(" / ")
  };

  const fail = (note: string, formula = "수량 산출 조건 부족") => ({
    ...base,
    quantityKg: 0,
    quantityTon: 0,
    calculationFormula: formula,
    calculationBasis:
      `${note} 정착·이음·갈고리 길이는 별도 검토 필요. 구조일람표 기반 추정 후보입니다.`,
    quantityReviewRequired: true,
    note
  });

  if (!candidate.diameter || unitWeight <= 0) {
    return fail("철근 규격 또는 단위중량 확인 필요");
  }

  if (candidate.memberType === "beam" && candidate.spacingMm && candidate.sectionWidthMm && candidate.sectionDepthMm && candidate.memberLengthMm) {
    const stirrupCount = Math.floor(candidate.memberLengthMm / candidate.spacingMm) + 1;
    const stirrupLengthM =
      (2 * (candidate.sectionWidthMm - coverMm * 2 + candidate.sectionDepthMm - coverMm * 2)) /
      1000;
    const quantityKg = stirrupCount * stirrupLengthM * unitWeight * memberCount;

    return {
      ...base,
      quantityKg: roundQuantity(quantityKg, 2),
      quantityTon: roundQuantity(quantityKg / 1000, 4),
      calculationFormula: `${candidate.diameter}@${candidate.spacingMm}: floor(${candidate.memberLengthMm}/${candidate.spacingMm})+1개 x ${roundQuantity(stirrupLengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA = ${roundQuantity(quantityKg, 2)}kg`,
      calculationBasis:
        "보 늑근/전단근 후보: 피복 40mm 가정, 정착·이음·갈고리 길이는 별도 검토 필요.",
      quantityReviewRequired: false,
      note: "피복 40mm 가정"
    };
  }

  if (candidate.memberType === "column" && candidate.spacingMm && candidate.sectionWidthMm && candidate.sectionDepthMm && candidate.memberHeightMm) {
    const tieCount = Math.floor(candidate.memberHeightMm / candidate.spacingMm) + 1;
    const tieLengthM =
      (2 * (candidate.sectionWidthMm - coverMm * 2 + candidate.sectionDepthMm - coverMm * 2)) /
      1000;
    const quantityKg = tieCount * tieLengthM * unitWeight * memberCount;

    return {
      ...base,
      quantityKg: roundQuantity(quantityKg, 2),
      quantityTon: roundQuantity(quantityKg / 1000, 4),
      calculationFormula: `${candidate.diameter}@${candidate.spacingMm}: floor(${candidate.memberHeightMm}/${candidate.spacingMm})+1개 x ${roundQuantity(tieLengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA = ${roundQuantity(quantityKg, 2)}kg`,
      calculationBasis:
        "기둥 띠철근 후보: 피복 40mm 가정, 정착·이음·갈고리 길이는 별도 검토 필요.",
      quantityReviewRequired: false,
      note: "피복 40mm 가정"
    };
  }

  if (candidate.memberType === "footing" && candidate.spacingMm && candidate.footingWidthMm && candidate.footingLengthMm) {
    if (candidate.position !== "x" && candidate.position !== "y") {
      return fail("기초 철근 X/Y 방향 확인 필요");
    }

    const barCount =
      candidate.position === "x"
        ? Math.floor(candidate.footingWidthMm / candidate.spacingMm) + 1
        : Math.floor(candidate.footingLengthMm / candidate.spacingMm) + 1;
    const lengthM =
      candidate.position === "x" ? candidate.footingLengthMm / 1000 : candidate.footingWidthMm / 1000;
    const quantityKg = barCount * lengthM * unitWeight * memberCount;

    return {
      ...base,
      barCount,
      quantityKg: roundQuantity(quantityKg, 2),
      quantityTon: roundQuantity(quantityKg / 1000, 4),
      calculationFormula: `${candidate.diameter}@${candidate.spacingMm}: ${barCount}본 x ${roundQuantity(lengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA = ${roundQuantity(quantityKg, 2)}kg`,
      calculationBasis:
        "기초 X/Y 방향 철근 후보: 정착·이음·갈고리 길이는 별도 검토 필요.",
      quantityReviewRequired: false,
      note: "기초 방향 및 피복 검토 필요"
    };
  }

  const mainLengthMm =
    candidate.memberType === "column" ? candidate.memberHeightMm : candidate.memberLengthMm;

  if (
    candidate.barCount &&
    mainLengthMm &&
    ["beam", "column"].includes(candidate.memberType)
  ) {
    const lengthM = mainLengthMm / 1000;
    const quantityKg = candidate.barCount * lengthM * unitWeight * memberCount;

    return {
      ...base,
      quantityKg: roundQuantity(quantityKg, 2),
      quantityTon: roundQuantity(quantityKg / 1000, 4),
      calculationFormula: `${candidate.diameter}: ${candidate.barCount}본 x ${roundQuantity(lengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA = ${roundQuantity(quantityKg, 2)}kg`,
      calculationBasis:
        `${memberTypeLabel[candidate.memberType]} 주근 후보: 정착·이음·갈고리 길이는 별도 검토 필요.`,
      quantityReviewRequired: false,
      note: "정착·이음·갈고리 길이 별도 검토 필요"
    };
  }

  if (candidate.memberType === "unknown") {
    return fail("부재 종류 확인 필요");
  }

  if (candidate.spacingMm) {
    return fail("간격형 철근 산출에 필요한 단면/길이/높이/기초 치수 확인 필요");
  }

  return fail("개수형 철근 산출에 필요한 부재 길이 또는 높이 확인 필요");
}

export function buildRebarQuantityCandidates(
  specs: RebarSpecRecord[]
): RebarQuantityCandidateRecord[] {
  return specs.reduce<RebarQuantityCandidateRecord[]>((candidates, spec) => {
    const unitWeight = spec.diameter ? getRebarUnitWeight(spec.diameter) : null;

    if (!spec.diameter || !unitWeight) {
      return candidates;
    }

    const candidate = createReviewCandidate(spec, unitWeight, "철근 수량 산출 조건 검토 필요");

    return [...candidates, recalculateRebarQuantityCandidate(candidate)];
  }, []);
}

export function summarizeRebarQuantityCandidates(
  candidates: RebarQuantityCandidateRecord[]
): RebarQuantitySummary {
  return candidates.reduce<RebarQuantitySummary>(
    (summary, candidate) => {
      summary.totalCandidates += 1;

      if (candidate.quantityReviewRequired) {
        summary.reviewRequiredCandidates += 1;
      } else {
        summary.calculatedCandidates += 1;
      }

      if (candidate.reviewStatus === "accepted") {
        summary.acceptedCandidates += 1;
        summary.totalKg += candidate.quantityKg;
        summary.totalTon += candidate.quantityTon;
      }

      return summary;
    },
    {
      totalCandidates: 0,
      calculatedCandidates: 0,
      reviewRequiredCandidates: 0,
      acceptedCandidates: 0,
      totalKg: 0,
      totalTon: 0
    }
  );
}

export function createEstimateItemsFromAcceptedRebarCandidates(
  candidates: RebarQuantityCandidateRecord[]
): EstimateItemRecord[] {
  return candidates
    .filter((candidate) => candidate.reviewStatus === "accepted")
    .map((candidate) => ({
      id: `rebar-estimate-${candidate.id}`,
      drawingFileId: `rebar-${candidate.sourceFileName ?? "uploaded-pdf"}`,
      drawingPageId: `rebar-page-${candidate.sourcePage ?? "unknown"}`,
      standardItemId: "rebar-quantity-rule",
      workCategory: "철근콘크리트공사",
      itemName: "철근 가공 및 조립",
      specification: [candidate.diameter, memberTypeLabel[candidate.memberType], candidate.memberName]
        .filter(Boolean)
        .join(" / "),
      quantity: candidate.quantityKg,
      unit: "kg",
      calculationBasis: candidate.calculationFormula,
      sourceNote: candidate.calculationBasis,
      reviewStatus: "accepted",
      standardItemName: "철근 가공 및 조립",
      drawingNo: candidate.sourcePage ? `PDF p.${candidate.sourcePage}` : "",
      drawingTitle: "구조일람표 기반 철근 수량 산출 후보",
      remark:
        "철근 수량 산출 후보 기반 / 정착·이음·갈고리 길이 별도 검토 필요 / 사용자 검토 후 승인",
      sourceCandidateId: candidate.id,
      sourceFileName: candidate.sourceFileName ?? null,
      sourcePage: candidate.sourcePage ?? null,
      quantityReviewRequired: candidate.quantityReviewRequired,
      matchSource: "rebar",
      standardCode: null
    }));
}

export function getRebarMemberTypeLabel(memberType: RebarMemberType): string {
  return memberTypeLabel[memberType];
}

export function getRebarPositionLabel(position: RebarPosition): string {
  return positionLabel[position];
}
