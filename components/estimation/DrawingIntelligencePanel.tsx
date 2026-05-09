"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  DrawingDiscipline,
  DrawingQuantityRoadmapRecord,
  DrawingReferenceRecord,
  DrawingSheetIndexRecord,
  DrawingSheetType,
  QuantityReadinessStatus
} from "@/lib/estimation/types";

type DrawingIntelligencePanelProps = {
  references: DrawingReferenceRecord[];
  roadmaps: DrawingQuantityRoadmapRecord[];
  sheets: DrawingSheetIndexRecord[];
};

type SheetFilter =
  | "all"
  | "structure"
  | "architecture"
  | "direct_table_available"
  | "structural_schedule"
  | "plan_link_required"
  | "review_required";

const disciplineLabel: Record<DrawingDiscipline, string> = {
  architecture: "건축",
  structure: "구조",
  rebar_concrete: "철근콘크리트",
  steel: "철골",
  finish: "마감",
  window_door: "창호",
  waterproof: "방수",
  civil_drainage: "토목/배수",
  mechanical: "설비",
  electrical: "전기",
  unknown: "기타"
};

const sheetTypeLabel: Record<DrawingSheetType, string> = {
  drawing_list: "도면목록표",
  architectural_plan: "건축평면도",
  structural_plan: "구조평면도",
  structural_schedule: "구조일람표",
  section: "단면도",
  elevation: "입면도",
  detail: "상세도",
  finish_schedule: "마감표",
  window_door_schedule: "창호일람표",
  legend: "범례표",
  quantity_table: "수량표",
  general_note: "일반사항",
  unknown: "기타"
};

const readinessLabel: Record<QuantityReadinessStatus, string> = {
  direct_table_available: "직접 수량표 있음",
  schedule_based_calculation: "일람표 기반 산출 가능",
  plan_link_required: "평면도 연결 필요",
  image_geometry_required: "이미지/도형 해석 필요",
  review_required: "검토 필요"
};

const readinessTone: Record<QuantityReadinessStatus, "green" | "blue" | "amber" | "red" | "gray"> =
  {
    direct_table_available: "green",
    schedule_based_calculation: "blue",
    plan_link_required: "amber",
    image_geometry_required: "red",
    review_required: "gray"
  };

const filters: Array<{ key: SheetFilter; label: string }> = [
  { key: "all", label: "전체" },
  { key: "structure", label: "구조" },
  { key: "architecture", label: "건축" },
  { key: "direct_table_available", label: "수량표 있음" },
  { key: "structural_schedule", label: "구조일람표" },
  { key: "plan_link_required", label: "평면도 연결 필요" },
  { key: "review_required", label: "검토 필요" }
];

function filterSheets(sheets: DrawingSheetIndexRecord[], filter: SheetFilter) {
  if (filter === "all") return sheets;
  if (filter === "structure") {
    return sheets.filter((sheet) =>
      ["structure", "rebar_concrete", "steel"].includes(sheet.discipline)
    );
  }
  if (filter === "architecture") {
    return sheets.filter((sheet) => sheet.discipline === "architecture");
  }
  if (filter === "structural_schedule") {
    return sheets.filter((sheet) => sheet.sheetType === "structural_schedule");
  }

  return sheets.filter((sheet) => sheet.quantityReadinessStatus === filter);
}

function getSheetLabel(sheet: DrawingSheetIndexRecord) {
  return `${sheet.drawingNo ?? `PDF p.${sheet.sourcePage}`} ${sheet.drawingTitle ?? ""}`.trim();
}

function getRelatedSheetLabels(
  sheet: DrawingSheetIndexRecord,
  sheets: DrawingSheetIndexRecord[],
  references: DrawingReferenceRecord[]
) {
  const relatedIds = references
    .filter((reference) => reference.fromSheetId === sheet.id)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 3)
    .map((reference) => reference.toSheetId);

  return relatedIds
    .map((id) => sheets.find((item) => item.id === id))
    .filter((item): item is DrawingSheetIndexRecord => Boolean(item))
    .map(getSheetLabel);
}

