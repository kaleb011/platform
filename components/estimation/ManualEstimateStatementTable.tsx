"use client";

import { FileSpreadsheet } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  ManualEstimateStatementItemRecord,
  ManualEstimateStatementStatus,
  ManualEstimateStatementSummary
} from "@/lib/estimation/types";

type ManualEstimateStatementTableProps = {
  items: ManualEstimateStatementItemRecord[];
  onChangeUnitPrice: (estimateItemId: string, value: string) => void;
  onExportExcel: () => void;
  summary: ManualEstimateStatementSummary;
  unitPriceInputs: Record<string, string>;
};

const statusLabel: Record<ManualEstimateStatementStatus, string> = {
  calculated: "금액 산출 완료",
  quantity_review_required: "수량 확인 필요",
  unit_price_required: "단가 입력 필요"
};

const statusTone: Record<ManualEstimateStatementStatus, "green" | "amber" | "red"> = {
  calculated: "green",
  quantity_review_required: "amber",
  unit_price_required: "red"
};

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatWon(value: number) {
  return `${formatNumber(value)}원`;
}

function getQuantityLabel(item: ManualEstimateStatementItemRecord) {
  return item.quantityReviewRequired || item.quantity <= 0
    ? "수량 확인 필요"
    : formatNumber(item.quantity);
}

function getAmountLabel(item: ManualEstimateStatementItemRecord) {
  if (item.status === "calculated" && typeof item.amount === "number") {
    return formatWon(item.amount);
  }

  if (item.status === "quantity_review_required") {
    return "수량 확인 필요";
  }

  return "단가 입력 필요";
}

export function ManualEstimateStatementTable({
  items,
  onChangeUnitPrice,
  onExportExcel,
  summary,
  unitPriceInputs
}: ManualEstimateStatementTableProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = useMemo(() => (expanded ? items : items.slice(0, 5)), [expanded, items]);
  const canToggle = items.length > 5;

  return (
    <Card className="section-enter">
      <SectionHeading
        title="수기 단가 기반 적산내역서"
        description="수량 산출은 시스템이 보조하고, 최종 단가는 사용자가 입력합니다. 수량과 공사단가가 모두 있으면 금액을 계산합니다."
        action={
          <Button
            className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
            disabled={items.length === 0}
            onClick={onExportExcel}
            type="button"
          >
            <FileSpreadsheet className="mr-1 h-4 w-4" />
            수기 단가 Excel 내보내기
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">전체 항목</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.totalCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">금액 산출 완료</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.calculatedCount}</p>
        </div>
        <div className="rounded-[16px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">단가 입력 필요</p>
          <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
            {summary.unitPriceRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#fff8ea] px-3 py-3">
          <p className="text-[11px] font-medium text-[#7a4a05]">수량 확인 필요</p>
          <p className="mt-1 text-[18px] font-bold text-[#7a4a05]">
            {summary.quantityReviewRequiredCount}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">총 금액</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {formatWon(summary.totalAmount)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-[16px] bg-[#f8fafc] px-4 py-3 text-[12px] leading-5 text-slate">
        공사단가는 자동 일위대가 매칭값이 아니라 사용자가 입력한 값을 우선 사용합니다. 공사단가가
        비어 있으면 단가 입력 필요, 수량 검토 대상이면 수량 확인 필요로 표시합니다.
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[1180px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">공종</th>
              <th className="px-2 py-3 font-medium">품명</th>
              <th className="px-2 py-3 font-medium">규격</th>
              <th className="px-2 py-3 font-medium">수량</th>
              <th className="px-2 py-3 font-medium">단위</th>
              <th className="px-2 py-3 font-medium">공사단가</th>
              <th className="px-2 py-3 font-medium">금액</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="px-2 py-3 font-medium">도면번호</th>
              <th className="px-2 py-3 font-medium">산출근거</th>
            </tr>
          </thead>
          <tbody>
            {visibleItems.map((item) => (
              <tr key={item.id} className="border-b border-border/70 align-top">
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {item.workCategory}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.itemName}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.specification || "-"}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">{getQuantityLabel(item)}</td>
                <td className="px-2 py-4 text-[13px] text-foreground">{item.unit || "-"}</td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      className="h-10 w-36 rounded-[10px] border border-border bg-white px-3 text-right text-[13px] font-semibold text-foreground outline-none transition focus:border-primary"
                      inputMode="decimal"
                      min="0"
                      onChange={(event) =>
                        onChangeUnitPrice(item.sourceEstimateItemId, event.target.value)
                      }
                      placeholder="공사단가 입력"
                      type="number"
                      value={unitPriceInputs[item.sourceEstimateItemId] ?? ""}
                    />
                    <span className="text-[12px] font-semibold text-slate">원</span>
                  </div>
                </td>
                <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                  {getAmountLabel(item)}
                </td>
                <td className="px-2 py-4">
                  <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {item.sourceDrawingNo ?? "-"}
                </td>
                <td className="px-2 py-4 text-[12px] leading-5 text-slate">
                  <p className="line-clamp-2">{item.calculationBasis ?? "-"}</p>
                  <p className="mt-1 line-clamp-2">{item.remark ?? "-"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate">
        <span>전체 {items.length}개 중 {visibleItems.length}개 표시</span>
        {canToggle ? (
          <Button
            aria-expanded={expanded}
            className="min-h-[34px] rounded-[12px] px-3 text-[12px]"
            onClick={() => setExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            {expanded ? "▼ 간략히 보기" : "▶ 전체 보기"}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
