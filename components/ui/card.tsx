import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-border bg-card p-4 shadow-[0_14px_28px_rgba(15,23,42,0.045)]",
        className
      )}
    >
      {children}
    </section>
  );
}
