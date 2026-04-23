import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const buttonVariants = {
  primary:
    "bg-primary text-white shadow-[0_10px_24px_rgba(3,199,90,0.24)] hover:bg-[#03b051]",
  secondary:
    "border border-border bg-white text-foreground hover:border-primary/30 hover:bg-primary/5",
  ghost: "bg-transparent text-slate hover:bg-[#f4f7f5]"
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-[48px] items-center justify-center rounded-[18px] px-4 text-sm font-semibold transition",
        buttonVariants[variant],
        className
      )}
      type={type}
      {...props}
    />
  );
}
