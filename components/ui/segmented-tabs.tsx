"use client";

import { cn } from "@/lib/utils";

type SegmentedTabsProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange
}: SegmentedTabsProps<T>) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-[20px] bg-[#eef3ef] p-1.5">
      {options.map((option) => {
        const active = value === option;

        return (
          <button
            key={option}
            className={cn(
              "rounded-2xl px-3 py-2 text-[12px] font-semibold transition",
              active ? "bg-white text-primary shadow-sm" : "text-slate"
            )}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
