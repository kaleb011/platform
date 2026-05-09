import { Box, FileStack, Workflow } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export function IfcExpansionNotice() {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="BIM / IFC 확장 방향"
        description="PDF 기반 적산 데이터 흐름을 우선 활용하고, 이후 IFC 기반 물량 추출 서비스로 확장합니다."
        action={<Badge tone="blue">IFC 확장</Badge>}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <FileStack className="h-4 w-4 text-primary" />
            소규모 현장
          </div>
          <p className="mt-2 text-[13px] leading-5 text-foreground">
            PDF 도면 기반 업로드와 적산 후보 검토 흐름으로 시작할 수 있습니다.
          </p>
        </div>

        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <Box className="h-4 w-4 text-primary" />
            중대형 프로젝트
          </div>
          <p className="mt-2 text-[13px] leading-5 text-foreground">
            BIM/IFC 데이터를 연계해 부재별 물량, 공정표, 자재 소요량 관리로 확장할 수 있습니다.
          </p>
        </div>

        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <Workflow className="h-4 w-4 text-primary" />
            향후 인터페이스
          </div>
          <p className="mt-2 text-[13px] leading-5 text-foreground">
            importIfcModel, extractQuantitiesFromIfc, mapIfcElementsToEstimateItems 연결 예정입니다.
          </p>
        </div>
      </div>
    </Card>
  );
}
