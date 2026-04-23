import { AlertTriangle, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { ProgressItem, ProgressStatus } from "@/lib/types/dashboard";

const toneMap: Record<ProgressStatus, "green" | "amber" | "blue" | "red"> = {
  정상: "green",
  지연: "amber",
  완료: "blue",
  위험: "red"
};

const progressToneMap: Record<ProgressStatus, string> = {
  정상: "bg-primary",
  지연: "bg-warning",
  완료: "bg-[#3b82f6]",
  위험: "bg-danger"
};

export function ProgressSection({ items }: { items: ProgressItem[] }) {
  return (
    <Card className="section-enter">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[17px] font-bold tracking-[-0.03em] text-foreground">
            주요 공정 진행 현황
          </p>
          <p className="mt-1 text-[12px] leading-5 text-slate">
            오늘 현장에서 바로 확인할 공종 중심으로 정리했습니다.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AlertTriangle className="h-4 w-4" />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-[22px] bg-[#f8fbf9] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-foreground">{item.name}</p>
                <p className="mt-1 text-[12px] text-slate">
                  {item.team} · {item.area}
                </p>
              </div>
              <Badge tone={toneMap[item.status]}>{item.status}</Badge>
            </div>

            <div className="mt-4 flex items-center justify-between text-[12px]">
              <span className="text-slate">진행률</span>
              <span className="font-semibold text-foreground">{item.progress}%</span>
            </div>
            <Progress
              className="mt-2"
              value={item.progress}
              indicatorClassName={progressToneMap[item.status]}
            />
            <div className="mt-3 flex items-start justify-between gap-2">
              <p className="text-[12px] leading-5 text-slate">{item.note}</p>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate/70" />
            </div>
          </div>
        ))}
      </div>

      {/* TODO: connect progress detail drawer or page */}
    </Card>
  );
}
