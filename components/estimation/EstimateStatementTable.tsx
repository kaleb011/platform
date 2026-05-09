"use client";

import { FileSpreadsheet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  EstimateStatementItemRecord,
  EstimateStatementSummary,
  StatementReviewStatus
} from "@/lib/estimation/types";

type EstimateStatementTableProps = {
  items: EstimateStatementItemRecord[];
  onExportExcel: () => void;
  summary: EstimateStatementSummary;
};

const reviewStatusLabel: Record<StatementReviewStatus, string> = {
  calculated: "산출 가능",
  quantity_review_required: "수량 확인 필요",
  unit_price_match_required: "일위대가 매칭 필요",
  unit_check_required: "단위 확인 필요",
  match_review_required: "매칭 검토 필요"
};

const reviewStatusTone: Record<StatementReviewStatus, "green" | "amber" | "red"> = {
  calculated: "green",
  quantity_review_required: "amber",
  unit_price_match_required: "red",
  unit_check_required: "amber",
  match_review_required: "amber"
};

function formatMoney(value: number) {
  return value.toLocaleString("ko-KR");
}

function getQuantityLabel(item: EstimateStatementItemRecord) {
  return item.quantityReviewRequired || item.quantity <= 0
    ? "수량 확인 필요"
    : formatMoney(item.quantity);
}

function getCostLabel(item: EstimateStatementItemRecord, value: number) {
  return item.unitPriceMatched ? formatMoney(value) : "-";
}

function getTotalUnitPriceLabel(item: EstimateStatementItemRecord) {
  if (!item.unitPriceMatched) {
    return "-";
  }

  return item.unitPrice <= 0 ? "단가 확인 필요" : formatMoney(item.unitPrice);
}

function getAmountLabel(item: EstimateStatementItemRecord) {
  if (item.statementReviewStatus === "calculated") {
    return formatMoney(item.amount);
  }

  if (item.statementReviewStatus === "quantity_review_required") {
    return "수량 확인 필요";
  }

  if (item.statementReviewStatus === "unit_check_required") {
    return "단위 확인 필요";
  }

  if (item.statementReviewStatus === "match_review_required") {
    return "매칭 검토 필요";
  }

  return "검토 필요";
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
          <p className="text-[11px] font-medium text-slate">산출 가능</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.calculatedCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">수량 확인 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.quantityReviewRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">일위대가 매칭 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.unitPriceMatchRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">단위 확인 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.unitCheckRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">매칭 검토 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.matchReviewRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">총 공사비 합계</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {formatMoney(summary.totalAmount)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-[#fff8e6] px-4 py-3 text-[12px] leading-5 text-slate">
        전체 {summary.totalCount}건 중 {summary.calculatedCount}건은 금액 산출 가능 상태입니다. 나머지는
        수량, 일위대가, 단위, 매칭 신뢰도 중 어떤 부분을 확인해야 하는지 상태로 구분했습니다.
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
                  {getCostLabel(item, item.materialCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {getCostLabel(item, item.laborCost)}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {getCostLabel(item, item.expenseCost)}
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
                  <p className="mt-1 text-[12px] text-slate">
                    {item.unitPriceCode ?? "-"} · 단위 {item.unitPriceUnit ?? "-"}
                  </p>
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.sourceDrawingNo ?? "-"}
                </td>
                <td className="px-2 py-4">
                  <Badge tone={reviewStatusTone[item.statementReviewStatus]}>
                    {reviewStatusLabel[item.statementReviewStatus]}
                  </Badge>
                  <p className="mt-2 text-[12px] font-medium text-foreground">
                    {item.reviewMessage}
                  </p>
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
