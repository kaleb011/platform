import type { Metadata } from "next";

import { ComingSoonScreen } from "@/components/layout/coming-soon-screen";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";

export const metadata: Metadata = {
  title: "작업일보 | 현장관리 플랫폼",
  description: "작업일보 화면 준비 중"
};

export default function DailyReportPage() {
  return (
    <MobileAppShell
      header={{
        siteName: "작업일보",
        siteMeta: "입력 · 검토 · PDF 내보내기 흐름",
        dateLabel: "2026년 4월 25일",
        weatherLabel: "다음 단계 예정",
        status: "준비 중",
        alertCount: 1
      }}
    >
      <ComingSoonScreen
        actionLabel="작업일보 준비 중"
        description="기존 플랫폼의 작업일보 기능과 연결되는 실제 입력 화면은 후속 작업에서 이어갈 수 있도록 라우팅만 정리했습니다."
        note="이번 단계는 적산 파트 범위에 집중했고, 기존 작업일보 기능 리팩터링은 포함하지 않았습니다."
        title="작업일보 화면은 추후 정리됩니다."
      />
    </MobileAppShell>
  );
}
