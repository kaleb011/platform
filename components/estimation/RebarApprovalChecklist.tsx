import { Badge } from "@/components/ui/badge";
import {
  getChecklistCompletion,
  getRebarChecklistItems,
  getReviewCompletenessLabel,
  resolveReviewCompleteness
} from "@/lib/estimation/rebar-evidence";
import type { RebarQuantityCandidateRecord } from "@/lib/estimation/types";

type RebarApprovalChecklistProps = {
  candidate: RebarQuantityCandidateRecord;
  onChange: (updates: Partial<RebarQuantityCandidateRecord>) => void;
};

export function RebarApprovalChecklist({ candidate, onChange }: RebarApprovalChecklistProps) {
  const items = getRebarChecklistItems(candidate.memberType);
  const checklist = candidate.reviewChecklist ?? {};
  const completion = getChecklistCompletion(candidate);
  const completeness = candidate.reviewCompleteness ?? resolveReviewCompleteness(candidate);

  if (items.length === 0) {
    return null;
  }

  const handleToggle = (id: string, checked: boolean) => {
    const nextChecklist = { ...checklist, [id]: checked };
    const nextCandidate = { ...candidate, reviewChecklist: nextChecklist };

    onChange({
      reviewChecklist: nextChecklist,
      reviewCompleteness: resolveReviewCompleteness(nextCandidate)
    });
  };

  return (
    <section className="rounded-[14px] border border-border bg-[#f8fafc] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-[13px] font-bold text-foreground">승인 전 검토 체크리스트</h4>
          <p className="mt-1 text-[11px] leading-4 text-slate">
            산출값 확정이 아니라 사용자 검토 이력 기록용입니다. 미완료 항목이 있어도 승인은 가능합니다.
          </p>
        </div>
        <Badge tone={completeness === "complete" ? "green" : completion.completed > 0 ? "amber" : "gray"}>
          {getReviewCompletenessLabel(completeness)} · {completion.completed}/{completion.total}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <label
            className="flex items-start gap-2 rounded-[10px] bg-white px-3 py-2 text-[12px] leading-5 text-foreground"
            key={item.id}
          >
            <input
              checked={Boolean(checklist[item.id])}
              className="mt-1"
              onChange={(event) => handleToggle(item.id, event.target.checked)}
              type="checkbox"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
