"use client";

import {
  Calculator,
  Check,
  Clock3,
  FileSpreadsheet,
  Info,
  Layers3,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CollapsibleResultList } from "@/components/estimation/CollapsibleResultList";
import { DrawingReferenceMatrix } from "@/components/estimation/DrawingReferenceMatrix";
import { RebarApprovalChecklist } from "@/components/estimation/RebarApprovalChecklist";
import { RebarInputSourceBadge } from "@/components/estimation/RebarInputSourceBadge";
import {
  getRebarReferenceItems,
  RebarReferenceGuide
} from "@/components/estimation/RebarReferenceGuide";
import { RebarReviewHistoryNote } from "@/components/estimation/RebarReviewHistoryNote";
import { RebarSourceEvidencePanel } from "@/components/estimation/RebarSourceEvidencePanel";
import { RebarGeneralRulePanel } from "@/components/estimation/RebarGeneralRulePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getMissingRebarRequiredInputLabels,
  getRebarCandidateSourceGroup,
  isWallRebarDetailReviewRequired,
  sortRebarQuantityCandidatesBySource,
  summarizeRebarQuantityCandidates
} from "@/lib/estimation/rebar-quantity";
import {
  getChecklistCompletion,
  getReviewCompletenessLabel,
  resolveReviewCompleteness
} from "@/lib/estimation/rebar-evidence";
import type {
  DrawingSheetIndexRecord,
  RebarBarCountRule,
  RebarDetailAdjustmentPreset,
  RebarFootingLayer,
  RebarMemberType,
  RebarPosition,
  RebarQuantityCandidateRecord,
  RebarReviewStatus
} from "@/lib/estimation/types";

type TemplateMemberType = Exclude<RebarMemberType, "unknown">;
type BadgeTone = "green" | "blue" | "amber" | "red" | "gray";

type RebarQuantityReviewProps = {
  candidates: RebarQuantityCandidateRecord[];
  drawingSheets?: DrawingSheetIndexRecord[];
  onAddCandidate?: (memberType: TemplateMemberType) => string | void;
  onChangeCandidate: (candidateId: string, updates: Partial<RebarQuantityCandidateRecord>) => void;
  onChangeStatus: (candidateId: string, reviewStatus: RebarReviewStatus) => void;
  onExportExcel?: () => void;
  onRemoveCandidate?: (candidateId: string) => void;
};

const memberTabs: Array<{ value: TemplateMemberType; label: string }> = [
  { value: "footing", label: "기초" },
  { value: "beam", label: "보" },
  { value: "column", label: "기둥" },
  { value: "slab", label: "슬래브" },
  { value: "wall", label: "벽체" }
];

