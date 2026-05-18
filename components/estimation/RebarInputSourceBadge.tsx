import { Badge } from "@/components/ui/badge";

type RebarInputSourceBadgeProps = {
  label: string;
};

export function RebarInputSourceBadge({ label }: RebarInputSourceBadgeProps) {
  return (
    <Badge className="px-2 py-0.5 text-[10px]" tone="blue">
      {label}
    </Badge>
  );
}
