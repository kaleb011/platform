import { normalizeRebarDiameter } from "@/lib/estimation/rebar-quantity";
import type {
  EstimateItemRecord,
  RebarQuantityCandidateRecord,
  RebarStandardEstimateItem,
  RebarStandardSettings,
  RebarStandardSummary,
  RebarStandardType
} from "@/lib/estimation/types";

type ApprovedRebarSource = EstimateItemRecord | RebarQuantityCandidateRecord;

const DEFAULT_RECOMMENDATION = {
  recommendedType: "building_type_1" as RebarStandardType,
  recommendationReason: "D13 이하 철근 비율이 50% 미만인 일반 건축 철근 기준으로 Type-I을 우선 제안합니다."
};

const typeDisplayName: Record<RebarStandardType, string> = {
  building_type_1: "건축 Type-I",
  building_type_2: "건축 Type-II",
  civil_type_1: "토목 Type-I",
  civil_type_2: "토목 Type-II",
  civil_type_3: "토목 Type-III"
};

function round(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(fractionDigits));
}

function isEstimateItemRecord(item: ApprovedRebarSource): item is EstimateItemRecord {
  return "matchSource" in item;
}

function isApprovedRebarItem(item: ApprovedRebarSource) {
  if (isEstimateItemRecord(item)) {
    const text = [item.workCategory, item.itemName, item.specification, item.standardItemName]
      .filter(Boolean)
      .join(" ");

    return (
      item.reviewStatus === "accepted" &&
      item.quantity > 0 &&
      !item.quantityReviewRequired &&
      (item.matchSource === "rebar" || /철근|rebar|D\s*-?\s*\d{2}/i.test(text))
    );
  }

  return item.reviewStatus === "accepted" && item.quantityKg > 0 && !item.quantityReviewRequired;
}

function getItemDiameter(item: ApprovedRebarSource) {
  if (!isEstimateItemRecord(item)) {
    return normalizeRebarDiameter(item.diameter);
  }

  const sourceText = [item.specification, item.itemName, item.standardItemName].filter(Boolean).join(" ");
  const match = sourceText.match(/(?:H?D)\s*-?\s*(10|13|16|19|22|25|29|32)/i);

  return match ? normalizeRebarDiameter(match[0]) : null;
}

function getItemQuantityKg(item: ApprovedRebarSource) {
  if (!isEstimateItemRecord(item)) {
    return item.quantityKg;
  }

  if (item.unit.toLowerCase() === "ton") {
    return item.quantity * 1000;
  }

  return item.quantity;
}

function isUnderD13(diameter: string) {
  const numericDiameter = Number(diameter.replace(/\D/g, ""));

  return Number.isFinite(numericDiameter) && numericDiameter <= 13;
}

export function recommendBuildingRebarType(
  summary: Pick<RebarStandardSummary, "underD13Ratio">,
  settings: Pick<RebarStandardSettings, "projectType" | "steelConcurrent" | "complexStructure">
): { recommendedType: RebarStandardType; recommendationReason: string } {
  if (settings.projectType === "civil") {
    return {
      recommendedType: "civil_type_3",
      recommendationReason:
        "토목 공사 선택 상태입니다. 이번 MVP는 건축 Type-I/II 산출 중심이므로 토목 Type-III은 참고 추천으로만 표시합니다."
    };
  }

  if (settings.steelConcurrent) {
    return {
      recommendedType: "building_type_2",
      recommendationReason: "철골 병행 시공 조건이 선택되어 건축 Type-II 적용 검토를 제안합니다."
    };
  }

  if (settings.complexStructure) {
    return {
      recommendedType: "building_type_2",
      recommendationReason: "복잡 구조시설물 조건이 선택되어 건축 Type-II 적용 검토를 제안합니다."
    };
  }

  if (summary.underD13Ratio >= 50) {
    return {
      recommendedType: "building_type_2",
      recommendationReason: "D13 이하 철근 비율이 50% 이상이므로 건축 Type-II 적용 검토를 제안합니다."
    };
  }

  return DEFAULT_RECOMMENDATION;
}

