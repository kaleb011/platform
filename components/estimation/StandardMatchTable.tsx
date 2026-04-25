"use client";

import { Check, Pencil, SearchX, X } from "lucide-react";

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

export function StandardMatchTable({
  candidates,
  matches,
  standardItems,
  onChangeStatus
}: StandardMatchTableProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="표준품셈 후보 매칭"
        description="표준품셈 원문 전체 파싱 대신, 전처리된 샘플 항목에서 후보를 제안합니다."
        action={<Badge tone="amber">USER REVIEW REQUIRED</Badge>}
      />

      <div className="overflow-x-auto">
        <table className="min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">도면 후보</th>
              <th className="px-2 py-3 font-medium">표준품셈 항목</th>
              <th className="px-2 py-3 font-medium">공종</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">매칭 근거</th>
              <th className="px-2 py-3 font-medium">신뢰도</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="px-2 py-3 font-medium">검수</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const candidate = candidates.find((item) => item.id === match.drawingExtractionId);
              const standardItem = standardItems.find((item) => item.id === match.standardItemId);

              if (!candidate || !standardItem) {
                return null;
              }

              return (
                <tr key={match.id} className="border-b border-border/70 align-top">
                  <td className="px-2 py-4">
                    <p className="text-[13px] font-semibold text-foreground">
                      {candidate.normalizedValue ?? candidate.extractedText}
                    </p>
                    <p className="mt-1 text-[12px] text-slate">
                      {candidate.drawingNo} · {candidate.quantity ?? "-"} {candidate.unit ?? ""}
                    </p>
                  </td>
                  <td className="px-2 py-4">
                    <p className="text-[13px] font-semibold text-foreground">{standardItem.itemName}</p>
                    <p className="mt-1 text-[12px] text-slate">
                      {standardItem.chapter}
                      {standardItem.section ? ` / ${standardItem.section}` : ""}
                    </p>
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {standardItem.workCategory}
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {standardItem.unit ?? "-"}
                  </td>
                  <td className="px-2 py-4">
                    <p className="text-[13px] leading-5 text-foreground">{match.matchReason}</p>
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
    </Card>
  );
}
