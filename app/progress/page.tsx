import type { Metadata } from "next";

import { ComingSoonScreen } from "@/components/layout/coming-soon-screen";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";

export const metadata: Metadata = {
  title: "공정 | 현장관리 플랫폼",
  description: "공정 화면 준비 중"
};

export default function ProgressPage() {
  return (
    <MobileAppShell
      header={{
        siteName: "공정 관리",
        siteMeta: "현장 공종별 진행률 · 이슈 · 상세 일정",
        dateLabel: "2026년 4월 25일",
        weatherLabel: "다음 단계 예정",
        status: "준비 중",
        alertCount: 1
      }}
    >
      <ComingSoonScreen
        actionLabel="공정 상세 준비 중"
        description="기존 하단 탭 흐름을 유지하기 위해 라우트는 준비했고, 이번 스프린트에서는 적산 파트 MVP를 우선 구현했습니다."
        note="공정 상세 차트, 지연 알림, 작업 순서 연동은 다음 단계에서 적산 forecast와 연결해 확장합니다."
        title="공정 화면은 다음 단계에서 연결됩니다."
      />
    </MobileAppShell>
  );
}
