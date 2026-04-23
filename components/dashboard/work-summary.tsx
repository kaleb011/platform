import { CheckCircle2, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WorkSummaryItem } from "@/lib/types/dashboard";

type WorkSummaryProps = {
  items: WorkSummaryItem[];
  safetyStatus: string;
  safetyNote: string;
  issueSummary: string;
};

export function WorkSummary({
  items,
  safetyStatus,
  safetyNote,
  issueSummary
}: WorkSummaryProps) {
  const safetyTone = safetyStatus === "안전 점검 완료" ? "green" : "amber";

  return (
    <Card className="section-enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-bold tracking-[-0.03em] text-foreground">
            오늘 작업 요약
          </p>
          <p className="mt-1 text-[12px] leading-5 text-slate">
            아침 브리핑과 점심 재확인에 모두 쓸 수 있는 정보만 담았습니다.
          </p>
        </div>
        <Badge tone={safetyTone}>{safetyStatus}</Badge>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-[18px] bg-[#f8fbf9] px-4 py-3"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-5 text-foreground">{item.title}</p>
              <p className="mt-1 text-[12px] leading-5 text-slate">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-4" />

      <div className="rounded-[20px] border border-[#d7eadf] bg-[#f3fbf6] p-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#067647]" />
          <p className="text-sm font-semibold text-[#14532d]">안전 체크</p>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-[#14532d]">{safetyNote}</p>
      </div>

      <div className="mt-3 rounded-[20px] border border-[#f4d8a8] bg-[#fff8ea] p-4">
        <p className="text-sm font-semibold text-[#7a4a05]">특이사항</p>
        <p className="mt-2 text-[13px] leading-5 text-[#7a4a05]">{issueSummary}</p>
      </div>

      {/* TODO: connect today work log and safety checklist source */}
    </Card>
  );
}
