import { BarChart3, Calculator, ClipboardPenLine, PackageSearch } from "lucide-react";

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
    <Card>
      <div>
        <p className="text-[17px] font-bold tracking-[-0.03em] text-foreground">빠른 실행</p>
        <p className="mt-1 text-[12px] leading-5 text-slate">
          자주 쓰는 기능을 홈에서 바로 진입하는 MVP 흐름입니다.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = iconMap[item.icon];

          return (
            <Button
              key={item.id}
              className="h-auto min-h-[84px] flex-col items-start gap-2 rounded-[20px] p-4 text-left"
              variant="secondary"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate">{item.description}</p>
              </div>
            </Button>
          );
        })}
      </div>

      {/* TODO: daily report submission */}
    </Card>
  );
}
