import { ArrowRight, HardHat, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

type HeroBriefingProps = {
  title: string;
  headline: string;
  description: string;
  chips: string[];
};

export function HeroBriefing({
  title,
  headline,
  description,
  chips
}: HeroBriefingProps) {
  return (
    <Card className="section-enter overflow-hidden border-0 bg-[linear-gradient(140deg,#109d56_0%,#03c75a_54%,#78dba3_100%)] p-0 text-white">
      <div className="relative p-5">
        <div className="absolute right-[-18px] top-[-18px] h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold text-white">
              <HardHat className="h-3.5 w-3.5" />
              {title}
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              안전 우선 확인
            </div>
          </div>

          <p className="mt-4 text-[21px] font-bold leading-8 tracking-[-0.04em] text-white">
            {headline}
          </p>
          <p className="mt-3 text-[13px] leading-6 text-white/88">{description}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-semibold text-white"
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between rounded-[20px] bg-white/14 px-4 py-3">
            <div>
              <p className="text-[11px] font-medium text-white/76">현장 메모</p>
              <p className="mt-1 text-[13px] font-semibold text-white">
                오전 검측 완료 후 적산 후보 검수 2건 확인 필요
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-white/80" />
          </div>
        </div>
      </div>

      {/* TODO: connect hero briefing to live site summary endpoint */}
    </Card>
  );
}
