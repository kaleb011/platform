"use client";

import { FileSpreadsheet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { exportRebarStandardEstimateToExcel } from "@/lib/estimation/export-estimate";
import {
  buildRebarStandardEstimateItems,
  summarizeApprovedRebarItems
} from "@/lib/estimation/rebar-standard-estimate";
import type {
  EstimateItemRecord,
  RebarProcessingMethod,
  RebarStandardEstimateItem,
  RebarStandardSettings,
  RebarStandardType
} from "@/lib/estimation/types";

type RebarStandardEstimatePanelProps = {
  approvedRebarItems: EstimateItemRecord[];
};

const typeOptions: Array<{ value: RebarStandardType; label: string; disabled?: boolean }> = [
  { value: "building_type_1", label: "건축 Type-I" },
  { value: "building_type_2", label: "건축 Type-II" },
  { value: "civil_type_1", label: "토목 Type-I", disabled: true },
  { value: "civil_type_2", label: "토목 Type-II", disabled: true },
  { value: "civil_type_3", label: "토목 Type-III", disabled: true }
];

const statusLabel: Record<RebarStandardEstimateItem["reviewStatus"], string> = {
  calculated: "품셈 기준 산출 후보",
  price_required: "단가 입력 필요",
  quantity_required: "수량 확인 필요",
  separate_input_required: "별도계상 필요"
};

const statusTone: Record<RebarStandardEstimateItem["reviewStatus"], "green" | "amber" | "red"> = {
  calculated: "green",
  price_required: "amber",
  quantity_required: "red",
  separate_input_required: "amber"
};

const categoryLabel: Record<RebarStandardEstimateItem["category"], string> = {
  material: "재료비",
  labor: "노무비",
  expense: "경비",
  consumable: "소모재료",
  separate: "별도계상"
};

function parsePositiveNumber(value: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatNumber(value: number, fractionDigits = 2) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0
  });
}

function formatWon(value: number) {
  return `${formatNumber(value, 0)}원`;
}

function formatOptionalWon(value: number | null) {
  return value === null ? "-" : formatWon(value);
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-slate">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  label,
  onChange,
  placeholder,
  unit,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  unit?: string;
  value: string;
}) {
  return (
    <Field label={label}>
      <div className="mt-1 flex items-center gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-border bg-white px-3 text-right text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
          inputMode="decimal"
          min="0"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="number"
          value={value}
        />
        {unit ? <span className="w-12 text-[12px] font-semibold text-slate">{unit}</span> : null}
      </div>
    </Field>
  );
}

