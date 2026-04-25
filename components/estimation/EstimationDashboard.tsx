"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  FileSearch,
  Layers3,
  LoaderCircle,
  Sparkles
} from "lucide-react";

import { DrawingExtractionTable } from "@/components/estimation/DrawingExtractionTable";
import { DrawingUploadPanel } from "@/components/estimation/DrawingUploadPanel";
import { EstimateItemsTable } from "@/components/estimation/EstimateItemsTable";
import { ScheduleForecastDashboard } from "@/components/estimation/ScheduleForecastDashboard";
import { StandardMatchTable } from "@/components/estimation/StandardMatchTable";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { exportEstimateToCsv, exportEstimateToExcel } from "@/lib/estimation/export-estimate";
import { createEstimationSampleData } from "@/lib/estimation/sample-data";
import {
  buildScheduleCategorySummaries,
  createLocalDrawingUpload,
  deriveEstimateItems
} from "@/lib/estimation/service";
import type {
  DrawingFileRecord,
  EstimationTabKey,
  ReviewStatus
} from "@/lib/estimation/types";

const tabOptions = [
  { value: "drawing-estimate", label: "도면 기반 적산내역 생성" },
  { value: "schedule-forecast", label: "적산내역 기반 예상공정 대시보드" }
] as const;

const summaryIcons = {
  uploaded: Layers3,
  converted: LoaderCircle,
  candidates: FileSearch,
  approved: CheckCircle2,
  matchingNeeded: BarChart3
} as const;

type SummaryCardKey = keyof typeof summaryIcons;

