import type { Metadata } from "next";

import { EstimationDashboard } from "@/components/estimation/EstimationDashboard";
import { MobileAppShell } from "@/components/layout/mobile-app-shell";

export const metadata: Metadata = {
  title: "적산 파트 | 현장관리 플랫폼",
  description: "도면 기반 적산내역 생성과 예상공정 대시보드를 위한 MVP 화면"
};

export default function EstimatePage() {
  return (
    <MobileAppShell
      header={{
        siteName: "적산 파트",
        siteMeta: "도면 후보값 검수 · 표준품셈 추천 · 예상공정 초안",
        dateLabel: "2026년 4월 25일",
        weatherLabel: "샘플 데이터 검증",
        status: "MVP 검수 모드",
        alertCount: 2
      }}
    >
      <EstimationDashboard />
    </MobileAppShell>
  );
}
