import type { Metadata } from "next";

import { ComingSoonScreen } from "@/components/layout/coming-soon-screen";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";

export const metadata: Metadata = {
  title: "자재 | 현장관리 플랫폼",
  description: "자재 화면 준비 중"
};

export default function MaterialsPage() {
  return (
    <MobileAppShell
      header={{
        siteName: "자재 관리",
        siteMeta: "자재 시세 · 반입 현황 · 발주 연동",
        dateLabel: "2026년 4월 25일",
        weatherLabel: "다음 단계 예정",
        status: "준비 중",
        alertCount: 1
      }}
    >
      <ComingSoonScreen
        actionLabel="자재 화면 준비 중"
        description="기존 하단 탭 구조를 유지하면서도 적산 MVP와 충돌하지 않도록 최소 라우트만 연결했습니다."
        note="향후에는 승인된 적산내역의 자재 수량을 자재 계획/반입 현황과 연결할 수 있습니다."
        title="자재 화면은 후속 스프린트에서 확장합니다."
      />
    </MobileAppShell>
  );
}
