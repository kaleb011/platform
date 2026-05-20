"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calculator } from "lucide-react";

import { cn } from "@/lib/utils";

const estimateTab = {
  label: "적산",
  href: "/estimate",
  icon: Calculator
};

export function BottomTabBar() {
  const pathname = usePathname();
  const active = pathname === estimateTab.href;
  const Icon = estimateTab.icon;

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-3 pt-3">
      <div className="rounded-[28px] border border-white/90 bg-white/92 p-1.5 shadow-[0_20px_32px_rgba(15,23,42,0.12)] backdrop-blur">
        <Link
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex min-h-[64px] items-center justify-center gap-2 rounded-[20px] px-4 py-2 text-[13px] font-semibold transition",
            active
              ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(3,199,90,0.24)]"
              : "text-slate hover:bg-[#f4f7f5]"
          )}
          href={estimateTab.href}
        >
          <Icon className="h-4 w-4" />
          <span>{estimateTab.label}</span>
        </Link>
      </div>
    </nav>
  );
}
