import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  tone?: "green" | "amber" | "red" | "blue";
  className?: string;
};

const toneClass = {
  green: "bg-primary",
  amber: "bg-warning",
  red: "bg-danger",
  blue: "bg-[#3b82f6]"
};

export function ProgressBar({
  value,
  tone = "green",
  className
}: ProgressBarProps) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-[#edf2ef]", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneClass[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
