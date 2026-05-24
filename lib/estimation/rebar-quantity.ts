import type {
  EstimateItemRecord,
  BeamMainCalculationMode,
  BeamStirrupEndZoneMode,
  PdfTextExtractionResult,
  PdfPageTextRecord,
  RebarBarCountRule,
  RebarMemberType,
  RebarPosition,
  RebarQuantityCandidateRecord,
  RebarRole,
  RebarQuantitySummary,
  RebarReviewStatus,
  RebarSourceType,
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
const defaultAnchorageLengthMm = 0;
const defaultSpliceLengthMm = 0;
const defaultHookLengthMm = 0;
const defaultDeductionLengthMm = 0;
const defaultBendCorrectionMm = 0;
const defaultLossRate = 0.03;
const defaultFaceCount = 1;
const beamStirrupEndSpacingFactor = 0.4;
const rebarDiameterPattern = "(?:H?D)\\s*-?\\s*(10|13|16|19|22|25|29|32)";
const rebarCountRegex = new RegExp(`\\b(\\d{1,3})\\s*[- ]\\s*${rebarDiameterPattern}\\b`, "gi");
const rebarSpacingRegex = new RegExp(`\\b${rebarDiameterPattern}\\s*@\\s*(\\d{2,4})\\b`, "gi");
const structuralScheduleKeywords = [
  "구조일람표",
  "보일람표",
  "기둥일람표",
  "기초일람표",
  "슬라브일람표",
  "STRUCTURAL SCHEDULE",
  "BEAM SCHEDULE",
  "COLUMN SCHEDULE",
  "FOOTING SCHEDULE"
];
const structuralPlanKeywords = [
  "구조평면도",
  "기초평면도",
  "바닥구조평면도",
  "FOUNDATION PLAN",
  "FRAMING PLAN",
  "SLAB PLAN"
];
const noiseKeywords = [
  "일반사항",
  "GENERAL NOTE",
  "구조 일반사항",
  "NOTE",
  "정착",
  "이음",
  "갈고리",
  "피복",
  "SD400",
  "콘크리트 강도",
  "DESIGNED BY",
  "APPROVED BY",
  "REVISION DESCRIPTION",
  "FCK",
  "FY"
];

const memberTypeLabel: Record<RebarMemberType, string> = {
  beam: "보",
  column: "기둥",
  footing: "기초",
  slab: "슬라브",
  wall: "벽체",
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
  x_bottom: "X방향 하부근",
  y_bottom: "Y방향 하부근",
  x_top: "X방향 상부근",
  y_top: "Y방향 상부근",
  distribution: "배력근",
  opening_reinforcement: "개구부 보강근",
  vertical: "수직근",
  horizontal: "수평근",
  u_bar: "U-BAR",
  c_bar: "C-BAR",
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
  if (/벽체|WALL/.test(normalized) || /^[0-9]?W\d/.test(member)) return "wall";

  return "unknown";
}

function hasRebarAnalysisKeyword(text: string): boolean {
  return /구조일람표|보|기둥|기초|BEAM|COLUMN|FOOTING|D10|D13|D16|D19|D22|D25|D29|D32|@\s*(150|200)/i.test(
    text
  );
}

function normalizeSnippet(value: string | undefined): string {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 120);
}

function includesKeyword(text: string, keywords: string[]): boolean {
  const normalized = text.toUpperCase();

  return keywords.some((keyword) => normalized.includes(keyword.toUpperCase()));
}

function inferRebarSourceType(pageText: string): RebarSourceType {
  const drawingNoMatch = pageText.match(/\bS-(\d{3})\b/i);
  const drawingNoNumber = drawingNoMatch ? Number(drawingNoMatch[1]) : null;

  if (
    includesKeyword(pageText, structuralScheduleKeywords) ||
    drawingNoNumber === 301 ||
    drawingNoNumber === 302 ||
    drawingNoNumber === 303
  ) {
    return "structural_schedule";
  }

  if (
    includesKeyword(pageText, structuralPlanKeywords) ||
    (typeof drawingNoNumber === "number" && drawingNoNumber >= 200 && drawingNoNumber < 300)
  ) {
    return "structural_plan";
  }

  if (/구조|STRUCTURE|DETAIL|SECTION|ELEVATION|D10|D13|D16|D19|D22|D25|D29|D32/i.test(pageText)) {
    return "other_structure";
  }

  return "unknown";
}

function getRebarSourcePriority(sourceType: RebarSourceType): number {
  if (sourceType === "structural_schedule") return 3;
  if (sourceType === "structural_plan") return 2;
  if (sourceType === "other_structure") return 1;

  return 0;
}

export type RebarCandidateSourceGroup = "schedule" | "plan" | "note";

export function getRebarCandidateSourceGroup(
  candidate: Pick<
    RebarQuantityCandidateRecord,
    "drawingNo" | "memberName" | "memberListSource" | "rebarSourceType" | "sourceTextSnippet"
  >
): RebarCandidateSourceGroup {
  if (
    candidate.memberListSource === "note_reference" ||
    candidate.memberListSource === "future_review"
  ) {
    return "note";
  }

  if (candidate.memberListSource === "plan_unmatched") {
    return "plan";
  }

  if (
    candidate.memberListSource === "schedule" ||
    candidate.memberListSource === "schedule_with_plan" ||
    candidate.memberListSource === "manual"
  ) {
    return "schedule";
  }

  const sourceText = [
    candidate.drawingNo,
    candidate.memberName,
    candidate.sourceTextSnippet
  ]
    .filter(Boolean)
    .join(" ");

  if (
    candidate.rebarSourceType === "structural_schedule" ||
    /\bS-30[1-3]\b/i.test(sourceText) ||
    includesKeyword(sourceText, structuralScheduleKeywords)
  ) {
    return "schedule";
  }

  if (
    candidate.rebarSourceType === "structural_plan" ||
    /\bS-22[1-5]\b/i.test(sourceText) ||
    includesKeyword(sourceText, structuralPlanKeywords)
  ) {
    return "plan";
  }

  return "note";
}

export function sortRebarQuantityCandidatesBySource(
  candidates: RebarQuantityCandidateRecord[]
): RebarQuantityCandidateRecord[] {
  const groupRank: Record<RebarCandidateSourceGroup, number> = {
    schedule: 0,
    plan: 1,
    note: 2
  };

  return [...candidates].sort((left, right) => {
    const leftGroup = getRebarCandidateSourceGroup(left);
    const rightGroup = getRebarCandidateSourceGroup(right);
    const groupDiff = groupRank[leftGroup] - groupRank[rightGroup];

    if (groupDiff !== 0) {
      return groupDiff;
    }

    return (
      (left.sourcePage ?? 9999) - (right.sourcePage ?? 9999) ||
      (left.memberName ?? "").localeCompare(right.memberName ?? "", "ko-KR") ||
      left.diameter.localeCompare(right.diameter, "ko-KR")
    );
  });
}

function hasScheduleReference(text: string): boolean {
  return includesKeyword(text, structuralScheduleKeywords) || /\bS-30[1-3]\b/i.test(text);
}

function hasStrongRebarContext(text: string, sourceType: RebarSourceType): boolean {
  const memberName = inferMemberName(text);
  const section = parseSectionSize(text);

  if (sourceType === "structural_schedule") {
    return true;
  }

  if (sourceType === "structural_plan") {
    return Boolean(memberName || section || hasScheduleReference(text));
  }

  return Boolean(memberName && section);
}

