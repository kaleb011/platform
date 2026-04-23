"use client";

import {
  BarChart3,
  Calculator,
  ClipboardPenLine,
  House,
  Package2
} from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { key: "home", label: "홈", icon: House, active: true },
  { key: "progress", label: "공정", icon: BarChart3, active: false },
  { key: "report", label: "일보", icon: ClipboardPenLine, active: false },
  { key: "estimate", label: "적산", icon: Calculator, active: false },
  { key: "materials", label: "자재", icon: Package2, active: false }
];

export function BottomTabBar() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border/80 bg-white/95 px-3 pt-3 backdrop-blur">
      <div className="grid grid-cols-5 gap-1 rounded-[26px] border border-border bg-[#f7faf8] p-1.5 shadow-soft">
        {tabs.map(({ key, label, icon: Icon, active }) => (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            className={cn(
              "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold transition",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(3,199,90,0.28)]"
                : "text-slate hover:bg-white"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
