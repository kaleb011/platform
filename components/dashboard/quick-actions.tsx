import {
  ArrowUpRight,
  BarChart3,
  Calculator,
  ClipboardPenLine,
  PackageSearch
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { QuickActionItem } from "@/lib/types/dashboard";

const iconMap = {
  "bar-chart": BarChart3,
  "clipboard-pen": ClipboardPenLine,
  calculator: Calculator,
  package: PackageSearch
} as const;

export function QuickActions({ items }: { items: QuickActionItem[] }) {
  return (
    <Card className="section-enter">
      <div>
        <p className="text-[17px] font-bold tracking-[-0.03em] text-foreground">빠른 실행</p>
        <p className="mt-1 text-[12px] leading-5 text-slate">
          자주 여는 기능을 홈 화면에서 바로 확인할 수 있도록 배치했습니다.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <Button
              key={item.id}
              className="h-auto min-h-[108px] flex-col items-start gap-3 rounded-[20px] p-4 text-left"
              variant="secondary"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate/60" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate">{item.description}</p>
                <p className="mt-2 text-[11px] font-medium text-primary">{item.hint}</p>
              </div>
            </Button>
          );
        })}
      </div>

      {/* TODO: daily report submission */}
    </Card>
  );
}
