import { cn } from "@/lib/utils";

type MiniTrendChartProps = {
  points: number[];
  tone?: "up" | "flat" | "down";
};

const chartColor = {
  up: "#03c75a",
  flat: "#94a3b8",
  down: "#f97316"
};

export function MiniTrendChart({
  points,
  tone = "up"
}: MiniTrendChartProps) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1 || 1)) * 100;
      const y = 40 - ((point - min) / range) * 28;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="relative h-12 overflow-hidden rounded-2xl bg-[#f4f7f5]">
      <div className="absolute inset-x-0 bottom-0 top-0 bg-[linear-gradient(180deg,rgba(3,199,90,0.06),transparent)]" />
      <svg
        className={cn("absolute inset-0 h-full w-full")}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke={chartColor[tone]}
          strokeLinecap="round"
          strokeWidth="3"
        />
      </svg>
    </div>
  );
}
