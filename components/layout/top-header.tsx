import { Bell, CircleDot } from "lucide-react";

type TopHeaderProps = {
  siteName: string;
  dateLabel: string;
  status: string;
};

export function TopHeader({ siteName, dateLabel, status }: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-white/92 px-5 pb-4 pt-5 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-slate">현장 홈 대시보드</p>
          <h1 className="mt-1 text-[22px] font-bold tracking-[-0.03em] text-foreground">
            {siteName}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f5f7f6] px-3 py-1 text-[12px] font-medium text-slate">
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-[#067647]">
              <CircleDot className="h-3.5 w-3.5" />
              {status}
            </span>
          </div>
        </div>

        <button
          aria-label="알림"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-[#f7faf8] text-slate transition hover:border-primary/40 hover:text-primary"
          type="button"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
          {/* TODO: notification integration */}
        </button>
      </div>
    </header>
  );
}
