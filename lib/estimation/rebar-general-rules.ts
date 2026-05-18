import type {
  RebarCoverRule,
  RebarDetailAdjustmentPreset,
  RebarDevelopmentRule,
  RebarGeneralRuleSource,
  RebarHookRule,
  RebarMemberType,
  RebarQuantityCandidateRecord
} from "@/lib/estimation/types";

const sourceS002: RebarGeneralRuleSource = {
  drawingNo: "S-002",
  drawingTitle: "구조 일반사항",
  pageLabel: "S-002",
  note: "피복두께, 철근 간격 제한, 표준갈고리 기준"
};

const sourceS004: RebarGeneralRuleSource = {
  drawingNo: "S-004",
  drawingTitle: "구조 일반사항",
  pageLabel: "S-004",
  note: "정착, 이음, B급 이음 및 이음 위치 원칙"
};

const sourceS005: RebarGeneralRuleSource = {
  drawingNo: "S-005",
  drawingTitle: "구조 일반사항",
  pageLabel: "S-005",
  note: "fy=400MPa 기준 정착 및 이음길이 표"
};

const sourceS006: RebarGeneralRuleSource = {
  drawingNo: "S-006",
  drawingTitle: "구조 일반사항",
  pageLabel: "S-006",
  note: "슬래브 개구부 보강, 단차상세, 보 접합상세"
};

export const REBAR_GENERAL_RULE_NOTES = [
  "구조도면과 구조일반사항이 상충할 경우 구조도면을 우선합니다.",
  "도면상 길이는 표기도와 치수를 기준으로 하며 축척자로 산정하지 않습니다.",
  "단위는 mm 기준입니다."
];

export const DECK_SLAB_FOLLOW_UP_BASIS =
  "DECK SLAB는 현장 DECK 업체 선정 후 업체 계산서와 DECK 구조도면을 원설계자 승인 후 시공하는 항목으로, 초기 RC 철근 수량산출 기본 후보에서 제외하고 후속 검토 대상으로 분리합니다.";

export const REBAR_COVER_RULES: RebarCoverRule[] = [
  {
    id: "S-002-cover-earth-cast-75",
    condition: "흙에 접하여 콘크리트를 친 후 영구히 흙에 묻히는 경우",
    memberTypes: ["footing", "beam", "column", "slab", "wall"],
    exposure: "earth_cast",
    coverMm: 75,
    source: sourceS002
  },
  {
    id: "S-002-cover-water-cast-100",
    condition: "수중에서 타설하는 콘크리트",
    memberTypes: ["footing", "beam", "column", "slab", "wall"],
    exposure: "water_cast",
    coverMm: 100,
    source: sourceS002
  },
  {
    id: "S-002-cover-exterior-beam-column-d16-40",
    condition: "옥외 공기나 흙에 직접 노출되는 보/기둥, D16 이하",
    memberTypes: ["beam", "column"],
    exposure: "exterior_or_earth_exposed",
    diameterRange: "D16 이하",
    coverMm: 40,
    source: sourceS002
  },
  {
    id: "S-002-cover-exterior-beam-column-d19-d25-50",
    condition: "옥외 공기나 흙에 직접 노출되는 보/기둥, D19~D25",
    memberTypes: ["beam", "column"],
    exposure: "exterior_or_earth_exposed",
    diameterRange: "D19~D25",
    coverMm: 50,
    source: sourceS002
  },
  {
    id: "S-002-cover-exterior-beam-column-d29-up-60",
    condition: "옥외 공기나 흙에 직접 노출되는 보/기둥, D29 이상",
    memberTypes: ["beam", "column"],
    exposure: "exterior_or_earth_exposed",
    diameterRange: "D29 이상",
    coverMm: 60,
    source: sourceS002
  },
  {
    id: "S-002-cover-interior-slab-wall-20",
    condition: "옥외 공기나 흙에 직접 접하지 않는 슬래브/벽체/장선",
    memberTypes: ["slab", "wall"],
    exposure: "interior",
    diameterRange: "전체 철근",
    coverMm: 20,
    source: sourceS002
  },
  {
    id: "S-002-cover-interior-beam-column-40",
    condition: "옥외 공기나 흙에 직접 접하지 않는 보/기둥",
    memberTypes: ["beam", "column"],
    exposure: "interior",
    diameterRange: "전체 철근",
    coverMm: 40,
    source: sourceS002
  },
  {
    id: "S-002-cover-special-review",
    condition: "특수환경 또는 도면 별도 표기 조건",
    memberTypes: ["footing", "beam", "column", "slab", "wall"],
    exposure: "unknown",
    coverMm: 40,
    source: sourceS002,
    reviewRequired: true
  }
];

