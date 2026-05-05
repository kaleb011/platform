"use client";

import { FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  EstimateStatementItemRecord,
  EstimateStatementSummary
} from "@/lib/estimation/types";

type EstimateStatementTableProps = {
  items: EstimateStatementItemRecord[];
  onExportExcel: () => void;
  summary: EstimateStatementSummary;
};

function formatMoney(value: number) {
  return value.toLocaleString("ko-KR");
}

function getQuantityLabel(item: EstimateStatementItemRecord) {
  return item.quantityReviewRequired || item.quantity <= 0 ? "검토 필요" : formatMoney(item.quantity);
}

function getUnitPriceLabel(item: EstimateStatementItemRecord, value: number) {
  return item.unitPriceMatched ? formatMoney(value) : "매칭 필요";
}

function getTotalUnitPriceLabel(item: EstimateStatementItemRecord) {
  if (!item.unitPriceMatched) {
    return "매칭 필요";
  }

  return item.unitPrice <= 0 ? "검토 필요" : formatMoney(item.unitPrice);
}

function getAmountLabel(item: EstimateStatementItemRecord) {
  return item.amountReviewRequired ? "검토 필요" : formatMoney(item.amount);
}

export function EstimateStatementTable({
  items,
  onExportExcel,
  summary
}: EstimateStatementTableProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="일위대가 기반 적산내역서"
        description="승인된 물량내역에 업로드한 건축공사 표준일위대가를 매칭해 재료비, 노무비, 경비, 금액을 산출합니다."
        action={
          <Button
            className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
            disabled={items.length === 0}
            onClick={onExportExcel}
            type="button"
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            금액 포함 Excel 내보내기
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">전체 항목</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.totalCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">단가 매칭</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.matchedCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">금액 산출 가능</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.amountReadyCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">총 공사비 합계</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {formatMoney(summary.totalAmount)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-[#fff8e6] px-4 py-3 text-[12px] leading-5 text-slate">
        검토 필요 항목 {summary.reviewNeededCount}건은 수량 또는 일위대가 매칭 확인 후 금액을 확정해야 합니다.
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1320px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">공종</th>
              <th className="px-2 py-3 font-medium">품명</th>
              <th className="px-2 py-3 font-medium">규격</th>
              <th className="px-2 py-3 font-medium">수량</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">재료비</th>
              <th className="px-2 py-3 font-medium">노무비</th>
              <th className="px-2 py-3 font-medium">경비</th>
              <th className="px-2 py-3 font-medium">합계단가</th>
              <th className="px-2 py-3 font-medium">금액</th>
              <th className="px-2 py-3 font-medium">일위대가 항목</th>
              <th className="px-2 py-3 font-medium">도면번호</th>
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
                <td className="px-2 py-4 text-[13px] text-foreground">{item.specification || "-"}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{getQuantityLabel(item)}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.unit}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {getUnitPriceLabel(item, item.materialCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {getUnitPriceLabel(item, item.laborCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {getUnitPriceLabel(item, item.expenseCost)}
                </td>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {getTotalUnitPriceLabel(item)}
                </td>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {getAmountLabel(item)}
                </td>
                <td className="px-2 py-4">
                  <p className="text-[13px] font-semibold text-foreground">
                    {item.unitPriceItemName ?? "일위대가 매칭 필요"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate">{item.unitPriceCode ?? "-"}</p>
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.sourceDrawingNo ?? "-"}
                </td>
                <td className="px-2 py-4">
                  <Badge tone={item.amountReviewRequired ? "amber" : "green"}>
                    {item.amountReviewRequired ? "검토 필요" : "금액 산출"}
                  </Badge>
                  <p className="mt-2 line-clamp-3 text-[12px] leading-5 text-slate">
                    {item.remark ?? "-"}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