function isLikelyNoiseContext(text: string, sourceType: RebarSourceType): boolean {
  if (!includesKeyword(text, noiseKeywords)) {
    return false;
  }

  return sourceType !== "structural_schedule" && !hasStrongRebarContext(text, sourceType);
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
  rebarSourceType: RebarSourceType;
  pattern: { diameter: string; rawText: string; count?: number; spacingMm?: number };
}): RebarSpecRecord {
  const section = parseSectionSize(args.context);
  const memberName = inferMemberName(args.context);
  const memberType = inferMemberType(args.context, memberName);
  const memberCount = parseMemberCountCandidate(args.context);
  const hasNoiseKeyword = includesKeyword(args.context, noiseKeywords);
  const confidence =
    args.rebarSourceType === "structural_schedule"
      ? hasNoiseKeyword
        ? 0.5
        : memberType === "unknown"
          ? 0.6
          : 0.76
      : memberType === "unknown"
        ? 0.42
        : 0.58;

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
    rebarSourceType: args.rebarSourceType,
    confidence
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
  options?: {
    sourceFileName?: string;
    sourcePage?: number;
    rebarSourceType?: RebarSourceType;
    hasStructuralSchedulePages?: boolean;
  }
): RebarSpecRecord[] {
  if (!hasRebarAnalysisKeyword(text)) {
    return [];
  }

  const rebarSourceType = options?.rebarSourceType ?? inferRebarSourceType(text);
  const sourcePriority = getRebarSourcePriority(rebarSourceType);

  if (sourcePriority <= 0) {
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
      const patternContext = getPatternContext(line, context, pattern.index);

      if (
        isLikelyNoiseContext(patternContext, rebarSourceType) ||
        (rebarSourceType !== "structural_schedule" &&
          !hasStrongRebarContext(patternContext, rebarSourceType))
      ) {
        return;
      }

      specs.push(
        createBaseSpec({
          line,
          context: patternContext,
          sourceFileName: options?.sourceFileName,
          sourcePage: options?.sourcePage,
          rebarSourceType,
          pattern
        })
      );
    });

    spacingPatterns.forEach((pattern) => {
      const patternContext = getPatternContext(line, context, pattern.index);

      if (
        isLikelyNoiseContext(patternContext, rebarSourceType) ||
        (rebarSourceType !== "structural_schedule" &&
          !hasStrongRebarContext(patternContext, rebarSourceType))
      ) {
        return;
      }

      specs.push(
        createBaseSpec({
          line,
          context: patternContext,
          sourceFileName: options?.sourceFileName,
          sourcePage: options?.sourcePage,
          rebarSourceType,
          pattern
        })
      );
    });
  });

  return dedupeRebarSpecs(specs);
}

