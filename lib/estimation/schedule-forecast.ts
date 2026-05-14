import type {
  EstimateItemRecord,
  EstimateStatementItemRecord,
  ManualEstimateStatementItemRecord,
  RebarStandardEstimateItem,
  ScheduleForecastItem,
  ScheduleForecastItemStatus,
  ScheduleForecastPriority,
  ScheduleForecastSummary
} from "@/lib/estimation/types";

type ScheduleForecastSourceItem =
  | EstimateItemRecord
  | EstimateStatementItemRecord
  | ManualEstimateStatementItemRecord
  | RebarStandardEstimateItem;

export type ScheduleForecastBuildResult = {
  items: ScheduleForecastItem[];
  summary: ScheduleForecastSummary;
};

type ProcessMapping = {
  workCategory: string;
  processName: string;
  order: number;
};

type GroupedProcess = ProcessMapping & {
  key: string;
  sourceItems: ScheduleForecastSourceItem[];
};

const PROCESS_ORDER: Record<string, number> = {
  "철근 가공 및 조립": 10,
  "거푸집 설치 및 해체": 20,
  "콘크리트 타설": 30,
  "배수관 및 맨홀 설치": 40,
  "단열재 설치": 50,
  "방수 시공": 60,
  "창호 설치": 70,
  "마감 시공": 80,
  "포장 시공": 90,
  "검토 필요 공정": 999
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, "").toLowerCase();
}

function includesAny(source: string, keywords: string[]): boolean {
  return keywords.some((keyword) => source.includes(normalizeText(keyword)));
}

function getSourceId(item: ScheduleForecastSourceItem): string {
  return "sourceEstimateItemId" in item ? item.sourceEstimateItemId : item.id;
}

function getSpecification(item: ScheduleForecastSourceItem): string {
  return "specification" in item ? item.specification ?? "" : "";
}

function getBasis(item: ScheduleForecastSourceItem): string {
  if ("calculationBasis" in item && item.calculationBasis) {
    return item.calculationBasis;
  }

  if ("basis" in item && item.basis) {
    return item.basis;
  }

  return "";
}

function getNote(item: ScheduleForecastSourceItem): string {
  const notes = [
    "remark" in item ? item.remark : null,
    "note" in item ? item.note : null,
    "reviewMessage" in item ? item.reviewMessage : null
  ].filter(Boolean);

  return notes.join(" / ");
}

function getAmount(item: ScheduleForecastSourceItem): number | undefined {
  if ("amount" in item && typeof item.amount === "number" && Number.isFinite(item.amount)) {
    return item.amount;
  }

  if ("totalCost" in item && Number.isFinite(item.totalCost)) {
    return item.totalCost;
  }

  return undefined;
}

function hasPrice(item: ScheduleForecastSourceItem): boolean {
  if ("status" in item && item.status === "unit_price_required") {
    return false;
  }

  if ("statementReviewStatus" in item && item.statementReviewStatus === "unit_price_match_required") {
    return false;
  }

  if ("reviewStatus" in item && item.reviewStatus === "price_required") {
    return false;
  }

  const amount = getAmount(item);

  return typeof amount === "number" && amount > 0;
}

function needsQuantityReview(item: ScheduleForecastSourceItem): boolean {
  if ("quantityReviewRequired" in item && item.quantityReviewRequired) {
    return true;
  }

  if ("status" in item && item.status === "quantity_review_required") {
    return true;
  }

  if ("statementReviewStatus" in item && item.statementReviewStatus === "quantity_review_required") {
    return true;
  }

  if ("reviewStatus" in item && item.reviewStatus === "quantity_required") {
    return true;
  }

  return !Number.isFinite(item.quantity) || item.quantity <= 0;
}

function needsReview(item: ScheduleForecastSourceItem): boolean {
  if ("amountReviewRequired" in item && item.amountReviewRequired) {
    return true;
  }

  if ("unitCheckRequired" in item && item.unitCheckRequired) {
    return true;
  }

  if ("matchReviewRequired" in item && item.matchReviewRequired) {
    return true;
  }

  if ("statementReviewStatus" in item) {
    return item.statementReviewStatus !== "calculated";
  }

  if ("reviewStatus" in item) {
    return item.reviewStatus === "separate_input_required";
  }

  return false;
}

