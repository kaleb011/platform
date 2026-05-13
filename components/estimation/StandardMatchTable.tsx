"use client";

import { Check, Pencil, SearchX, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  DrawingExtractionCandidateRecord,
  EstimateItemMatchRecord,
  ReviewStatus,
  StandardItemRecord
} from "@/lib/estimation/types";

type StandardMatchTableProps = {
  candidates: DrawingExtractionCandidateRecord[];
  matches: EstimateItemMatchRecord[];
  standardItems: StandardItemRecord[];
  onChangeStatus: (matchId: string, reviewStatus: ReviewStatus) => void;
};

const toneMap = {
  pending: "gray",
  accepted: "green",
  rejected: "red",
  edited: "blue",
  needs_standard_match: "amber"
} as const;

const labelMap = {
  pending: "검토 대기",
  accepted: "승인됨",
  rejected: "제외됨",
  edited: "수정 승인",
  needs_standard_match: "추가 매칭 필요"
} as const;

function getCandidateSourceLabel(candidate: DrawingExtractionCandidateRecord) {
  if (candidate.sourceLabel === "uploaded_pdf") {
    return [
      "uploaded_pdf",
      candidate.sourceFileName ? `출처파일: ${candidate.sourceFileName}` : null,
      candidate.sourcePage ? `p.${candidate.sourcePage}` : null
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return "sample";
}

export function StandardMatchTable({
  candidates,
  matches,
  standardItems,
  onChangeStatus
}: StandardMatchTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleMatches = useMemo(() => (expanded ? matches : matches.slice(0, 5)), [expanded, matches]);
  const canToggle = matches.length > 5;

  return (
    <Card className="section-enter">
      <SectionHeading
        title="표준품셈 후보 매칭"
        description="승인된 적산 후보를 샘플 표준품셈 항목과 임시 키워드 규칙으로 연결합니다."
        action={<Badge tone="amber">USER REVIEW REQUIRED</Badge>}
      />

      <div className="overflow-x-auto">
        <table className="min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">도면 후보</th>
              <th className="px-2 py-3 font-medium">표준품셈 후보</th>
              <th className="px-2 py-3 font-medium">공종</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">매칭 근거</th>
              <th className="px-2 py-3 font-medium">신뢰도</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="px-2 py-3 font-medium">검수</th>
            </tr>
          </thead>
          <tbody>
            {visibleMatches.map((match) => {
              const candidate = candidates.find((item) => item.id === match.drawingExtractionId);
              const standardItem = standardItems.find((item) => item.id === match.standardItemId);

              if (!candidate || !standardItem) {
                return null;
              }

              const standardItemName = match.displayStandardItemName ?? standardItem.itemName;
              const workCategory = match.displayWorkCategory ?? standardItem.workCategory;
              const unit = match.displayUnit ?? standardItem.unit ?? "-";

              return (
                <tr key={match.id} className="border-b border-border/70 align-top">
                  <td className="px-2 py-4">
                    <p className="line-clamp-2 text-[13px] font-semibold text-foreground">
                      {candidate.normalizedValue ?? candidate.extractedText}
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate">
                      {getCandidateSourceLabel(candidate)}
                    </p>
                  </td>
                  <td className="px-2 py-4">
                    <p className="text-[13px] font-semibold text-foreground">
                      {standardItemName}
                    </p>
                    <p className="mt-1 text-[12px] text-slate">
                      {standardItem.chapter}
                      {standardItem.section ? ` / ${standardItem.section}` : ""}
                    </p>
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">{workCategory}</td>
                  <td className="px-2 py-4 text-[13px] text-foreground">{unit}</td>
                  <td className="px-2 py-4">
                    <p className="line-clamp-3 text-[13px] leading-5 text-foreground">
                      {match.matchReason}
                    </p>
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {match.confidence ? `${Math.round(match.confidence * 100)}%` : "-"}
                  </td>
                  <td className="px-2 py-4">
                    <Badge tone={toneMap[match.reviewStatus]}>{labelMap[match.reviewStatus]}</Badge>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                        onClick={() => onChangeStatus(match.id, "accepted")}
                        variant="secondary"
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        승인
                      </Button>
                      <Button
                        className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                        onClick={() => onChangeStatus(match.id, "edited")}
                        variant="ghost"
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        수정
                      </Button>
                      <Button
                        className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                        onClick={() => onChangeStatus(match.id, "rejected")}
                        variant="ghost"
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        제외
                      </Button>
                      <Button
                        className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                        onClick={() => onChangeStatus(match.id, "needs_standard_match")}
                        variant="ghost"
                      >
                        <SearchX className="mr-1 h-3.5 w-3.5" />
                        품셈 매칭 필요
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate">
        <span>전체 {matches.length}개 중 {visibleMatches.length}개 표시</span>
        {canToggle ? (
          <Button
            aria-expanded={expanded}
            className="min-h-[34px] rounded-[12px] px-3 text-[12px]"
            onClick={() => setExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            {expanded ? "▼ 간략히 보기" : "▶ 전체 보기"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
