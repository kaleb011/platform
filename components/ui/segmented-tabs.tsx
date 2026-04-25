"use client";

import { cn } from "@/lib/utils";

type SegmentedTabOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  options: readonly SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange
}: SegmentedTabsProps<T>) {
  return (
    <div
      className="grid gap-2 rounded-[20px] bg-[#eef3ef] p-1.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.value}
            className={cn(
              "rounded-2xl px-3 py-2 text-[12px] font-semibold transition",
              active ? "bg-white text-primary shadow-sm" : "text-slate"
            )}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
