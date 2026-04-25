import { CloudRain, RadioTower, Sparkles } from "lucide-react";

import { HeroBriefing } from "@/components/dashboard/hero-briefing";
import { MaterialSummary } from "@/components/dashboard/material-summary";
import { ProgressSection } from "@/components/dashboard/progress-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { WorkSummary } from "@/components/dashboard/work-summary";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";
import { Card } from "@/components/ui/card";
import {
  dashboardHeader,
  dashboardHero,
  dashboardSummaryStats,
  materialPriceItems,
  progressItems,
  quickActionItems,
  workSummaryItems,
  workSummaryMeta
} from "@/lib/mock-data/dashboard";

export default function HomePage() {
  return (
    <MobileAppShell header={dashboardHeader}>
      <HeroBriefing
        title={dashboardHero.title}
        headline={dashboardHero.headline}
        description={dashboardHero.description}
        chips={dashboardHero.chips}
      />

      <div className="grid grid-cols-3 gap-3 section-enter">
        <Card className="col-span-2 bg-[#f8fbf8] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#067647]">
            <RadioTower className="h-4 w-4" />
            오전 브리핑 요약
          </div>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-foreground">
            외부 작업은 우천 대응 기준으로 조정하고, 실내 검측과 적산 검토를 우선 처리합니다.
          </p>
        </Card>
        <Card className="bg-[#f4faf5] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#067647]">
            <CloudRain className="h-4 w-4" />
            기상
          </div>
          <p className="mt-2 text-[15px] font-bold text-foreground">오후 1시 이후 비</p>
          <p className="mt-1 text-[11px] text-slate">외부 공정 순서 재확인 필요</p>
        </Card>
      </div>

      <SummaryCards items={dashboardSummaryStats} />
      <ProgressSection items={progressItems} />
      <WorkSummary
        items={workSummaryItems}
        safetyStatus={workSummaryMeta.safetyStatus}
        safetyNote={workSummaryMeta.safetyNote}
        issueSummary={workSummaryMeta.issueSummary}
      />
      <MaterialSummary items={materialPriceItems} />
      <QuickActions items={quickActionItems} />

      <Card className="section-enter bg-[#f8fbf9]">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          다음 연결 준비
        </div>
        <p className="mt-2 text-[12px] leading-5 text-slate">
          이번 단계에서는 기존 홈 대시보드 톤을 유지하면서 적산 파트 라우트를 새로 추가했습니다.
          이후 공정 상세, 작업일보 입력, 자재 시세 연동은 각 라우트에서 순차적으로 확장할 수
          있도록 분리해두었습니다.
        </p>
        {/* TODO: replace mock dashboard payload with real API hooks */}
      </Card>
    </MobileAppShell>
  );
}
