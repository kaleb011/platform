"use client";

import { Check, Clock3, FileSpreadsheet, X } from "lucide-react";
import { useMemo } from "react";

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
  RebarMemberType,
  RebarPosition,
  RebarQuantityCandidateRecord,
  RebarReviewStatus
} from "@/lib/estimation/types";

type RebarQuantityReviewProps = {
  candidates: RebarQuantityCandidateRecord[];
  drawingSheets?: DrawingSheetIndexRecord[];
  onChangeCandidate: (candidateId: string, updates: Partial<RebarQuantityCandidateRecord>) => void;
  onChangeStatus: (candidateId: string, reviewStatus: RebarReviewStatus) => void;
  onExportExcel?: () => void;
};

const memberTypeOptions: Array<{ value: RebarMemberType; label: string }> = [
  { value: "beam", label: "보" },
  { value: "column", label: "기둥" },
  { value: "footing", label: "기초" },
  { value: "slab", label: "슬라브" },
  { value: "unknown", label: "미확정" }
];

const positionOptions: Array<{ value: RebarPosition; label: string }> = [
  { value: "top", label: "상부" },
  { value: "bottom", label: "하부" },
  { value: "main", label: "주근" },
  { value: "stirrup", label: "늑근/전단근" },
  { value: "tie", label: "띠철근" },
  { value: "x", label: "X방향" },
  { value: "y", label: "Y방향" },
  { value: "unknown", label: "미확정" }
];

const diameterOptions = ["D10", "D13", "D16", "D19", "D22", "D25", "D29", "D32"];

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

const rebarSourceLabelMap: Record<
  NonNullable<RebarQuantityCandidateRecord["rebarSourceType"]>,
  string
> = {
  structural_schedule: "구조일람표 기반",
  structural_plan: "구조평면도 기반",
  other_structure: "구조 노트 기반 검토 필요",
  unknown: "출처 유형 검토 필요"
};

const rebarSourceToneMap: Record<
  NonNullable<RebarQuantityCandidateRecord["rebarSourceType"]>,
  "blue" | "gray" | "amber"
> = {
  structural_schedule: "blue",
  structural_plan: "amber",
  other_structure: "gray",
  unknown: "gray"
};

