"use client";

import { Check, Clock3, SearchX, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { CollapsibleResultList } from "@/components/estimation/CollapsibleResultList";
import {
  filterExtractionCandidates,
  getCandidateDisplayTitle,
  getCandidateGroup,
  getCandidateReviewSummary
} from "@/lib/estimation/service";
import type {
  DrawingExtractionCandidateRecord,
  ExtractionCandidateFilter,
  ReviewStatus
} from "@/lib/estimation/types";

type DrawingExtractionTableProps = {
  candidates: DrawingExtractionCandidateRecord[];
  onChangeStatus: (candidateId: string, reviewStatus: ReviewStatus) => void;
};

const statusToneMap = {
  pending: "gray",
  accepted: "green",
  rejected: "red",
  edited: "blue",
  needs_standard_match: "amber"
} as const;

const statusLabelMap = {
  pending: "보류",
  accepted: "승인됨",
  rejected: "제외됨",
  edited: "수정 승인",
  needs_standard_match: "품셈 매칭 필요"
} as const;

const groupLabelMap = {
  drawing_metadata: "도면 메타데이터",
  estimate_candidate: "적산 후보"
} as const;

const filterLabels: Array<{ key: ExtractionCandidateFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "drawing_metadata", label: "도면 메타데이터" },
  { key: "estimate_candidate", label: "적산 후보" },
  { key: "drawing_no", label: "도면번호" },
  { key: "drawing_title", label: "도면명" },
  { key: "scale", label: "축척" },
  { key: "material", label: "자재" },
  { key: "work_item", label: "공종" },
  { key: "uploaded_pdf", label: "uploaded_pdf" },
  { key: "sample", label: "sample" },
  { key: "accepted", label: "승인됨" },
  { key: "rejected", label: "제외됨" },
  { key: "needs_standard_match", label: "품셈 매칭 필요" }
];

function getPageLabel(candidate: DrawingExtractionCandidateRecord): string {
  return typeof candidate.sourcePage === "number" ? `p.${candidate.sourcePage}` : "-";
}

function getSourceLabel(candidate: DrawingExtractionCandidateRecord): "sample" | "uploaded_pdf" {
  return candidate.sourceLabel ?? "sample";
}

function getFilterCount(
  candidates: DrawingExtractionCandidateRecord[],
  filter: ExtractionCandidateFilter
) {
  return filterExtractionCandidates(candidates, filter).length;
}

function CandidateReviewCard({
  candidate,
  onChangeStatus
}: {
  candidate: DrawingExtractionCandidateRecord;
  onChangeStatus: (candidateId: string, reviewStatus: ReviewStatus) => void;
}) {
  const group = getCandidateGroup(candidate);
  const sourceLabel = getSourceLabel(candidate);
  const title = getCandidateDisplayTitle(candidate);

  return (
    <div className="rounded-[20px] border border-border bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] font-bold leading-6 text-foreground">{title}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={group === "estimate_candidate" ? "amber" : "blue"}>
              {groupLabelMap[group]}
            </Badge>
            <Badge tone="gray">{candidate.extractedType}</Badge>
            <Badge tone="gray">{getPageLabel(candidate)}</Badge>
            <Badge tone={sourceLabel === "uploaded_pdf" ? "green" : "gray"}>{sourceLabel}</Badge>
            <Badge tone={statusToneMap[candidate.reviewStatus]}>
              {statusLabelMap[candidate.reviewStatus]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-5 text-slate">
        <p>
          <span className="font-semibold text-foreground">정규화: </span>
          <span className="line-clamp-2">{candidate.normalizedValue ?? "-"}</span>
        </p>
        <p>
          <span className="font-semibold text-foreground">출처: </span>
          <span className="line-clamp-1">{candidate.sourceFileName ?? candidate.drawingNo ?? "-"}</span>
        </p>
        <p>
          <span className="font-semibold text-foreground">신뢰도: </span>
          {candidate.confidence ? `${Math.round(candidate.confidence * 100)}%` : "-"}
        </p>
        <p>
          <span className="font-semibold text-foreground">수량: </span>
          {candidate.quantity ?? "-"} {candidate.unit ?? ""}
        </p>
      </div>

      {candidate.sourceNote ? (
        <p className="mt-3 line-clamp-2 text-[12px] leading-5 text-slate">
          <span className="font-semibold text-foreground">설명: </span>
          {candidate.sourceNote}
        </p>
      ) : null}

      {candidate.sourceTextSnippet ? (
        <p className="mt-2 line-clamp-3 text-[11px] leading-4 text-slate">
          <span className="font-semibold text-foreground">출처 문장: </span>
          {candidate.sourceTextSnippet}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
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
        <Button
          className="min-h-[38px] rounded-[14px] px-2 text-[12px]"
          onClick={() => onChangeStatus(candidate.id, "needs_standard_match")}
          variant="ghost"
        >
          <SearchX className="mr-1 h-3.5 w-3.5" />
          품셈 매칭 필요
        </Button>
      </div>
    </div>
  );
}

export function DrawingExtractionTable({
  candidates,
  onChangeStatus
}: DrawingExtractionTableProps) {
  const [activeFilter, setActiveFilter] = useState<ExtractionCandidateFilter>("all");
  const filteredCandidates = useMemo(
    () => filterExtractionCandidates(candidates, activeFilter),
    [activeFilter, candidates]
  );
  const summary = useMemo(() => getCandidateReviewSummary(candidates), [candidates]);

  return (
    <Card className="section-enter">
      <SectionHeading
        title="도면 분석 결과 후보"
        description="PDF 텍스트 후보를 도면 메타데이터와 적산 후보로 나누어 검수합니다."
        action={<Badge tone="blue">표시 {filteredCandidates.length}건</Badge>}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <p className="text-[12px] font-semibold text-slate">도면 메타데이터</p>
          <p className="mt-2 text-[22px] font-bold text-foreground">{summary.drawingMetadata}</p>
        </div>
        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <p className="text-[12px] font-semibold text-slate">적산 후보</p>
          <p className="mt-2 text-[22px] font-bold text-foreground">{summary.estimateCandidates}</p>
        </div>
        <div className="rounded-[18px] bg-[#e8f9ef] p-4">
          <p className="text-[12px] font-semibold text-[#087443]">승인된 적산 후보</p>
          <p className="mt-2 text-[22px] font-bold text-[#087443]">
            {summary.approvedEstimateCandidates}
          </p>
        </div>
        <div className="rounded-[18px] bg-[#fff8ea] p-4">
          <p className="text-[12px] font-semibold text-[#7a4a05]">품셈 매칭 필요</p>
          <p className="mt-2 text-[22px] font-bold text-[#7a4a05]">{summary.matchingNeeded}</p>
        </div>
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {filterLabels.map((filter) => {
          const selected = activeFilter === filter.key;
          const count = getFilterCount(candidates, filter.key);

          return (
            <button
              key={filter.key}
              className={[
                "shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold transition",
                selected ? "bg-primary text-white" : "bg-[#eef3ef] text-slate"
              ].join(" ")}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              {filter.label} {count}
            </button>
          );
        })}
      </div>

      <CollapsibleResultList
        className="mt-4"
        emptyMessage="선택한 필터에 해당하는 후보가 없습니다."
        items={filteredCandidates}
        renderItem={(candidate) => (
          <CandidateReviewCard
            key={candidate.id}
            candidate={candidate}
            onChangeStatus={onChangeStatus}
          />
        )}
      />
    </Card>
  );
}
