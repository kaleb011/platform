import { Minus, Package2, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { MaterialPriceItem } from "@/lib/types/dashboard";

const directionMeta = {
  상승: {
    tone: "green" as const,
    icon: TrendingUp
  },
  보합: {
    tone: "gray" as const,
    icon: Minus
  },
  하락: {
    tone: "amber" as const,
    icon: TrendingDown
  }
};

export function MaterialSummary({ items }: { items: MaterialPriceItem[] }) {
  return (
    <Card className="section-enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-bold tracking-[-0.03em] text-foreground">
            자재 가격 요약
          </p>
          <p className="mt-1 text-[12px] leading-5 text-slate">
            현장 발주 판단에 필요한 핵심 자재 단가 흐름만 먼저 정리했습니다.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Package2 className="h-4 w-4" />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        {items.map((item) => {
          const meta = directionMeta[item.direction];
          const Icon = meta.icon;

          return (
            <div key={item.id} className="rounded-[20px] bg-[#f8fbf9] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <p className="mt-1 text-[12px] text-slate">현재 단가 {item.currentPrice}</p>
                </div>
                <Badge tone={meta.tone}>{item.direction}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-[16px] bg-white px-3 py-2.5">
                <div>
                  <p className="text-[12px] text-slate">전주 대비 {item.changeRate}</p>
                  <p className="mt-0.5 text-[11px] text-slate">{item.note}</p>
                </div>
                <div className="flex items-center gap-1 text-[12px] font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-primary" />
                  {item.direction}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TODO: material forecast data source */}
    </Card>
  );
}
