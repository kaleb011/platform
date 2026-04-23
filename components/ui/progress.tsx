import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  className?: string;
  indicatorClassName?: string;
};

export function Progress({
  value,
  className,
  indicatorClassName
}: ProgressProps) {
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full bg-[#edf2ef]", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