const memberTypeLabel: Record<RebarMemberType, string> = {
  footing: "기초",
  beam: "보",
  column: "기둥",
  slab: "슬래브",
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

const diameterOptions = ["D10", "D13", "D16", "D19", "D22", "D25", "D29", "D32"];

const countRuleOptions: Array<{ value: RebarBarCountRule; label: string }> = [
  { value: "floor_plus_one", label: "floor+1" },
  { value: "ceil_plus_one", label: "ceil+1" },
  { value: "direct", label: "직접 본수" }
];

const reviewToneMap: Record<RebarReviewStatus, BadgeTone> = {
  pending: "gray",
  accepted: "green",
  rejected: "red"
};

const reviewLabelMap: Record<RebarReviewStatus, string> = {
  pending: "보류",
  accepted: "승인",
  rejected: "제외"
};

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
  if (!value.trim()) return undefined;
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

function getSourceGroupLabel(candidate: RebarQuantityCandidateRecord) {
  if (candidate.memberListSource === "manual") {
    return { label: "사용자 직접 추가", tone: "gray" as BadgeTone };
  }

  if (candidate.memberListSource === "schedule_with_plan") {
    return { label: "일람표 기반 후보", tone: "green" as BadgeTone };
  }

  if (candidate.memberListSource === "schedule") {
    return { label: "일람표 기반 후보", tone: "green" as BadgeTone };
  }

  if (candidate.memberListSource === "plan_unmatched") {
    return { label: "일람표 매칭 필요", tone: "amber" as BadgeTone };
  }

  if (candidate.memberListSource === "note_reference") {
    return { label: "참고 문구 / 검토 필요", tone: "amber" as BadgeTone };
  }

  if (candidate.memberListSource === "future_review") {
    return { label: "후속 검토 대상", tone: "amber" as BadgeTone };
  }

  const group = getRebarCandidateSourceGroup(candidate);

  if (group === "schedule") return { label: "구조일람표 기반 후보", tone: "green" as BadgeTone };
  if (group === "plan") return { label: "구조평면도 기반 보조 후보", tone: "blue" as BadgeTone };
  return { label: "참고 문구 / 검토 필요", tone: "amber" as BadgeTone };
}

function getInputSourceLabel(field: string, memberType: RebarMemberType) {
  if (["coverMm", "anchorageLengthMm", "spliceLengthMm", "hookLengthMm"].includes(field)) {
    return "구조 일반사항 확인값";
  }

  if (["lossRate", "bendCorrectionMm", "deductionLengthMm", "manualBarCount", "barCountRule"].includes(field)) {
    return "사용자 판단값";
  }

  if (["memberCount", "memberLengthMm", "slabLengthMm", "slabWidthMm", "wallLengthMm"].includes(field)) {
    return "구조평면도 확인값";
  }

  if (["memberHeightMm", "wallHeightMm"].includes(field)) {
    return memberType === "column" || memberType === "wall"
      ? "단면도/구조평면도 확인값"
      : "구조평면도 확인값";
  }

  if (
    [
      "footingWidthMm",
      "footingLengthMm",
      "sectionWidthMm",
      "sectionDepthMm",
      "slabThicknessMm",
      "wallThicknessMm",
      "diameter",
      "spacingMm",
      "position",
      "footingLayer"
    ].includes(field)
  ) {
    return memberType === "wall" ? "상세도 확인값" : "구조일람표 확인값";
  }

  if (field === "faceCount") return "배근상세도 확인값";

  return "사용자 보정값";
}

function Field({
  children,
  hint,
  label,
  missing,
  required,
  source
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
  missing?: boolean;
  required?: boolean;
  source?: string;
}) {
  return (
    <label className="block">
      <span className="flex min-h-5 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate">
        <span className={missing ? "text-[#b42318]" : ""}>
          {label}
          {required ? " *" : ""}
        </span>
        {source ? <RebarInputSourceBadge label={source} /> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] leading-4 text-slate">{hint}</span> : null}
      {missing ? (
        <span className="mt-1 block text-[10px] font-semibold leading-4 text-[#b42318]">
          필수 입력값 확인 필요
        </span>
      ) : null}
    </label>
  );
}

function NumberInput({
  field,
  label,
  memberType,
  missing,
  onChange,
  required,
  value
}: {
  field: string;
  label: string;
  memberType: RebarMemberType;
  missing?: boolean;
  onChange: (value: number | undefined) => void;
  required?: boolean;
  value: number | undefined;
}) {
  return (
    <Field
      label={label}
      missing={missing}
      required={required}
      source={getInputSourceLabel(field, memberType)}
    >
      <input
        className={[
          "mt-1 h-10 w-full rounded-[10px] border bg-white px-3 text-right text-[13px] font-semibold text-foreground outline-none transition focus:border-primary",
          missing ? "border-[#f3a19a] bg-[#fff8f7]" : "border-border"
        ].join(" ")}
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
  field,
  label,
  memberType,
  missing,
  onChange,
  options,
  required,
  value
}: {
  field: string;
  label: string;
  memberType: RebarMemberType;
  missing?: boolean;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; disabled?: boolean }>;
  required?: boolean;
  value: T;
}) {
  return (
    <Field
      label={label}
      missing={missing}
      required={required}
      source={getInputSourceLabel(field, memberType)}
    >
      <select
        className={[
          "mt-1 h-10 w-full rounded-[10px] border bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition focus:border-primary",
          missing ? "border-[#f3a19a] bg-[#fff8f7]" : "border-border"
        ].join(" ")}
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

function getPositionOptions(activeType: TemplateMemberType): Array<{ value: RebarPosition; label: string }> {
  if (activeType === "footing") {
    return [
      { value: "x", label: "X방향" },
      { value: "y", label: "Y방향" }
    ];
  }

  if (activeType === "beam") {
    return [
      { value: "main", label: "주근" },
      { value: "stirrup", label: "늑근/전단근" }
    ];
  }

  if (activeType === "column") {
    return [
      { value: "main", label: "주근" },
      { value: "tie", label: "띠철근" }
    ];
  }

  if (activeType === "slab") {
    return [
      { value: "x_bottom", label: "X방향 하부근" },
      { value: "y_bottom", label: "Y방향 하부근" },
      { value: "x_top", label: "X방향 상부근" },
      { value: "y_top", label: "Y방향 상부근" },
      { value: "distribution", label: "배력근" },
      { value: "opening_reinforcement", label: "개구부 보강근" }
    ];
  }

  return [
    { value: "vertical", label: "수직근" },
    { value: "horizontal", label: "수평근" },
    { value: "u_bar", label: "U-BAR" },
    { value: "c_bar", label: "C-BAR" },
    { value: "opening_reinforcement", label: "개구부 보강근" }
  ];
}

function ExtractedValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[10px] bg-white px-3 py-2">
      <p className="text-[10px] font-semibold text-slate">{label}</p>
      <p className="mt-1 break-words text-[12px] font-semibold text-foreground">{value || "-"}</p>
    </div>
  );
}