export const REBAR_HOOK_RULES: RebarHookRule[] = [
  ...["D10", "D13", "D16"].flatMap((diameter) => {
    const db = Number(diameter.replace("D", ""));
    return [
      {
        id: `S-002-hook-main-90-${diameter}`,
        barRole: "main" as const,
        diameter,
        hookAngle: "90" as const,
        hookLengthMm: Math.ceil((12 * db) / 10) * 10,
        basis: "주근 90도 표준갈고리 추천값",
        source: sourceS002
      },
      {
        id: `S-002-hook-stirrup-135-${diameter}`,
        barRole: "stirrup" as const,
        diameter,
        hookAngle: "135" as const,
        hookLengthMm: Math.ceil((10 * db) / 10) * 10,
        basis: "스터럽/띠철근 135도 표준갈고리 추천값",
        source: sourceS002
      }
    ];
  }),
  ...["D19", "D22", "D25"].map((diameter) => ({
    id: `S-002-hook-review-${diameter}`,
    barRole: "unknown" as const,
    diameter,
    hookAngle: "90" as const,
    hookLengthMm: null,
    basis: "구조일반사항 S-002 표준갈고리 표 확인 필요",
    source: sourceS002,
    reviewRequired: true
  }))
];

const developmentLengths: Record<string, number> = {
  D10: 400,
  D13: 520,
  D16: 640,
  D19: 760,
  D22: 880
};

export const REBAR_DEVELOPMENT_RULES: RebarDevelopmentRule[] = Object.entries(
  developmentLengths
).flatMap(([diameter, development]) => [
  {
    id: `S-005-development-fy400-fck30-${diameter}`,
    concreteStrengthMpa: 30,
    steelYieldMpa: 400,
    diameter,
    memberGroup: "beam_column",
    barPosition: "general",
    lengthType: "development",
    lengthMm: development,
    source: sourceS005,
    reviewRequired: true
  },
  {
    id: `S-004-S005-b-splice-fy400-fck30-${diameter}`,
    concreteStrengthMpa: 30,
    steelYieldMpa: 400,
    diameter,
    memberGroup: "beam_column",
    barPosition: "general",
    lengthType: "lap_splice",
    lengthMm: Math.ceil((development * 1.3) / 10) * 10,
    source: sourceS005,
    reviewRequired: true
  },
  {
    id: `S-005-hooked-development-fy400-fck30-${diameter}`,
    concreteStrengthMpa: 30,
    steelYieldMpa: 400,
    diameter,
    memberGroup: "slab_wall",
    barPosition: "hooked_tension",
    lengthType: "hooked_development",
    lengthMm: null,
    source: sourceS005,
    reviewRequired: true
  }
]);

function diameterNumber(diameter: string | undefined) {
  return Number((diameter ?? "").replace(/[^0-9]/g, "")) || 0;
}

function getMemberGroup(memberType: RebarMemberType): RebarDevelopmentRule["memberGroup"] {
  if (memberType === "footing") return "foundation";
  if (memberType === "beam" || memberType === "column") return "beam_column";
  if (memberType === "slab" || memberType === "wall") return "slab_wall";
  return "other";
}

