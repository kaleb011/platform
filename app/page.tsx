import { CloudRain, RadioTower, Sparkles } from "lucide-react";

import { HeroBriefing } from "@/components/dashboard/hero-briefing";
import { MaterialSummary } from "@/components/dashboard/material-summary";
import { ProgressSection } from "@/components/dashboard/progress-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { WorkSummary } from "@/components/dashboard/work-summary";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { TopHeader } from "@/components/layout/top-header";
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
    <div className="min-h-screen px-4 py-5">
      <div className="phone-shell mx-auto min-h-[100dvh] max-w-[430px] rounded-[36px]">
        <TopHeader
          siteName={dashboardHeader.siteName}
          siteMeta={dashboardHeader.siteMeta}
          dateLabel={dashboardHeader.dateLabel}
          weatherLabel={dashboardHeader.weatherLabel}
          status={dashboardHeader.status}
          alertCount={dashboardHeader.alertCount}
        />

        <main className="app-safe-bottom relative space-y-4 px-4 pb-8 pt-4">
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
                오전 브리핑 포인트
              </div>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-foreground">
                외부 양중은 점심 전 우선 처리, 오후에는 실내 중심으로 전환 권장
              </p>
            </Card>
            <Card className="bg-[#f4faf5] p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#067647]">
                <CloudRain className="h-4 w-4" />
                기상
              </div>
              <p className="mt-2 text-[15px] font-bold text-foreground">13시 이후 비</p>
              <p className="mt-1 text-[11px] text-slate">타설 일정 재확인</p>
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
              지금 단계는 홈 대시보드 완성도에 집중한 목업입니다. 하단 탭은 이동 가능한 구조처럼
              보이도록 잡아두었고, 이후 공정 상세, 작업일보, 적산, 자재 화면을 같은 톤으로 확장할 수
              있게 분리해두었습니다.
            </p>
            {/* TODO: replace mock dashboard payload with real API hooks */}
            {/* TODO: connect tab navigation when secondary screens are ready */}
          </Card>
        </main>

        <BottomTabBar />
      </div>
    </div>
  );
}
