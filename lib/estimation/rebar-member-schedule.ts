import {
  getRebarUnitWeight,
  normalizeRebarDiameter,
  parseRebarCountPattern,
  parseRebarSpacingPattern,
  parseSectionSize,
  recalculateRebarQuantityCandidate
} from "@/lib/estimation/rebar-quantity";
import type {
  DrawingSheetIndexRecord,
  PdfTextExtractionResult,
  RebarMemberScheduleRecord,
  RebarMemberType,
  RebarPlanReferenceRecord,
  RebarPosition,
  RebarQuantityCandidateRecord
} from "@/lib/estimation/types";

const koreanRcScheduleTitlePattern =
  /철근\s*콘크리트\s*(?:슬라브|슬래브|보|기둥|기초|벽체)\s*일람표/i;
const koreanNonRcSectionTerminatorPattern =
  /데크\s*슬라브|데크\s*PL|베이스\s*플레이트|베이스플레이트|앵커\s*볼트/i;

const scheduleTitlePattern =
  /구조일람표|슬라브\s*일람표|슬래브\s*일람표|보\s*일람표|기둥\s*일람표|기초\s*일람표|베이스플레이트|STRUCTURAL SCHEDULE|BEAM SCHEDULE|COLUMN SCHEDULE|FOOTING SCHEDULE|SLAB SCHEDULE/i;
const planTitlePattern = /구조평면도|FOUNDATION PLAN|FRAMING PLAN|SLAB PLAN|STRUCTURAL PLAN/i;
const notePattern =
  /구조\s*일반사항|GENERAL NOTE|NOTE|정착|이음|갈고리|피복|SD400|SD500|fy|fck|표준갈고리|A급\s*이음|B급\s*이음|철근\s*순간격|설계기준강도/i;
const memberNamePattern =
  /\b(?:\d{0,2}(?:NFG|NMF|NPC|NS|DS|RW|NF|FG|PC|G|B|C|F|W)[A-Z]?\d{1,3}[A-Z]?|[A-Z]{1,3}\d{1,3}[A-Z]?)\b/g;
const basePlateContextPattern =
  /BASE\s*PLATE|ANCHOR\s*BOLT|RIB\s*PLATE|PEDESTAL|베이스플레이트|철골/i;
const basePlateMemberPattern = /^(?:NSC|BP)\d/i;
const deckSlabContextPattern =
  /DECK\s*SLAB|DECK\s*TYPE|DECK\s*PL|LATTICE|CAMBER|SUPPORT|NONE-1|NONE-2|데크\s*슬라브/i;
const deckSlabMemberPattern = /^(?:DS|SD)\d/i;
const explicitWallSchedulePattern = /WALL\s*SCHEDULE|WALL\s*REBAR|벽체\s*배근|벽체\s*일람/i;

const nonRcSectionTerminatorPattern =
  /데크\s*슬라브|DECK\s*SLAB|DECK\s*PL|DECK\s*TYPE|LATTICE|CAMBER|SUPPORT|베이스\s*플레이트|베이스플레이트|BASE\s*PLATE|ANCHOR\s*BOLT|RIB\s*PLATE|COLUMN\s*SIZE|\bBP\d*\b|\bNSC\d+\b|철골보|철골기둥|STEEL\s*BEAM|STEEL\s*COLUMN/i;

type RebarScheduleScanState = "idle" | "rc_section_active" | "non_rc_section_active";

type RcScheduleSectionTitle = {
  memberType: Exclude<RebarMemberType, "unknown">;
  title: string;
  strength: "strong" | "weak";
};

type RcScheduleSectionCandidate = {
  startLine: number;
  startIndex: number;
  memberType: Exclude<RebarMemberType, "unknown">;
  title: string;
  strength: "strong" | "weak";
};

export type RebarScheduleSectionDebug = {
  normalizedTitleMatched: boolean;
  matchedTitleText?: string;
  headerTokensFound: string[];
  headerTokenCount: number;
  memberTokensFound: string[];
  rebarPatternsFound: string[];
  rejectedReason?: string;
  startIndex?: number;
  endIndex?: number;
  previewText?: string;
};

export type RebarConcreteScheduleSection = {
  startLine: number;
  endLineExclusive: number;
  startIndex: number;
  endIndex: number;
  memberType: Exclude<RebarMemberType, "unknown">;
  title: string;
  headerTokens: string[];
  confidence: number;
  sourceText: string;
  debug: RebarScheduleSectionDebug;
};

let lastRebarScheduleSectionDebugLog: RebarScheduleSectionDebug[] = [];

const rcScheduleTitleTypes: Array<{
  memberType: Exclude<RebarMemberType, "unknown">;
  titlePattern: RegExp;
}> = [
  { memberType: "slab", titlePattern: /슬(?:라|래)브일람표/ },
  { memberType: "beam", titlePattern: /보일람표/ },
  { memberType: "column", titlePattern: /기둥일람표/ },
  { memberType: "footing", titlePattern: /기초일람표/ },
  { memberType: "wall", titlePattern: /벽체일람표/ }
];

const flexibleRcScheduleTitleTypes: Array<{
  memberType: Exclude<RebarMemberType, "unknown">;
  titlePattern: RegExp;
}> = [
  {
    memberType: "slab",
    titlePattern: /철\s*근\s*콘\s*크\s*리\s*트\s*슬\s*(?:라|래)\s*브\s*일\s*람\s*표/i
  },
  {
    memberType: "beam",
    titlePattern: /철\s*근\s*콘\s*크\s*리\s*트\s*보\s*일\s*람\s*표/i
  },
  {
    memberType: "column",
    titlePattern: /철\s*근\s*콘\s*크\s*리\s*트\s*기\s*둥\s*일\s*람\s*표/i
  },
  {
    memberType: "footing",
    titlePattern: /철\s*근\s*콘\s*크\s*리\s*트\s*기\s*초\s*일\s*람\s*표/i
  },
  {
    memberType: "wall",
    titlePattern: /철\s*근\s*콘\s*크\s*리\s*트\s*벽\s*체\s*일\s*람\s*표/i
  }
];

