import { Badge } from "@/components/ui/badge";
import {
  getChecklistCompletion,
  getReviewCompletenessLabel,
  resolveReviewCompleteness
} from "@/lib/estimation/rebar-evidence";
import type { RebarQuantityCandidateRecord } from "@/lib/estimation/types";

type RebarReviewHistoryNoteProps = {
  candidate: RebarQuantityCandidateRecord;
  onChange: (updates: Partial<RebarQuantityCandidateRecord>) => void;
};

export function RebarReviewHistoryNote({ candidate, onChange }: RebarReviewHistoryNoteProps) {
  const completeness = candidate.reviewCompleteness ?? resolveReviewCompleteness(candidate);
  const completion = getChecklistCompletion(candidate);

  return (
    <section className="rounded-[14px] border border-border bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[13px] font-bold text-foreground">승인 사유 / 검토 메모</h4>
        <Badge tone={completeness === "complete" ? "green" : completion.completed > 0 ? "amber" : "gray"}>
          {getReviewCompletenessLabel(completeness)}
        </Badge>
      </div>
      <textarea
        className="mt-3 min-h-[92px] w-full rounded-[12px] border border-border bg-[#f8fafc] px-3 py-2 text-[12px] leading-5 text-foreground outline-none transition focus:border-primary"
        onChange={(event) =>
          onChange({
            reviewNote: event.target.value,
            reviewerComment: event.target.value
          })
        }
        placeholder="예: S-303 기초일람표와 S-222 구조평면도 기준으로 NF2 반복 개수 확인"
        value={candidate.reviewNote ?? ""}
      />
      <p className="mt-2 text-[11px] leading-4 text-slate">
        승인/보류/제외 시 이 메모와 체크리스트 상태가 승인된 적산내역 및 Excel 근거에 함께 남습니다.
      </p>
    </section>
  );
}
