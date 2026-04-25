"use client";

import { Download, FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { EstimateItemRecord } from "@/lib/estimation/types";

type EstimateItemsTableProps = {
  items: EstimateItemRecord[];
  onExportCsv: () => void;
  onExportExcel: () => void;
};

const toneMap = {
  pending: "gray",
  accepted: "green",
  rejected: "red",
  edited: "blue",
  needs_standard_match: "amber"
} as const;

const labelMap = {
  pending: "대기",
  accepted: "승인",
  rejected: "제외",
  edited: "수정 승인",
  needs_standard_match: "매칭 필요"
} as const;

export function EstimateItemsTable({
  items,
  onExportCsv,
  onExportExcel
}: EstimateItemsTableProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="승인된 적산내역"
        description="사용자가 승인한 항목만 내역서에 반영합니다."
        action={
          <div className="flex gap-2">
            <Button
              className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
              disabled={items.length === 0}
              onClick={onExportCsv}
              variant="secondary"
            >
              <Download className="mr-1 h-4 w-4" />
              CSV 내보내기
            </Button>
            <Button
              className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
              disabled={items.length === 0}
              onClick={onExportExcel}
            >
              <FileSpreadsheet className="mr-1 h-4 w-4" />
              Excel 내보내기
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="min-w-[1080px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">공종</th>
              <th className="px-2 py-3 font-medium">품명</th>
              <th className="px-2 py-3 font-medium">규격</th>
              <th className="px-2 py-3 font-medium">수량</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">산출근거</th>
              <th className="px-2 py-3 font-medium">표준품셈 항목</th>
              <th className="px-2 py-3 font-medium">도면번호</th>
              <th className="px-2 py-3 font-medium">도면명</th>
              <th className="px-2 py-3 font-medium">검수상태</th>
              <th className="px-2 py-3 font-medium">비고</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/70 align-top">
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {item.workCategory}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.itemName}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.specification ?? "-"}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.quantity}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.unit}</td>
                <td className="px-2 py-4 text-[13px] leading-5 text-foreground">
                  {item.calculationBasis ?? "-"}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.standardItemName}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.drawingNo}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.drawingTitle}</td>
                <td className="px-2 py-4">
                  <Badge tone={toneMap[item.reviewStatus]}>{labelMap[item.reviewStatus]}</Badge>
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.remark ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
