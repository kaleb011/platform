import { UploadCloud } from "lucide-react";

import { Card } from "@/components/ui/card";

type PlaceholderPanelProps = {
  title: string;
  description: string;
  actionLabel: string;
};

export function PlaceholderPanel({
  title,
  description,
  actionLabel
}: PlaceholderPanelProps) {
  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-primary">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-[12px] leading-5 text-slate">{description}</p>
          <button
            className="mt-3 inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white"
            type="button"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </Card>
  );
}