export function RebarStandardEstimatePanel({
  approvedRebarItems
}: RebarStandardEstimatePanelProps) {
  const [projectType, setProjectType] = useState<"building" | "civil">("building");
  const [selectedType, setSelectedType] = useState<RebarStandardType>("building_type_1");
  const [processingMethod, setProcessingMethod] =
    useState<RebarProcessingMethod>("site_processing");
  const [steelConcurrent, setSteelConcurrent] = useState(false);
  const [complexStructure, setComplexStructure] = useState(false);
  const [rebarWorkerWage, setRebarWorkerWage] = useState("");
  const [commonWorkerWage, setCommonWorkerWage] = useState("");
  const [materialUnitPrices, setMaterialUnitPrices] = useState<Record<string, string>>({});
  const [bindingWireUnitPrice, setBindingWireUnitPrice] = useState("");
  const [spacerQuantity, setSpacerQuantity] = useState("");
  const [spacerUnit, setSpacerUnit] = useState<"EA" | "식">("EA");
  const [spacerUnitPrice, setSpacerUnitPrice] = useState("");
  const [craneCost, setCraneCost] = useState("");
  const [transportCost, setTransportCost] = useState("");
  const [shopDrawingCost, setShopDrawingCost] = useState("");
  const [constructionDurationDays, setConstructionDurationDays] = useState("");
  const [rebarStockCapacityTon, setRebarStockCapacityTon] = useState("");

  const summary = useMemo(
    () =>
      summarizeApprovedRebarItems(approvedRebarItems, {
        projectType,
        steelConcurrent,
        complexStructure
      }),
    [approvedRebarItems, complexStructure, projectType, steelConcurrent]
  );

  const visibleDiameters = useMemo(
    () =>
      Object.keys(summary.diameterWeightsKg).sort(
        (left, right) => Number(left.slice(1)) - Number(right.slice(1))
      ),
    [summary.diameterWeightsKg]
  );

  const settings = useMemo<RebarStandardSettings>(() => {
    const rebarMaterialUnitPrices = visibleDiameters.reduce<Record<string, number | undefined>>(
      (prices, diameter) => {
        prices[diameter] = parsePositiveNumber(materialUnitPrices[diameter] ?? "");
        return prices;
      },
      {}
    );

    return {
      projectType,
      recommendedType: summary.recommendedType,
      selectedType,
      processingMethod,
      steelConcurrent,
      complexStructure,
      constructionDurationDays: parsePositiveNumber(constructionDurationDays),
      rebarWorkerWage: parsePositiveNumber(rebarWorkerWage),
      commonWorkerWage: parsePositiveNumber(commonWorkerWage),
      rebarMaterialUnitPrices,
      bindingWireUnitPrice: parsePositiveNumber(bindingWireUnitPrice),
      spacerQuantity: parsePositiveNumber(spacerQuantity),
      spacerUnit,
      spacerUnitPrice: parsePositiveNumber(spacerUnitPrice),
      craneCost: parsePositiveNumber(craneCost),
      transportCost: parsePositiveNumber(transportCost),
      shopDrawingCost: parsePositiveNumber(shopDrawingCost)
    };
  }, [
    bindingWireUnitPrice,
    commonWorkerWage,
    complexStructure,
    constructionDurationDays,
    craneCost,
    materialUnitPrices,
    processingMethod,
    projectType,
    rebarWorkerWage,
    selectedType,
    shopDrawingCost,
    spacerQuantity,
    spacerUnit,
    spacerUnitPrice,
    steelConcurrent,
    summary.recommendedType,
    transportCost,
    visibleDiameters
  ]);

  const estimateItems = useMemo(
    () => buildRebarStandardEstimateItems(summary, settings),
    [settings, summary]
  );
  const calculatedCount = estimateItems.filter((item) => item.reviewStatus === "calculated").length;
  const priceRequiredCount = estimateItems.filter(
    (item) => item.reviewStatus === "price_required"
  ).length;
  const durationDays = settings.constructionDurationDays;
  const totalLaborCost = estimateItems.reduce((sum, item) => sum + item.laborCost, 0);
  const totalExpenseCost = estimateItems.reduce((sum, item) => sum + item.expenseCost, 0);
  const dailyLaborCost = durationDays ? totalLaborCost / durationDays : null;
  const dailyExpenseCost = durationDays ? totalExpenseCost / durationDays : null;
  const stockCapacityTon = parsePositiveNumber(rebarStockCapacityTon) ?? 0;
  const orderProgressPercent =
    summary.totalWeightTon > 0
      ? Math.min(100, (stockCapacityTon / summary.totalWeightTon) * 100)
      : 0;
  const orderProgressLabel = formatNumber(orderProgressPercent, 1);
  const availableOrderTon = Math.min(stockCapacityTon, summary.totalWeightTon);
  const remainingOrderTon = Math.max(summary.totalWeightTon - stockCapacityTon, 0);

  useEffect(() => {
    if (summary.recommendedType === "building_type_1" || summary.recommendedType === "building_type_2") {
      setSelectedType(summary.recommendedType);
    }
  }, [summary.recommendedType]);

  const handleApplyRecommendation = () => {
    if (summary.recommendedType === "civil_type_3") {
      setSelectedType("building_type_2");
      return;
    }

    setSelectedType(summary.recommendedType);
  };

  if (summary.totalWeightKg <= 0) {
    return (
      <Card className="section-enter bg-white shadow-sm">
        <SectionHeading
          title="철근 품셈 적용 산출"
          description="승인된 철근 수량을 기준으로 철근 본재, 현장가공, 현장조립, 결속선, 간격재, 별도계상 항목을 재료비·노무비·경비로 분리합니다."
        />
        <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-6 text-[13px] leading-6 text-slate">
          승인된 철근 수량이 없습니다. 철근 수량 산출 후보를 검토 후 승인하면 품셈 산출 항목이 생성됩니다.
        </div>
      </Card>
    );
  }

  return (
    <Card className="section-enter bg-white shadow-sm">
      <SectionHeading
        title="철근 품셈 적용 산출"
        description="승인된 철근 수량을 기준으로 철근 본재, 현장가공, 현장조립, 결속선, 간격재, 별도계상 항목을 재료비·노무비·경비로 분리합니다."
        action={
          <Button
            className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
            disabled={estimateItems.length === 0}
            onClick={() => exportRebarStandardEstimateToExcel(summary, settings, estimateItems)}
            type="button"
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            철근 품셈 Excel 내보내기
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">승인 철근 총량 kg</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {formatNumber(summary.totalWeightKg)}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#eef6ff] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">승인 철근 총량 ton</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {formatNumber(summary.totalWeightTon, 4)}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">D13 이하 비율</p>
          <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
            {formatNumber(summary.underD13Ratio, 2)}%
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">추천 Type</p>
          <p className="mt-1 text-[16px] font-bold text-foreground">
            {typeOptions.find((option) => option.value === summary.recommendedType)?.label}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#e8f9ef] px-3 py-3">
          <p className="text-[11px] font-medium text-[#087443]">품셈 기준 산출 후보</p>
          <p className="mt-1 text-[18px] font-bold text-[#087443]">{calculatedCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">단가 입력 필요</p>
          <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">{priceRequiredCount}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[14px] border border-border bg-[#f8fafc] px-4 py-3 text-[12px] leading-5 text-slate">
        <p className="font-semibold text-foreground">수량 기준 안내</p>
        <p className="mt-1">
          철근 가공/조립 품셈 수량은 승인된 정미중량 기준입니다. 철근 본재 재료비 검토는 LOSS율이 반영된 자재중량을 참고하세요.
        </p>
      </section>

      <section className="mt-4 rounded-[18px] border border-border bg-[#f8fafc] px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-foreground">품셈 적용 설정</h3>
            <p className="mt-1 text-[12px] leading-5 text-slate">{summary.recommendationReason}</p>
          </div>
          <Button
            className="min-h-[36px] rounded-[12px] px-3 text-[12px]"
            onClick={handleApplyRecommendation}
            variant="secondary"
          >
            추천 Type 적용
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="공사구분">
            <select
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground"
              onChange={(event) => setProjectType(event.target.value as "building" | "civil")}
              value={projectType}
            >
              <option value="building">건축</option>
              <option value="civil">토목</option>
            </select>
          </Field>
          <Field label="적용 Type">
            <select
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground"
              onChange={(event) => setSelectedType(event.target.value as RebarStandardType)}
              value={selectedType}
            >
              {typeOptions.map((option) => (
                <option disabled={option.disabled} key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="가공방식">
            <select
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground"
              onChange={(event) => setProcessingMethod(event.target.value as RebarProcessingMethod)}
              value={processingMethod}
            >
              <option value="site_processing">현장가공</option>
              <option disabled value="factory_processing">
                공장가공 후속 반영
              </option>
            </select>
          </Field>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex min-h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-3 text-[12px] font-semibold text-foreground">
              <input
                checked={steelConcurrent}
                onChange={(event) => setSteelConcurrent(event.target.checked)}
                type="checkbox"
              />
              철골 병행 시공
            </label>
            <label className="flex min-h-10 items-center gap-2 rounded-[10px] border border-border bg-white px-3 text-[12px] font-semibold text-foreground">
              <input
                checked={complexStructure}
                onChange={(event) => setComplexStructure(event.target.checked)}
                type="checkbox"
              />
              복잡 구조시설물
            </label>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-[18px] border border-border px-4 py-4">
        <h3 className="text-[14px] font-bold text-foreground">단가 입력</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NumberInput label="공사일수" onChange={setConstructionDurationDays} unit="일" value={constructionDurationDays} />
          <NumberInput label="철근공 노임단가" onChange={setRebarWorkerWage} unit="원/인" value={rebarWorkerWage} />
          <NumberInput label="보통인부 노임단가" onChange={setCommonWorkerWage} unit="원/인" value={commonWorkerWage} />
          {visibleDiameters.map((diameter) => (
            <NumberInput
              key={diameter}
              label={`철근 본재 ${diameter}`}
              onChange={(value) =>
                setMaterialUnitPrices((current) => ({ ...current, [diameter]: value }))
              }
              unit="원/ton"
              value={materialUnitPrices[diameter] ?? ""}
            />
          ))}
          <NumberInput label="결속선 단가" onChange={setBindingWireUnitPrice} unit="원/kg" value={bindingWireUnitPrice} />
          <NumberInput label="간격재 수량" onChange={setSpacerQuantity} unit={spacerUnit} value={spacerQuantity} />
          <Field label="간격재 단위">
            <select
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground"
              onChange={(event) => setSpacerUnit(event.target.value as "EA" | "식")}
              value={spacerUnit}
            >
              <option value="EA">EA</option>
              <option value="식">식</option>
            </select>
          </Field>
          <NumberInput label="간격재 단가" onChange={setSpacerUnitPrice} unit="원" value={spacerUnitPrice} />
          <NumberInput label="크레인 양중비" onChange={setCraneCost} unit="원" value={craneCost} />
          <NumberInput label="현장 내 운반비" onChange={setTransportCost} unit="원" value={transportCost} />
          <NumberInput label="shop drawing 작성비" onChange={setShopDrawingCost} unit="원" value={shopDrawingCost} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[14px] bg-[#f8fafc] px-3 py-3">
            <p className="text-[11px] font-medium text-slate">공사일수 기준 일별 노무비</p>
            <p className="mt-1 text-[18px] font-bold text-foreground">
              {formatOptionalWon(dailyLaborCost)}
            </p>
          </div>
          <div className="rounded-[14px] bg-[#f8fafc] px-3 py-3">
            <p className="text-[11px] font-medium text-slate">공사일수 기준 일별 경비</p>
            <p className="mt-1 text-[18px] font-bold text-foreground">
              {formatOptionalWon(dailyExpenseCost)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-x-auto">
        <table className="min-w-[1480px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">구분</th>
              <th className="px-2 py-3 font-medium">세부공종</th>
              <th className="px-2 py-3 font-medium">품명</th>
              <th className="px-2 py-3 font-medium">규격</th>
              <th className="px-2 py-3 font-medium">수량</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">재료비</th>
              <th className="px-2 py-3 font-medium">노무비</th>
              <th className="px-2 py-3 font-medium">경비</th>
              <th className="px-2 py-3 font-medium">일별 노무비</th>
              <th className="px-2 py-3 font-medium">일별 경비</th>
              <th className="px-2 py-3 font-medium">합계금액</th>
              <th className="px-2 py-3 font-medium">품셈근거</th>
              <th className="px-2 py-3 font-medium">산출근거</th>
              <th className="px-2 py-3 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {estimateItems.map((item) => (
              <tr className="border-b border-border/70 align-top" key={item.id}>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {categoryLabel[item.category]}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.workCategory}</td>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {item.itemName}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.specification}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.quantity > 0 ? formatNumber(item.quantity, 4) : "-"}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.unit}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {formatWon(item.materialCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {formatWon(item.laborCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {formatWon(item.expenseCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {formatOptionalWon(durationDays ? item.laborCost / durationDays : null)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {formatOptionalWon(durationDays ? item.expenseCost / durationDays : null)}
                </td>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {formatWon(item.totalCost)}
                </td>
                <td className="px-2 py-4 text-[12px] leading-5 text-slate">
                  {item.standardCode}
                </td>
                <td className="px-2 py-4 text-[12px] leading-5 text-slate">{item.basis}</td>
                <td className="px-2 py-4">
                  <Badge tone={statusTone[item.reviewStatus]}>
                    {statusLabel[item.reviewStatus]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 rounded-[18px] border border-border bg-[#f8fafc] px-4 py-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(300px,1fr)_minmax(320px,440px)] xl:items-center">
          <div className="min-w-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[12px] font-semibold text-primary">현장 발주 판단</p>
                <h3 className="mt-1 text-[18px] font-bold text-foreground">철근 발주 대시보드</h3>
                <p className="mt-2 text-[12px] leading-5 text-slate">
                  현장 적체 가능량을 입력하면 총 산출 철근량 중 발주된 철근량과 남은 철근량을 한눈에 비교합니다.
                </p>
              </div>
              <div className="w-full md:w-[240px]">
                <NumberInput
                  label="철근 적체 가능량"
                  onChange={setRebarStockCapacityTon}
                  unit="ton"
                  value={rebarStockCapacityTon}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-[14px] border border-border bg-white px-3 py-3">
                <p className="text-[11px] font-medium text-slate">총 산출 철근량</p>
                <p className="mt-1 text-[20px] font-bold text-foreground">
                  {formatNumber(summary.totalWeightTon, 4)}
                  <span className="ml-1 text-[12px] font-semibold text-slate">ton</span>
                </p>
              </div>
              <div className="rounded-[14px] border border-[#b7ddc4] bg-[#eef6f1] px-3 py-3">
                <p className="text-[11px] font-medium text-[#1c7c54]">발주된 철근량</p>
                <p className="mt-1 text-[20px] font-bold text-[#1c7c54]">
                  {formatNumber(availableOrderTon, 4)}
                  <span className="ml-1 text-[12px] font-semibold">ton</span>
                </p>
              </div>
              <div className="rounded-[14px] border border-[#edd8aa] bg-[#fff8ea] px-3 py-3">
                <p className="text-[11px] font-medium text-[#7a4a05]">남은 철근량</p>
                <p className="mt-1 text-[20px] font-bold text-[#7a4a05]">
                  {formatNumber(remainingOrderTon, 4)}
                  <span className="ml-1 text-[12px] font-semibold">ton</span>
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 text-[12px] leading-5 text-slate sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2">
                <span className="h-3 w-3 rounded-full bg-[#1c7c54]" />
                <span>발주된 철근량: {formatNumber(availableOrderTon, 4)} ton</span>
              </div>
              <div className="flex items-center gap-2 rounded-[12px] bg-white px-3 py-2">
                <span className="h-3 w-3 rounded-full bg-[#f0b84b]" />
                <span>남은 철근량: {formatNumber(remainingOrderTon, 4)} ton</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-[18px] border border-border bg-white px-4 py-5 shadow-sm">
            <div
              aria-label={`철근 발주 비율 ${orderProgressLabel}%, 발주된 철근량 ${formatNumber(availableOrderTon, 4)} ton, 남은 철근량 ${formatNumber(remainingOrderTon, 4)} ton`}
              className="flex h-64 w-64 items-center justify-center rounded-full sm:h-72 sm:w-72"
              role="img"
              style={{
                background: `conic-gradient(#1c7c54 ${orderProgressPercent}%, #f0b84b 0)`
              }}
            >
              <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full bg-white px-4 text-center shadow-md sm:h-48 sm:w-48">
                <span className="text-[34px] font-bold text-foreground">{orderProgressLabel}%</span>
                <span className="mt-1 text-[11px] font-semibold text-slate">발주 진행률</span>
                <span className="mt-3 text-[12px] font-bold text-[#1c7c54]">
                  발주 {formatNumber(availableOrderTon, 3)} ton
                </span>
                <span className="mt-1 text-[12px] font-bold text-[#7a4a05]">
                  잔여 {formatNumber(remainingOrderTon, 3)} ton
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-[320px] text-center text-[12px] leading-5 text-slate">
              적체 가능량이 총 산출 철근량보다 크면 발주 진행률은 100%로 표시됩니다.
            </p>
          </div>
        </div>
      </section>
    </Card>
  );
}
