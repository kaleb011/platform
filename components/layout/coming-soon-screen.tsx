import { Clock3 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { PlaceholderPanel } from "@/components/ui/placeholder-panel";
import { SectionHeading } from "@/components/ui/section-heading";

type ComingSoonScreenProps = {
  title: string;
  description: string;
  actionLabel: string;
  note: string;
};

export function ComingSoonScreen({
  title,
  description,
  actionLabel,
  note
}: ComingSoonScreenProps) {
  return (
    <>
      <Card className="section-enter bg-[#f6fbf7]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-primary">기존 모바일 대시보드 톤 유지</p>
            <h2 className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-foreground">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-slate">{description}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
            <Clock3 className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <div className="section-enter">
        <SectionHeading
          title="준비 중인 화면"
          description="이번 1차 구현에서는 적산 파트 MVP를 우선 완성하고, 나머지 화면은 기존 라우팅만 유지합니다."
        />
        <PlaceholderPanel title={title} description={note} actionLabel={actionLabel} />
      </div>
    </>
  );
}