function mapEstimateItemToProcess(item: ScheduleForecastSourceItem): ProcessMapping {
  const workCategory = item.workCategory || "기타";
  const text = normalizeText(
    [
      item.workCategory,
      item.itemName,
      getSpecification(item),
      getBasis(item),
      getNote(item)
    ].join(" ")
  );
  const category = normalizeText(workCategory);
  const isReinforcedConcrete =
    includesAny(category, ["철근콘크리트공사", "철근콘크리트", "rebarconcrete", "rc"]) ||
    includesAny(text, ["철근콘크리트", "rc"]);

  if (isReinforcedConcrete && includesAny(text, ["철근", "rebar"])) {
    return {
      workCategory: "철근콘크리트공사",
      processName: "철근 가공 및 조립",
      order: PROCESS_ORDER["철근 가공 및 조립"]
    };
  }

  if (isReinforcedConcrete && includesAny(text, ["거푸집", "formwork", "form"])) {
    return {
      workCategory: "철근콘크리트공사",
      processName: "거푸집 설치 및 해체",
      order: PROCESS_ORDER["거푸집 설치 및 해체"]
    };
  }

  if (isReinforcedConcrete && includesAny(text, ["콘크리트", "타설", "concrete"])) {
    return {
      workCategory: "철근콘크리트공사",
      processName: "콘크리트 타설",
      order: PROCESS_ORDER["콘크리트 타설"]
    };
  }

  if (includesAny(category, ["단열공사", "단열"])) {
    return {
      workCategory: "단열공사",
      processName: "단열재 설치",
      order: PROCESS_ORDER["단열재 설치"]
    };
  }

  if (includesAny(category, ["방수공사", "방수"])) {
    return {
      workCategory: "방수공사",
      processName: "방수 시공",
      order: PROCESS_ORDER["방수 시공"]
    };
  }

  if (includesAny(category, ["배수공사", "배수", "우수", "오수"])) {
    return {
      workCategory: "배수공사",
      processName: "배수관 및 맨홀 설치",
      order: PROCESS_ORDER["배수관 및 맨홀 설치"]
    };
  }

  if (includesAny(category, ["포장공사", "포장"])) {
    return {
      workCategory: "포장공사",
      processName: "포장 시공",
      order: PROCESS_ORDER["포장 시공"]
    };
  }

  if (includesAny(category, ["창호공사", "창호"])) {
    return {
      workCategory: "창호공사",
      processName: "창호 설치",
      order: PROCESS_ORDER["창호 설치"]
    };
  }

  if (includesAny(category, ["마감공사", "마감", "수장공사", "수장"])) {
    return {
      workCategory: "마감공사",
      processName: "마감 시공",
      order: PROCESS_ORDER["마감 시공"]
    };
  }

  return {
    workCategory: workCategory || "기타",
    processName: "검토 필요 공정",
    order: PROCESS_ORDER["검토 필요 공정"]
  };
}

function groupItemsByProcess(items: ScheduleForecastSourceItem[]): GroupedProcess[] {
  const grouped = new Map<string, GroupedProcess>();

  for (const item of items) {
    const mapping = mapEstimateItemToProcess(item);
    const key = `${mapping.workCategory}:${mapping.processName}`;
    const current =
      grouped.get(key) ??
      ({
        ...mapping,
        key,
        sourceItems: []
      } satisfies GroupedProcess);

    current.sourceItems.push(item);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.processName.localeCompare(right.processName, "ko-KR");
  });
}

function getDisplayQuantity(items: ScheduleForecastSourceItem[]) {
  const firstUnit = items[0]?.unit;
  const hasOneUnit = Boolean(firstUnit) && items.every((item) => item.unit === firstUnit);

  if (!hasOneUnit) {
    return {};
  }

  const quantity = items.reduce((sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0), 0);

  return { quantity, unit: firstUnit };
}

function getRebarQuantityTon(items: ScheduleForecastSourceItem[]): number {
  return items.reduce((sum, item) => {
    const unit = normalizeText(item.unit);

    if (unit === "kg") {
      return sum + item.quantity / 1000;
    }

    if (["ton", "t", "톤"].includes(unit)) {
      return sum + item.quantity;
    }

    return sum;
  }, 0);
}

function getEstimatedDurationDays(group: GroupedProcess): number | null {
  if (group.sourceItems.some(needsQuantityReview)) {
    return null;
  }

  if (group.processName === "철근 가공 및 조립") {
    const rebarTon = getRebarQuantityTon(group.sourceItems);

    if (rebarTon <= 0) {
      return null;
    }

    if (rebarTon < 1) {
      return 1;
    }

    if (rebarTon < 5) {
      return 2;
    }

    return 3;
  }

  if (group.sourceItems.length <= 2) {
    return 1;
  }

  if (group.sourceItems.length <= 5) {
    return 2;
  }

  return 3;
}