function dedupeRebarSpecs(specs: RebarSpecRecord[]): RebarSpecRecord[] {
  const seen = new Set<string>();

  return specs.filter((spec) => {
    const key = [
      spec.sourceFileName,
      spec.sourcePage,
      spec.memberName,
      spec.memberType,
      spec.position,
      spec.diameter,
      spec.barCount ?? "",
      spec.spacingMm ?? "",
      spec.lengthMm ?? spec.heightMm ?? "",
      normalizeSnippet(spec.sourceTextSnippet ?? spec.rawText)
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
  const pageSources = pages.map((page) => {
    const rebarSourceType = inferRebarSourceType(page.text);

    return {
      page,
      rebarSourceType,
      priority: getRebarSourcePriority(rebarSourceType)
    };
  });
  const hasStructuralSchedulePages = pageSources.some(({ priority }) => priority === 3);

  const specs = pageSources.reduce<RebarSpecRecord[]>((records, source) => {
    if (source.priority <= 0) {
      return records;
    }

    return [
      ...records,
      ...extractRebarSpecsFromText(source.page.text, {
        sourceFileName,
        sourcePage: source.page.pageNumber,
        rebarSourceType: source.rebarSourceType,
        hasStructuralSchedulePages
      })
    ];
  }, []);

  return dedupeRebarSpecs(specs);
}

export function extractRebarSpecsFromPdfResults(
  results: PdfTextExtractionResult[]
): RebarSpecRecord[] {
  const specs = results.reduce<RebarSpecRecord[]>((records, result) => {
    return [...records, ...extractRebarSpecsFromPdfPages(result.pages, result.fileName)];
  }, []);

  return dedupeRebarSpecs(specs);
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
    coverMm,
    anchorageLengthMm: defaultAnchorageLengthMm,
    spliceLengthMm: defaultSpliceLengthMm,
    hookLengthMm: defaultHookLengthMm,
    bendCorrectionMm: defaultBendCorrectionMm,
    lossRate: defaultLossRate,
    faceCount: defaultFaceCount,
    barCountRule: spec.spacingMm ? "ceil_plus_one" : "direct",
    manualBarCount: spec.barCount,
    footingLayer: spec.position === "bottom" ? "bottom" : "top",
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
    sourceTextSnippet: spec.sourceTextSnippet,
    rebarSourceType: spec.rebarSourceType ?? "unknown"
  };
}

function roundQuantity(value: number, fractionDigits: number) {
  return Number(value.toFixed(fractionDigits));
}

function recalculateRebarQuantityCandidateLegacy(
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

  const missingRequiredInputs = getMissingRebarRequiredInputLabels(candidate);

  if (missingRequiredInputs.length > 0) {
    return fail(`필수 입력값 부족: ${missingRequiredInputs.join(", ")}`, "필수 입력값 부족");
  }

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

  if (candidate.memberType === "footing" && candidate.barCount && candidate.memberLengthMm) {
    const lengthM = candidate.memberLengthMm / 1000;
    const quantityKg = candidate.barCount * lengthM * unitWeight * memberCount;

    return {
      ...base,
      quantityKg: roundQuantity(quantityKg, 2),
      quantityTon: roundQuantity(quantityKg / 1000, 4),
      calculationFormula: `${candidate.diameter} ${candidate.barCount}본 x ${roundQuantity(lengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA = ${roundQuantity(quantityKg, 2)}kg`,
      calculationBasis:
        "기초 개수형 철근 후보: 정착·이음·갈고리 길이는 별도 검토 필요.",
      quantityReviewRequired: false,
      note: "정착·이음·갈고리 길이 별도 검토 필요"
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

function positiveOrDefault(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonNegativeOrDefault(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function resolveCountByRule(
  ratio: number,
  rule: RebarBarCountRule,
  manualBarCount?: number
) {
  if (rule === "direct") {
    return positiveOrDefault(manualBarCount, 0);
  }

  if (!Number.isFinite(ratio) || ratio < 0) {
    return 0;
  }

  return rule === "ceil_plus_one" ? Math.ceil(ratio) + 1 : Math.floor(ratio) + 1;
}

function getCountRulePreview(
  ratioFormula: string,
  rule: RebarBarCountRule,
  manualBarCount?: number
) {
  if (rule === "direct") {
    return `직접입력 ${manualBarCount ?? 0}`;
  }

  return `${rule === "ceil_plus_one" ? "ceil" : "floor"}(${ratioFormula}) + 1`;
}

function getGeneralRuleBasis(candidate: RebarQuantityCandidateRecord) {
  const notes = candidate.generalRuleNotes?.filter(Boolean) ?? [];
  const ruleIds = candidate.appliedGeneralRuleIds?.filter(Boolean) ?? [];

  if (notes.length === 0 && ruleIds.length === 0) return "";

  return [
    "구조일반사항 추천값을 참고한 사용자 보정",
    ruleIds.length > 0 ? `적용 기준: ${ruleIds.join(", ")}` : null,
    notes.length > 0 ? notes.join(" / ") : null
  ]
    .filter(Boolean)
    .join(" / ");
}

function buildQuantityResult(args: {
  base: RebarQuantityCandidateRecord;
  barCount: number;
  singleBarLengthM: number;
  formula: string;
  basis: string;
}) {
  const netWeightKg =
    args.singleBarLengthM *
    args.barCount *
    args.base.memberCount *
    (args.base.faceCount ?? defaultFaceCount) *
    args.base.unitWeightKgPerM;
  const materialWeightKg = netWeightKg * (1 + (args.base.lossRate ?? defaultLossRate));

  return {
    ...args.base,
    barCount: args.barCount,
    singleBarLengthM: roundQuantity(args.singleBarLengthM, 3),
    quantityKg: roundQuantity(netWeightKg, 2),
    quantityTon: roundQuantity(netWeightKg / 1000, 4),
    materialQuantityKg: roundQuantity(materialWeightKg, 2),
    materialQuantityTon: roundQuantity(materialWeightKg / 1000, 4),
    calculationFormula: `${args.formula} = 정미 ${roundQuantity(netWeightKg, 2)}kg / 자재 ${roundQuantity(materialWeightKg, 2)}kg`,
    calculationBasis: [
      args.basis,
      "정미중량은 철근 가공조립 적용중량으로, 자재중량은 LOSS율을 반영한 참고값입니다.",
      getGeneralRuleBasis(args.base)
    ]
      .filter(Boolean)
      .join(" "),
    quantityReviewRequired: args.barCount <= 0 || args.singleBarLengthM <= 0 || netWeightKg <= 0,
    note: args.barCount <= 0 || args.singleBarLengthM <= 0 ? "산출 조건 확인 필요" : "실무식 템플릿 적용"
  };
}

function getDirectionType(position: RebarPosition): "x" | "y" | null {
  if (position === "x" || position === "x_bottom" || position === "x_top") {
    return "x";
  }

  if (position === "y" || position === "y_bottom" || position === "y_top") {
    return "y";
  }

  return null;
}

function isDirectShapePosition(position: RebarPosition) {
  return position === "distribution" ||
    position === "opening_reinforcement" ||
    position === "u_bar" ||
    position === "c_bar";
}

function hasPositiveInput(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function normalizeRebarRole(value: unknown): RebarRole {
  if (typeof value !== "string") return "unknown";

  const normalized = value.trim().toUpperCase().replace(/\s+/g, "");

  if (!normalized) return "unknown";
  if (/^(MAIN|MAIN_BAR|주근|상부근|하부근|TOP|BOTTOM)$/.test(normalized)) return "main";
  if (/^(STIRRUP|HOOP|TIE|늑근|스터럽|띠철근)$/.test(normalized)) return "stirrup";
  if (/^(SHEAR|전단근|전단철근)$/.test(normalized)) return "shear";
  if (/^\d{1,3}[- ]?(?:H?D)?\d{2}$/.test(normalized)) return "main";
  if (/@/.test(normalized) || /STIRRUP|늑근|스터럽|전단철근|전단근/i.test(value)) {
    return /전단|SHEAR/i.test(value) ? "shear" : "stirrup";
  }

  return "unknown";
}

export function getEffectiveRebarRole(candidate: RebarQuantityCandidateRecord): RebarRole {
  return [
    candidate.rebarRole,
    candidate.position,
    candidate.originalRole,
    candidate.rawText,
    candidate.sourceTextSnippet
  ].reduce<RebarRole>((role, value) => {
    if (role !== "unknown") return role;

    return normalizeRebarRole(value);
  }, "unknown");
}

function hasWallReinforcementSnippet(candidate: RebarQuantityCandidateRecord) {
  const snippet = candidate.sourceTextSnippet ?? candidate.rawText ?? "";
  const hasSpacing = parseRebarSpacingPattern(snippet).length > 0;
  const hasDirection = /수직|수평|VERT|HOR|HORIZONTAL|VERTICAL/i.test(snippet);

  return hasSpacing && hasDirection;
}

function isBeamStirrupCandidate(candidate: RebarQuantityCandidateRecord) {
  const role = getEffectiveRebarRole(candidate);

  return candidate.memberType === "beam" && (role === "stirrup" || role === "shear");
}

function resolveBeamStirrupEndLength(
  mode: BeamStirrupEndZoneMode,
  beamLengthMm: number,
  beamDepthMm: number,
  ratio: number,
  manualLengthMm: number | undefined
) {
  if (mode === "manual") {
    return nonNegativeOrDefault(manualLengthMm, 0);
  }

  if (mode === "two_depth") {
    return hasPositiveInput(manualLengthMm) ? manualLengthMm ?? 0 : Math.max(0, beamDepthMm * 2);
  }

  return Math.max(0, beamLengthMm * ratio);
}

function resolveBeamStirrupSegmentCount(
  lengthMm: number,
  spacingMm: number | undefined,
  overrideCount: number | undefined,
  rule: "ceil_plus_one" | "floor"
) {
  const directCount = positiveOrDefault(overrideCount, 0);

  if (directCount > 0) {
    return directCount;
  }

  if (lengthMm <= 0 || !spacingMm || spacingMm <= 0) {
    return 0;
  }

  return rule === "ceil_plus_one"
    ? Math.ceil(lengthMm / spacingMm) + 1
    : Math.floor(lengthMm / spacingMm);
}

function getBeamStirrupSegmentBasis(candidate: RebarQuantityCandidateRecord) {
  if (candidate.beamStirrupCalculationMode !== "segmented_spacing") return "";

  return [
    "보 늑근 산출 모드: 단부/중앙부 분리",
    `좌측 단부 ${roundQuantity(candidate.beamStirrupLeftEndLengthMm ?? 0, 1)}mm / @${candidate.beamStirrupLeftSpacingMm ?? "-"} / ${candidate.beamStirrupLeftCount ?? 0}본`,
    `중앙부 ${roundQuantity(candidate.beamStirrupCenterLengthMm ?? 0, 1)}mm / @${candidate.beamStirrupCenterSpacingMm ?? "-"} / ${candidate.beamStirrupCenterCount ?? 0}본`,
    `우측 단부 ${roundQuantity(candidate.beamStirrupRightEndLengthMm ?? 0, 1)}mm / @${candidate.beamStirrupRightSpacingMm ?? "-"} / ${candidate.beamStirrupRightCount ?? 0}본`,
    `총 늑근 본수 ${candidate.beamStirrupTotalCount ?? candidate.barCount ?? 0}본`,
    candidate.beamStirrupUnitLengthMm
      ? `늑근 1개 길이 ${roundQuantity(candidate.beamStirrupUnitLengthMm, 1)}mm`
      : null,
    candidate.beamStirrupSegmentNote
  ]
    .filter(Boolean)
    .join(" / ");
}

export function isWallRebarDetailReviewRequired(candidate: RebarQuantityCandidateRecord) {
  return candidate.memberType === "wall" && !hasWallReinforcementSnippet(candidate);
}

export function getMissingRebarRequiredInputLabels(
  candidate: RebarQuantityCandidateRecord
): string[] {
  const missing: string[] = [];
  const effectiveRole = getEffectiveRebarRole(candidate);
  const isBeamMain = candidate.memberType === "beam" && effectiveRole === "main";
  const isBeamStirrupOrShear =
    candidate.memberType === "beam" && (effectiveRole === "stirrup" || effectiveRole === "shear");
  const hasSpacingOrDirectCount =
    hasPositiveInput(candidate.spacingMm) || hasPositiveInput(candidate.manualBarCount ?? candidate.barCount);

  if (!isBeamMain && !hasPositiveInput(candidate.coverMm)) missing.push("피복");
  if (!hasPositiveInput(candidate.memberCount)) missing.push("반복 개수");
  if (candidate.memberType === "footing") {
    if (candidate.position !== "x" && candidate.position !== "y") missing.push("방향 X/Y");
    if (!hasPositiveInput(candidate.footingWidthMm)) missing.push("기초 폭");
    if (!hasPositiveInput(candidate.footingLengthMm)) missing.push("기초 길이");
    if (!hasSpacingOrDirectCount) missing.push("철근 간격 또는 직접 본수");
  }

  if (candidate.memberType === "beam") {
    if (effectiveRole !== "main" && effectiveRole !== "stirrup" && effectiveRole !== "shear") {
      missing.push("철근 종류 주근/늑근");
    }
    if (!hasPositiveInput(candidate.memberLengthMm)) missing.push("보 길이");
    if (
      isBeamStirrupOrShear &&
      candidate.beamStirrupCalculationMode === "segmented_spacing"
    ) {
      if (!hasPositiveInput(candidate.sectionWidthMm)) missing.push("보 폭");
      if (!hasPositiveInput(candidate.sectionDepthMm)) missing.push("보 춤");
      const endZoneMode = candidate.beamStirrupEndZoneMode ?? "ratio";
      const centerSpacing = candidate.beamStirrupCenterSpacingMm ?? candidate.spacingMm;
      const autoEndSpacing =
        candidate.beamStirrupUseAutoEndSpacing !== false && hasPositiveInput(centerSpacing)
          ? Math.max(1, Math.floor((centerSpacing ?? 0) * beamStirrupEndSpacingFactor))
          : undefined;
      const leftSpacing = candidate.beamStirrupLeftSpacingMm ?? autoEndSpacing;
      const rightSpacing = candidate.beamStirrupRightSpacingMm ?? autoEndSpacing;
      const leftLength = candidate.beamStirrupLeftEndLengthMm;
      const rightLength = candidate.beamStirrupRightEndLengthMm;
      const centerLength = candidate.beamStirrupCenterLengthMm;
      const hasDirectStirrupTotalCount = hasPositiveInput(candidate.manualBarCount);

      if (endZoneMode === "manual") {
        if (!hasPositiveInput(leftLength)) missing.push("좌측 단부 길이");
        if (!hasPositiveInput(rightLength)) missing.push("우측 단부 길이");
      }
      if (!hasDirectStirrupTotalCount && !hasPositiveInput(leftSpacing)) missing.push("좌측 단부 간격");
      if (!hasDirectStirrupTotalCount && !hasPositiveInput(centerSpacing)) missing.push("중앙부 간격");
      if (!hasDirectStirrupTotalCount && !hasPositiveInput(rightSpacing)) missing.push("우측 단부 간격");
      if (
        hasPositiveInput(candidate.memberLengthMm) &&
        hasPositiveInput(leftLength) &&
        hasPositiveInput(rightLength) &&
        (leftLength ?? 0) + (rightLength ?? 0) > (candidate.memberLengthMm ?? 0)
      ) {
        missing.push("구간 길이 검토 필요");
      }
      if (
        hasPositiveInput(candidate.memberLengthMm) &&
        hasPositiveInput(leftLength) &&
        hasPositiveInput(rightLength) &&
        typeof centerLength === "number" &&
        Math.abs((leftLength ?? 0) + centerLength + (rightLength ?? 0) - (candidate.memberLengthMm ?? 0)) > 1
      ) {
        missing.push("구간 길이 검토 필요");
      }
    } else if (isBeamMain) {
      if (candidate.beamMainCalculationMode === "segmented_layout") {
        const hasSegmentCount = [
          candidate.beamMainTopLeftCount,
          candidate.beamMainTopCenterCount,
          candidate.beamMainTopRightCount,
          candidate.beamMainBottomLeftCount,
          candidate.beamMainBottomCenterCount,
          candidate.beamMainBottomRightCount
        ].some(hasPositiveInput);

        if (!hasSegmentCount && !hasPositiveInput(candidate.manualBarCount)) {
          missing.push("직접 본수");
        }
      } else if (!hasPositiveInput(candidate.manualBarCount)) {
        missing.push("직접 본수");
      }
    } else if (isBeamStirrupOrShear) {
      if (!hasPositiveInput(candidate.sectionWidthMm)) missing.push("보 폭");
      if (!hasPositiveInput(candidate.sectionDepthMm)) missing.push("보 춤");
      if (!hasPositiveInput(candidate.spacingMm)) missing.push("철근 개수 또는 늑근 간격");
    } else if (!hasSpacingOrDirectCount) {
      missing.push("철근 개수 또는 늑근 간격");
    }
  }

  if (candidate.memberType === "column") {
    if (candidate.position !== "main" && candidate.position !== "tie") {
      missing.push("철근 종류 주근/띠철근");
    }
    if (!hasPositiveInput(candidate.memberHeightMm)) missing.push("기둥 높이");
    if (!hasPositiveInput(candidate.sectionWidthMm)) missing.push("기둥 폭");
    if (!hasPositiveInput(candidate.sectionDepthMm)) missing.push("기둥 춤");
    if (candidate.position === "main") {
      if (!hasPositiveInput(candidate.manualBarCount)) {
        missing.push("철근 개수 또는 띠철근 간격");
      }
    } else if (candidate.position === "tie") {
      if (!hasSpacingOrDirectCount) missing.push("철근 개수 또는 띠철근 간격");
    } else if (!hasSpacingOrDirectCount) {
      missing.push("철근 개수 또는 띠철근 간격");
    }
  }

  if (candidate.memberType === "slab") {
    if (!["x_bottom", "y_bottom", "x_top", "y_top", "x", "y"].includes(candidate.position)) {
      missing.push("X/Y 방향 및 상부/하부");
    }
    if (!hasPositiveInput(candidate.slabLengthMm ?? candidate.memberLengthMm)) {
      missing.push("슬래브 길이");
    }
    if (!hasPositiveInput(candidate.slabWidthMm ?? candidate.sectionWidthMm)) {
      missing.push("슬래브 폭");
    }
    if (!hasPositiveInput(candidate.spacingMm)) missing.push("철근 간격");
  }

  if (candidate.memberType === "wall") {
    if (candidate.position !== "vertical" && candidate.position !== "horizontal") {
      missing.push("수직근/수평근");
    }
    if (!hasPositiveInput(candidate.wallLengthMm ?? candidate.memberLengthMm)) {
      missing.push("벽 길이");
    }
    if (!hasPositiveInput(candidate.wallHeightMm ?? candidate.memberHeightMm)) {
      missing.push("벽 높이");
    }
    if (!hasPositiveInput(candidate.spacingMm)) missing.push("철근 간격");
    if (!hasPositiveInput(candidate.faceCount)) missing.push("면수");
  }

  if (candidate.memberType === "unknown") {
    missing.push("부재 종류");
  }

  return missing;
}

export function recalculateRebarQuantityCandidate(
  candidate: RebarQuantityCandidateRecord
): RebarQuantityCandidateRecord {
  const unitWeight = getRebarUnitWeight(candidate.diameter) ?? candidate.unitWeightKgPerM;
  const memberCount = positiveOrDefault(candidate.memberCount, 1);
  const cover = nonNegativeOrDefault(candidate.coverMm, coverMm);
  const anchorage = nonNegativeOrDefault(candidate.anchorageLengthMm, defaultAnchorageLengthMm);
  const splice = nonNegativeOrDefault(candidate.spliceLengthMm, defaultSpliceLengthMm);
  const hook = nonNegativeOrDefault(candidate.hookLengthMm, defaultHookLengthMm);
  const deduction = nonNegativeOrDefault(candidate.deductionLengthMm, defaultDeductionLengthMm);
  const bend = nonNegativeOrDefault(candidate.bendCorrectionMm, defaultBendCorrectionMm);
  const lossRate = nonNegativeOrDefault(candidate.lossRate, defaultLossRate);
  const faceCount = positiveOrDefault(candidate.faceCount, defaultFaceCount);
  const barCountRule = candidate.barCountRule ?? "ceil_plus_one";
  const manualBarCount = positiveOrDefault(candidate.manualBarCount, 0);
  const effectiveRole = getEffectiveRebarRole(candidate);
  const base: RebarQuantityCandidateRecord = {
    ...candidate,
    unitWeightKgPerM: unitWeight,
    coverMm: cover,
    anchorageLengthMm: anchorage,
    spliceLengthMm: splice,
    hookLengthMm: hook,
    deductionLengthMm: deduction,
    bendCorrectionMm: bend,
    lossRate,
    faceCount,
    barCountRule,
    manualBarCount: manualBarCount || undefined,
    memberCount,
    specification: [candidate.diameter, memberTypeLabel[candidate.memberType], candidate.memberName]
      .filter(Boolean)
      .join(" / ")
  };

  const fail = (note: string, formula = "실무식 산출 조건 부족") => ({
    ...base,
    quantityKg: 0,
    quantityTon: 0,
    materialQuantityKg: 0,
    materialQuantityTon: 0,
    calculationFormula: formula,
    calculationBasis: [
      `${note} 피복, 정착, 이음, 갈고리, 공제, 절곡 보정값과 부재 치수를 확인해야 합니다.`,
      getGeneralRuleBasis(base)
    ]
      .filter(Boolean)
      .join(" "),
    quantityReviewRequired: true,
    note
  });

  if (!candidate.diameter || unitWeight <= 0) {
    return fail("철근 규격 또는 단위중량 확인 필요");
  }

  const missingRequiredInputsForTemplate = getMissingRebarRequiredInputLabels(candidate);

  if (missingRequiredInputsForTemplate.length > 0) {
    return fail(
      `필수 입력값 부족: ${missingRequiredInputsForTemplate.join(", ")}`,
      "필수 입력값 부족"
    );
  }

  if (candidate.memberType === "footing") {
    if (!candidate.footingWidthMm || !candidate.footingLengthMm) {
      return fail("기초 산출에는 폭, 길이, 간격이 필요합니다.");
    }

    const direction = candidate.position === "y" ? "y" : "x";
    const countDimension = direction === "x" ? candidate.footingWidthMm : candidate.footingLengthMm;
    const lengthDimension = direction === "x" ? candidate.footingLengthMm : candidate.footingWidthMm;

    if (!candidate.spacingMm && manualBarCount > 0) {
      const singleBarLengthM = Math.max(
        0,
        lengthDimension - 2 * cover + anchorage + splice + hook + bend - deduction
      ) / 1000;
      const layer = candidate.footingLayer === "bottom" ? "하부근" : "상부근";

      return buildQuantityResult({
        base: {
          ...base,
          position: direction,
          footingLayer: candidate.footingLayer ?? "top"
        },
        barCount: manualBarCount,
        singleBarLengthM,
        formula:
          `${layer} ${direction.toUpperCase()}방향: 직접입력 ${manualBarCount}본 x ` +
          `${roundQuantity(singleBarLengthM, 3)}m x ${memberCount}EA x ${faceCount}면 x ${unitWeight}kg/m`,
        basis:
          "기초: 사용자가 직접 입력한 본수와 기초 치수로 정미중량을 산출합니다. 간격 또는 직접 본수의 출처를 도면에서 확인하세요."
      });
    }

    if (!candidate.spacingMm) {
      return fail("기초 산출에는 폭, 길이, 간격 또는 직접 본수가 필요합니다.");
    }

    const effectiveCountDimension = Math.max(0, countDimension - 2 * cover);
    const barCount = resolveCountByRule(
      effectiveCountDimension / candidate.spacingMm,
      barCountRule,
      manualBarCount
    );
    const singleBarLengthM = Math.max(
      0,
      lengthDimension - 2 * cover + anchorage + splice + hook + bend - deduction
    ) / 1000;
    const countPreview = getCountRulePreview(
      `(${countDimension} - 2x${cover}) / ${candidate.spacingMm}`,
      barCountRule,
      manualBarCount
    );
    const layer = candidate.footingLayer === "bottom" ? "하부근" : "상부근";

    return buildQuantityResult({
      base: {
        ...base,
        position: direction,
        footingLayer: candidate.footingLayer ?? "top"
      },
      barCount,
      singleBarLengthM,
      formula:
        `${layer} ${direction.toUpperCase()}방향: ${countPreview}본 x ` +
        `${roundQuantity(singleBarLengthM, 3)}m x ${memberCount}회 x ${faceCount}면 x ${unitWeight}kg/m`,
      basis:
        "기초: 본수는 (기초 폭 또는 길이 - 2x피복) / 간격 기준, 1본 길이는 반대 방향 치수 - 2x피복 + 정착 + 이음 + 갈고리/절곡 보정입니다."
    });
  }

  if (candidate.memberType === "beam") {
    if (!candidate.memberLengthMm) {
      return fail("보 산출에는 보 길이가 필요합니다.");
    }

    const isStirrup =
      effectiveRole === "stirrup" ||
      effectiveRole === "shear" ||
      (effectiveRole === "unknown" && Boolean(candidate.spacingMm && !candidate.barCount));

    if (isStirrup) {
      if (!candidate.sectionWidthMm || !candidate.sectionDepthMm) {
        return fail("보 늑근 산출에는 보 폭과 보 춤이 필요합니다.");
      }

      if ((candidate.beamStirrupCalculationMode ?? "segmented_spacing") === "segmented_spacing") {
        const endZoneMode = candidate.beamStirrupEndZoneMode ?? "ratio";
        const endZoneRatio =
          typeof candidate.beamStirrupEndZoneRatio === "number" &&
          Number.isFinite(candidate.beamStirrupEndZoneRatio) &&
          candidate.beamStirrupEndZoneRatio >= 0
            ? candidate.beamStirrupEndZoneRatio
            : 0.25;
        const centerSpacing = candidate.beamStirrupCenterSpacingMm ?? candidate.spacingMm;
        const leftSpacing =
          candidate.beamStirrupLeftSpacingMm ??
          (candidate.beamStirrupUseAutoEndSpacing !== false && centerSpacing
            ? Math.max(1, Math.floor(centerSpacing * beamStirrupEndSpacingFactor))
            : undefined);
        const rightSpacing =
          candidate.beamStirrupRightSpacingMm ??
          (candidate.beamStirrupUseAutoEndSpacing !== false && centerSpacing
            ? Math.max(1, Math.floor(centerSpacing * beamStirrupEndSpacingFactor))
            : undefined);
        const leftEndLength = resolveBeamStirrupEndLength(
          endZoneMode,
          candidate.memberLengthMm,
          candidate.sectionDepthMm,
          endZoneRatio,
          candidate.beamStirrupLeftEndLengthMm
        );
        const rightEndLength = resolveBeamStirrupEndLength(
          endZoneMode,
          candidate.memberLengthMm,
          candidate.sectionDepthMm,
          endZoneRatio,
          candidate.beamStirrupRightEndLengthMm
        );
        const segmentLengthExceeded = leftEndLength + rightEndLength > candidate.memberLengthMm;
        const centerLength = Math.max(0, candidate.memberLengthMm - leftEndLength - rightEndLength);
        const leftCount = resolveBeamStirrupSegmentCount(
          leftEndLength,
          leftSpacing,
          candidate.beamStirrupLeftCountOverride,
          "ceil_plus_one"
        );
        const centerCount = resolveBeamStirrupSegmentCount(
          centerLength,
          centerSpacing,
          candidate.beamStirrupCenterCountOverride,
          "floor"
        );
        const rightCount = resolveBeamStirrupSegmentCount(
          rightEndLength,
          rightSpacing,
          candidate.beamStirrupRightCountOverride,
          "ceil_plus_one"
        );
        const directTotalCount = manualBarCount > 0 ? manualBarCount : 0;
        const totalCount = directTotalCount > 0 ? directTotalCount : leftCount + centerCount + rightCount;
        const unitLengthMm = Math.max(
          0,
          2 * (candidate.sectionWidthMm - 2 * cover) +
            2 * (candidate.sectionDepthMm - 2 * cover) +
            hook +
            bend
        );
        const singleBarLengthM = unitLengthMm / 1000;
        const netWeightKg =
          singleBarLengthM * totalCount * unitWeight * memberCount * faceCount;
        const materialWeightKg = netWeightKg * (1 + lossRate);
        const spacingMissing = directTotalCount <= 0 && (!leftSpacing || !centerSpacing || !rightSpacing);
        const invalid =
          segmentLengthExceeded ||
          spacingMissing ||
          totalCount <= 0 ||
          singleBarLengthM <= 0 ||
          netWeightKg <= 0;
        const segmentNote = [
          segmentLengthExceeded ? "구간 길이 검토 필요" : null,
          spacingMissing ? "단부/중앙부 간격 확인 필요" : null,
          directTotalCount > 0 ? "직접 본수를 총 늑근 본수로 우선 적용합니다." : null,
          "단부/중앙부 구간 길이와 간격은 보 배근상세 및 구조평면도 확인 후 보정해야 합니다.",
          "경계 중복 방지를 위해 좌측 단부는 시작 스터럽을 포함하고 중앙부/우측 단부는 floor(length / spacing)을 기본 적용합니다."
        ]
          .filter(Boolean)
          .join(" ");

        return {
          ...base,
          position: "stirrup",
          beamStirrupCalculationMode: "segmented_spacing",
          beamStirrupEndZoneMode: endZoneMode,
          beamStirrupEndZoneRatio: endZoneRatio,
          beamStirrupLeftEndLengthMm: roundQuantity(leftEndLength, 1),
          beamStirrupRightEndLengthMm: roundQuantity(rightEndLength, 1),
          beamStirrupCenterLengthMm: roundQuantity(centerLength, 1),
          beamStirrupLeftSpacingMm: leftSpacing,
          beamStirrupCenterSpacingMm: centerSpacing,
          beamStirrupRightSpacingMm: rightSpacing,
          beamStirrupLeftCount: leftCount,
          beamStirrupCenterCount: centerCount,
          beamStirrupRightCount: rightCount,
          beamStirrupTotalCount: totalCount,
          beamStirrupUnitLengthMm: roundQuantity(unitLengthMm, 1),
          beamStirrupSegmentNote: segmentNote,
          barCount: totalCount,
          singleBarLengthM: roundQuantity(singleBarLengthM, 3),
          quantityKg: invalid ? 0 : roundQuantity(netWeightKg, 2),
          quantityTon: invalid ? 0 : roundQuantity(netWeightKg / 1000, 4),
          materialQuantityKg: invalid ? 0 : roundQuantity(materialWeightKg, 2),
          materialQuantityTon: invalid ? 0 : roundQuantity(materialWeightKg / 1000, 4),
          calculationFormula:
            "현재 산출 모드: 보 늑근/전단근 - 단부·중앙부 분리. " +
            "보 늑근 구간별 산출 - " +
            `좌측 단부: 길이 ${roundQuantity(leftEndLength, 1)}mm / 간격 ${leftSpacing ?? "-"}mm / 본수 ${leftCount}본, ` +
            `중앙부: 길이 ${roundQuantity(centerLength, 1)}mm / 간격 ${centerSpacing ?? "-"}mm / 본수 ${centerCount}본, ` +
            `우측 단부: 길이 ${roundQuantity(rightEndLength, 1)}mm / 간격 ${rightSpacing ?? "-"}mm / 본수 ${rightCount}본, ` +
            `총 늑근 본수 ${totalCount}본, 늑근 1개 길이 [2x(보 폭 ${candidate.sectionWidthMm}-2x피복 ${cover})+2x(보 춤 ${candidate.sectionDepthMm}-2x피복 ${cover})+갈고리 ${hook}+절곡 ${bend}]/1000 = ${roundQuantity(singleBarLengthM, 3)}m, ` +
            `정미중량 ${roundQuantity(singleBarLengthM, 3)}m x ${totalCount}본 x ${unitWeight}kg/m x ${memberCount}회 x ${faceCount}면 = ${roundQuantity(netWeightKg, 2)}kg, ` +
            `자재중량 = 정미중량 x (1 + LOSS율 ${lossRate}) = ${roundQuantity(materialWeightKg, 2)}kg`,
          calculationBasis: [
            "보 늑근/스터럽: 단부 구간 + 중앙부 구간 분리 산출입니다.",
            "좌측 단부는 floor(단부 길이 / 단부 간격) + 1, 중앙부와 우측 단부는 경계 중복 방지를 위해 floor(구간 길이 / 간격)을 기본 적용합니다.",
            "직접 본수 override가 있으면 해당 구간 본수를 우선 사용합니다.",
            "늑근 1개 길이 = 2x(보 폭-2피복)+2x(보 춤-2피복)+갈고리+절곡보정입니다.",
            "정미중량은 늑근 1개 길이 x 총 본수 x 단위중량 x 반복개수 x 면수입니다.",
            "자재중량은 정미중량 x (1 + LOSS율)입니다.",
            segmentNote,
            getGeneralRuleBasis(base)
          ]
            .filter(Boolean)
            .join(" "),
          quantityReviewRequired: invalid,
          note: invalid ? "보 늑근 구간별 산출 조건 확인 필요" : "보 늑근 구간별 실무식 적용"
        };
      }

      if (
        !candidate.sectionWidthMm ||
        !candidate.sectionDepthMm ||
        (!candidate.spacingMm && manualBarCount <= 0)
      ) {
        return fail("보 늑근 산출에는 보 폭, 보 춤, 간격 또는 직접 본수가 필요합니다.");
      }

      const barCount = candidate.spacingMm
        ? manualBarCount > 0
          ? manualBarCount
          : resolveCountByRule(
            candidate.memberLengthMm / candidate.spacingMm,
            barCountRule,
            manualBarCount
          )
        : manualBarCount;
      const singleBarLengthM = Math.max(
        0,
        2 * (candidate.sectionWidthMm - 2 * cover) +
          2 * (candidate.sectionDepthMm - 2 * cover) +
          hook +
          bend -
          deduction
      ) / 1000;
      const countPreview = candidate.spacingMm
        ? manualBarCount > 0
          ? `직접입력 ${manualBarCount}`
          : getCountRulePreview(
            `${candidate.memberLengthMm} / ${candidate.spacingMm}`,
            barCountRule,
            manualBarCount
          )
        : `직접입력 ${manualBarCount}`;

      return buildQuantityResult({
        base: { ...base, position: "stirrup" },
        barCount,
        singleBarLengthM,
        formula:
          "현재 산출 모드: 보 늑근/전단근 - 단일 간격. " +
          `보 늑근: ${countPreview}본 x ` +
          `[2x(${candidate.sectionWidthMm}-2x${cover})+2x(${candidate.sectionDepthMm}-2x${cover})+갈고리 ${hook}+절곡 ${bend}]/1000m ` +
          `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
        basis:
          "보 늑근: 개수는 보 길이 / 간격 기준, 1개 길이는 2x(보 폭 - 2x피복) + 2x(보 춤 - 2x피복) + 갈고리 + 절곡 보정입니다."
      });
    }

    const beamMainMode: BeamMainCalculationMode = candidate.beamMainCalculationMode ?? "single_length";

    if (beamMainMode === "segmented_layout") {
      const endZoneMode = candidate.beamMainEndZoneMode ?? "ratio";
      const endZoneRatio =
        typeof candidate.beamMainEndZoneRatio === "number" &&
        Number.isFinite(candidate.beamMainEndZoneRatio) &&
        candidate.beamMainEndZoneRatio >= 0
          ? candidate.beamMainEndZoneRatio
          : 0.25;
      const leftEndLength = resolveBeamStirrupEndLength(
        endZoneMode,
        candidate.memberLengthMm,
        candidate.sectionDepthMm ?? 0,
        endZoneRatio,
        candidate.beamMainLeftEndLengthMm
      );
      const rightEndLength = resolveBeamStirrupEndLength(
        endZoneMode,
        candidate.memberLengthMm,
        candidate.sectionDepthMm ?? 0,
        endZoneRatio,
        candidate.beamMainRightEndLengthMm
      );
      const centerLength = Math.max(0, candidate.memberLengthMm - leftEndLength - rightEndLength);
      const segmentLengthExceeded = leftEndLength + rightEndLength > candidate.memberLengthMm;
      const topLeftCount = positiveOrDefault(candidate.beamMainTopLeftCount, 0);
      const topCenterCount = positiveOrDefault(candidate.beamMainTopCenterCount, 0);
      const topRightCount = positiveOrDefault(candidate.beamMainTopRightCount, 0);
      const bottomLeftCount = positiveOrDefault(candidate.beamMainBottomLeftCount, 0);
      const bottomCenterCount = positiveOrDefault(candidate.beamMainBottomCenterCount, 0);
      const bottomRightCount = positiveOrDefault(candidate.beamMainBottomRightCount, 0);
      const totalCount =
        topLeftCount +
        topCenterCount +
        topRightCount +
        bottomLeftCount +
        bottomCenterCount +
        bottomRightCount;
      const segmentAdjustmentMm = anchorage + splice + hook + bend - deduction;
      const leftSingleLengthM = Math.max(0, leftEndLength + segmentAdjustmentMm) / 1000;
      const centerSingleLengthM = Math.max(0, centerLength + segmentAdjustmentMm) / 1000;
      const rightSingleLengthM = Math.max(0, rightEndLength + segmentAdjustmentMm) / 1000;
      const totalBarLengthM =
        leftSingleLengthM * (topLeftCount + bottomLeftCount) +
        centerSingleLengthM * (topCenterCount + bottomCenterCount) +
        rightSingleLengthM * (topRightCount + bottomRightCount);
      const averageBarLengthM = totalCount > 0 ? totalBarLengthM / totalCount : 0;
      const netWeightKg = totalBarLengthM * unitWeight * memberCount * faceCount;
      const materialWeightKg = netWeightKg * (1 + lossRate);
      const invalid =
        segmentLengthExceeded ||
        totalCount <= 0 ||
        totalBarLengthM <= 0 ||
        netWeightKg <= 0;
      const segmentNote = [
        segmentLengthExceeded ? "구간 길이 검토 필요" : null,
        "상부/하부 주근을 좌측 단부, 중앙부, 우측 단부로 분리 산출합니다.",
        "단부와 중앙부의 상하부 배근이 다른 보 일람표는 각 구간 본수를 별도 입력해 보정해야 합니다."
      ]
        .filter(Boolean)
        .join(" ");

      return {
        ...base,
        position: "main",
        rebarRole: "main",
        beamMainCalculationMode: "segmented_layout",
        beamMainEndZoneMode: endZoneMode,
        beamMainEndZoneRatio: endZoneRatio,
        beamMainLeftEndLengthMm: roundQuantity(leftEndLength, 1),
        beamMainCenterLengthMm: roundQuantity(centerLength, 1),
        beamMainRightEndLengthMm: roundQuantity(rightEndLength, 1),
        beamMainTopLeftCount: topLeftCount || undefined,
        beamMainTopCenterCount: topCenterCount || undefined,
        beamMainTopRightCount: topRightCount || undefined,
        beamMainBottomLeftCount: bottomLeftCount || undefined,
        beamMainBottomCenterCount: bottomCenterCount || undefined,
        beamMainBottomRightCount: bottomRightCount || undefined,
        beamMainTotalCount: totalCount,
        beamMainSegmentNote: segmentNote,
        barCount: totalCount,
        singleBarLengthM: roundQuantity(averageBarLengthM, 3),
        quantityKg: invalid ? 0 : roundQuantity(netWeightKg, 2),
        quantityTon: invalid ? 0 : roundQuantity(netWeightKg / 1000, 4),
        materialQuantityKg: invalid ? 0 : roundQuantity(materialWeightKg, 2),
        materialQuantityTon: invalid ? 0 : roundQuantity(materialWeightKg / 1000, 4),
        calculationFormula:
          "현재 산출 모드: 보 주근 - 단부·중앙부 상하부 분리. " +
          `좌측 단부 ${roundQuantity(leftEndLength, 1)}mm: 상부 ${topLeftCount}본 / 하부 ${bottomLeftCount}본, ` +
          `중앙부 ${roundQuantity(centerLength, 1)}mm: 상부 ${topCenterCount}본 / 하부 ${bottomCenterCount}본, ` +
          `우측 단부 ${roundQuantity(rightEndLength, 1)}mm: 상부 ${topRightCount}본 / 하부 ${bottomRightCount}본, ` +
          `총 길이 ${roundQuantity(totalBarLengthM, 3)}m x ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면 = ${roundQuantity(netWeightKg, 2)}kg, ` +
          `자재중량 = 정미중량 x (1 + LOSS율 ${lossRate}) = ${roundQuantity(materialWeightKg, 2)}kg`,
        calculationBasis: [
          "보 주근: 단부와 중앙부의 상부/하부 배근이 다를 때 구간별 본수 x 구간 길이로 정미중량을 산출합니다.",
          "각 구간 1본 길이는 구간 길이 + 정착 + 이음 + 갈고리 + 절곡보정 - 공제입니다.",
          "자재중량은 정미중량 x (1 + LOSS율)입니다.",
          segmentNote,
          getGeneralRuleBasis(base)
        ]
          .filter(Boolean)
          .join(" "),
        quantityReviewRequired: invalid,
        note: invalid ? "보 주근 구간별 산출 조건 확인 필요" : "보 주근 구간별 실무식 적용"
      };
    }

    const barCount = manualBarCount;
    const singleBarLengthM =
      Math.max(0, candidate.memberLengthMm + anchorage + splice + hook + bend - deduction) / 1000;

    return buildQuantityResult({
      base: { ...base, position: "main", rebarRole: "main" },
      barCount,
      singleBarLengthM,
      formula:
        "현재 산출 모드: 보 주근. " +
        `보 주근: ${barCount}본 x ${roundQuantity(singleBarLengthM, 3)}m x ` +
        `${unitWeight}kg/m x ${memberCount}회 x ${faceCount}면`,
      basis:
        "보 주근: 1본 길이 = 보 길이 + 정착 + 이음 + 갈고리 + 절곡보정 - 공제이며, 정미중량은 1본 길이 x 직접 본수 x 단위중량 x 반복개수 x 면수입니다."
    });
  }

  if (candidate.memberType === "column") {
    if (!candidate.memberHeightMm) {
      return fail("기둥 산출에는 기둥 높이가 필요합니다.");
    }

    const isTie =
      candidate.position === "tie" ||
      (candidate.position === "unknown" && Boolean(candidate.spacingMm && !candidate.barCount));

    if (isTie) {
      if (
        !candidate.sectionWidthMm ||
        !candidate.sectionDepthMm ||
        (!candidate.spacingMm && manualBarCount <= 0)
      ) {
        return fail("기둥 띠철근 산출에는 기둥 폭, 기둥 춤, 간격 또는 직접 본수가 필요합니다.");
      }

      const barCount = candidate.spacingMm
        ? resolveCountByRule(
            candidate.memberHeightMm / candidate.spacingMm,
            barCountRule,
            manualBarCount
          )
        : manualBarCount;
      const singleBarLengthM = Math.max(
        0,
        2 * (candidate.sectionWidthMm - 2 * cover) +
          2 * (candidate.sectionDepthMm - 2 * cover) +
          hook +
          bend -
          deduction
      ) / 1000;
      const countPreview = candidate.spacingMm
        ? getCountRulePreview(
            `${candidate.memberHeightMm} / ${candidate.spacingMm}`,
            barCountRule,
            manualBarCount
          )
        : `직접입력 ${manualBarCount}`;

      return buildQuantityResult({
        base: { ...base, position: "tie" },
        barCount,
        singleBarLengthM,
        formula:
          `기둥 띠철근: ${countPreview}본 x ` +
          `[2x(${candidate.sectionWidthMm}-2x${cover})+2x(${candidate.sectionDepthMm}-2x${cover})+갈고리 ${hook}+절곡 ${bend}]/1000m ` +
          `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
        basis:
          "기둥 띠철근: 개수는 기둥 높이 / 간격 기준, 1개 길이는 2x(기둥 폭 - 2x피복) + 2x(기둥 춤 - 2x피복) + 갈고리 + 절곡 보정입니다."
      });
    }

    const barCount = positiveOrDefault(candidate.barCount ?? manualBarCount, 0);
    const singleBarLengthM = Math.max(0, candidate.memberHeightMm + anchorage + splice - deduction) / 1000;

    return buildQuantityResult({
      base: { ...base, position: candidate.position === "unknown" ? "main" : candidate.position },
      barCount,
      singleBarLengthM,
      formula:
        `기둥 주근: ${barCount}본 x ${roundQuantity(singleBarLengthM, 3)}m x ` +
        `${memberCount}회 x ${faceCount}면 x ${unitWeight}kg/m`,
      basis: "기둥 주근: 본수 x (기둥 높이 + 상하 정착 + 이음) x 단위중량 x 반복 개수입니다."
    });
  }

  if (candidate.memberType === "slab") {
    const slabLength = candidate.slabLengthMm ?? candidate.memberLengthMm;
    const slabWidth = candidate.slabWidthMm ?? candidate.sectionWidthMm;
    const directLengthM = nonNegativeOrDefault(candidate.directBarLengthMm, 0) / 1000;

    if (isDirectShapePosition(candidate.position) && directLengthM > 0) {
      const barCount = positiveOrDefault(manualBarCount || candidate.barCount, 0);

      return buildQuantityResult({
        base,
        barCount,
        singleBarLengthM: directLengthM,
        formula:
          `${positionLabel[candidate.position]}: 직접입력 ${barCount}본 x ${roundQuantity(directLengthM, 3)}m ` +
          `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
        basis:
          "슬래브 배력근/개구부 보강근 1차 템플릿: 직접 본수와 직접 산출길이로 정미중량을 산출합니다."
      });
    }

    if (!slabLength || !slabWidth || !candidate.spacingMm) {
      return fail("슬래브 산출에는 슬래브 길이, 폭, 간격이 필요합니다.");
    }

    const direction = getDirectionType(candidate.position) ?? "x";
    const countDimension = direction === "x" ? slabWidth : slabLength;
    const lengthDimension = direction === "x" ? slabLength : slabWidth;
    const effectiveCountDimension = Math.max(0, countDimension - 2 * cover);
    const barCount = resolveCountByRule(
      effectiveCountDimension / candidate.spacingMm,
      barCountRule,
      manualBarCount
    );
    const singleBarLengthM = Math.max(
      0,
      lengthDimension - 2 * cover + anchorage + splice + hook + bend - deduction
    ) / 1000;
    const countPreview = getCountRulePreview(
      `(${countDimension} - 2x${cover}) / ${candidate.spacingMm}`,
      barCountRule,
      manualBarCount
    );
    const label =
      candidate.position === "y_bottom" || candidate.position === "y_top"
        ? positionLabel[candidate.position]
        : candidate.position === "x_top" ||
            candidate.position === "x_bottom" ||
            candidate.position === "distribution"
          ? positionLabel[candidate.position]
          : direction === "x"
            ? "X방향 철근"
            : "Y방향 철근";

    return buildQuantityResult({
      base: {
        ...base,
        slabLengthMm: slabLength,
        slabWidthMm: slabWidth,
        position: candidate.position === "unknown" ? "x_bottom" : candidate.position
      },
      barCount,
      singleBarLengthM,
      formula:
        `슬래브 ${label}: ${countPreview}본 x ` +
        `(${lengthDimension}-2x${cover}+정착 ${anchorage}+이음 ${splice}+갈고리 ${hook}+절곡 ${bend})/1000m ` +
        `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
      basis:
        "슬래브: X방향은 본수 산정에 슬래브 폭, 1본 길이에 슬래브 길이를 쓰고, Y방향은 길이와 폭을 반대로 적용합니다."
    });
  }

  if (candidate.memberType === "wall") {
    const wallLength = candidate.wallLengthMm ?? candidate.memberLengthMm;
    const wallHeight = candidate.wallHeightMm ?? candidate.memberHeightMm;
    const directLengthM = nonNegativeOrDefault(candidate.directBarLengthMm, 0) / 1000;

    if (isDirectShapePosition(candidate.position) && directLengthM > 0) {
      const barCount = positiveOrDefault(manualBarCount || candidate.barCount, 0);

      return buildQuantityResult({
        base,
        barCount,
        singleBarLengthM: directLengthM,
        formula:
          `벽체 ${positionLabel[candidate.position]}: 직접입력 ${barCount}본 x ${roundQuantity(directLengthM, 3)}m ` +
          `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
        basis:
          "벽체 U-BAR/C-BAR/개구부 보강근 1차 템플릿: 직접 본수와 직접 산출길이로 정미중량을 산출합니다. 사용자 보정값 기반입니다."
      });
    }

    if (!wallLength || !wallHeight || !candidate.spacingMm) {
      return fail("벽체 산출에는 벽 길이, 벽 높이, 간격이 필요합니다.");
    }

    const isHorizontal = candidate.position === "horizontal";
    const countDimension = isHorizontal ? wallHeight : wallLength;
    const lengthDimension = isHorizontal ? wallLength : wallHeight;
    const effectiveCountDimension = Math.max(0, countDimension - 2 * cover);
    const barCount = resolveCountByRule(
      effectiveCountDimension / candidate.spacingMm,
      barCountRule,
      manualBarCount
    );
    const singleBarLengthM = Math.max(
      0,
      lengthDimension - 2 * cover + anchorage + splice + hook + bend - deduction
    ) / 1000;
    const countPreview = getCountRulePreview(
      `(${countDimension} - 2x${cover}) / ${candidate.spacingMm}`,
      barCountRule,
      manualBarCount
    );
    const position = candidate.position === "horizontal" ? "horizontal" : "vertical";

    return buildQuantityResult({
      base: {
        ...base,
        wallLengthMm: wallLength,
        wallHeightMm: wallHeight,
        position
      },
      barCount,
      singleBarLengthM,
      formula:
        `벽체 ${positionLabel[position]}: ${countPreview}본 x ` +
        `(${lengthDimension}-2x${cover}+정착 ${anchorage}+이음 ${splice}+갈고리 ${hook}+절곡 ${bend})/1000m ` +
        `x ${candidate.diameter} ${unitWeight}kg/m x ${memberCount}EA x ${faceCount}면`,
      basis:
        "벽체: 수직근은 본수 산정에 벽 길이, 1본 길이에 벽 높이를 쓰고, 수평근은 높이와 길이를 반대로 적용합니다. 면수는 양면 배근 검토값으로 반영합니다. 사용자 보정값 기반입니다."
    });
  }

  return fail("부재 종류 확인 필요");
}

export function applyRebarCandidateReviewStatus(
  candidate: RebarQuantityCandidateRecord,
  reviewStatus: RebarReviewStatus
): RebarQuantityCandidateRecord {
  const recalculated = recalculateRebarQuantityCandidate(candidate);
  const hasCalculatedQuantity =
    Number.isFinite(recalculated.quantityKg) && recalculated.quantityKg > 0;

  if (reviewStatus !== "accepted") {
    return {
      ...recalculated,
      reviewStatus
    };
  }

  return {
    ...recalculated,
    quantityKg: hasCalculatedQuantity ? recalculated.quantityKg : 0,
    quantityTon: hasCalculatedQuantity ? roundQuantity(recalculated.quantityKg / 1000, 4) : 0,
    quantityReviewRequired: !hasCalculatedQuantity,
    reviewStatus: "accepted"
  };
}

export function buildRebarQuantityCandidates(
  specs: RebarSpecRecord[]
): RebarQuantityCandidateRecord[] {
  const candidates = specs.reduce<RebarQuantityCandidateRecord[]>((records, spec) => {
    const unitWeight = spec.diameter ? getRebarUnitWeight(spec.diameter) : null;

    if (!spec.diameter || !unitWeight) {
      return records;
    }

    const candidate = createReviewCandidate(spec, unitWeight, "철근 수량 산출 조건 검토 필요");

    return [...records, recalculateRebarQuantityCandidate(candidate)];
  }, []);

  return sortRebarQuantityCandidatesBySource(dedupeRebarQuantityCandidates(candidates));
}

export function dedupeRebarQuantityCandidates(
  candidates: RebarQuantityCandidateRecord[]
): RebarQuantityCandidateRecord[] {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = [
      candidate.sourceFileName,
      candidate.sourcePage,
      candidate.memberName,
      candidate.memberType,
      candidate.position,
      candidate.diameter,
      candidate.barCount ?? "",
      candidate.spacingMm ?? "",
      candidate.memberLengthMm ?? candidate.memberHeightMm ?? "",
      normalizeSnippet(candidate.sourceTextSnippet ?? candidate.rawText)
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
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
    .map((candidate) => {
      const recalculated = recalculateRebarQuantityCandidate(candidate);
      const hasCalculatedQuantity =
        Number.isFinite(recalculated.quantityKg) &&
        recalculated.quantityKg > 0 &&
        !recalculated.quantityReviewRequired;
      const quantityKg = hasCalculatedQuantity ? recalculated.quantityKg : 0;
      const checklistValues = Object.values(recalculated.reviewChecklist ?? {});
      const checklistTotal = checklistValues.length;
      const checklistCompleted = checklistValues.filter(Boolean).length;
      const reviewCompleteness =
        recalculated.reviewCompleteness ??
        (checklistTotal === 0
          ? "not_started"
          : checklistCompleted === checklistTotal
            ? "complete"
            : checklistCompleted > 0
              ? "partial"
              : "not_started");
      const reviewCompletenessLabel =
        reviewCompleteness === "complete"
          ? "검토 완료"
          : reviewCompleteness === "partial"
            ? "일부 검토 미완료"
            : "검토 전";
      const checklistNote =
        checklistTotal > 0 ? `체크리스트 ${checklistCompleted}/${checklistTotal}` : null;
      const wallDetailNote =
        recalculated.memberType === "wall" ? "배근 상세 확인 필요 / 사용자 보정값 기반" : null;
      const beamStirrupSegmentBasis = getBeamStirrupSegmentBasis(recalculated);

      return {
        id: `rebar-estimate-${candidate.id}`,
        drawingFileId: `rebar-${candidate.sourceFileName ?? "uploaded-pdf"}`,
        drawingPageId: `rebar-page-${candidate.sourcePage ?? "unknown"}`,
        standardItemId: "rebar-quantity-rule",
        workCategory: "철근콘크리트공사",
        itemName: "철근 가공 및 조립",
        specification: [
          recalculated.diameter,
          memberTypeLabel[recalculated.memberType],
          recalculated.memberName
        ]
          .filter(Boolean)
          .join(" / "),
        quantity: quantityKg,
        unit: "kg",
        calculationBasis: recalculated.calculationFormula,
        sourceNote: [
          `정미중량(품셈 가공/조립 기준): ${quantityKg}kg`,
          recalculated.calculationBasis,
          beamStirrupSegmentBasis,
          typeof recalculated.materialQuantityKg === "number"
            ? `자재중량(LOSS 포함): ${recalculated.materialQuantityKg}kg`
            : null,
          reviewCompletenessLabel,
          checklistNote,
          recalculated.sourcePage ? `출처페이지: PDF p.${recalculated.sourcePage}` : null,
          recalculated.approvedReason ?? "사용자 검토 후 승인",
          recalculated.reviewNote ? `검토메모: ${recalculated.reviewNote}` : null,
          recalculated.appliedGeneralRuleIds?.length
            ? `구조일반사항 적용: ${recalculated.appliedGeneralRuleIds.join(", ")}`
            : null,
          recalculated.generalRuleNotes?.length
            ? `구조일반사항 메모: ${recalculated.generalRuleNotes.join(" / ")}`
            : null,
          wallDetailNote
        ]
          .filter(Boolean)
          .join(" / "),
        reviewStatus: "accepted",
        standardItemName: "철근 가공 및 조립",
        drawingNo: recalculated.sourcePage ? `PDF p.${recalculated.sourcePage}` : "",
        drawingTitle: "구조일람표 기반 철근 수량 산출 후보",
        remark: hasCalculatedQuantity
          ? [
              "rebar_quantity",
              "사용자 검토 후 승인",
              reviewCompletenessLabel,
              recalculated.appliedGeneralRuleIds?.length ? "구조일반사항 추천값 참고" : null,
              recalculated.generalRuleReviewRequired ? "구조일반사항 표 확인 필요" : null,
              beamStirrupSegmentBasis ? "보 늑근 단부/중앙부 분리 산출" : null,
              wallDetailNote
            ]
              .filter(Boolean)
              .join(" / ")
          : [
              "rebar_quantity",
              "수량 확인 필요",
              reviewCompletenessLabel,
              recalculated.appliedGeneralRuleIds?.length ? "구조일반사항 추천값 참고" : null,
              recalculated.generalRuleReviewRequired ? "구조일반사항 표 확인 필요" : null,
              beamStirrupSegmentBasis ? "보 늑근 단부/중앙부 분리 산출" : null,
              wallDetailNote
            ]
              .filter(Boolean)
              .join(" / "),
        sourceCandidateId: recalculated.id,
        sourceFileName: recalculated.sourceFileName ?? null,
        sourcePage: recalculated.sourcePage ?? null,
        quantityReviewRequired: !hasCalculatedQuantity,
        matchSource: "rebar",
        standardCode: null
      };
    });
}

export function getRebarMemberTypeLabel(memberType: RebarMemberType): string {
  return memberTypeLabel[memberType];
}

export function getRebarPositionLabel(position: RebarPosition): string {
  return positionLabel[position];
}
