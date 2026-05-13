"use client";

import {
  Calculator,
  Check,
  Clock3,
  FileSpreadsheet,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getRebarMemberTypeLabel,
  getRebarPositionLabel,
  summarizeRebarQuantityCandidates
} from "@/lib/estimation/rebar-quantity";
import type {
  DrawingSheetIndexRecord,
  RebarBarCountRule,
  RebarFootingLayer,
  RebarMemberType,
  RebarPosition,
  RebarQuantityCandidateRecord,
  RebarReviewStatus
} from "@/lib/estimation/types";

type TemplateMemberType = Exclude<RebarMemberType, "unknown">;

type RebarQuantityReviewProps = {
  candidates: RebarQuantityCandidateRecord[];
  drawingSheets?: DrawingSheetIndexRecord[];
  onAddCandidate?: (memberType: TemplateMemberType) => string | void;
  onChangeCandidate: (candidateId: string, updates: Partial<RebarQuantityCandidateRecord>) => void;
  onChangeStatus: (candidateId: string, reviewStatus: RebarReviewStatus) => void;
  onExportExcel?: () => void;
  onRemoveCandidate?: (candidateId: string) => void;
};

const memberTabs: Array<{ value: TemplateMemberType; label: string; enabled: boolean }> = [
  { value: "footing", label: "기초", enabled: true },
  { value: "beam", label: "보", enabled: true },
  { value: "column", label: "기둥", enabled: true },
  { value: "slab", label: "슬래브", enabled: false },
  { value: "wall", label: "벽체", enabled: false }
];

const diameterOptions = ["D10", "D13", "D16", "D19", "D22", "D25", "D29", "D32"];

const countRuleOptions: Array<{ value: RebarBarCountRule; label: string }> = [
  { value: "floor_plus_one", label: "floor+1" },
  { value: "ceil_plus_one", label: "ceil+1" },
  { value: "direct", label: "직접입력" }
];

const reviewToneMap = {
  pending: "gray",
  accepted: "green",
  rejected: "red"
} as const;

const reviewLabelMap = {
  pending: "보류",
  accepted: "승인",
  rejected: "제외"
} as const;

function formatNumber(value: number | undefined, fractionDigits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0
  });
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function sourceLabel(
  candidate: RebarQuantityCandidateRecord,
  drawingSheets: DrawingSheetIndexRecord[]
) {
  const sourceSheet = drawingSheets.find(
    (sheet) =>
      sheet.sourcePage === candidate.sourcePage &&
      (!candidate.sourceFileName || sheet.sourceFileName === candidate.sourceFileName)
  );

  if (sourceSheet) {
    return `${sourceSheet.drawingNo ?? "도면번호 미확인"} ${sourceSheet.drawingTitle ?? "도면명 미확인"} / p.${sourceSheet.sourcePage}`;
  }

  return `${candidate.sourceFileName ?? "직접 추가"}${candidate.sourcePage ? ` / p.${candidate.sourcePage}` : ""}`;
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
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
  value
}: {
  label: string;
  onChange: (value: number | undefined) => void;
  value: number | undefined;
}) {
  return (
    <Field label={label}>
      <input
        className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-right text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
        type="number"
        value={value ?? ""}
      />
    </Field>
  );
}