export function summarizeApprovedRebarItems(
  items: ApprovedRebarSource[],
  settings?: Pick<RebarStandardSettings, "projectType" | "steelConcurrent" | "complexStructure">
): RebarStandardSummary {
  const diameterWeightsKg = items.reduce<Record<string, number>>((weights, item) => {
    if (!isApprovedRebarItem(item)) {
      return weights;
    }

    const diameter = getItemDiameter(item);
    const quantityKg = getItemQuantityKg(item);

    if (!diameter || quantityKg <= 0) {
      return weights;
    }

    weights[diameter] = round((weights[diameter] ?? 0) + quantityKg, 4);
    return weights;
  }, {});

  const totalWeightKg = round(
    Object.values(diameterWeightsKg).reduce((sum, value) => sum + value, 0),
    4
  );
  const underD13WeightKg = round(
    Object.entries(diameterWeightsKg).reduce(
      (sum, [diameter, value]) => (isUnderD13(diameter) ? sum + value : sum),
      0
    ),
    4
  );
  const underD13Ratio = totalWeightKg > 0 ? round((underD13WeightKg / totalWeightKg) * 100, 2) : 0;
  const recommendation = recommendBuildingRebarType(
    { underD13Ratio },
    settings ?? {
      projectType: "building",
      steelConcurrent: false,
      complexStructure: false
    }
  );

  return {
    totalWeightKg,
    totalWeightTon: round(totalWeightKg / 1000, 4),
    underD13WeightKg,
    underD13Ratio,
    recommendedType: recommendation.recommendedType,
    recommendationReason: recommendation.recommendationReason,
    diameterWeightsKg,
    diameterWeightsTon: Object.fromEntries(
      Object.entries(diameterWeightsKg).map(([diameter, weightKg]) => [
        diameter,
        round(weightKg / 1000, 4)
      ])
    )
  };
}

export function getSiteProcessingProductivity(type: RebarStandardType) {
  if (type === "building_type_2") {
    return 4.0;
  }

  if (type === "civil_type_3") {
    return 3.5;
  }

  return 4.5;
}

export function getSiteAssemblyProductivity(type: RebarStandardType) {
  if (type === "building_type_2") {
    return 3.0;
  }

  return 3.4;
}

export function getBindingWireUsage(type: RebarStandardType) {
  if (type === "building_type_2" || type === "civil_type_2") {
    return 8.0;
  }

  if (type === "civil_type_3") {
    return 9.5;
  }

  return 6.5;
}

function makeItem(
  item: Omit<RebarStandardEstimateItem, "totalCost">
): RebarStandardEstimateItem {
  return {
    ...item,
    materialCost: round(item.materialCost, 0),
    laborCost: round(item.laborCost, 0),
    expenseCost: round(item.expenseCost, 0),
    quantity: round(item.quantity, 4),
    totalCost: round(item.materialCost + item.laborCost + item.expenseCost, 0)
  };
}

function hasWages(settings: RebarStandardSettings) {
  return Boolean(settings.rebarWorkerWage && settings.commonWorkerWage);
}

