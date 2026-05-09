import { Database, HardDrive, TableProperties } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

const refinedDataItems = [
  "도면 파일 메타데이터",
  "도면 추출 후보",
  "품셈 매칭 결과",
  "승인된 적산내역",
  "공종별 물량 요약",
  "예상공정 데이터",
  "자재 소요량/가격 집계 데이터"
];

export function EstimationDataStrategyCard() {
  return (
    <Card className="section-enter bg-[#f8fbf9]">
      <SectionHeading
        title="Supabase 저장 전략"
        description="무료 플랜 용량을 고려해 원본 파일보다 대시보드에 필요한 정제 데이터를 우선 저장합니다."
        action={<Badge tone="gray">저장 전략</Badge>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] bg-white p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <HardDrive className="h-4 w-4 text-primary" />
            원본 파일 정책
          </div>
          <p className="mt-2 text-[13px] leading-6 text-foreground">
            PDF, DWG, IFC, 고해상도 PNG는 무제한 장기 저장 대상으로 보지 않고, 최소 저장 또는
            외부 저장소 연계를 검토합니다. CSV/Excel/PDF 결과물은 가능하면 필요 시 생성합니다.
          </p>
        </div>

        <div className="rounded-[18px] bg-white p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <Database className="h-4 w-4 text-primary" />
            DB 저장 중심 데이터
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {refinedDataItems.map((item) => (
              <span
                key={item}
                className="inline-flex rounded-full bg-[#eef3ef] px-2.5 py-1 text-[11px] font-semibold text-slate"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-[18px] bg-white px-4 py-3 text-[12px] leading-5 text-slate">
        <TableProperties className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        현재 화면은 로컬 검수 흐름을 우선 제공하며, 이후 Supabase Storage 및 DB 저장 파이프라인으로
        연결할 수 있도록 정제 데이터 구조를 유지합니다.
      </div>
    </Card>
  );
}