const rcColumnHeaderPatterns: Array<{ label: string; pattern: RegExp; normalizedPattern?: RegExp }> = [
  { label: "단면번호", pattern: /단면\s*번호/i },
  { label: "단면", pattern: /단\s*면(?!\s*번호)/i, normalizedPattern: /단면(?!번호)/i },
  { label: "배근형태", pattern: /배근\s*형태/i },
  { label: "두께", pattern: /두께(?:\s*\(\s*mm\s*\))?/i },
  { label: "크기", pattern: /크기/i },
  { label: "구분", pattern: /구\s*분/i },
  { label: "SIZE", pattern: /\bSIZE\b/i },
  { label: "직경", pattern: /직경/i },
  { label: "철근", pattern: /철근/i },
  { label: "주근", pattern: /주근/i },
  { label: "부근", pattern: /부\s*근/i },
  { label: "상부근", pattern: /상부근/i },
  { label: "하부근", pattern: /하부근/i },
  { label: "상하단부", pattern: /상\s*하\s*단\s*부/i },
  { label: "중앙부", pattern: /중\s*앙\s*부/i },
  { label: "늑근", pattern: /늑근/i },
  { label: "전단철근", pattern: /전단\s*철근/i },
  { label: "X-DIR", pattern: /\bX\s*-\s*DIR\b/i },
  { label: "Y-DIR", pattern: /\bY\s*-\s*DIR\b/i },
  { label: "간격", pattern: /간격/i },
  { label: "배근", pattern: /배근/i }
];

function normalizeText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeScheduleParsingText(value: string | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[＠﹫]/g, "@")
    .replace(/[×✕✖]/g, "x");
}