export function buildRebarStandardEstimateItems(
  summary: RebarStandardSummary,
  settings: RebarStandardSettings
): RebarStandardEstimateItem[] {
  if (summary.totalWeightTon <= 0) {
    return [];
  }

  const selectedType = settings.selectedType;
  const typeLabel = typeDisplayName[selectedType];
  const items: RebarStandardEstimateItem[] = [];

  Object.entries(summary.diameterWeightsTon)
    .sort(([left], [right]) => Number(left.slice(1)) - Number(right.slice(1)))
    .forEach(([diameter, quantityTon]) => {
      const unitPrice = settings.rebarMaterialUnitPrices[diameter];
      const hasPrice = typeof unitPrice === "number" && unitPrice > 0;

      items.push(
        makeItem({
          id: `rebar-material-${diameter}`,
          category: "material",
          workCategory: "철근콘크리트공사",
          itemName: `철근 본재 ${diameter}`,
          specification: `${diameter}, 사용자 입력 단가 기준`,
          quantity: quantityTon,
          unit: "ton",
          materialCost: hasPrice ? quantityTon * unitPrice : 0,
          laborCost: 0,
          expenseCost: 0,
          unitPrice: hasPrice ? unitPrice : undefined,
          basis: `${diameter} ${round(quantityTon, 4)}ton x ${hasPrice ? `${unitPrice.toLocaleString("ko-KR")}원/ton` : "단가 입력 필요"}`,
          standardCode: "철근 본재 사용자 입력 단가",
          reviewStatus: hasPrice ? "calculated" : "price_required"
        })
      );
    });

  const processingProductivity = getSiteProcessingProductivity(selectedType);
  const processingRebarWorkerDays = (summary.totalWeightTon / processingProductivity) * 3;
  const processingCommonWorkerDays = summary.totalWeightTon / processingProductivity;
  const processingLaborCost = hasWages(settings)
    ? processingRebarWorkerDays * (settings.rebarWorkerWage ?? 0) +
      processingCommonWorkerDays * (settings.commonWorkerWage ?? 0)
    : 0;

  items.push(
    makeItem({
      id: "rebar-site-processing",
      category: "labor",
      workCategory: "철근콘크리트공사",
      itemName: "철근 현장가공",
      specification: `${typeLabel}, 철근공 3인 + 보통인부 1인`,
      quantity: summary.totalWeightTon,
      unit: "ton",
      materialCost: 0,
      laborCost: processingLaborCost,
      expenseCost: hasWages(settings) ? processingLaborCost * 0.09 : 0,
      basis: `총 ${round(summary.totalWeightTon, 4)}ton / ${processingProductivity}ton/day, 철근공 ${round(processingRebarWorkerDays, 3)}인, 보통인부 ${round(processingCommonWorkerDays, 3)}인, 경비 노무비 9%`,
      standardCode: "6-2-2 현장가공",
      reviewStatus: hasWages(settings) ? "calculated" : "price_required"
    })
  );

  const assemblyProductivity = getSiteAssemblyProductivity(selectedType);
  const assemblyRebarWorkerDays = (summary.totalWeightTon / assemblyProductivity) * 6;
  const assemblyCommonWorkerDays = (summary.totalWeightTon / assemblyProductivity) * 2;
  const assemblyLaborCost = hasWages(settings)
    ? assemblyRebarWorkerDays * (settings.rebarWorkerWage ?? 0) +
      assemblyCommonWorkerDays * (settings.commonWorkerWage ?? 0)
    : 0;

  items.push(
    makeItem({
      id: "rebar-site-assembly",
      category: "labor",
      workCategory: "철근콘크리트공사",
      itemName: "철근 현장조립",
      specification: `${typeLabel}, 철근공 6인 + 보통인부 2인`,
      quantity: summary.totalWeightTon,
      unit: "ton",
      materialCost: 0,
      laborCost: assemblyLaborCost,
      expenseCost: hasWages(settings) ? assemblyLaborCost * 0.02 : 0,
      basis: `총 ${round(summary.totalWeightTon, 4)}ton / ${assemblyProductivity}ton/day, 철근공 ${round(assemblyRebarWorkerDays, 3)}인, 보통인부 ${round(assemblyCommonWorkerDays, 3)}인, 경비 노무비 2%`,
      standardCode: "6-2-3 현장조립",
      reviewStatus: hasWages(settings) ? "calculated" : "price_required"
    })
  );

  const bindingWireUsage = getBindingWireUsage(selectedType);
  const bindingWireQuantity = summary.totalWeightTon * bindingWireUsage;
  const hasBindingWirePrice =
    typeof settings.bindingWireUnitPrice === "number" && settings.bindingWireUnitPrice > 0;

  items.push(
    makeItem({
      id: "rebar-binding-wire",
      category: "consumable",
      workCategory: "철근콘크리트공사",
      itemName: "결속선",
      specification: `${typeLabel}, ${bindingWireUsage}kg/ton`,
      quantity: bindingWireQuantity,
      unit: "kg",
      materialCost: hasBindingWirePrice
        ? bindingWireQuantity * (settings.bindingWireUnitPrice ?? 0)
        : 0,
      laborCost: 0,
      expenseCost: 0,
      unitPrice: hasBindingWirePrice ? settings.bindingWireUnitPrice : undefined,
      basis: `총 ${round(summary.totalWeightTon, 4)}ton x ${bindingWireUsage}kg/ton`,
      standardCode: "6-2-3 현장조립 [주] 소모재료 별도 계상",
      reviewStatus: hasBindingWirePrice ? "calculated" : "price_required"
    })
  );

  const hasSpacerInput =
    typeof settings.spacerQuantity === "number" &&
    settings.spacerQuantity > 0 &&
    typeof settings.spacerUnitPrice === "number" &&
    settings.spacerUnitPrice > 0;

  items.push(
    makeItem({
      id: "rebar-spacer",
      category: "separate",
      workCategory: "철근콘크리트공사",
      itemName: "간격재",
      specification: "간격재 재료비 별도 계상",
      quantity: settings.spacerQuantity ?? 0,
      unit: settings.spacerUnit ?? "EA",
      materialCost: hasSpacerInput
        ? (settings.spacerQuantity ?? 0) * (settings.spacerUnitPrice ?? 0)
        : 0,
      laborCost: 0,
      expenseCost: 0,
      unitPrice: hasSpacerInput ? settings.spacerUnitPrice : undefined,
      basis: hasSpacerInput
        ? `${settings.spacerQuantity} ${settings.spacerUnit ?? "EA"} x ${settings.spacerUnitPrice?.toLocaleString("ko-KR")}원`
        : "수량과 단가를 입력하면 재료비에 반영",
      standardCode: "6-2-3 현장조립 [주] 간격재 설치 포함, 재료비 별도 계상",
      reviewStatus: hasSpacerInput ? "calculated" : "separate_input_required",
      note: "철근 조립 품에는 간격재 설치가 포함되나, 간격재 재료비는 별도 계상합니다."
    })
  );

  [
    {
      id: "rebar-crane-cost",
      itemName: "크레인 양중비",
      cost: settings.craneCost,
      standardCode: "6-2-1 적용범위 / 6-2-2 [주] 운반 및 양중 별도 계상"
    },
    {
      id: "rebar-transport-cost",
      itemName: "현장 내 운반비",
      cost: settings.transportCost,
      standardCode: "6-2-1 적용범위 / 6-2-2 [주] 운반 및 양중 별도 계상"
    },
    {
      id: "rebar-shop-drawing-cost",
      itemName: "shop drawing 작성비",
      cost: settings.shopDrawingCost,
      standardCode: "6-2-1 적용범위, shop drawing 작성비용 별도 계상"
    }
  ].forEach((separateItem) => {
    const hasCost = typeof separateItem.cost === "number" && separateItem.cost > 0;

    items.push(
      makeItem({
        id: separateItem.id,
        category: hasCost ? "expense" : "separate",
        workCategory: "철근콘크리트공사",
        itemName: separateItem.itemName,
        specification: "사용자 입력 금액 기준",
        quantity: hasCost ? 1 : 0,
        unit: "식",
        materialCost: 0,
        laborCost: 0,
        expenseCost: hasCost ? separateItem.cost ?? 0 : 0,
        unitPrice: hasCost ? separateItem.cost : undefined,
        basis: hasCost ? "사용자 입력 금액 1식 반영" : "별도계상 필요",
        standardCode: separateItem.standardCode,
        reviewStatus: hasCost ? "calculated" : "separate_input_required"
      })
    );
  });

  items.push(
    makeItem({
      id: "rebar-mechanical-splice-guide",
      category: "separate",
      workCategory: "철근콘크리트공사",
      itemName: "특수 기계적 이음",
      specification: "MVP 자동 산출 제외",
      quantity: 0,
      unit: "식",
      materialCost: 0,
      laborCost: 0,
      expenseCost: 0,
      basis: "특수 기계적 이음이 있는 경우 별도 검토 및 계상",
      standardCode: "특수 기계적 이음 별도 계상",
      reviewStatus: "separate_input_required",
      note: "이번 MVP에서는 자동 산출하지 않습니다."
    })
  );

  return items;
}