export function DrawingIntelligencePanel({
  references,
  roadmaps,
  sheets
}: DrawingIntelligencePanelProps) {
  const [activeFilter, setActiveFilter] = useState<SheetFilter>("all");
  const filteredSheets = useMemo(() => filterSheets(sheets, activeFilter), [activeFilter, sheets]);
  const summary = useMemo(
    () => ({
      classified: sheets.filter(
        (sheet) => sheet.discipline !== "unknown" || sheet.sheetType !== "unknown"
      ).length,
      directTables: sheets.filter(
        (sheet) => sheet.quantityReadinessStatus === "direct_table_available"
      ).length,
      planLinkRequired: sheets.filter(
        (sheet) => sheet.quantityReadinessStatus === "plan_link_required"
      ).length,
      structuralSchedules: sheets.filter((sheet) => sheet.sheetType === "structural_schedule")
        .length,
      structureSheets: sheets.filter((sheet) =>
        ["structure", "rebar_concrete", "steel"].includes(sheet.discipline)
      ).length
    }),
    [sheets]
  );

  if (sheets.length === 0) {
    return (
      <Card className="section-enter">
        <SectionHeading
          title="프로젝트 도면 데이터 인덱스"
          description="업로드된 PDF 도면을 페이지별로 분류하여 도면번호, 도면명, 공종, 층, 도면종류, 수량 산출 가능성을 확인합니다."
        />
        <p className="rounded-[16px] bg-[#f8fbf9] px-4 py-3 text-[12px] leading-5 text-slate">
          아직 분류할 PDF 텍스트가 없습니다. 도면 PDF를 업로드하면 페이지별 도면 인덱스가 생성됩니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="section-enter">
      <SectionHeading
        title="프로젝트 도면 데이터 인덱스"
        description="업로드된 PDF 도면을 페이지별로 분류하여 도면번호, 도면명, 공종, 층, 도면종류, 수량 산출 가능성을 확인합니다."
        action={<Badge tone="blue">{sheets.length} page</Badge>}
      />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">전체 도면 페이지</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{sheets.length}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">분류된 도면</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.classified}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">구조 도면</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.structureSheets}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">수량표/범례표</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{summary.directTables}</p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">구조일람표</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.structuralSchedules}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#fff8e6] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">평면도 연결 필요</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">
            {summary.planLinkRequired}
          </p>
        </div>
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => {
          const selected = activeFilter === filter.key;
          const count = filterSheets(sheets, filter.key).length;

          return (
            <button
              key={filter.key}
              className={[
                "shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold transition",
                selected ? "bg-primary text-white" : "bg-[#eef3ef] text-slate"
              ].join(" ")}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              {filter.label} {count}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {filteredSheets.slice(0, 80).map((sheet) => {
          const relatedLabels = getRelatedSheetLabels(sheet, sheets, references);

          return (
            <article
              key={sheet.id}
              className="rounded-[20px] border border-border bg-white px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-primary">PDF p.{sheet.sourcePage}</p>
                  <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-6 text-foreground">
                    {sheet.drawingNo ?? "도면번호 검토 필요"} ·{" "}
                    {sheet.drawingTitle ?? "도면명 검토 필요"}
                  </h3>
                </div>
                <Badge tone={readinessTone[sheet.quantityReadinessStatus]}>
                  {readinessLabel[sheet.quantityReadinessStatus]}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="blue">{disciplineLabel[sheet.discipline]}</Badge>
                <Badge tone="gray">{sheetTypeLabel[sheet.sheetType]}</Badge>
                <Badge tone="gray">{sheet.floor ?? "층 정보 검토"}</Badge>
                <Badge tone="gray">{sheet.scale ?? "축척 검토"}</Badge>
                <Badge tone="gray">신뢰도 {Math.round(sheet.confidence * 100)}%</Badge>
              </div>

              <p className="mt-3 text-[12px] leading-5 text-slate">
                {sheet.quantityReadinessReason}
              </p>

              {sheet.detectedKeywords.length > 0 ? (
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate">
                  <span className="font-semibold text-foreground">감지 키워드: </span>
                  {sheet.detectedKeywords.join(", ")}
                </p>
              ) : null}

              {relatedLabels.length > 0 ? (
                <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate">
                  <span className="font-semibold text-foreground">참조 후보: </span>
                  {relatedLabels.join(" / ")}
                </p>
              ) : null}
            </article>
          );
        })}
      </div>

      <section className="mt-5">
        <SectionHeading
          title="수량 산출 로드맵"
          description="현재 분류된 도면을 기준으로 공종별 수량 산출에 필요한 도면과 부족한 데이터를 정리합니다."
        />
        <div className="grid grid-cols-1 gap-3">
          {roadmaps.map((roadmap) => (
            <article
              key={roadmap.id}
              className="rounded-[18px] border border-border bg-[#fbfdfc] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[12px] font-semibold text-primary">{roadmap.workCategory}</p>
                  <h3 className="mt-1 text-[15px] font-bold text-foreground">
                    {roadmap.targetQuantity}
                  </h3>
                </div>
                <Badge tone={readinessTone[roadmap.readiness]}>
                  {readinessLabel[roadmap.readiness]}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-[12px] leading-5 text-slate">
                <p>
                  <span className="font-semibold text-foreground">필요 도면: </span>
                  {roadmap.requiredSheets.join(", ")}
                </p>
                <p>
                  <span className="font-semibold text-foreground">감지된 도면: </span>
                  {roadmap.availableSheets.length > 0 ? roadmap.availableSheets.join(" / ") : "검토 필요"}
                </p>
                <p>
                  <span className="font-semibold text-foreground">부족한 데이터: </span>
                  {roadmap.missingData.join(", ")}
                </p>
                <p>
                  <span className="font-semibold text-foreground">다음 작업: </span>
                  {roadmap.nextAction}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </Card>
  );
}
