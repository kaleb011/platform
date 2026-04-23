import { cn } from "@/lib/utils";

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-border bg-card p-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)]",
        className
      )}
    >
      {children}
    </section>
  );
}
