import { cn } from "@/lib/utils";

const badgeTone = {
  green: "bg-[#e8f9ef] text-[#087443]",
  blue: "bg-[#eaf2ff] text-[#2157a3]",
  amber: "bg-[#fff7e7] text-[#a16207]",
  red: "bg-[#feeceb] text-[#b42318]",
  gray: "bg-[#f3f4f6] text-[#475467]"
} as const;

type BadgeProps = {
  children: React.ReactNode;
  tone?: keyof typeof badgeTone;
  className?: string;
};

export function Badge({ children, tone = "gray", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        badgeTone[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
