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
  dashboardSummaryStats,
  materialPriceItems,
  progressItems,
  quickActionItems,
  workSummaryItems,
  workSummaryMeta
} from "@/lib/mock-data/dashboard";

export default function HomePage() {
  return (
    <div className="mx-auto min-h-screen max-w-[430px] bg-white shadow-soft">
      <TopHeader
        siteName={dashboardHeader.siteName}
        dateLabel={dashboardHeader.dateLabel}
        status={dashboardHeader.status}
      />

      <main className="app-safe-bottom space-y-4 px-4 pb-8 pt-4">
        <Card className="bg-[linear-gradient(135deg,#0ca95a_0%,#03c75a_58%,#74dfa4_100%)] text-white">
          <p className="text-[12px] font-medium text-white/80">오늘 현장 브리핑</p>
          <p className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-white">
            공정과 안전, 자재 흐름을 한 화면에서 빠르게 확인하세요.
          </p>
          <p className="mt-3 text-[13px] leading-5 text-white/85">
            오전 작업 인원과 주요 공종, 자재 단가 변동을 현장 관리자 시선에서 바로 볼 수 있게
            정리했습니다.
          </p>
        </Card>

        <SummaryCards items={dashboardSummaryStats} />
        <ProgressSection items={progressItems} />
        <WorkSummary
          items={workSummaryItems}
          note={workSummaryMeta.note}
          safetyStatus={workSummaryMeta.safetyStatus}
        />
        <MaterialSummary items={materialPriceItems} />
        <QuickActions items={quickActionItems} />

        <Card className="bg-[#f8fbf9]">
          <p className="text-sm font-semibold text-foreground">연동 준비 메모</p>
          <p className="mt-2 text-[12px] leading-5 text-slate">
            현재는 mock data 기반 UI입니다. 추후 스프레드시트, Supabase, 알림 기능과 연결하기
            쉽도록 타입과 데이터를 분리해두었습니다.
          </p>
          {/* TODO: spreadsheet import hook */}
          {/* TODO: supabase query hook */}
        </Card>
      </main>

      <BottomTabBar />
    </div>
  );
}