function DrawingExtractedValues({
  candidate,
  drawingSheets
}: {
  candidate: RebarQuantityCandidateRecord;
  drawingSheets: DrawingSheetIndexRecord[];
}) {
  const dimensionLabel = [
    candidate.sectionWidthMm && candidate.sectionDepthMm
      ? `${candidate.sectionWidthMm}x${candidate.sectionDepthMm}`
      : null,
    candidate.footingWidthMm && candidate.footingLengthMm
      ? `기초 ${candidate.footingWidthMm}x${candidate.footingLengthMm}`
      : null,
    candidate.slabThicknessMm ? `슬래브 두께 ${candidate.slabThicknessMm}` : null,
    candidate.wallThicknessMm ? `벽 두께 ${candidate.wallThicknessMm}` : null
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <section className="rounded-[14px] border border-border bg-[#f8fafc] px-4 py-4">
      <div className="mb-3 flex items-center gap-2">
        <Layers3 className="h-4 w-4 text-primary" />
        <h4 className="text-[13px] font-bold text-foreground">도면 추출값</h4>
        <Badge tone="gray">읽기 전용</Badge>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
        <ExtractedValue label="부재명" value={candidate.memberName ?? "부재명 미확인"} />
        <ExtractedValue label="부재 종류" value={memberTypeLabel[candidate.memberType]} />
        <ExtractedValue label="철근 종류" value={positionLabel[candidate.position]} />
        <ExtractedValue label="철근 규격" value={candidate.diameter} />
        <ExtractedValue label="철근 개수" value={candidate.barCount} />
        <ExtractedValue
          label="철근 간격"
          value={candidate.spacingMm ? `@${candidate.spacingMm}` : "-"}
        />
        <ExtractedValue label="단면/두께" value={dimensionLabel} />
        <ExtractedValue label="출처" value={sourceLabel(candidate, drawingSheets)} />
      </div>
      {candidate.sourceTextSnippet ? (
        <p className="mt-3 line-clamp-3 rounded-[10px] bg-white px-3 py-2 text-[11px] leading-5 text-slate">
          원문: {candidate.sourceTextSnippet}
        </p>
      ) : null}
    </section>
  );
}

function RelatedDrawingRecommendation({ memberType }: { memberType: RebarMemberType }) {
  const items = getRebarReferenceItems(memberType);

  if (items.length === 0) return null;

  return (
    <section className="rounded-[14px] border border-[#b7d9ff] bg-[#f4f9ff] px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 text-[#2157a3]" />
        <h4 className="text-[13px] font-bold text-foreground">관련 도면 추천</h4>
      </div>
      <ul className="grid gap-1.5 text-[12px] leading-5 text-slate">
        {items.map((item) => (
          <li key={`${item.title}-${item.detail}`}>
            <span className="font-semibold text-foreground">{item.detail}:</span> {item.title} 확인
          </li>
        ))}
      </ul>
    </section>
  );
}

function CandidateButton({
  candidate,
  drawingSheets,
  onSelect,
  selected
}: {
  candidate: RebarQuantityCandidateRecord;
  drawingSheets: DrawingSheetIndexRecord[];
  onSelect: (id: string) => void;
  selected: boolean;
}) {
  const sourceGroup = getSourceGroupLabel(candidate);
  const wallReviewRequired = isWallRebarDetailReviewRequired(candidate);
  const checklistCompletion = getChecklistCompletion(candidate);
  const completeness = candidate.reviewCompleteness ?? resolveReviewCompleteness(candidate);

  return (
    <button
      className={[
        "w-full min-w-0 overflow-hidden rounded-[14px] border px-3 py-3 text-left transition",
        selected ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40"
      ].join(" ")}
      onClick={() => onSelect(candidate.id)}
      type="button"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-[13px] font-bold leading-5 text-foreground">
            {candidate.memberName ?? "부재명 미확인"} · {candidate.diameter}
          </p>
          <p className="mt-1 break-words text-[11px] leading-4 text-slate">
            {sourceLabel(candidate, drawingSheets)}
          </p>
        </div>
        <Badge tone={reviewToneMap[candidate.reviewStatus]}>
          {reviewLabelMap[candidate.reviewStatus]}
        </Badge>
      </div>
      <div className="mt-2 flex min-w-0 max-w-full flex-wrap gap-1.5 [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:break-words [&>span]:text-left">
        <Badge tone={sourceGroup.tone}>{sourceGroup.label}</Badge>
        {candidate.detectedSpecs && candidate.detectedSpecs.length > 0 ? (
          <Badge tone="blue">{candidate.detectedSpecs.slice(0, 3).join(", ")}</Badge>
        ) : null}
        {candidate.planMatched ? <Badge tone="blue">평면도 배치 확인됨</Badge> : null}
        <Badge tone="gray">{positionLabel[candidate.position]}</Badge>
        <Badge tone={completeness === "complete" ? "green" : checklistCompletion.completed > 0 ? "amber" : "gray"}>
          {getReviewCompletenessLabel(completeness)}
        </Badge>
        {wallReviewRequired ? <Badge tone="amber">배근 상세 확인 필요</Badge> : null}
        {candidate.quantityReviewRequired ? (
          <Badge tone="amber">수량 확인 필요</Badge>
        ) : (
          <Badge tone="green">{formatNumber(candidate.quantityKg)}kg</Badge>
        )}
      </div>
    </button>
  );
}