function normalizeMemberName(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function normalizeScheduleTitleText(value: string | undefined) {
  return (value ?? "")
    .replace(/\s+/g, "")
    .replace(/철근콘크리트/gi, "철근콘크리트")
    .replace(/슬라브/g, "슬래브")
    .toUpperCase();
}

function normalizeScheduleHeaderText(value: string | undefined) {
  return (value ?? "")
    .replace(/철근\s*콘크리트/gi, "철근콘크리트")
    .replace(/단\s*면/g, "단면")
    .replace(/부\s*근/g, "부근")
    .replace(/상\s*하\s*단\s*부/g, "상하단부")
    .replace(/중\s*앙\s*부/g, "중앙부")
    .replace(/\s+/g, "")
    .replace(/슬라브/g, "슬래브")
    .toUpperCase();
}

function getLineStartIndexes(lines: string[]) {
  const indexes: number[] = [];
  let offset = 0;

  lines.forEach((line) => {
    indexes.push(offset);
    offset += line.length + 1;
  });

  return indexes;
}

function debugRebarScheduleSection(debug: RebarScheduleSectionDebug) {
  lastRebarScheduleSectionDebugLog.push(debug);

  if (typeof console !== "undefined" && typeof console.debug === "function") {
    console.debug("[estimate:rebar-schedule-section]", debug);
  }
}

export function getLastRebarScheduleSectionDebugLog() {
  return lastRebarScheduleSectionDebugLog;
}

function getRcScheduleTitle(
  line: string,
  drawingNo?: string,
  drawingTitle?: string
): RcScheduleSectionTitle | null {
  if (koreanNonRcSectionTerminatorPattern.test(line)) {
    return null;
  }

  const koreanTitleMatch = line.match(
    /철근\s*콘크리트\s*(슬라브|슬래브|보|기둥|기초|벽체)\s*일람표/i
  );

  if (koreanTitleMatch) {
    const koreanMemberTypeMap: Record<string, Exclude<RebarMemberType, "unknown">> = {
      "슬라브": "slab",
      "슬래브": "slab",
      "보": "beam",
      "기둥": "column",
      "기초": "footing",
      "벽체": "wall"
    };

    return {
      memberType: koreanMemberTypeMap[koreanTitleMatch[1]] ?? "slab",
      title: line,
      strength: "strong"
    };
  }

  const normalizedLine = normalizeScheduleTitleText(line);
  const normalizedSheetContext = normalizeScheduleTitleText(`${drawingNo ?? ""} ${drawingTitle ?? ""}`);
  const hasStrongRcPrefix = normalizedLine.includes("철근콘크리트");
  const hasWeakRcContext =
    normalizedSheetContext.includes("철근콘크리트") || /\bS-30[1-3]\b/i.test(drawingNo ?? "");

  for (const titleType of flexibleRcScheduleTitleTypes) {
    if (titleType.titlePattern.test(line)) {
      return {
        memberType: titleType.memberType,
        title: line,
        strength: "strong"
      };
    }
  }

  for (const titleType of rcScheduleTitleTypes) {
    if (!titleType.titlePattern.test(normalizedLine)) {
      continue;
    }

    if (hasStrongRcPrefix) {
      return {
        memberType: titleType.memberType,
        title: line,
        strength: "strong"
      };
    }

    if (hasWeakRcContext) {
      return {
        memberType: titleType.memberType,
        title: line,
        strength: "weak"
      };
    }
  }

  return null;
}

function getDetectedColumnHeaders(text: string) {
  const headers = new Set<string>();
  const normalizedText = normalizeScheduleHeaderText(text);

  rcColumnHeaderPatterns.forEach((header) => {
    if (
      header.pattern.test(text) ||
      (header.normalizedPattern ?? header.pattern).test(normalizedText)
    ) {
      headers.add(header.label);
    }
  });
  return Array.from(headers);
}

function hasScheduleMemberPattern(text: string) {
  return getScheduleMemberTokens(text)
    .some((name) => !/^(?:D|HD|SD400|SD500|FCK|FY)\d/i.test(name));
}

function getScheduleMemberTokens(text: string) {
  return Array.from(text.matchAll(memberNamePattern))
    .map((match) => normalizeMemberName(match[0]))
    .filter((name) => !/^(?:D|HD|SD400|SD500|FCK|FY)\d/i.test(name));
}

function hasNpcMemberToken(text: string) {
  return getScheduleMemberTokens(text).some((name) => /^NPC\d/i.test(name));
}

function hasRcScheduleTitleLead(text: string) {
  return /철근|콘크리트|구조|일람표|STRUCTURAL|BEAM|COLUMN|FOOTING|SLAB|WALL/i.test(text);
}

function hasRebarPattern(text: string) {
  return getDetectedSpecs(text).length > 0;
}

function getSectionConfidence(args: {
  titleStrength: RcScheduleSectionTitle["strength"];
  headerCount: number;
  hasMemberAndRebarPattern: boolean;
  sheetConfidence?: number;
}) {
  const base = args.titleStrength === "strong" ? 0.68 : 0.48;
  const headerBonus = args.headerCount >= 2 ? 0.14 : 0;
  const patternBonus = args.hasMemberAndRebarPattern ? 0.1 : 0;
  const sheetBonus = args.sheetConfidence ? Math.min(0.08, Math.max(0, args.sheetConfidence - 0.6)) : 0;

  return Math.min(0.92, base + headerBonus + patternBonus + sheetBonus);
}

function buildScheduleSection(
  active: RcScheduleSectionCandidate,
  endLineExclusive: number,
  endIndex: number,
  lines: string[],
  sheetConfidence?: number
): RebarConcreteScheduleSection | null {
  const sourceLines = lines.slice(active.startLine, Math.max(active.startLine + 1, endLineExclusive));
  const sourceText = normalizeText(sourceLines.join(" "));
  const headerTokens = getDetectedColumnHeaders(sourceText);
  const memberTokensFound = getScheduleMemberTokens(sourceText);
  const rebarPatternsFound = getDetectedSpecs(sourceText);
  const hasMemberAndRebarPattern = memberTokensFound.length > 0 && rebarPatternsFound.length > 0;
  const hasColumnNpcFallback = active.memberType === "column" && hasNpcMemberToken(sourceText);
  const accepted = headerTokens.length >= 2 || hasMemberAndRebarPattern || hasColumnNpcFallback;
  const debug: RebarScheduleSectionDebug = {
    normalizedTitleMatched: true,
    matchedTitleText: active.title,
    headerTokensFound: headerTokens,
    headerTokenCount: headerTokens.length,
    memberTokensFound,
    rebarPatternsFound,
    startIndex: active.startIndex,
    endIndex,
    previewText: sourceText.slice(0, 280)
  };

  if (!accepted) {
    debug.rejectedReason =
      active.memberType === "column"
        ? "column schedule title matched but header token count < 2 and NPC member was not found"
        : "schedule title matched but header token count < 2 and member/rebar pattern was not found";
    debugRebarScheduleSection(debug);
    return null;
  }

  if (active.memberType === "column" && headerTokens.length < 2 && hasColumnNpcFallback) {
    debug.rejectedReason = "column schedule title matched and NPC member found";
  }

  debugRebarScheduleSection(debug);

  return {
    startLine: active.startLine,
    endLineExclusive,
    startIndex: active.startIndex,
    endIndex,
    memberType: active.memberType,
    title: active.title,
    headerTokens,
    confidence: getSectionConfidence({
      titleStrength: active.strength,
      headerCount: headerTokens.length,
      hasMemberAndRebarPattern,
      sheetConfidence
    }),
    sourceText,
    debug
  };
}

export function detectRebarConcreteScheduleSections(
  pageText: string,
  drawingNo?: string,
  drawingTitle?: string,
  sheetConfidence?: number
): RebarConcreteScheduleSection[] {
  lastRebarScheduleSectionDebugLog = [];
  const lines = pageText.split(/\r?\n/).map((line) => line.trim());
  const lineStartIndexes = getLineStartIndexes(lines);
  const sections: RebarConcreteScheduleSection[] = [];
  let state: RebarScheduleScanState = "idle";
  let activeSection: RcScheduleSectionCandidate | null = null;

  const closeActiveSection = (endLineExclusive: number, endIndex: number) => {
    if (!activeSection) {
      return;
    }

    const section = buildScheduleSection(
      activeSection,
      endLineExclusive,
      endIndex,
      lines,
      sheetConfidence
    );

    if (section) {
      sections.push(section);
    }

    activeSection = null;
  };

  lines.forEach((line, index) => {
    const titleText = lines.slice(index, Math.min(lines.length, index + 3)).join(" ");
    const title =
      state === "non_rc_section_active" && !hasRcScheduleTitleLead(line)
        ? null
        : getRcScheduleTitle(titleText, drawingNo, drawingTitle);
    const lineStartIndex = lineStartIndexes[index] ?? 0;

    if (title) {
      if (state === "rc_section_active") {
        closeActiveSection(index, lineStartIndex);
      }

      activeSection = {
        startLine: index,
        startIndex: lineStartIndex,
        memberType: title.memberType,
        title: title.title,
        strength: title.strength
      };
      state = "rc_section_active";
      return;
    }

    if (nonRcSectionTerminatorPattern.test(line) || koreanNonRcSectionTerminatorPattern.test(line)) {
      if (state === "rc_section_active") {
        const activeTextBeforeLine = activeSection
          ? lines.slice(activeSection.startLine, index).join(" ")
          : "";
        const shouldKeepColumnOpen =
          activeSection?.memberType === "column" && !hasNpcMemberToken(activeTextBeforeLine);

        if (shouldKeepColumnOpen) {
          return;
        }

        debugRebarScheduleSection({
          normalizedTitleMatched: true,
          matchedTitleText: activeSection?.title,
          headerTokensFound: [],
          headerTokenCount: 0,
          memberTokensFound: [],
          rebarPatternsFound: [],
          rejectedReason: `${activeSection?.memberType ?? "RC"} schedule closed by ${line} keyword`,
          startIndex: activeSection?.startIndex,
          endIndex: lineStartIndex,
          previewText: line
        });
        closeActiveSection(index, lineStartIndex);
      }

      state = "non_rc_section_active";
      return;
    }
  });

  if (activeSection) {
    closeActiveSection(lines.length, pageText.length);
  }

  return sections;
}

function inferMemberTypeForSection(
  memberName: string,
  sectionType: RebarConcreteScheduleSection["memberType"]
): RebarMemberType {
  const member = normalizeMemberName(memberName);

  if (deckSlabMemberPattern.test(member) || basePlateMemberPattern.test(member) || /^NSC\d/i.test(member)) {
    return "unknown";
  }

  if (sectionType === "slab" && /^(?:\d{0,2}NS|NMF)\d/i.test(member)) return "slab";
  if (sectionType === "beam" && /^(?:\d{0,2}NFG|NFG|FG|G|B)\d/i.test(member)) return "beam";
  if (sectionType === "column" && /^NPC\d/i.test(member)) return "column";
  if (sectionType === "footing" && /^(?:\d{0,2}NF|NMF)\d/i.test(member)) return "footing";
  if (sectionType === "wall" && /^(?:RW|W)\d/i.test(member)) return "wall";

  return "unknown";
}

function createStableId(parts: Array<string | number | undefined>) {
  let hash = 0;
  const source = parts.filter(Boolean).join("|");

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `schedule-member-${hash.toString(36)}`;
}

function findSheet(
  drawingIndexes: DrawingSheetIndexRecord[] | undefined,
  sourceFileName: string,
  sourcePage: number
) {
  return drawingIndexes?.find(
    (sheet) =>
      sheet.sourcePage === sourcePage &&
      (!sheet.sourceFileName || sheet.sourceFileName === sourceFileName)
  );
}

function isSchedulePage(text: string, sheet?: DrawingSheetIndexRecord) {
  const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${text}`;

  return (
    /\bS-30[1-3]\b/i.test(source) ||
    sheet?.sheetType === "structural_schedule" ||
    koreanRcScheduleTitlePattern.test(source) ||
    scheduleTitlePattern.test(source)
  );
}

function isPlanPage(text: string, sheet?: DrawingSheetIndexRecord) {
  const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${text}`;

  return (
    /\bS-22[1-5]\b/i.test(source) ||
    sheet?.sheetType === "structural_plan" ||
    planTitlePattern.test(source)
  );
}

function inferMemberType(memberName: string, source: string): RebarMemberType {
  const member = normalizeMemberName(memberName);

  if (basePlateMemberPattern.test(member)) return "unknown";

  if (/\bS-301\b/i.test(source) || /슬라브|슬래브|SLAB/i.test(source)) {
    if (/^(?:\d{0,2}NS|NMF|S)\d/i.test(member)) return "slab";
  }

  if (/\bS-302\b/i.test(source) || /보\s*일람표|BEAM/i.test(source)) {
    if (/(?:NFG|FG|G|B)\d/i.test(member)) return "beam";
  }

  if (/\bS-302\b/i.test(source) || /기둥\s*일람표|COLUMN/i.test(source)) {
    if (/^NPC\d/i.test(member)) return "column";
    if (/^PC\d/i.test(member) && !basePlateContextPattern.test(source)) return "column";
  }

  if (/\bS-303\b/i.test(source) || /기초|베이스|FOOTING|BASE/i.test(source)) {
    if (/(?:NMF|NF|F)\d/i.test(member)) return "footing";
  }

  if (/^(?:RW|W)\d/i.test(member) || /벽체|WALL/i.test(source)) return "wall";
  if (/(?:NFG|FG|G|B)\d/i.test(member)) return "beam";
  if (/^NPC\d/i.test(member)) return "column";
  if (/^PC\d/i.test(member) && !basePlateContextPattern.test(source)) return "column";
  if (/^(?:\d{0,2}NS|S)\d/i.test(member)) return "slab";
  if (/(?:NMF|NF|F)\d/i.test(member)) return "footing";

  return "unknown";
}

function isDefaultScheduleMember(memberName: string, memberType: RebarMemberType, source: string) {
  const member = normalizeMemberName(memberName);

  if (basePlateMemberPattern.test(member)) return false;
  if (deckSlabMemberPattern.test(member)) return false;
  if (memberType === "column" && basePlateContextPattern.test(source) && !/^NPC\d/i.test(member)) {
    return false;
  }
  if (memberType === "slab" && deckSlabContextPattern.test(source) && !/^(?:\d{0,2}NS|NMF)\d/i.test(member)) {
    return false;
  }
  if (memberType === "wall" && !explicitWallSchedulePattern.test(source)) return false;

  return true;
}

function inferFutureReviewMemberType(memberName: string, source: string): RebarMemberType {
  const member = normalizeMemberName(memberName);

  if (deckSlabMemberPattern.test(member)) return "slab";
  if (basePlateMemberPattern.test(member)) return "column";
  if (deckSlabContextPattern.test(source) && !/^(?:\d{0,2}NS|NMF)\d/i.test(member)) return "slab";
  if (basePlateContextPattern.test(source) && !/^NPC\d/i.test(member)) return "column";

  return inferMemberType(memberName, source);
}

function getFutureReviewLabel(memberName: string, source: string) {
  const member = normalizeMemberName(memberName);
  const followUpBasis =
    "해당 항목은 현재 철근콘크리트 철근 수량산출 기본 대상이 아니며, 별도 공종 또는 업체 구조계산 확인이 필요한 후속 검토 대상입니다.";

  if (deckSlabMemberPattern.test(member)) {
    return {
      label: "데크 슬라브 / 업체 구조계산 필요",
      basis: followUpBasis
    };
  }

  if (basePlateMemberPattern.test(member)) {
    return {
      label: "철골 / 베이스플레이트",
      basis: followUpBasis
    };
  }

  return null;
}

function getContextWindow(lines: string[], index: number) {
  return normalizeText(lines.slice(Math.max(0, index - 1), index + 2).join(" "));
}

function getScheduleContextWindow(lines: string[], index: number) {
  return normalizeText(lines.slice(Math.max(0, index - 2), index + 4).join(" "));
}

function getMemberNamesFromText(text: string) {
  return Array.from(normalizeScheduleParsingText(text).matchAll(memberNamePattern))
    .map((match) => normalizeMemberName(match[0]))
    .filter((name) => !/^(?:D|HD|SD|FCK|FY)\d/i.test(name));
}

function getSectionMemberNames(
  text: string,
  sectionType: RebarConcreteScheduleSection["memberType"]
) {
  return getMemberNamesFromText(text).filter(
    (memberName) => inferMemberTypeForSection(memberName, sectionType) !== "unknown"
  );
}

function getInferredCountSpecs(text: string) {
  const specs = new Set<string>();
  const normalizedText = normalizeScheduleParsingText(text);

  Array.from(normalizedText.matchAll(/\b(\d{1,3})\s*[- ]\s*(10|13|16|19|22|25|29|32)\b/gi)).forEach(
    (match) => {
      specs.add(`${match[1]}-D${match[2]}`);
    }
  );

  return Array.from(specs);
}

function getInferredSpacingSpecs(text: string) {
  const specs = new Set<string>();
  const normalizedText = normalizeScheduleParsingText(text);

  Array.from(normalizedText.matchAll(/\b(?:HD|D)\s*(10|13|16|19|22|25|29|32)\s*(\d{2,4})\b/gi)).forEach(
    (match) => {
      const spacing = Number(match[2]);

      if (spacing >= 50 && spacing <= 600) {
        specs.add(`D${match[1]}@${spacing}`);
      }
    }
  );

  return Array.from(specs);
}

function getDetectedSpecs(text: string) {
  const specs = new Set<string>();
  const normalizedText = normalizeScheduleParsingText(text);

  parseRebarCountPattern(normalizedText).forEach((pattern) => specs.add(pattern.rawText.replace(/\s+/g, "")));
  parseRebarSpacingPattern(normalizedText).forEach((pattern) => specs.add(pattern.rawText.replace(/\s+/g, "")));
  getInferredCountSpecs(normalizedText).forEach((spec) => specs.add(spec));
  getInferredSpacingSpecs(normalizedText).forEach((spec) => specs.add(spec));

  return Array.from(specs);
}

function parseScheduleSectionSize(text: string) {
  const normalizedText = normalizeScheduleParsingText(text);
  const parsed = parseSectionSize(normalizedText);

  if (parsed) {
    return parsed;
  }

  const looseMatch = normalizedText.match(/\b([2-9]\d{2,4})\s+(?:[xX]\s*)?([2-9]\d{2,4})\b/);

  return looseMatch
    ? { widthMm: Number(looseMatch[1]), depthMm: Number(looseMatch[2]) }
    : null;
}

function getPositionFromSpec(spec: string, memberType: RebarMemberType): RebarPosition {
  if (memberType === "beam" && /@/.test(spec)) return "stirrup";
  if (memberType === "column" && /@/.test(spec)) return "tie";
  if (memberType === "footing") return "x";
  if (memberType === "slab") return "x_bottom";
  if (memberType === "wall") return "vertical";

  return "main";
}

function isInferredRebarSpec(spec: string, sourceText: string | undefined) {
  const source = sourceText ?? "";
  const countMatch = spec.match(/^(\d{1,3})-D(10|13|16|19|22|25|29|32)$/i);
  const spacingMatch = spec.match(/^D(10|13|16|19|22|25|29|32)@(\d{2,4})$/i);

  if (countMatch) {
    return new RegExp(`\\b${countMatch[1]}\\s*[- ]\\s*${countMatch[2]}\\b`, "i").test(source);
  }

  if (spacingMatch) {
    return new RegExp(`\\b(?:HD|D)\\s*${spacingMatch[1]}\\s*${spacingMatch[2]}\\b`, "i").test(source);
  }

  return false;
}

function mergeScheduleRecord(
  current: RebarMemberScheduleRecord | undefined,
  next: RebarMemberScheduleRecord
) {
  if (!current) return next;

  return {
    ...current,
    detectedSpecs: Array.from(new Set([...current.detectedSpecs, ...next.detectedSpecs])),
    mainBars: Array.from(new Set([...(current.mainBars ?? []), ...(next.mainBars ?? [])])),
    stirrups: Array.from(new Set([...(current.stirrups ?? []), ...(next.stirrups ?? [])])),
    spacingSpecs: Array.from(new Set([...(current.spacingSpecs ?? []), ...(next.spacingSpecs ?? [])])),
    sourceTextSnippet: [current.sourceTextSnippet, next.sourceTextSnippet]
      .filter(Boolean)
      .join(" ")
      .slice(0, 320),
    confidence: Math.max(current.confidence, next.confidence)
  };
}

function getTextWindowAroundMember(text: string, memberName: string) {
  const normalizedText = normalizeScheduleParsingText(text);
  const memberPattern = new RegExp(`\\b${memberName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const memberMatch = normalizedText.match(memberPattern);
  const start = memberMatch?.index ?? 0;
  const nextMemberMatch = normalizedText.slice(start + memberName.length).match(/\bNPC\d+[A-Z]?\b/i);
  const nextStart =
    nextMemberMatch?.index === undefined
      ? normalizedText.length
      : start + memberName.length + nextMemberMatch.index;

  return normalizeText(
    normalizedText.slice(
      Math.max(0, start - 180),
      Math.min(normalizedText.length, Math.max(nextStart, start + 700))
    )
  );
}

function extractColumnFallbackSchedules(args: {
  fileName: string;
  pageNumber: number;
  sheet?: DrawingSheetIndexRecord;
  text: string;
}) {
  const source = `${args.sheet?.drawingNo ?? ""} ${args.sheet?.drawingTitle ?? ""} ${args.text}`;
  const hasColumnContext = /\bS-302\b/i.test(source) || /기\s*둥\s*일\s*람\s*표|COLUMN\s*SCHEDULE/i.test(source);
  const memberNames = Array.from(new Set(getMemberNamesFromText(args.text).filter((name) => /^NPC\d/i.test(name))));

  if (!hasColumnContext || memberNames.length === 0) {
    return [];
  }

  return memberNames.flatMap<RebarMemberScheduleRecord>((memberName) => {
    const context = getTextWindowAroundMember(args.text, memberName);
    const detectedSpecs = getDetectedSpecs(context).length > 0
      ? getDetectedSpecs(context)
      : getDetectedSpecs(args.text);

    if (detectedSpecs.length === 0) {
      return [];
    }

    const section = parseScheduleSectionSize(context) ?? parseScheduleSectionSize(args.text);
    const spacingSpecs = detectedSpecs.filter((spec) => spec.includes("@"));
    const countSpecs = detectedSpecs.filter((spec) => !spec.includes("@"));

    return [
      {
        id: createStableId([args.fileName, args.pageNumber, "column", memberName, "fallback"]),
        memberName,
        memberType: "column",
        drawingNo: args.sheet?.drawingNo,
        drawingTitle: args.sheet?.drawingTitle,
        sourcePage: args.pageNumber,
        sourceType: "schedule",
        sectionName: args.sheet?.drawingTitle ?? "철근콘크리트 기둥 일람표",
        detectedSpecs,
        sectionSize: section
          ? [section.widthMm, section.lengthMm ?? section.depthMm].filter(Boolean).join("x")
          : undefined,
        widthMm: section?.widthMm,
        depthMm: section?.depthMm,
        mainBars: countSpecs,
        stirrups: spacingSpecs,
        spacingSpecs,
        sourceTextSnippet: context,
        confidence: 0.74
      }
    ];
  });
}

export type RebarMemberScheduleTextParseOptions = {
  fileName?: string;
  pageNumber?: number;
  drawingNo?: string;
  drawingTitle?: string;
  sheetConfidence?: number;
  sheetType?: DrawingSheetIndexRecord["sheetType"];
};

export function extractRebarMemberScheduleFromText(
  text: string,
  options: RebarMemberScheduleTextParseOptions = {}
): RebarMemberScheduleRecord[] {
  const fileName = options.fileName ?? "rebar-member-schedule-fixture.txt";
  const pageNumber = options.pageNumber ?? 1;
  const drawingFileId = "rebar-member-schedule-fixture";
  const pdfResult: PdfTextExtractionResult = {
    fileName,
    pageCount: 1,
    status: "success",
    pages: [
      {
        id: `${drawingFileId}-page-${pageNumber}`,
        drawingFileId,
        pageNumber,
        text,
        textLength: text.length,
        extractionStatus: "success"
      }
    ]
  };
  const sheet: DrawingSheetIndexRecord = {
    id: `${drawingFileId}-sheet-${pageNumber}`,
    sourcePage: pageNumber,
    sourceFileName: fileName,
    drawingNo: options.drawingNo,
    drawingTitle: options.drawingTitle,
    discipline: "rebar_concrete",
    sheetType: options.sheetType ?? "structural_schedule",
    detectedKeywords: [],
    quantityReadinessStatus: "schedule_based_calculation",
    quantityReadinessReason: "Fixture text parse helper",
    relatedSheetIds: [],
    confidence: options.sheetConfidence ?? 0.9,
    sourceTextSnippet: text.slice(0, 320)
  };

  return extractRebarMemberScheduleFromPdfResults([pdfResult], [sheet]);
}

export function extractRebarMemberScheduleFromPdfResults(
  pdfResults: PdfTextExtractionResult[],
  drawingIndexes: DrawingSheetIndexRecord[] = []
): RebarMemberScheduleRecord[] {
  const scheduleMap = new Map<string, RebarMemberScheduleRecord>();
  const planReferences = new Map<string, RebarPlanReferenceRecord[]>();

  pdfResults.forEach((result) => {
    result.pages.forEach((page) => {
      const sheet = findSheet(drawingIndexes, result.fileName, page.pageNumber);
      const text = page.text ?? "";
      const rawLines = text.split(/\r?\n/).map((line) => line.trim());
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (isSchedulePage(text, sheet)) {
        const sections = detectRebarConcreteScheduleSections(
          text,
          sheet?.drawingNo,
          sheet?.drawingTitle,
          sheet?.confidence
        );

        sections.forEach((scheduleSection) => {
          const sectionLines = rawLines.slice(
            scheduleSection.startLine,
            scheduleSection.endLineExclusive
          ).filter(Boolean);
          let activeMemberNames: string[] = [];

          sectionLines.forEach((line, index) => {
            const context = getScheduleContextWindow(sectionLines, index);
            const lineMemberNames = getSectionMemberNames(line, scheduleSection.memberType);

            if (lineMemberNames.length > 0) {
              activeMemberNames = lineMemberNames;
            }

            const detectedSpecs = getDetectedSpecs(context);

            if (detectedSpecs.length === 0) return;

            const memberNames = getSectionMemberNames(context, scheduleSection.memberType);
            const targetMemberNames = memberNames.length > 0 ? memberNames : activeMemberNames;

            targetMemberNames.forEach((memberName) => {
              const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${scheduleSection.title} ${scheduleSection.sourceText} ${context}`;
              const memberType = inferMemberTypeForSection(
                memberName,
                scheduleSection.memberType
              );

              if (memberType === "unknown") return;
              if (!isDefaultScheduleMember(memberName, memberType, source)) return;

              const section = parseScheduleSectionSize(context);
              const spacingSpecs = detectedSpecs.filter((spec) => spec.includes("@"));
              const countSpecs = detectedSpecs.filter((spec) => !spec.includes("@"));
              const record: RebarMemberScheduleRecord = {
                id: createStableId([result.fileName, page.pageNumber, memberType, memberName]),
                memberName,
                memberType,
                drawingNo: sheet?.drawingNo,
                drawingTitle: sheet?.drawingTitle,
                sourcePage: page.pageNumber,
                sourceType: "schedule",
                sectionName: scheduleSection.title || sheet?.drawingTitle,
                detectedSpecs,
                sectionSize: section
                  ? [section.widthMm, section.lengthMm ?? section.depthMm].filter(Boolean).join("x")
                  : undefined,
                widthMm: section?.widthMm,
                depthMm: section?.depthMm,
                thicknessMm: memberType === "slab" || memberType === "wall" ? section?.depthMm : undefined,
                mainBars: countSpecs,
                stirrups: spacingSpecs,
                spacingSpecs,
                sourceTextSnippet: context,
                confidence: scheduleSection.confidence
              };

              const scheduleKey = `${memberType}|${memberName}`;
              scheduleMap.set(scheduleKey, mergeScheduleRecord(scheduleMap.get(scheduleKey), record));
            });
          });
        });

        extractColumnFallbackSchedules({
          fileName: result.fileName,
          pageNumber: page.pageNumber,
          sheet,
          text
        }).forEach((record) => {
          const scheduleKey = `${record.memberType}|${record.memberName}`;
          scheduleMap.set(scheduleKey, mergeScheduleRecord(scheduleMap.get(scheduleKey), record));
        });
      } else if (isPlanPage(text, sheet)) {
        lines.forEach((line, index) => {
          const context = getContextWindow(lines, index);
          const memberNames = Array.from(context.matchAll(memberNamePattern)).map((match) =>
            normalizeMemberName(match[0])
          );

          memberNames.forEach((memberName) => {
            const reference: RebarPlanReferenceRecord = {
              drawingNo: sheet?.drawingNo,
              drawingTitle: sheet?.drawingTitle,
              sourcePage: page.pageNumber,
              sourceTextSnippet: context
            };

            planReferences.set(memberName, [...(planReferences.get(memberName) ?? []), reference]);
          });
        });
      }
    });
  });

  return Array.from(scheduleMap.values()).map((record) => {
    const references = planReferences.get(record.memberName) ?? [];

    return {
      ...record,
      sourceType: references.length > 0 ? "schedule_with_plan" : "schedule",
      planReferences: references
    };
  });
}

