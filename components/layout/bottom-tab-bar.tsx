"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calculator,
  ClipboardPenLine,
  Home,
  Package2
} from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { key: "home", label: "홈", icon: Home, href: "/" },
  { key: "progress", label: "공정", icon: BarChart3, href: "/progress" },
  { key: "report", label: "일보", icon: ClipboardPenLine, href: "/daily-report" },
  { key: "estimate", label: "적산", icon: Calculator, href: "/estimate" },
  { key: "materials", label: "자재", icon: Package2, href: "/materials" }
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-3 pt-3">
      <div className="grid grid-cols-5 gap-1 rounded-[28px] border border-white/90 bg-white/92 p-1.5 shadow-[0_20px_32px_rgba(15,23,42,0.12)] backdrop-blur">
        {tabs.map(({ key, label, icon: Icon, href }) => {
          const active = pathname === href;

          return (
            <Link
              key={key}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-2 text-[11px] font-semibold transition",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_8px_18px_rgba(3,199,90,0.24)]"
                  : "text-slate hover:bg-[#f4f7f5]"
              )}
              href={href}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
