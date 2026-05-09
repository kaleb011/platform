"use client";

import { Clock3, Link2, ListTodo, UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  EstimateItemRecord,
  ScheduleCategorySummary,
  ScheduleForecastItemRecord
} from "@/lib/estimation/types";

type ScheduleForecastDashboardProps = {
  estimateItems: EstimateItemRecord[];
  scheduleItems: ScheduleForecastItemRecord[];
  categorySummaries: ScheduleCategorySummary[];
  reviewNeededItems: ScheduleForecastItemRecord[];
  importedSheetName: string | null;
  onImportSpreadsheet: (files: FileList | null) => void;
};

const toneMap = {
  draft: "amber",
  linked: "green",
  review_needed: "red"
} as const;

const labelMap = {
  draft: "초안",
  linked: "공정표 연결됨",
  review_needed: "검토 필요"
} as const;

export function ScheduleForecastDashboard({
  estimateItems,
  scheduleItems,
  categorySummaries,
  reviewNeededItems,
  importedSheetName,
  onImportSpreadsheet
}: ScheduleForecastDashboardProps) {
  const orderedCategories = [...scheduleItems]
    .sort((left, right) => (left.plannedOrder ?? 999) - (right.plannedOrder ?? 999))
    .map((item) => item.workCategory)
    .filter((value, index, array) => array.indexOf(value) === index);

  return (
    <div className="space-y-4">
      <Card className="section-enter">
        <SectionHeading
          title="적산내역 업로드 또는 불러오기"
          description="승인된 물량내역 또는 스프레드시트를 기준으로 예상 공정 흐름을 확인합니다."
          action={<Badge tone="blue">공정 초안</Badge>}
        />

        <div className="rounded-[22px] border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-primary">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                적산내역 스프레드시트 또는 승인된 estimate_items 불러오기
              </p>
              <p className="mt-1 text-[12px] leading-5 text-slate">
                CSV/XLSX 파싱 자동화는 다음 단계에서 연결하고, 현재는 업로드된 파일명과 샘플
                공정 초안을 표시합니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer">
                  <input
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(event) => onImportSpreadsheet(event.target.files)}
                    type="file"
                  />
                  <span className="inline-flex min-h-[46px] items-center justify-center rounded-[16px] border border-border bg-white px-4 text-sm font-semibold text-foreground">
                    스프레드시트 선택
                  </span>
                </label>
                <Button className="min-h-[46px] rounded-[16px] px-4" variant="secondary">
                  현재 승인 적산 {estimateItems.length}건 불러오기
                </Button>
              </div>
              <p className="mt-3 text-[12px] text-slate">
                {importedSheetName
                  ? `선택된 파일: ${importedSheetName}`
                  : "선택된 파일 없음. 샘플 forecast 데이터로 대시보드를 표시 중입니다."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 gap-3 section-enter">
        {categorySummaries.map((summary) => (
          <Card key={summary.workCategory} className="bg-[#f8fbf9]">
            <p className="text-[12px] font-semibold text-slate">{summary.workCategory}</p>
            <p className="mt-2 text-[22px] font-bold tracking-[-0.03em] text-foreground">
              {summary.totalQuantity}
            </p>
            <p className="mt-1 text-[12px] text-slate">
              항목 {summary.itemCount}건 · 공정표 연결 {summary.linkedCount}건
            </p>
          </Card>
        ))}
      </section>

      <Card className="section-enter">
        <SectionHeading
          title="예상 작업 순서"
          description="공종별 대표 작업 흐름을 빠르게 파악할 수 있도록 정렬했습니다."
        />
        <div className="space-y-3">
          {orderedCategories.map((category, index) => (
            <div
              key={category}
              className="flex items-start gap-3 rounded-[20px] border border-border bg-white px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground">{category}</p>
                <p className="mt-1 text-[12px] leading-5 text-slate">
                  {scheduleItems
                    .filter((item) => item.workCategory === category)
                    .map((item) => item.taskName)
                    .join(" → ")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="section-enter">
        <SectionHeading
          title="예상공정 초안"
          description="적산내역과 샘플 기준 공정 순서를 결합한 초안 테이블입니다."
        />
        <div className="overflow-x-auto">
          <table className="min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-border text-[12px] text-slate">
                <th className="px-2 py-3 font-medium">순서</th>
                <th className="px-2 py-3 font-medium">공종</th>
                <th className="px-2 py-3 font-medium">작업명</th>
                <th className="px-2 py-3 font-medium">예정 물량</th>
                <th className="px-2 py-3 font-medium">예상기간</th>
                <th className="px-2 py-3 font-medium">연결 여부</th>
                <th className="px-2 py-3 font-medium">비고</th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems
                .sort((left, right) => (left.plannedOrder ?? 999) - (right.plannedOrder ?? 999))
                .map((item) => (
                  <tr key={item.id} className="border-b border-border/70 align-top">
                    <td className="px-2 py-4 text-[13px] font-semibold text-foreground">
                      {item.plannedOrder ?? "-"}
                    </td>
                    <td className="px-2 py-4 text-[13px] text-foreground">{item.workCategory}</td>
                    <td className="px-2 py-4 text-[13px] text-foreground">{item.taskName}</td>
                    <td className="px-2 py-4 text-[13px] text-foreground">
                      {item.plannedQuantity ?? "-"} {item.unit ?? ""}
                    </td>
                    <td className="px-2 py-4 text-[13px] text-foreground">
                      {item.estimatedDurationDays ?? "-"}일
                    </td>
                    <td className="px-2 py-4">
                      <Badge tone={toneMap[item.status]}>{labelMap[item.status]}</Badge>
                    </td>
                    <td className="px-2 py-4 text-[13px] leading-5 text-foreground">
                      {item.dependencyNote ?? "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-4 section-enter sm:grid-cols-2">
        <Card>
          <SectionHeading title="검토 필요 항목" description="공정표 연결 또는 기준 보강이 필요한 항목입니다." />
          <div className="space-y-3">
            {reviewNeededItems.map((item) => (
              <div key={item.id} className="rounded-[18px] bg-[#fff8ea] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-[#7a4a05]">{item.taskName}</p>
                  <Badge tone={toneMap[item.status]}>{labelMap[item.status]}</Badge>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-[#7a4a05]">{item.dependencyNote}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading
            title="공정표 연결 현황"
            description="승인 적산 항목과 연결된 공정 forecast 상태를 표시합니다."
          />
          <div className="space-y-3">
            <div className="rounded-[18px] bg-[#f8fbf9] px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
                <Link2 className="h-4 w-4 text-primary" />
                공정표 연결 여부
              </div>
              <p className="mt-2 text-[22px] font-bold text-foreground">
                {scheduleItems.filter((item) => item.status === "linked").length} / {scheduleItems.length}
              </p>
            </div>
            <div className="rounded-[18px] bg-[#f8fbf9] px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
                <Clock3 className="h-4 w-4 text-primary" />
                예상공정 초안
              </div>
              <p className="mt-2 text-[13px] leading-5 text-foreground">
                철거 → 구조 → 철골 → 수장 → 창호 → 방수 → 포장 순으로 샘플 초안을 구성했습니다.
              </p>
            </div>
            <div className="rounded-[18px] bg-[#f8fbf9] px-4 py-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
                <ListTodo className="h-4 w-4 text-primary" />
                검토 필요 수
              </div>
              <p className="mt-2 text-[22px] font-bold text-foreground">{reviewNeededItems.length}건</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