export function buildRebarQuantityCandidatesFromMemberSchedules(
  schedules: RebarMemberScheduleRecord[],
  sourceFileName?: string
): RebarQuantityCandidateRecord[] {
  const candidates = schedules.flatMap((schedule) => {
    if (
      schedule.memberType === "unknown" ||
      schedule.detectedSpecs.length === 0
    ) {
      return [];
    }

    return schedule.detectedSpecs.flatMap((spec, index) => {
      const countPattern = parseRebarCountPattern(spec)[0];
      const spacingPattern = parseRebarSpacingPattern(spec)[0];
      const diameter = normalizeRebarDiameter(
        countPattern?.diameter ?? spacingPattern?.diameter ?? spec
      );
      const unitWeightKgPerM = diameter ? getRebarUnitWeight(diameter) : null;

      if (!diameter || !unitWeightKgPerM) return [];

      const position = getPositionFromSpec(spec, schedule.memberType);
      const inferredSpec = isInferredRebarSpec(spec, schedule.sourceTextSnippet);
      const inferenceNote = inferredSpec ? "철근 표기 추정 검토 필요" : null;
      const candidate: RebarQuantityCandidateRecord = {
        id: `${schedule.id}-${index}`,
        scheduleMemberId: schedule.id,
        sourceFileName,
        sourcePage: schedule.sourcePage,
        drawingNo: schedule.drawingNo,
        memberName: schedule.memberName,
        memberType: schedule.memberType,
        position,
        workCategory: "철근콘크리트공사",
        itemName: "철근 가공 및 조립",
        specification: [diameter, schedule.memberName, spec].join(" / "),
        diameter,
        unitWeightKgPerM,
        barCount: countPattern?.count,
        manualBarCount: countPattern?.count,
        spacingMm: spacingPattern?.spacingMm,
        sectionWidthMm: schedule.memberType === "beam" || schedule.memberType === "column" ? schedule.widthMm : undefined,
        sectionDepthMm:
          schedule.memberType === "beam" || schedule.memberType === "column"
            ? schedule.depthMm
            : schedule.thicknessMm,
        footingWidthMm: schedule.memberType === "footing" ? schedule.widthMm : undefined,
        footingLengthMm: schedule.memberType === "footing" ? schedule.depthMm : undefined,
        slabThicknessMm: schedule.memberType === "slab" ? schedule.thicknessMm : undefined,
        coverMm: schedule.memberType === "slab" ? 30 : 40,
        anchorageLengthMm: 0,
        spliceLengthMm: 0,
        hookLengthMm: 0,
        bendCorrectionMm: 0,
        lossRate: 0.03,
        faceCount: 1,
        barCountRule: "floor_plus_one",
        footingLayer: "top",
        memberCount: 1,
        quantityKg: 0,
        quantityTon: 0,
        materialQuantityKg: 0,
        materialQuantityTon: 0,
        unit: "kg",
        calculationFormula: "필수 입력값 부족",
        calculationBasis: "구조일람표 기반 부재 마스터에서 생성된 수량산출 후보입니다.",
        confidence: schedule.confidence,
        reviewStatus: "pending",
        quantityReviewRequired: true,
        reviewNote: inferenceNote ?? undefined,
        note: inferenceNote ?? "구조일람표 기반 후보",
        rawText: spec,
        sourceTextSnippet: schedule.sourceTextSnippet,
        rebarSourceType: "structural_schedule",
        scheduleSourcePage: schedule.sourcePage,
        scheduleDrawingNo: schedule.drawingNo,
        scheduleDrawingTitle: schedule.drawingTitle,
        planMatched: (schedule.planReferences?.length ?? 0) > 0,
        planReferencePages: schedule.planReferences
          ?.map((reference) => reference.sourcePage)
          .filter((page): page is number => typeof page === "number"),
        memberListSource:
          (schedule.planReferences?.length ?? 0) > 0 ? "schedule_with_plan" : "schedule",
        detectedSpecs: schedule.detectedSpecs
      };

      return [recalculateRebarQuantityCandidate(candidate)];
    });
  });

  return candidates;
}