export function getDefaultCoverRule(params: {
  memberType: RebarMemberType;
  diameter?: string;
  exposure?: RebarCoverRule["exposure"];
  isEarthContact?: boolean;
  isWaterCast?: boolean;
  isExteriorExposed?: boolean;
}) {
  const exposure = params.isWaterCast
    ? "water_cast"
    : params.isEarthContact || params.memberType === "footing"
      ? "earth_cast"
      : params.isExteriorExposed
        ? "exterior_or_earth_exposed"
        : params.exposure ?? "interior";
  const db = diameterNumber(params.diameter);
  const rule =
    REBAR_COVER_RULES.find((item) => {
      if (!item.memberTypes.includes(params.memberType)) return false;
      if (item.exposure !== exposure) return false;
      if (!item.diameterRange) return true;
      if (item.diameterRange.includes("D16")) return db <= 16;
      if (item.diameterRange.includes("D19")) return db >= 19 && db <= 25;
      if (item.diameterRange.includes("D29")) return db >= 29;
      return true;
    }) ??
    REBAR_COVER_RULES.find(
      (item) => item.memberTypes.includes(params.memberType) && item.exposure === "interior"
    ) ??
    REBAR_COVER_RULES[REBAR_COVER_RULES.length - 1]!;

  return {
    coverMm: rule.coverMm,
    rule,
    warnings: [
      "구조도면과 구조일반사항이 상충할 경우 구조도면 우선",
      rule.reviewRequired ? "특수환경은 구조일반사항 S-002 표 확인 필요" : null
    ].filter((warning): warning is string => Boolean(warning))
  };
}

export function getDefaultHookRule(params: {
  diameter: string;
  barRole: RebarHookRule["barRole"];
  hookAngle?: RebarHookRule["hookAngle"];
}) {
  const hookAngle = params.hookAngle ?? (params.barRole === "stirrup" || params.barRole === "tie" ? "135" : "90");
  const rule =
    REBAR_HOOK_RULES.find(
      (item) =>
        item.diameter === params.diameter &&
        item.hookAngle === hookAngle &&
        (item.barRole === params.barRole ||
          (params.barRole === "tie" && item.barRole === "stirrup") ||
          item.barRole === "unknown")
    ) ??
    REBAR_HOOK_RULES.find((item) => item.diameter === params.diameter) ??
    null;

  return {
    hookLengthMm: rule?.hookLengthMm ?? null,
    rule,
    reviewRequired: !rule || Boolean(rule.reviewRequired)
  };
}

export function getDevelopmentOrSpliceRule(params: {
  concreteStrengthMpa?: number;
  steelYieldMpa?: number;
  diameter: string;
  memberType: RebarMemberType;
  barPosition?: RebarDevelopmentRule["barPosition"];
  lengthType: RebarDevelopmentRule["lengthType"];
}) {
  const memberGroup = getMemberGroup(params.memberType);
  const rule =
    REBAR_DEVELOPMENT_RULES.find(
      (item) =>
        item.diameter === params.diameter &&
        item.lengthType === params.lengthType &&
        (item.memberGroup === memberGroup || item.memberGroup === "beam_column") &&
        item.concreteStrengthMpa === (params.concreteStrengthMpa ?? 30) &&
        item.steelYieldMpa === (params.steelYieldMpa ?? 400)
    ) ??
    REBAR_DEVELOPMENT_RULES.find(
      (item) => item.diameter === params.diameter && item.lengthType === params.lengthType
    ) ??
    null;

  return {
    lengthMm: rule?.lengthMm ?? null,
    rule,
    reviewRequired: !rule || Boolean(rule.reviewRequired)
  };
}

export function validateRebarSpacing(params: {
  memberType: RebarMemberType;
  diameter?: string;
  spacingMm?: number;
  slabThicknessMm?: number;
  wallThicknessMm?: number;
}) {
  const warnings: string[] = [];
  const spacing = params.spacingMm ?? 0;
  const db = diameterNumber(params.diameter);

  if (spacing <= 0) {
    return {
      valid: false,
      warnings: ["철근 간격 입력 후 S-002 간격 제한 검토 필요"],
      basis: "S-002 철근 순간격 및 최대 간격 기준"
    };
  }

  if (params.memberType === "slab") {
    const maxSpacing = Math.min((params.slabThicknessMm ?? 150) * 2, 300);
    if (spacing > maxSpacing) warnings.push(`슬래브 휨 주철근 간격은 2t 및 300mm 이하 검토 필요: ${maxSpacing}mm`);
  }

  if (params.memberType === "wall") {
    const maxSpacing = Math.min((params.wallThicknessMm ?? 150) * 3, 450);
    if (spacing > maxSpacing) warnings.push(`벽체 철근 간격은 3t 및 450mm 이하 검토 필요: ${maxSpacing}mm`);
  }

  if (params.memberType === "column" && spacing < Math.max(40, db * 1.5)) {
    warnings.push("기둥 종방향 철근 순간격은 40mm, 1.5db, 굵은 골재 4/3 중 큰 값 이상 검토 필요");
  }

  return {
    valid: warnings.length === 0,
    warnings,
    basis: "S-002 철근 간격 제한: db, 25mm, 굵은 골재 공칭 최대치수 4/3 및 부재별 최대 간격 검토"
  };
}

