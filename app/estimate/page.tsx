import type { Metadata } from "next";

import { EstimationDashboard } from "@/components/estimation/EstimationDashboard";

export const metadata: Metadata = {
  title: "적산내역 보조 | 현장관리 플랫폼",
  description: "도면 PDF 기반 수량 후보 검수와 일위대가 적용을 위한 적산 업무 콘솔"
};

export default function EstimatePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <EstimationDashboard />
    </main>
  );
}