function getStatus(group: GroupedProcess): ScheduleForecastItemStatus {
  if (group.sourceItems.some(needsQuantityReview)) {
    return "quantity_required";
  }

  if (group.sourceItems.some((item) => !hasPrice(item))) {
    return "price_required";
  }

  if (group.sourceItems.some(needsReview)) {
    return "review_required";
  }

  if (group.processName === "검토 필요 공정") {
    return "review_required";
  }

  if (group.processName === "철근 가공 및 조립" && getRebarQuantityTon(group.sourceItems) >= 5) {
    return "review_required";
  }

  return "ready";
}

function getPriority(group: GroupedProcess, totalAmount: number): ScheduleForecastPriority {
  if (
    totalAmount >= 10_000_000 ||
    group.sourceItems.length >= 6 ||
    (group.processName === "철근 가공 및 조립" && getRebarQuantityTon(group.sourceItems) >= 5)
  ) {
    return "high";
  }

  if (totalAmount >= 1_000_000 || group.sourceItems.length >= 3) {
    return "medium";
  }

  return "low";
}

function buildBasis(group: GroupedProcess, durationDays: number | null): string {
  if (group.processName === "철근 가공 및 조립") {
    const rebarTon = getRebarQuantityTon(group.sourceItems);
    const quantityBasis =
      rebarTon > 0
        ? `철근 물량 ${rebarTon.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}ton 기준`
        : "철근 물량 확인 필요";

    return `${quantityBasis}, 1ton 미만 1일, 1~5ton 2일, 5ton 이상 3일 이상 검토 기준을 적용했습니다.`;
  }

  if (durationDays === null) {
    return `관련 적산 항목 ${group.sourceItems.length}건 중 수량 확인이 필요한 항목이 있어 기간 산정을 보류했습니다.`;
  }

  return `관련 적산 항목 ${group.sourceItems.length}건 기준으로 1~2건 1일, 3~5건 2일, 6건 이상 3일 기준을 적용했습니다.`;
}

function buildNote(status: ScheduleForecastItemStatus): string | undefined {
  if (status === "quantity_required") {
    return "수량 후보 승인 또는 수량 보정 후 예상 기간을 다시 산정하세요.";
  }

  if (status === "price_required") {
    return "공사단가를 입력하면 공사금액과 우선순위가 확정됩니다.";
  }

  if (status === "review_required") {
    return "금액, 수량 또는 대형 철근 물량 기준으로 담당자 검토가 필요합니다.";
  }

  return "견적서 기반 예상공정 초안으로 활용할 수 있습니다.";
}

export function buildScheduleForecastFromEstimateItems(
  items: ScheduleForecastSourceItem[]
): ScheduleForecastBuildResult {
  const groups = groupItemsByProcess(items);
  const forecastItems = groups.map<ScheduleForecastItem>((group, index) => {
    const amount = group.sourceItems.reduce((sum, item) => sum + (getAmount(item) ?? 0), 0);
    const durationDays = getEstimatedDurationDays(group);
    const status = getStatus(group);
    const displayQuantity = getDisplayQuantity(group.sourceItems);

    return {
      id: `schedule-forecast-${index + 1}-${group.key}`,
      workCategory: group.workCategory,
      processName: group.processName,
      sourceEstimateItems: group.sourceItems.map(getSourceId),
      quantity: displayQuantity.quantity,
      unit: displayQuantity.unit,
      amount: amount > 0 ? amount : undefined,
      estimatedDurationDays: durationDays,
      priority: getPriority(group, amount),
      status,
      basis: buildBasis(group, durationDays),
      note: buildNote(status)
    };
  });
  const summary = forecastItems.reduce<ScheduleForecastSummary>(
    (current, item) => {
      current.totalProcesses += 1;
      current.totalEstimatedDays += item.estimatedDurationDays ?? 0;
      current.totalAmount += item.amount ?? 0;

      if (item.status === "ready") {
        current.readyProcesses += 1;
      } else {
        current.reviewRequiredProcesses += 1;
      }

      return current;
    },
    {
      totalProcesses: 0,
      readyProcesses: 0,
      reviewRequiredProcesses: 0,
      totalEstimatedDays: 0,
      totalAmount: 0
    }
  );

  return {
    items: forecastItems,
    summary
  };
}