export function buildRebarDetailAdjustmentPreset(
  candidate: RebarQuantityCandidateRecord
): RebarDetailAdjustmentPreset {
  const cover = getDefaultCoverRule({
    memberType: candidate.memberType,
    diameter: candidate.diameter,
    isEarthContact: candidate.memberType === "footing"
  });
  const barRole =
    candidate.position === "stirrup"
      ? "stirrup"
      : candidate.position === "tie"
        ? "tie"
        : "main";
  const hook = getDefaultHookRule({
    diameter: candidate.diameter,
    barRole
  });
  const development = getDevelopmentOrSpliceRule({
    diameter: candidate.diameter,
    memberType: candidate.memberType,
    barPosition: "general",
    lengthType: "development"
  });
  const splice = getDevelopmentOrSpliceRule({
    diameter: candidate.diameter,
    memberType: candidate.memberType,
    barPosition: "general",
    lengthType: "lap_splice"
  });
  const spacing = validateRebarSpacing({
    memberType: candidate.memberType,
    diameter: candidate.diameter,
    spacingMm: candidate.spacingMm,
    slabThicknessMm: candidate.slabThicknessMm ?? candidate.sectionDepthMm,
    wallThicknessMm: candidate.wallThicknessMm ?? candidate.sectionDepthMm
  });
  const warnings = [
    ...cover.warnings,
    hook.reviewRequired ? "S-002 표준갈고리 표 확인 필요" : null,
    development.reviewRequired ? "S-005 정착길이 표 확인 필요" : null,
    splice.reviewRequired ? "S-004 B급 이음 원칙 및 S-005 이음길이 표 확인 필요" : null,
    ...spacing.warnings,
    candidate.memberType === "slab"
      ? "S-006 슬래브 개구부/단차/이어치기 보강은 도면 표기와 책임구조기술자 협의 조건 확인"
      : null,
    candidate.memberListSource === "future_review" ? DECK_SLAB_FOLLOW_UP_BASIS : null
  ].filter((warning): warning is string => Boolean(warning));

  return {
    coverMm: cover.coverMm,
    developmentLengthMm: development.lengthMm ?? candidate.anchorageLengthMm ?? 0,
    spliceLengthMm: splice.lengthMm ?? candidate.spliceLengthMm ?? 0,
    hookLengthMm: hook.hookLengthMm ?? candidate.hookLengthMm ?? 0,
    deductionLengthMm: candidate.deductionLengthMm ?? 0,
    bendingAdjustmentMm: candidate.bendCorrectionMm ?? 0,
    lossRate: candidate.lossRate ?? 0.03,
    appliedRuleIds: [
      cover.rule.id,
      hook.rule?.id,
      development.rule?.id,
      splice.rule?.id,
      "S-002-spacing-limit",
      candidate.memberType === "slab" ? "S-006-slab-opening-step-guidance" : null
    ].filter((id): id is string => Boolean(id)),
    warnings
  };
}

export function getGeneralRuleSummary(candidate: RebarQuantityCandidateRecord) {
  const preset = buildRebarDetailAdjustmentPreset(candidate);

  return {
    preset,
    notes: [
      ...REBAR_GENERAL_RULE_NOTES,
      "S-002: 피복두께, 철근 간격 제한, 표준갈고리 기준",
      "S-004: 정착/이음 원칙, B급 이음, 이음 위치 및 소성힌지구간 제한",
      "S-005: fy=400MPa, fck=30MPa 조건의 정착/이음길이 표 확인",
      "S-006: 슬래브 개구부 보강, 단차상세, 보 접합상세 확인",
      candidate.memberListSource === "future_review" ? DECK_SLAB_FOLLOW_UP_BASIS : null
    ].filter((note): note is string => Boolean(note))
  };
}