function formatNumber(value: number, fractionDigits = 2) {
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

function numberInputProps(
  value: number | undefined,
  onChange: (value: number | undefined) => void
) {
  return {
    className:
      "mt-1 min-h-[38px] w-full rounded-[12px] border border-border bg-white px-3 text-[13px] text-foreground",
    inputMode: "numeric" as const,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(parseOptionalNumber(event.target.value)),
    type: "number",
    value: value ?? ""
  };
}

function RebarCandidateCard({
  candidate,
  drawingSheets = [],
  onChangeCandidate,
  onChangeStatus
}: {
  candidate: RebarQuantityCandidateRecord;
  drawingSheets?: DrawingSheetIndexRecord[];
  onChangeCandidate: (candidateId: string, updates: Partial<RebarQuantityCandidateRecord>) => void;
  onChangeStatus: (candidateId: string, reviewStatus: RebarReviewStatus) => void;
}) {
  const sourceSheet = drawingSheets.find(
    (sheet) =>
      sheet.sourcePage === candidate.sourcePage &&
      (!candidate.sourceFileName || sheet.sourceFileName === candidate.sourceFileName)
  );
  const sourceLabel = sourceSheet
    ? `${sourceSheet.drawingNo ?? "도면번호 검토"} ${sourceSheet.drawingTitle ?? "도면명 검토"} / p.${sourceSheet.sourcePage}`
    : `${candidate.sourceFileName ?? "-"} ${candidate.sourcePage ? `/ p.${candidate.sourcePage}` : ""}`;
  const rebarSourceType = candidate.rebarSourceType ?? "unknown";

  return (
    <div className="rounded-[20px] border border-border bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-bold leading-6 text-foreground">
            {candidate.memberName ?? "부재명 검토 필요"} · {candidate.diameter}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="blue">{getRebarMemberTypeLabel(candidate.memberType)}</Badge>
            <Badge tone="gray">{getRebarPositionLabel(candidate.position)}</Badge>
            <Badge tone={rebarSourceToneMap[rebarSourceType]}>
              {rebarSourceLabelMap[rebarSourceType]}
            </Badge>
            <Badge tone={candidate.quantityReviewRequired ? "amber" : "green"}>
              {candidate.quantityReviewRequired ? "수량 검토 필요" : "산출 가능"}
            </Badge>
            <Badge tone={reviewToneMap[candidate.reviewStatus]}>
              {reviewLabelMap[candidate.reviewStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-[16px] bg-[#f8fbf9] px-3 py-3 text-[12px] leading-5 text-slate">
        <p>
          <span className="font-semibold text-foreground">개수/간격: </span>
          {candidate.barCount ? `${candidate.barCount}본` : candidate.spacingMm ? `@${candidate.spacingMm}` : "-"}
        </p>
        <p>
          <span className="font-semibold text-foreground">단위중량: </span>
          {candidate.unitWeightKgPerM}kg/m
        </p>
        <p>
          <span className="font-semibold text-foreground">수량 kg: </span>
          {candidate.quantityReviewRequired ? "검토 필요" : formatNumber(candidate.quantityKg)}
        </p>
        <p>
          <span className="font-semibold text-foreground">수량 ton: </span>
          {candidate.quantityReviewRequired ? "검토 필요" : formatNumber(candidate.quantityTon, 4)}
        </p>
      </div>

      <details className="mt-3 rounded-[16px] border border-border bg-white px-3 py-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-foreground">
          산출값 보정
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="부재명">
            <input
              className="mt-1 min-h-[38px] w-full rounded-[12px] border border-border bg-white px-3 text-[13px] text-foreground"
              onChange={(event) => onChangeCandidate(candidate.id, { memberName: event.target.value })}
              value={candidate.memberName ?? ""}
            />
          </Field>
          <Field label="부재 종류">
            <select
              className="mt-1 min-h-[38px] w-full rounded-[12px] border border-border bg-white px-3 text-[13px] text-foreground"
              onChange={(event) =>
                onChangeCandidate(candidate.id, {
                  memberType: event.target.value as RebarMemberType
                })
              }
              value={candidate.memberType}
            >
              {memberTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="철근 위치">
            <select
              className="mt-1 min-h-[38px] w-full rounded-[12px] border border-border bg-white px-3 text-[13px] text-foreground"
              onChange={(event) =>
                onChangeCandidate(candidate.id, {
                  position: event.target.value as RebarPosition
                })
              }
              value={candidate.position}
            >
              {positionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="철근 규격">
            <select
              className="mt-1 min-h-[38px] w-full rounded-[12px] border border-border bg-white px-3 text-[13px] text-foreground"
              onChange={(event) => onChangeCandidate(candidate.id, { diameter: event.target.value })}
              value={candidate.diameter}
            >
              {diameterOptions.map((diameter) => (
                <option key={diameter} value={diameter}>
                  {diameter}
                </option>
              ))}
            </select>
          </Field>
          <Field label="철근 개수">
            <input {...numberInputProps(candidate.barCount, (value) => onChangeCandidate(candidate.id, { barCount: value }))} />
          </Field>
          <Field label="간격 mm">
            <input {...numberInputProps(candidate.spacingMm, (value) => onChangeCandidate(candidate.id, { spacingMm: value }))} />
          </Field>
          <Field label="부재 길이 mm">
            <input {...numberInputProps(candidate.memberLengthMm, (value) => onChangeCandidate(candidate.id, { memberLengthMm: value }))} />
          </Field>
          <Field label="부재 높이 mm">
            <input {...numberInputProps(candidate.memberHeightMm, (value) => onChangeCandidate(candidate.id, { memberHeightMm: value }))} />
          </Field>
          <Field label="단면 폭 mm">
            <input {...numberInputProps(candidate.sectionWidthMm, (value) => onChangeCandidate(candidate.id, { sectionWidthMm: value }))} />
          </Field>
          <Field label="단면 춤 mm">
            <input {...numberInputProps(candidate.sectionDepthMm, (value) => onChangeCandidate(candidate.id, { sectionDepthMm: value }))} />
          </Field>
          <Field label="기초 폭 mm">
            <input {...numberInputProps(candidate.footingWidthMm, (value) => onChangeCandidate(candidate.id, { footingWidthMm: value }))} />
          </Field>
          <Field label="기초 길이 mm">
            <input {...numberInputProps(candidate.footingLengthMm, (value) => onChangeCandidate(candidate.id, { footingLengthMm: value }))} />
          </Field>
          <Field label="반복 개수">
            <input {...numberInputProps(candidate.memberCount, (value) => onChangeCandidate(candidate.id, { memberCount: value ?? 1 }))} />
          </Field>
        </div>
      </details>

      <p className="mt-3 line-clamp-3 text-[12px] leading-5 text-foreground">
        <span className="font-semibold">산출식: </span>
        {candidate.calculationFormula}
      </p>
      <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-slate">
        <span className="font-semibold text-foreground">산출근거: </span>
        {candidate.calculationBasis}
      </p>
      {candidate.sourceTextSnippet ? (
        <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-slate">
          <span className="font-semibold text-foreground">출처 문장: </span>
          {candidate.sourceTextSnippet}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-slate">
        출처: {sourceLabel}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button
          className="min-h-[38px] rounded-[14px] px-2 text-[12px]"
          onClick={() => onChangeStatus(candidate.id, "accepted")}
          variant="secondary"
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          승인
        </Button>
        <Button
          className="min-h-[38px] rounded-[14px] px-2 text-[12px]"
          onClick={() => onChangeStatus(candidate.id, "rejected")}
          variant="ghost"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          제외
        </Button>
        <Button
          className="min-h-[38px] rounded-[14px] px-2 text-[12px]"
          onClick={() => onChangeStatus(candidate.id, "pending")}
          variant="ghost"
        >
          <Clock3 className="mr-1 h-3.5 w-3.5" />
          보류
        </Button>
      </div>
    </div>
  );
}

export function RebarQuantityReview({
  candidates,
  drawingSheets,
  onChangeCandidate,
  onChangeStatus,
  onExportExcel
}: RebarQuantityReviewProps) {
  const summary = useMemo(() => summarizeRebarQuantityCandidates(candidates), [candidates]);
  const structuralScheduleCandidateCount = useMemo(
    () =>
      candidates.filter((candidate) => candidate.rebarSourceType === "structural_schedule")
        .length,
    [candidates]
  );

  if (candidates.length === 0) {
    return (
      <Card className="section-enter">
        <SectionHeading
          title="철근 수량 산출 후보"
          description="구조일람표 텍스트에서 철근 배근 패턴이 확인되면 이 영역에 산출 후보가 표시됩니다."
        />
        <p className="rounded-[16px] bg-[#f8fbf9] px-4 py-3 text-[12px] leading-5 text-slate">
          아직 철근 수량 산출 후보가 없습니다. 구조일람표가 포함된 PDF를 업로드하면 D10@200,
          5-D22 같은 패턴을 기준으로 후보를 생성합니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="section-enter">
      <SectionHeading
        title="철근 수량 산출 후보"
        description="구조일람표에서 철근 배근 정보를 추출하고, 철근 단위중량표를 적용해 수량 산출 후보를 생성합니다. 정착, 이음, 갈고리 길이 등은 별도 검토가 필요합니다."
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
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">중복 제거 후 후보</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.totalCandidates}</p>
        </div>
        <div className="rounded-[16px] bg-[#eef6ff] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">구조일람표 기반</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {structuralScheduleCandidateCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">산출 가능</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.calculatedCandidates}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#fff8e6] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">검토 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.reviewRequiredCandidates}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#e8f9ef] px-3 py-3">
          <p className="text-[11px] font-medium text-[#087443]">승인 철근 총중량</p>
          <p className="mt-1 text-[18px] font-bold text-[#087443]">
            {formatNumber(summary.totalKg)}kg
          </p>
          <p className="mt-1 text-[11px] text-[#087443]">
            {formatNumber(summary.totalTon, 4)}ton / 승인 {summary.acceptedCandidates}건
          </p>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {candidates.map((candidate) => (
          <RebarCandidateCard
            key={candidate.id}
            candidate={candidate}
            drawingSheets={drawingSheets}
            onChangeCandidate={onChangeCandidate}
            onChangeStatus={onChangeStatus}
          />
        ))}
      </div>
    </Card>
  );
}