export function buildFutureReviewRebarCandidatesFromPdfResults(
  pdfResults: PdfTextExtractionResult[],
  drawingIndexes: DrawingSheetIndexRecord[] = []
): RebarQuantityCandidateRecord[] {
  const seen = new Set<string>();
  const candidates: RebarQuantityCandidateRecord[] = [];

  pdfResults.forEach((result) => {
    result.pages.forEach((page) => {
      const sheet = findSheet(drawingIndexes, result.fileName, page.pageNumber);
      const text = page.text ?? "";

      if (!isSchedulePage(text, sheet)) return;

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      lines.forEach((line, index) => {
        const context = getScheduleContextWindow(lines, index);
        const detectedSpecs = getDetectedSpecs(context);

        if (detectedSpecs.length === 0) return;

        const memberNames = Array.from(context.matchAll(memberNamePattern))
          .map((match) => normalizeMemberName(match[0]))
          .filter((name) => !/^(?:D|HD|SD400|SD500|FCK|FY)\d/i.test(name));

        memberNames.forEach((memberName) => {
          const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${text.slice(0, 1200)} ${context}`;
          const futureReview = getFutureReviewLabel(memberName, source);

          if (!futureReview) return;

          const memberType = inferFutureReviewMemberType(memberName, source);
          if (memberType === "unknown") return;

          detectedSpecs.forEach((spec, specIndex) => {
            const key = `${result.fileName}|${page.pageNumber}|${memberName}|${spec}`;
            if (seen.has(key)) return;
            seen.add(key);

            const countPattern = parseRebarCountPattern(spec)[0];
            const spacingPattern = parseRebarSpacingPattern(spec)[0];
            const diameter = normalizeRebarDiameter(
              countPattern?.diameter ?? spacingPattern?.diameter ?? spec
            );
            const unitWeightKgPerM = diameter ? getRebarUnitWeight(diameter) : null;

            if (!diameter || !unitWeightKgPerM) return;

            const section = parseSectionSize(context);
            const candidate: RebarQuantityCandidateRecord = {
              id: `future-review-${createStableId([
                result.fileName,
                page.pageNumber,
                memberName,
                specIndex
              ])}`,
              sourceFileName: result.fileName,
              sourcePage: page.pageNumber,
              drawingNo: sheet?.drawingNo,
              memberName,
              memberType,
              position: getPositionFromSpec(spec, memberType),
              workCategory: "철근콘크리트공사",
              itemName: "철근 가공 및 조립",
              specification: [diameter, memberName, spec].join(" / "),
              diameter,
              unitWeightKgPerM,
              barCount: countPattern?.count,
              manualBarCount: countPattern?.count,
              spacingMm: spacingPattern?.spacingMm,
              sectionWidthMm: memberType === "column" ? section?.widthMm : undefined,
              sectionDepthMm: memberType === "column" ? section?.depthMm : section?.depthMm,
              slabThicknessMm: memberType === "slab" ? section?.depthMm : undefined,
              coverMm: memberType === "slab" ? 30 : 40,
              anchorageLengthMm: 0,
              spliceLengthMm: 0,
              hookLengthMm: 0,
              bendCorrectionMm: 0,
              lossRate: 0.03,
              faceCount: 1,
              barCountRule: "floor_plus_one",
              footingLayer: "top",
              memberCount: 1,
              quantityKg: 0,
              quantityTon: 0,
              materialQuantityKg: 0,
              materialQuantityTon: 0,
              unit: "kg",
              calculationFormula: "필수 입력값 부족",
              calculationBasis: futureReview.basis,
              confidence: sheet?.confidence ? Math.min(sheet.confidence, 0.5) : 0.4,
              reviewStatus: "pending",
              quantityReviewRequired: true,
              note: futureReview.label,
              rawText: spec,
              sourceTextSnippet: context,
              rebarSourceType: "structural_schedule",
              scheduleSourcePage: page.pageNumber,
              scheduleDrawingNo: sheet?.drawingNo,
              scheduleDrawingTitle: sheet?.drawingTitle,
              planMatched: false,
              memberListSource: "future_review",
              detectedSpecs
            };

            candidates.push(recalculateRebarQuantityCandidate(candidate));
          });
        });
      });
    });
  });

  return candidates;
}

export function buildPlanUnmatchedRebarCandidatesFromPdfResults(
  pdfResults: PdfTextExtractionResult[],
  drawingIndexes: DrawingSheetIndexRecord[] = [],
  schedules: RebarMemberScheduleRecord[] = []
): RebarQuantityCandidateRecord[] {
  const scheduleNames = new Set(schedules.map((schedule) => schedule.memberName));
  const seen = new Set<string>();
  const candidates: RebarQuantityCandidateRecord[] = [];

  pdfResults.forEach((result) => {
    result.pages.forEach((page) => {
      const sheet = findSheet(drawingIndexes, result.fileName, page.pageNumber);
      const text = page.text ?? "";

      if (!isPlanPage(text, sheet)) return;

      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      lines.forEach((line, index) => {
        const context = getContextWindow(lines, index);
        const memberNames = Array.from(context.matchAll(memberNamePattern))
          .map((match) => normalizeMemberName(match[0]))
          .filter((name) => !scheduleNames.has(name));

        memberNames.forEach((memberName) => {
          const source = `${sheet?.drawingNo ?? ""} ${sheet?.drawingTitle ?? ""} ${context}`;
          const memberType = inferMemberType(memberName, source);
          const key = `${result.fileName}|${page.pageNumber}|${memberName}`;

          if (seen.has(key) || memberType !== "wall") return;
          seen.add(key);

          const detectedSpecs = getDetectedSpecs(context);
          const firstSpec = detectedSpecs[0] ?? "D13";
          const spacingPattern = parseRebarSpacingPattern(firstSpec)[0];
          const diameter = normalizeRebarDiameter(spacingPattern?.diameter ?? firstSpec) ?? "D13";
          const unitWeightKgPerM = getRebarUnitWeight(diameter) ?? 0.995;
          const candidate: RebarQuantityCandidateRecord = {
            id: `plan-unmatched-${createStableId([result.fileName, page.pageNumber, memberName])}`,
            sourceFileName: result.fileName,
            sourcePage: page.pageNumber,
            drawingNo: sheet?.drawingNo,
            memberName,
            memberType,
            position: "vertical",
            workCategory: "철근콘크리트공사",
            itemName: "철근 가공 및 조립",
            specification: [diameter, memberName, "평면도 감지"].join(" / "),
            diameter,
            unitWeightKgPerM,
            spacingMm: spacingPattern?.spacingMm,
            sectionDepthMm: parseSectionSize(context)?.depthMm,
            wallThicknessMm: parseSectionSize(context)?.depthMm,
            coverMm: 40,
            anchorageLengthMm: 0,
            spliceLengthMm: 0,
            hookLengthMm: 0,
            bendCorrectionMm: 0,
            lossRate: 0.03,
            faceCount: 2,
            barCountRule: "floor_plus_one",
            memberCount: 1,
            quantityKg: 0,
            quantityTon: 0,
            materialQuantityKg: 0,
            materialQuantityTon: 0,
            unit: "kg",
            calculationFormula: "필수 입력값 부족",
            calculationBasis:
              "구조평면도에서 감지되었지만 구조일람표 마스터와 매칭되지 않은 후보입니다. 배근 상세 확인 필요.",
            confidence: sheet?.confidence ? Math.min(sheet.confidence, 0.55) : 0.45,
            reviewStatus: "pending",
            quantityReviewRequired: true,
            note: "평면도 감지 후보 / 일람표 매칭 필요",
            rawText: firstSpec,
            sourceTextSnippet: context,
            rebarSourceType: "structural_plan",
            planMatched: false,
            planReferencePages: [page.pageNumber],
            memberListSource: "plan_unmatched",
            detectedSpecs
          };

          candidates.push(recalculateRebarQuantityCandidate(candidate));
        });
      });
    });
  });

  return candidates;
}
