"use client";

import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, ListChecks, WalletCards } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  ScheduleForecastItem,
  ScheduleForecastItemStatus,
  ScheduleForecastPriority,
  ScheduleForecastSummary
} from "@/lib/estimation/types";

type ScheduleForecastDashboardProps = {
  items: ScheduleForecastItem[];
  summary: ScheduleForecastSummary;
};

const statusLabel: Record<ScheduleForecastItemStatus, string> = {
  ready: "산출 가능",
  quantity_required: "수량 확인 필요",
  price_required: "단가 입력 필요",
  review_required: "검토 필요"
};

const statusTone: Record<ScheduleForecastItemStatus, "green" | "amber" | "blue"> = {
  ready: "green",
  quantity_required: "amber",
  price_required: "blue",
  review_required: "amber"
};

const priorityLabel: Record<ScheduleForecastPriority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음"
};

const priorityTone: Record<ScheduleForecastPriority, "red" | "amber" | "gray"> = {
  high: "red",
  medium: "amber",
  low: "gray"
};

function formatNumber(value: number | undefined, fractionDigits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0
  });
}

function formatWon(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return `${formatNumber(value, 0)}원`;
}

function formatDuration(value: number | null) {
  return value === null ? "산정 보류" : `${value}일`;
}

export function ScheduleForecastDashboard({ items, summary }: ScheduleForecastDashboardProps) {
  const summaryCards = [
    {
      label: "예상 공정 수",
      value: `${summary.totalProcesses}`,
      icon: ListChecks
    },
    {
      label: "산출 가능 공정",
      value: `${summary.readyProcesses}`,
      icon: CheckCircle2
    },
    {
      label: "검토 필요 공정",
      value: `${summary.reviewRequiredProcesses}`,
      icon: AlertTriangle
    },
    {
      label: "예상 총 기간",
      value: `${summary.totalEstimatedDays}일`,
      icon: Clock3
    },
    {
      label: "총 공사금액",
      value: formatWon(summary.totalAmount),
      icon: WalletCards
    }
  ];

  return (
    <Card className="bg-white shadow-sm">
      <SectionHeading
        title="예상공정 대시보드"
        description="승인된 적산내역과 수기 단가 입력 결과를 바탕으로 공정 초안을 생성합니다."
        action={<Badge tone="green">견적서 기반 초안</Badge>}
      />

      {items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-[13px] leading-6 text-[#067647]">
          승인된 적산내역이 없습니다. 수량 후보를 승인하고 공사단가를 입력하면 예상공정 초안이 생성됩니다.
        </div>
      ) : (
        <div className="space-y-4">
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.label}
                  className="rounded-2xl border border-border bg-[#f8fbf9] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold text-slate">{card.label}</p>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-[20px] font-bold tracking-[-0.03em] text-foreground">
                    {card.value}
                  </p>
                </div>
              );
            })}
          </section>

          <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-border bg-white px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-bold text-foreground">{item.processName}</p>
                    <p className="mt-1 text-[12px] font-semibold text-primary">{item.workCategory}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                    <Badge tone={priorityTone[item.priority]}>우선순위 {priorityLabel[item.priority]}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2">
                    <p className="text-[11px] font-medium text-slate">예상 기간</p>
                    <p className="mt-1 text-[13px] font-bold text-foreground">
                      {formatDuration(item.estimatedDurationDays)}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2">
                    <p className="text-[11px] font-medium text-slate">관련 항목</p>
                    <p className="mt-1 text-[13px] font-bold text-foreground">
                      {item.sourceEstimateItems.length}건
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2">
                    <p className="text-[11px] font-medium text-slate">수량</p>
                    <p className="mt-1 text-[13px] font-bold text-foreground">
                      {formatNumber(item.quantity)} {item.unit ?? ""}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-[#f5f7fb] px-3 py-2">
                    <p className="text-[11px] font-medium text-slate">금액</p>
                    <p className="mt-1 text-[13px] font-bold text-foreground">
                      {formatWon(item.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-[14px] border border-border bg-[#fbfcfe] px-3 py-3">
                  <div className="flex items-start gap-2">
                    <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate">산출근거</p>
                      <p className="mt-1 text-[12px] leading-5 text-foreground">{item.basis}</p>
                      {item.note ? (
                        <p className="mt-2 text-[12px] leading-5 text-slate">비고: {item.note}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      )}
    </Card>
  );
}