export function EstimationDashboard() {
  const seed = createEstimationSampleData();
  const [activeTab, setActiveTab] = useState<EstimationTabKey>("drawing-estimate");
  const [drawingFiles, setDrawingFiles] = useState(() => seed.drawingFiles);
  const [candidates, setCandidates] = useState(() => seed.extractionCandidates);
  const [matches, setMatches] = useState(() => seed.estimateItemMatches);
  const [importedSheetName, setImportedSheetName] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    "샘플 도면/품셈 데이터로 검수 흐름을 먼저 검증할 수 있습니다."
  );
  const timeoutRefs = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const estimateItems = deriveEstimateItems({
    candidates,
    matches,
    standardItems: seed.standardItems
  });
  const scheduleSummaries = buildScheduleCategorySummaries(seed.scheduleForecastItems);
  const reviewNeededScheduleItems = seed.scheduleForecastItems.filter(
    (item) => item.status !== "linked"
  );

  const matchingNeededCount = candidates.filter(
    (candidate) => candidate.reviewStatus === "needs_standard_match"
  ).length;

  const convertedPageCount = drawingFiles.reduce((count, file) => {
    if (file.status === "converted" || file.status === "analyzed") {
      return count + file.pageCount;
    }

    return count;
  }, 0);

  const summaryCards: Array<{
    key: SummaryCardKey;
    label: string;
    value: string;
    footnote: string;
    tone: "blue" | "green" | "amber";
  }> = [
    {
      key: "uploaded",
      label: "업로드 도면 수",
      value: `${drawingFiles.length}`,
      footnote: "PDF/PNG 업로드 + DWG 안내 포함",
      tone: "blue" as const
    },
    {
      key: "converted",
      label: "변환 완료 페이지 수",
      value: `${convertedPageCount}`,
      footnote: "페이지별 PNG 구조를 위한 상태 관리",
      tone: "green" as const
    },
    {
      key: "candidates",
      label: "추출 후보 수",
      value: `${candidates.length}`,
      footnote: "도면 분석 후보값은 모두 검수 대상",
      tone: "blue" as const
    },
    {
      key: "matchingNeeded",
      label: "품셈 매칭 필요 항목 수",
      value: `${matchingNeededCount}`,
      footnote: "자동 확정하지 않고 후보 상태 유지",
      tone: "amber" as const
    },
    {
      key: "approved",
      label: "승인된 적산 항목 수",
      value: `${estimateItems.length}`,
      footnote: "승인 또는 수정 승인만 반영",
      tone: "green" as const
    }
  ];

  const updateRelatedMatches = (candidateId: string, reviewStatus: ReviewStatus) => {
    const relatedMatches = matches
      .filter((match) => match.drawingExtractionId === candidateId)
      .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0));

    if (relatedMatches.length === 0) {
      return;
    }

    const primaryMatchId = relatedMatches[0].id;

    setMatches((current) =>
      current.map((match) => {
        if (match.drawingExtractionId !== candidateId) {
          return match;
        }

        if (reviewStatus === "accepted" || reviewStatus === "edited") {
          return {
            ...match,
            reviewStatus: match.id === primaryMatchId ? "accepted" : "rejected"
          };
        }

        return {
          ...match,
          reviewStatus
        };
      })
    );
  };

  const handleCandidateStatusChange = (candidateId: string, reviewStatus: ReviewStatus) => {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, reviewStatus } : candidate
      )
    );
    updateRelatedMatches(candidateId, reviewStatus);
    setNotice("검수 상태가 반영되었습니다. 승인된 항목은 적산내역 테이블에 즉시 반영됩니다.");
  };

  const handleMatchStatusChange = (matchId: string, reviewStatus: ReviewStatus) => {
    const match = matches.find((item) => item.id === matchId);

    if (!match) {
      return;
    }

    setMatches((current) =>
      current.map((item) => {
        if (item.drawingExtractionId !== match.drawingExtractionId) {
          return item;
        }

        if (reviewStatus === "accepted" || reviewStatus === "edited") {
          return {
            ...item,
            reviewStatus: item.id === matchId ? "accepted" : "rejected"
          };
        }

        return item.id === matchId ? { ...item, reviewStatus } : item;
      })
    );

    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === match.drawingExtractionId
          ? {
              ...candidate,
              reviewStatus
            }
          : candidate
      )
    );

    setNotice("표준품셈 검수 결과를 반영했습니다. 필요한 경우 품셈 매칭 필요 상태로 다시 돌릴 수 있습니다.");
  };

  const updateDrawingFileStatus = (
    fileId: string,
    updater: (file: DrawingFileRecord) => DrawingFileRecord
  ) => {
    setDrawingFiles((current) => current.map((file) => (file.id === fileId ? updater(file) : file)));
  };

  const handleDrawingUpload = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    Array.from(files).forEach((file) => {
      const localUpload = createLocalDrawingUpload(file);

      if (localUpload.fileType === "dwg") {
        setNotice(
          "DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한 뒤 업로드해주세요."
        );
        return;
      }

      setDrawingFiles((current) => [localUpload, ...current]);
      setNotice(`${file.name} 업로드를 시작했습니다. 샘플 변환 상태를 순차적으로 표시합니다.`);

      timeoutRefs.current.push(
        window.setTimeout(() => {
          updateDrawingFileStatus(localUpload.id, (current) => ({
            ...current,
            status: "converting"
          }));
        }, 500)
      );

      timeoutRefs.current.push(
        window.setTimeout(() => {
          updateDrawingFileStatus(localUpload.id, (current) => ({
            ...current,
            status: "converted",
            pageCount: current.fileType === "png" ? 1 : 2
          }));
        }, 1400)
      );

      timeoutRefs.current.push(
        window.setTimeout(() => {
          updateDrawingFileStatus(localUpload.id, (current) => ({
            ...current,
            status: "analyzed",
            pageCount: current.fileType === "png" ? 1 : 2
          }));
          setNotice("업로드한 도면은 샘플 상태 흐름만 표시합니다. 실제 변환/분석 서비스는 다음 단계 TODO입니다.");
        }, 2400)
      );
    });
  };

  const handleImportSpreadsheet = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setImportedSheetName(file.name);
    setNotice(
      `${file.name} 파일을 선택했습니다. 현재 MVP에서는 파일명만 표시하고, forecast 데이터는 샘플 세트를 사용합니다.`
    );
  };

  return (
    <div className="space-y-4">
      <Card className="section-enter bg-[#f6fbf7]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-primary">적산 파트 1차 구현 범위</p>
            <h2 className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-foreground">
              도면 기반 적산 초안과 예상공정 대시보드 MVP
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-slate">
              실제 AI 분석, PDF/PNG 변환, DWG 자동 변환, 2026 표준품셈 전체 PDF 파싱은 다음 단계
              서비스로 분리하고, 이번에는 검수 가능한 UI와 sample data 흐름에 집중했습니다.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="section-enter">
        <SectionHeading
          title="적산 파트"
          description="탭 전환으로 도면 기반 적산과 예상공정 대시보드를 오갈 수 있습니다."
        />
        <SegmentedTabs options={tabOptions} value={activeTab} onChange={setActiveTab} />
      </Card>

      {activeTab === "drawing-estimate" ? (
        <>
          <section className="grid grid-cols-2 gap-3 section-enter">
            {summaryCards.map((card) => {
              const Icon = summaryIcons[card.key];

              return (
                <Card key={card.key} className="bg-[#f8fbf9]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge tone={card.tone}>{card.value}</Badge>
                  </div>
                  <p className="mt-4 text-[12px] font-medium text-slate">{card.label}</p>
                  <p className="mt-2 text-[12px] leading-5 text-slate">{card.footnote}</p>
                </Card>
              );
            })}
          </section>

          <DrawingUploadPanel
            drawingFiles={drawingFiles}
            notice={notice}
            onSelectFiles={handleDrawingUpload}
          />
          <DrawingExtractionTable
            candidates={candidates}
            onChangeStatus={handleCandidateStatusChange}
          />
          <StandardMatchTable
            candidates={candidates}
            matches={matches}
            onChangeStatus={handleMatchStatusChange}
            standardItems={seed.standardItems}
          />
          <EstimateItemsTable
            items={estimateItems}
            onExportCsv={() => exportEstimateToCsv(estimateItems)}
            onExportExcel={() => exportEstimateToExcel(estimateItems)}
          />
        </>
      ) : (
        <ScheduleForecastDashboard
          categorySummaries={scheduleSummaries}
          estimateItems={estimateItems}
          importedSheetName={importedSheetName}
          onImportSpreadsheet={handleImportSpreadsheet}
          reviewNeededItems={reviewNeededScheduleItems}
          scheduleItems={seed.scheduleForecastItems}
        />
      )}
    </div>
  );
}