function CandidateList({
  candidates,
  drawingSheets,
  onSelect,
  selectedId
}: {
  candidates: RebarQuantityCandidateRecord[];
  drawingSheets: DrawingSheetIndexRecord[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  const scheduleCandidates = candidates.filter(
    (candidate) =>
      candidate.memberListSource === "schedule" ||
      candidate.memberListSource === "schedule_with_plan" ||
      (!candidate.memberListSource && getRebarCandidateSourceGroup(candidate) === "schedule")
  );
  const planMatchedCandidates: RebarQuantityCandidateRecord[] = [];
  const manualCandidates = candidates.filter(
    (candidate) => candidate.memberListSource === "manual"
  );
  const planUnmatchedCandidates = candidates.filter(
    (candidate) =>
      candidate.memberListSource === "plan_unmatched" ||
      (!candidate.memberListSource && getRebarCandidateSourceGroup(candidate) === "plan")
  );
  const noteCandidates = candidates.filter(
    (candidate) =>
      candidate.memberListSource === "note_reference" ||
      (!candidate.memberListSource && getRebarCandidateSourceGroup(candidate) === "note")
  );
  const futureReviewCandidates = candidates.filter(
    (candidate) => candidate.memberListSource === "future_review"
  );

  if (candidates.length === 0) {
    return (
      <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-5 text-[12px] leading-5 text-slate">
        표시할 철근 후보가 없습니다. 직접 부재를 추가해 수량산출 템플릿을 만들 수 있습니다.
      </div>
    );
  }

  const renderCandidate = (candidate: RebarQuantityCandidateRecord) => (
    <CandidateButton
      candidate={candidate}
      drawingSheets={drawingSheets}
      key={candidate.id}
      onSelect={onSelect}
      selected={selectedId === candidate.id}
    />
  );

  return (
    <div className="grid min-w-0 gap-4">
      <CollapsibleResultList
        emptyMessage="구조일람표 기반 후보가 없습니다."
        initialVisibleCount={5}
        items={scheduleCandidates}
        renderItem={renderCandidate}
        summaryLabel={`일람표 후보 ${scheduleCandidates.length}개`}
        title="구조일람표 기반 후보"
      />
      <CollapsibleResultList
        emptyMessage="구조평면도 기반 보조 후보가 없습니다."
        initialVisibleCount={3}
        className="hidden"
        items={planMatchedCandidates}
        renderItem={renderCandidate}
        summaryLabel={`평면도 배치 확인 ${planMatchedCandidates.length}개`}
        title="평면도 배치 확인"
      />
      <CollapsibleResultList
        emptyMessage="사용자 직접 추가 후보가 없습니다."
        initialVisibleCount={5}
        items={manualCandidates}
        renderItem={renderCandidate}
        summaryLabel={`사용자 직접 추가 ${manualCandidates.length}개`}
        title="사용자 직접 추가"
      />
      <CollapsibleResultList
        emptyMessage="일람표 매칭 필요 후보가 없습니다."
        initialVisibleCount={0}
        items={planUnmatchedCandidates}
        renderItem={renderCandidate}
        summaryLabel={`일람표 매칭 필요 ${planUnmatchedCandidates.length}개`}
        title="일람표 매칭 필요"
      />
      <CollapsibleResultList
        emptyMessage="일반사항/노트 기반 참고 후보가 없습니다."
        initialVisibleCount={0}
        items={noteCandidates}
        renderItem={renderCandidate}
        summaryLabel={`검토 필요 ${noteCandidates.length}개`}
        title="참고 문구 / 검토 필요"
      />
      <CollapsibleResultList
        emptyMessage="후속 검토 대상 후보가 없습니다."
        initialVisibleCount={0}
        items={futureReviewCandidates}
        renderItem={renderCandidate}
        summaryLabel={`후속 검토 ${futureReviewCandidates.length}개`}
        title="후속 검토 대상"
      />
    </div>
  );
}

function TemplateInputs({
  activeType,
  candidate,
  missingRequiredLabels,
  onChange
}: {
  activeType: TemplateMemberType;
  candidate: RebarQuantityCandidateRecord;
  missingRequiredLabels: string[];
  onChange: (updates: Partial<RebarQuantityCandidateRecord>) => void;
}) {
  const positionOptions = getPositionOptions(activeType);
  const missing = (label: string) => missingRequiredLabels.includes(label);

  return (
    <div className="grid gap-4">
      <section>
        <h4 className="mb-3 text-[13px] font-bold text-foreground">사용자 보정값</h4>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="부재명" source="도면 추출값 또는 사용자 보정">
            <input
              className="mt-1 h-10 w-full rounded-[10px] border border-border bg-white px-3 text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
              onChange={(event) => onChange({ memberName: event.target.value })}
              value={candidate.memberName ?? ""}
            />
          </Field>
          <SelectField
            field="memberType"
            label="부재 종류"
            memberType={candidate.memberType}
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
            field="position"
            label={activeType === "footing" ? "방향" : "철근 종류"}
            memberType={candidate.memberType}
            missing={missing("방향 X/Y") || missing("철근 종류 주근/늑근") || missing("철근 종류 주근/띠철근") || missing("X/Y 방향 및 상부/하부") || missing("수직근/수평근")}
            onChange={(value: RebarPosition) => onChange({ position: value })}
            options={positionOptions}
            required
            value={
              positionOptions.some((option) => option.value === candidate.position)
                ? candidate.position
                : positionOptions[0].value
            }
          />
          <SelectField
            field="diameter"
            label="철근 규격"
            memberType={candidate.memberType}
            onChange={(value: string) => onChange({ diameter: value })}
            options={diameterOptions.map((diameter) => ({ value: diameter, label: diameter }))}
            value={candidate.diameter}
          />
        </div>
      </section>

      {activeType === "footing" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SelectField
            field="footingLayer"
            label="상부/하부"
            memberType={candidate.memberType}
            onChange={(value: RebarFootingLayer) => onChange({ footingLayer: value })}
            options={[
              { value: "top", label: "상부근" },
              { value: "bottom", label: "하부근" }
            ]}
            value={candidate.footingLayer ?? "top"}
          />
          <NumberInput
            field="footingWidthMm"
            label="기초 폭 mm"
            memberType={candidate.memberType}
            missing={missing("기초 폭")}
            onChange={(value) => onChange({ footingWidthMm: value })}
            required
            value={candidate.footingWidthMm}
          />
          <NumberInput
            field="footingLengthMm"
            label="기초 길이 mm"
            memberType={candidate.memberType}
            missing={missing("기초 길이")}
            onChange={(value) => onChange({ footingLengthMm: value })}
            required
            value={candidate.footingLengthMm}
          />
          <NumberInput
            field="spacingMm"
            label="철근 간격 mm"
            memberType={candidate.memberType}
            missing={missing("철근 간격 또는 직접 본수")}
            onChange={(value) => onChange({ spacingMm: value })}
            required
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      {activeType === "beam" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            field="memberLengthMm"
            label="보 길이 mm"
            memberType={candidate.memberType}
            missing={missing("보 길이")}
            onChange={(value) => onChange({ memberLengthMm: value })}
            required
            value={candidate.memberLengthMm}
          />
          <NumberInput
            field="sectionWidthMm"
            label="보 폭 mm"
            memberType={candidate.memberType}
            missing={missing("보 폭")}
            onChange={(value) => onChange({ sectionWidthMm: value })}
            required
            value={candidate.sectionWidthMm}
          />
          <NumberInput
            field="sectionDepthMm"
            label="보 춤 mm"
            memberType={candidate.memberType}
            missing={missing("보 춤")}
            onChange={(value) => onChange({ sectionDepthMm: value })}
            required
            value={candidate.sectionDepthMm}
          />
          <NumberInput
            field="spacingMm"
            label="늑근 간격 mm"
            memberType={candidate.memberType}
            missing={missing("철근 개수 또는 늑근 간격")}
            onChange={(value) => onChange({ spacingMm: value })}
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      {activeType === "column" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            field="memberHeightMm"
            label="기둥 높이 mm"
            memberType={candidate.memberType}
            missing={missing("기둥 높이")}
            onChange={(value) => onChange({ memberHeightMm: value })}
            required
            value={candidate.memberHeightMm}
          />
          <NumberInput
            field="sectionWidthMm"
            label="기둥 폭 mm"
            memberType={candidate.memberType}
            missing={missing("기둥 폭")}
            onChange={(value) => onChange({ sectionWidthMm: value })}
            required
            value={candidate.sectionWidthMm}
          />
          <NumberInput
            field="sectionDepthMm"
            label="기둥 춤 mm"
            memberType={candidate.memberType}
            missing={missing("기둥 춤")}
            onChange={(value) => onChange({ sectionDepthMm: value })}
            required
            value={candidate.sectionDepthMm}
          />
          <NumberInput
            field="spacingMm"
            label="띠철근 간격 mm"
            memberType={candidate.memberType}
            missing={missing("철근 개수 또는 띠철근 간격")}
            onChange={(value) => onChange({ spacingMm: value })}
            value={candidate.spacingMm}
          />
        </div>
      ) : null}

      {activeType === "slab" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            field="slabLengthMm"
            label="슬래브 길이 mm"
            memberType={candidate.memberType}
            missing={missing("슬래브 길이")}
            onChange={(value) => onChange({ slabLengthMm: value, memberLengthMm: value })}
            required
            value={candidate.slabLengthMm ?? candidate.memberLengthMm}
          />
          <NumberInput
            field="slabWidthMm"
            label="슬래브 폭 mm"
            memberType={candidate.memberType}
            missing={missing("슬래브 폭")}
            onChange={(value) => onChange({ slabWidthMm: value, sectionWidthMm: value })}
            required
            value={candidate.slabWidthMm ?? candidate.sectionWidthMm}
          />
          <NumberInput
            field="slabThicknessMm"
            label="슬래브 두께 mm"
            memberType={candidate.memberType}
            onChange={(value) => onChange({ slabThicknessMm: value, sectionDepthMm: value })}
            value={candidate.slabThicknessMm ?? candidate.sectionDepthMm}
          />
          <NumberInput
            field="spacingMm"
            label="철근 간격 mm"
            memberType={candidate.memberType}
            missing={missing("철근 간격")}
            onChange={(value) => onChange({ spacingMm: value })}
            required
            value={candidate.spacingMm}
          />
          <NumberInput
            field="directBarLengthMm"
            label="직접 산출길이 mm"
            memberType={candidate.memberType}
            onChange={(value) => onChange({ directBarLengthMm: value })}
            value={candidate.directBarLengthMm}
          />
        </div>
      ) : null}

      {activeType === "wall" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <NumberInput
            field="wallLengthMm"
            label="벽 길이 mm"
            memberType={candidate.memberType}
            missing={missing("벽 길이")}
            onChange={(value) => onChange({ wallLengthMm: value, memberLengthMm: value })}
            required
            value={candidate.wallLengthMm ?? candidate.memberLengthMm}
          />
          <NumberInput
            field="wallHeightMm"
            label="벽 높이 mm"
            memberType={candidate.memberType}
            missing={missing("벽 높이")}
            onChange={(value) => onChange({ wallHeightMm: value, memberHeightMm: value })}
            required
            value={candidate.wallHeightMm ?? candidate.memberHeightMm}
          />
          <NumberInput
            field="wallThicknessMm"
            label="벽 두께 mm"
            memberType={candidate.memberType}
            onChange={(value) => onChange({ wallThicknessMm: value, sectionDepthMm: value })}
            value={candidate.wallThicknessMm ?? candidate.sectionDepthMm}
          />
          <NumberInput
            field="spacingMm"
            label="철근 간격 mm"
            memberType={candidate.memberType}
            missing={missing("철근 간격")}
            onChange={(value) => onChange({ spacingMm: value })}
            required
            value={candidate.spacingMm}
          />
          <NumberInput
            field="directBarLengthMm"
            label="직접 산출길이 mm"
            memberType={candidate.memberType}
            onChange={(value) => onChange({ directBarLengthMm: value })}
            value={candidate.directBarLengthMm}
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberInput
          field="manualBarCount"
          label="직접 본수"
          memberType={candidate.memberType}
          missing={missing("철근 간격 또는 직접 본수") || missing("철근 개수 또는 늑근 간격") || missing("철근 개수 또는 띠철근 간격")}
          onChange={(value) => onChange({ barCount: value, manualBarCount: value })}
          value={candidate.manualBarCount ?? candidate.barCount}
        />
        <SelectField
          field="barCountRule"
          label="본수 산정 방식"
          memberType={candidate.memberType}
          onChange={(value: RebarBarCountRule) => onChange({ barCountRule: value })}
          options={countRuleOptions}
          value={candidate.barCountRule ?? "floor_plus_one"}
        />
        <NumberInput
          field="memberCount"
          label="반복 개수"
          memberType={candidate.memberType}
          missing={missing("반복 개수")}
          onChange={(value) => onChange({ memberCount: value ?? 1 })}
          required
          value={candidate.memberCount}
        />
        <NumberInput
          field="faceCount"
          label="면수"
          memberType={candidate.memberType}
          missing={missing("면수")}
          onChange={(value) => onChange({ faceCount: value ?? 1 })}
          required={activeType === "wall"}
          value={candidate.faceCount ?? 1}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <NumberInput
          field="coverMm"
          label="피복 mm"
          memberType={candidate.memberType}
          missing={missing("피복")}
          onChange={(value) => onChange({ coverMm: value })}
          required
          value={candidate.coverMm}
        />
        <NumberInput
          field="anchorageLengthMm"
          label="정착길이 mm"
          memberType={candidate.memberType}
          onChange={(value) => onChange({ anchorageLengthMm: value })}
          value={candidate.anchorageLengthMm}
        />
        <NumberInput
          field="spliceLengthMm"
          label="이음길이 mm"
          memberType={candidate.memberType}
          onChange={(value) => onChange({ spliceLengthMm: value })}
          value={candidate.spliceLengthMm}
        />
        <NumberInput
          field="hookLengthMm"
          label="갈고리길이 mm"
          memberType={candidate.memberType}
          onChange={(value) => onChange({ hookLengthMm: value })}
          value={candidate.hookLengthMm}
        />
        <NumberInput
          field="deductionLengthMm"
          label="공제길이 mm"
          memberType={candidate.memberType}
          onChange={(value) => onChange({ deductionLengthMm: value })}
          value={candidate.deductionLengthMm}
        />
        <NumberInput
          field="bendCorrectionMm"
          label="절곡보정 mm"
          memberType={candidate.memberType}
          onChange={(value) => onChange({ bendCorrectionMm: value })}
          value={candidate.bendCorrectionMm}
        />
        <NumberInput
          field="lossRate"
          label="LOSS율"
          memberType={candidate.memberType}
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
      sortRebarQuantityCandidatesBySource(
        candidates.filter(
          (candidate) => candidate.memberType === activeType || candidate.memberType === "unknown"
        )
      ),
    [activeType, candidates]
  );
  const selectedCandidate = useMemo(
    () => activeCandidates.find((candidate) => candidate.id === selectedId) ?? activeCandidates[0],
    [activeCandidates, selectedId]
  );
  const selectedMemberType =
    selectedCandidate && selectedCandidate.memberType !== "unknown"
      ? (selectedCandidate.memberType as TemplateMemberType)
      : activeType;
  const missingRequiredLabels = selectedCandidate
    ? getMissingRebarRequiredInputLabels(selectedCandidate)
    : [];
  const wallDetailReviewRequired = selectedCandidate
    ? isWallRebarDetailReviewRequired(selectedCandidate)
    : false;
  const selectedChecklistCompletion = selectedCandidate
    ? getChecklistCompletion(selectedCandidate)
    : { completed: 0, total: 0, percent: 0 };
  const selectedReviewCompleteness = selectedCandidate
    ? selectedCandidate.reviewCompleteness ?? resolveReviewCompleteness(selectedCandidate)
    : "not_started";

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
    if (typeof newId === "string") setSelectedId(newId);
  };

  const handleApplyGeneralRulePreset = (preset: RebarDetailAdjustmentPreset) => {
    if (!selectedCandidate) return;

    const hasExistingDetailValue = [
      selectedCandidate.coverMm,
      selectedCandidate.anchorageLengthMm,
      selectedCandidate.spliceLengthMm,
      selectedCandidate.hookLengthMm,
      selectedCandidate.deductionLengthMm,
      selectedCandidate.bendCorrectionMm,
      selectedCandidate.lossRate
    ].some((value) => typeof value === "number" && value > 0);

    if (
      hasExistingDetailValue &&
      typeof window !== "undefined" &&
      !window.confirm("기존 보정값을 구조일반사항 추천값으로 덮어쓸까요?")
    ) {
      return;
    }

    onChangeCandidate(selectedCandidate.id, {
      coverMm: preset.coverMm,
      anchorageLengthMm: preset.developmentLengthMm,
      spliceLengthMm: preset.spliceLengthMm,
      hookLengthMm: preset.hookLengthMm,
      deductionLengthMm: preset.deductionLengthMm,
      bendCorrectionMm: preset.bendingAdjustmentMm,
      lossRate: preset.lossRate,
      appliedGeneralRuleIds: preset.appliedRuleIds,
      generalRuleNotes: [
        "구조일반사항 S-002 피복/간격/표준갈고리 기준 추천값 적용",
        "구조일반사항 S-004 B급 이음 원칙 참고",
        "구조일반사항 S-005 정착/이음길이 표 참고",
        "구조도면과 구조일반사항이 상충할 경우 구조도면 우선",
        ...preset.warnings
      ],
      generalRuleReviewRequired: preset.warnings.length > 0
    });
  };

  return (
    <Card className="section-enter bg-white shadow-sm">
      <SectionHeading
        title="철근 실무식 수량산출 후보"
        description="도면 텍스트 기반 후보를 부재별로 검토하고, 사용자가 확인한 보정값으로 승인 후 적산내역과 품셈 산출에 반영합니다."
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
          <p className="text-[11px] font-medium text-slate">검토 후 산출 가능</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.calculatedCandidates}
          </p>
        </div>
        <div className="rounded-[14px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">수량 확인 필요</p>
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
          const count = candidates.filter(
            (candidate) =>
              candidate.memberType === tab.value &&
              (candidate.memberListSource === "schedule" ||
                candidate.memberListSource === "schedule_with_plan" ||
                (!candidate.memberListSource &&
                  getRebarCandidateSourceGroup(candidate) === "schedule"))
          ).length;

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
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate">
        탭 숫자는 구조일람표 기반 기본 후보 수입니다. 평면도 감지 후보와 일반 노트 참고 문구, 후속 검토 대상은 접기 영역에서 확인합니다. 벽체 일람표가 없으면 벽체 기본 후보는 0개로 표시됩니다.
      </p>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <aside className="min-w-0 overflow-hidden rounded-[18px] border border-border bg-[#f8fafc] p-3">
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-foreground">
                {memberTypeLabel[activeType]} 후보
              </h3>
              <p className="mt-1 text-[11px] leading-4 text-slate">
                기본 후보는 구조일람표에서 확인된 부재명을 기준으로 생성됩니다. 구조평면도는 위치·반복 개수·축간 치수 확인용으로 연결되며, 일반 구조사항의 철근 문구는 참고 문구로 분리됩니다.
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
            candidates={activeCandidates}
            drawingSheets={drawingSheets}
            onSelect={setSelectedId}
            selectedId={selectedCandidate?.id}
          />
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[18px] border border-border bg-white p-4">
          {selectedCandidate ? (
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <h3 className="text-[16px] font-bold text-foreground">
                      {selectedCandidate.memberName ?? "부재명 미확인"} 수량산출 후보
                    </h3>
                    <Badge tone={reviewToneMap[selectedCandidate.reviewStatus]}>
                      {reviewLabelMap[selectedCandidate.reviewStatus]}
                    </Badge>
                    {selectedCandidate.quantityReviewRequired ? (
                      <Badge tone="amber">수량 확인 필요</Badge>
                    ) : (
                      <Badge tone="green">검토 후 산출 가능</Badge>
                    )}
                    <Badge tone={selectedReviewCompleteness === "complete" ? "green" : selectedChecklistCompletion.completed > 0 ? "amber" : "gray"}>
                      {getReviewCompletenessLabel(selectedReviewCompleteness)} · {selectedChecklistCompletion.percent}%
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

              <RelatedDrawingRecommendation memberType={selectedMemberType} />
              <DrawingReferenceMatrix memberType={selectedMemberType} />
              <RebarReferenceGuide memberType={selectedMemberType} />
              <RebarSourceEvidencePanel
                candidate={selectedCandidate}
                drawingSheets={drawingSheets}
              />
              <RebarGeneralRulePanel
                candidate={selectedCandidate}
                onApplyPreset={handleApplyGeneralRulePreset}
              />
              <DrawingExtractedValues candidate={selectedCandidate} drawingSheets={drawingSheets} />

              {wallDetailReviewRequired ? (
                <div className="rounded-[14px] border border-[#f2c94c] bg-[#fffaf0] px-4 py-3 text-[12px] leading-5 text-[#7a4a05]">
                  <p className="font-bold">배근 상세 확인 필요</p>
                  <p className="mt-1">
                    벽체 위치와 두께는 확인되었지만, 수직근/수평근 배근 상세는 별도 도면 또는 구조 일반사항 확인이 필요합니다.
                  </p>
                </div>
              ) : null}

              <TemplateInputs
                activeType={selectedMemberType}
                candidate={selectedCandidate}
                missingRequiredLabels={missingRequiredLabels}
                onChange={(updates) => onChangeCandidate(selectedCandidate.id, updates)}
              />

              <RebarApprovalChecklist
                candidate={selectedCandidate}
                onChange={(updates) => onChangeCandidate(selectedCandidate.id, updates)}
              />

              <RebarReviewHistoryNote
                candidate={selectedCandidate}
                onChange={(updates) => onChangeCandidate(selectedCandidate.id, updates)}
              />

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
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
                  <p className="mt-1 text-[10px] leading-4 text-[#087443]">
                    철근 가공 및 조립 품셈 적용 기준
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#fff8ea] px-3 py-3">
                  <p className="text-[11px] font-medium text-[#7a4a05]">자재중량 kg</p>
                  <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
                    {formatNumber(selectedCandidate.materialQuantityKg)}
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[#7a4a05]">
                    철근 본재 재료비 산출 참고 기준, LOSS율은 자재중량에만 반영
                  </p>
                </div>
              </div>

              <div className="rounded-[14px] border border-border bg-[#f8fafc] px-4 py-4">
                <p className="text-[12px] font-bold text-foreground">산출식 미리보기</p>
                <p className="mt-2 text-[12px] leading-5 text-foreground">
                  {missingRequiredLabels.length > 0
                    ? `필수 입력값 부족: ${missingRequiredLabels.join(", ")}`
                    : selectedCandidate.calculationFormula}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-slate">
                  {selectedCandidate.calculationBasis}
                </p>
              </div>
            </div>
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
