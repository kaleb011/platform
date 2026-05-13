"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

type CollapsibleResultListProps<T> = {
  items: T[];
  initialVisibleCount?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  title?: string;
  summaryLabel?: string;
  emptyMessage?: string;
  defaultExpanded?: boolean;
  className?: string;
};

export function CollapsibleResultList<T>({
  items,
  initialVisibleCount = 5,
  renderItem,
  title,
  summaryLabel,
  emptyMessage = "표시할 항목이 없습니다.",
  defaultExpanded = false,
  className
}: CollapsibleResultListProps<T>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, initialVisibleCount)),
    [expanded, initialVisibleCount, items]
  );
  const canToggle = items.length > initialVisibleCount;

  if (items.length === 0) {
    return (
      <div className={className}>
        {title ? <p className="mb-2 text-[12px] font-bold text-foreground">{title}</p> : null}
        <div className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-4 py-5 text-[12px] leading-5 text-slate">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {title ? <p className="text-[12px] font-bold text-foreground">{title}</p> : <span />}
        <p className="text-[11px] font-semibold text-slate">
          {summaryLabel ?? `전체 ${items.length}개 중 ${visibleItems.length}개 표시`}
        </p>
      </div>
      <div className="grid gap-2">
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>
      {canToggle ? (
        <div className="mt-3 flex justify-end">
          <Button
            aria-expanded={expanded}
            className="min-h-[34px] rounded-[12px] px-3 text-[12px]"
            onClick={() => setExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            {expanded ? "▼ 간략히 보기" : "▶ 전체 보기"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
