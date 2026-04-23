import { ClipboardList, Gauge, Truck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardSummaryStat } from "@/lib/types/dashboard";

const iconMap = {
  gauge: Gauge,
  users: Users,
  truck: Truck,
  clipboard: ClipboardList
} as const;

export function SummaryCards({ items }: { items: DashboardSummaryStat[] }) {
  return (
    <section className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const Icon = iconMap[item.icon];

        return (
          <Card key={item.id} className="section-enter overflow-hidden p-0">
            <div className="rounded-[24px] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <Badge tone={item.tone}>{item.description}</Badge>
              </div>
              <p className="mt-4 text-[12px] font-medium text-slate">{item.label}</p>
              <p className="mt-1 text-[25px] font-bold tracking-[-0.03em] text-foreground">
                {item.value}
              </p>
              <p className="mt-2 text-[12px] leading-5 text-slate">{item.footnote}</p>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