function SelectField<T extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  value: T;
}) {
  return (
    <Field label={label}>
      <select
        className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option disabled={option.disabled} key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function CandidateList({
  activeType,
  candidates,
  drawingSheets,
  onSelect,
  selectedId
}: {
  activeType: TemplateMemberType;
  candidates: RebarQuantityCandidateRecord[];
  drawingSheets: DrawingSheetIndexRecord[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-5 text-[12px] leading-5 text-slate">
        {getRebarMemberTypeLabel(activeType)} 후보가 없습니다. 직접 부재 추가로 산출 템플릿을 만들 수 있습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {candidates.map((candidate) => {
        const selected = selectedId === candidate.id;

        return (
          <button
            className={[
              "rounded-[14px] border px-3 py-3 text-left transition",
              selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
            ].join(" ")}
            key={candidate.id}
            onClick={() => onSelect(candidate.id)}
            type="button"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {candidate.memberName ?? "부재명 미확인"} · {candidate.diameter}
                </p>
                <p className="mt-1 truncate text-[11px] text-slate">
                  {sourceLabel(candidate, drawingSheets)}
                </p>
              </div>
              <Badge tone={reviewToneMap[candidate.reviewStatus]}>
                {reviewLabelMap[candidate.reviewStatus]}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="blue">{getRebarMemberTypeLabel(candidate.memberType)}</Badge>
              <Badge tone="gray">{getRebarPositionLabel(candidate.position)}</Badge>
              {candidate.quantityReviewRequired ? (
                <Badge tone="amber">검토 필요</Badge>
              ) : (
                <Badge tone="green">{formatNumber(candidate.quantityKg)}kg</Badge>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TemplateInputs({
  activeType,
  candidate,
  onChange
}: {
  activeType: TemplateMemberType;
  candidate: RebarQuantityCandidateRecord;
  onChange: (updates: Partial<RebarQuantityCandidateRecord>) => void;
}) {
  const positionOptions: Array<{ value: RebarPosition; label: string }> =
    activeType === "footing"
      ? [
          { value: "x", label: "X방향" },
          { value: "y", label: "Y방향" }
        ]
      : activeType === "beam"
        ? [
            { value: "main", label: "주근" },
            { value: "stirrup", label: "늑근" }
          ]
        : activeType === "column"
          ? [
              { value: "main", label: "주근" },
              { value: "tie", label: "띠철근" }
            ]
          : [{ value: "unknown", label: "후속 템플릿" }];

  const disabledTemplate = activeType === "slab" || activeType === "wall";

  return (
    <div className="grid gap-4">
      {disabledTemplate ? (
        <div className="rounded-[14px] border border-dashed border-border bg-[#fff8ea] px-4 py-3 text-[12px] leading-5 text-[#7a4a05]">
          {getRebarMemberTypeLabel(activeType)} 산출식은 1차 구현 범위 밖입니다. 후보 분류와 보류/제외 관리는 가능하며, 승인 산출은 후속 템플릿 반영 후 사용합니다.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="부재명">
          <input
            className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
            onChange={(event) => onChange({ memberName: event.target.value })}
            value={candidate.memberName ?? ""}
          />
        </Field>
        <SelectField
          label="부재 종류"
          onChange={(value: RebarMemberType) => onChange({ memberType: value })}
          options={[
            { value: "footing", label: "기초" },
            { value: "beam", label: "보" },
            { value: "column", label: "기둥" },
            { value: "slab", label: "슬래브" },
            { value: "wall", label: "벽체" },
            { value: "unknown", label: "미확정" }
          ]}
          value={candidate.memberType}
        />
        <SelectField
          label={activeType === "footing" ? "방향" : "철근 종류"}
          onChange={(value: RebarPosition) => onChange({ position: value })}
          options={positionOptions}
          value={
            positionOptions.some((option) => option.value === candidate.position)
              ? candidate.position
              : positionOptions[0].value
          }
        />
        <SelectField
          label="철근 규격"
          onChange={(value: string) => onChange({ diameter: value })}
          options={diameterOptions.map((diameter) => ({ value: diameter, label: diameter }))}
          value={candidate.diameter}
        />
      </div>

      {activeType === "footing" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            label="상부/하부"
            onChange={(value: RebarFootingLayer) => onChange({ footingLayer: value })}
            options={[
              { value: "top", label: "상부근" },
              { value: "bottom", label: "하부근" }
            ]}
            value={candidate.footingLayer ?? "top"}
          />
          <NumberInput
            label="기초 폭 mm"
            onChange={(value) => onChange({ footingWidthMm: value })}
            value={candidate.footingWidthMm}
          />
          <NumberInput
            label="기초 길이 mm"
            onChange={(value) => onChange({ footingLengthMm: value })}
            value={candidate.footingLengthMm}
          />
          <NumberInput
            label="간격 mm"
            onChange={(value) => onChange({ spacingMm: value })}
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      {activeType === "beam" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            label="보 길이 mm"
            onChange={(value) => onChange({ memberLengthMm: value })}
            value={candidate.memberLengthMm}
          />
          <NumberInput
            label="보 폭 mm"
            onChange={(value) => onChange({ sectionWidthMm: value })}
            value={candidate.sectionWidthMm}
          />
          <NumberInput
            label="보 춤 mm"
            onChange={(value) => onChange({ sectionDepthMm: value })}
            value={candidate.sectionDepthMm}
          />
          <NumberInput
            label="늑근 간격 mm"
            onChange={(value) => onChange({ spacingMm: value })}
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      {activeType === "column" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            label="기둥 높이 mm"
            onChange={(value) => onChange({ memberHeightMm: value })}
            value={candidate.memberHeightMm}
          />
          <NumberInput
            label="기둥 폭 mm"
            onChange={(value) => onChange({ sectionWidthMm: value })}
            value={candidate.sectionWidthMm}
          />
          <NumberInput
            label="기둥 춤 mm"
            onChange={(value) => onChange({ sectionDepthMm: value })}
            value={candidate.sectionDepthMm}
          />
          <NumberInput
            label="띠철근 간격 mm"
            onChange={(value) => onChange({ spacingMm: value })}
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberInput
          label="직접 본수"
          onChange={(value) => onChange({ barCount: value, manualBarCount: value })}
          value={candidate.manualBarCount ?? candidate.barCount}
        />
        <SelectField
          label="본수 산정 방식"
          onChange={(value: RebarBarCountRule) => onChange({ barCountRule: value })}
          options={countRuleOptions}
          value={candidate.barCountRule ?? "floor_plus_one"}
        />
        <NumberInput
          label="반복 개수"
          onChange={(value) => onChange({ memberCount: value ?? 1 })}
          value={candidate.memberCount}
        />
        <NumberInput
          label="면수"
          onChange={(value) => onChange({ faceCount: value ?? 1 })}
          value={candidate.faceCount ?? 1}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberInput
          label="피복 mm"
          onChange={(value) => onChange({ coverMm: value })}
          value={candidate.coverMm}
        />
        <NumberInput
          label="정착길이 mm"
          onChange={(value) => onChange({ anchorageLengthMm: value })}
          value={candidate.anchorageLengthMm}
        />
        <NumberInput
          label="이음길이 mm"
          onChange={(value) => onChange({ spliceLengthMm: value })}
          value={candidate.spliceLengthMm}
        />
        <NumberInput
          label="갈고리길이 mm"
          onChange={(value) => onChange({ hookLengthMm: value })}
          value={candidate.hookLengthMm}
        />
        <NumberInput
          label="절곡보정 mm"
          onChange={(value) => onChange({ bendCorrectionMm: value })}
          value={candidate.bendCorrectionMm}
        />
        <NumberInput
          label="LOSS율"
          onChange={(value) => onChange({ lossRate: value })}
          value={candidate.lossRate}
        />
      </div>
    </div>
  );
}

export function RebarQuantityReview({
  candidates,
  drawingSheets = [],
  onAddCandidate,
  onChangeCandidate,
  onChangeStatus,
  onExportExcel,
  onRemoveCandidate
}: RebarQuantityReviewProps) {
  const [activeType, setActiveType] = useState<TemplateMemberType>("footing");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const summary = useMemo(() => summarizeRebarQuantityCandidates(candidates), [candidates]);
  const activeCandidates = useMemo(
    () =>
      candidates.filter(
        (candidate) => candidate.memberType === activeType || candidate.memberType === "unknown"
      ),
    [activeType, candidates]
  );
  const selectedCandidate = useMemo(
    () => activeCandidates.find((candidate) => candidate.id === selectedId) ?? activeCandidates[0],
    [activeCandidates, selectedId]
  );

  useEffect(() => {
    if (!selectedCandidate) {
      setSelectedId(undefined);
      return;
    }

    if (selectedCandidate.id !== selectedId) {
      setSelectedId(selectedCandidate.id);
    }
  }, [selectedCandidate, selectedId]);

  const handleAddCandidate = () => {
    const newId = onAddCandidate?.(activeType);

    if (typeof newId === "string") {
      setSelectedId(newId);
    }
  };

  return (
    <Card className="section-enter bg-white shadow-sm">
      <SectionHeading
        title="철근 실무식 수량산출"
        description="파싱된 철근 후보를 부재 종류별 템플릿에 배치하고, 승인된 항목만 물량내역과 철근 품셈 산출로 전달합니다."
        action={
          onExportExcel ? (
            <Button
              className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
              disabled={candidates.length === 0}
              onClick={onExportExcel}
              variant="secondary"
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              철근 후보 Excel
            </Button>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-[14px] bg-[#f8fafc] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">전체 후보</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.totalCandidates}</p>
        </div>
        <div className="rounded-[14px] bg-[#eef6ff] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">계산 가능</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.calculatedCandidates}
          </p>
        </div>
        <div className="rounded-[14px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">검토 필요</p>
          <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
            {summary.reviewRequiredCandidates}
          </p>
        </div>
        <div className="rounded-[14px] bg-[#e8f9ef] px-3 py-3">
          <p className="text-[11px] font-medium text-[#087443]">승인 정미중량</p>
          <p className="mt-1 text-[18px] font-bold text-[#087443]">
            {formatNumber(summary.totalKg)}kg
          </p>
        </div>
        <div className="rounded-[14px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">승인 항목</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.acceptedCandidates}
          </p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-5 gap-2 rounded-[18px] bg-[#eef3ef] p-1.5">
        {memberTabs.map((tab) => {
          const active = activeType === tab.value;
          const count = candidates.filter((candidate) => candidate.memberType === tab.value).length;

          return (
            <button
              className={[
                "min-h-[42px] rounded-[14px] px-2 text-[12px] font-bold transition",
                active ? "bg-white text-primary shadow-sm" : "text-slate hover:bg-white/60"
              ].join(" ")}
              key={tab.value}
              onClick={() => setActiveType(tab.value)}
              type="button"
            >
              {tab.label}
              <span className="ml-1 text-[11px] font-semibold">({count})</span>
              {!tab.enabled ? <span className="ml-1 text-[10px] font-semibold">후속</span> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-border bg-[#f8fafc] p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">
                {getRebarMemberTypeLabel(activeType)} 후보
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-slate">
                미분류 후보는 현재 탭에서 선택 후 부재 종류를 확정할 수 있습니다.
              </p>
            </div>
            <Button
              className="min-h-[34px] shrink-0 rounded-[12px] px-2 text-[11px]"
              onClick={handleAddCandidate}
              variant="secondary"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              추가
            </Button>
          </div>
          <CandidateList
            activeType={activeType}
            candidates={activeCandidates}
            drawingSheets={drawingSheets}
            onSelect={setSelectedId}
            selectedId={selectedCandidate?.id}
          />
        </aside>

        <section className="rounded-[18px] border border-border bg-white p-4">
          {selectedCandidate ? (
            <>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h3 className="text-[16px] font-bold text-foreground">
                      {selectedCandidate.memberName ?? "부재명 미확인"} 산출 템플릿
                    </h3>
                    <Badge tone={reviewToneMap[selectedCandidate.reviewStatus]}>
                      {reviewLabelMap[selectedCandidate.reviewStatus]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-slate">
                    {sourceLabel(selectedCandidate, drawingSheets)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-[36px] rounded-[12px] px-3 text-[12px]"
                    onClick={() => onChangeStatus(selectedCandidate.id, "accepted")}
                    variant="secondary"
                  >
                    <Check className="mr-1 h-3.5 w-3.5" />
                    승인
                  </Button>
                  <Button
                    className="min-h-[36px] rounded-[12px] px-3 text-[12px]"
                    onClick={() => onChangeStatus(selectedCandidate.id, "rejected")}
                    variant="ghost"
                  >
                    <X className="mr-1 h-3.5 w-3.5" />
                    제외
                  </Button>
                  <Button
                    className="min-h-[36px] rounded-[12px] px-3 text-[12px]"
                    onClick={() => onChangeStatus(selectedCandidate.id, "pending")}
                    variant="ghost"
                  >
                    <Clock3 className="mr-1 h-3.5 w-3.5" />
                    보류
                  </Button>
                  <Button
                    className="min-h-[36px] rounded-[12px] px-3 text-[12px]"
                    onClick={() => {
                      onRemoveCandidate?.(selectedCandidate.id);
                      setSelectedId(undefined);
                    }}
                    variant="ghost"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    제거
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <TemplateInputs
                  activeType={
                    selectedCandidate.memberType !== "unknown"
                      ? (selectedCandidate.memberType as TemplateMemberType)
                      : activeType
                  }
                  candidate={selectedCandidate}
                  onChange={(updates) => onChangeCandidate(selectedCandidate.id, updates)}
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-[14px] bg-[#f8fafc] px-3 py-3">
                  <p className="text-[11px] font-medium text-slate">철근 본수</p>
                  <p className="mt-1 text-[18px] font-bold text-foreground">
                    {formatNumber(selectedCandidate.barCount, 0)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#e8f9ef] px-3 py-3">
                  <p className="text-[11px] font-medium text-[#087443]">정미중량 kg</p>
                  <p className="mt-1 text-[18px] font-bold text-[#087443]">
                    {formatNumber(selectedCandidate.quantityKg)}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#fff8ea] px-3 py-3">
                  <p className="text-[11px] font-medium text-[#7a4a05]">자재중량 kg</p>
                  <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
                    {formatNumber(selectedCandidate.materialQuantityKg)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-border bg-[#f8fafc] px-4 py-4">
                <p className="text-[12px] font-bold text-foreground">산출식 미리보기</p>
                <p className="mt-2 text-[12px] leading-5 text-foreground">
                  {selectedCandidate.calculationFormula}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-slate">
                  {selectedCandidate.calculationBasis}
                </p>
                {selectedCandidate.sourceTextSnippet ? (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-slate">
                    원문: {selectedCandidate.sourceTextSnippet}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-8 text-center text-[13px] leading-6 text-slate">
              선택된 철근 후보가 없습니다. 왼쪽에서 후보를 선택하거나 직접 부재를 추가하세요.
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
