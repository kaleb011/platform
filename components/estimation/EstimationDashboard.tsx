"use client";

import { useMemo, useState } from "react";
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
import { EstimationDataStrategyCard } from "@/components/estimation/EstimationDataStrategyCard";
import { IfcExpansionNotice } from "@/components/estimation/IfcExpansionNotice";
import { PdfTextExtractionSummary } from "@/components/estimation/PdfTextExtractionSummary";
import { ScheduleForecastDashboard } from "@/components/estimation/ScheduleForecastDashboard";
import { StandardMatchTable } from "@/components/estimation/StandardMatchTable";
import { UploadedDrawingFilesTable } from "@/components/estimation/UploadedDrawingFilesTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { exportEstimateToCsv, exportEstimateToExcel } from "@/lib/estimation/export-estimate";
import {
  createEstimationSampleData,
  createSampleProjectEstimateStates
} from "@/lib/estimation/sample-data";
import {
  buildScheduleCategorySummaries,
  createCandidatesFromPdfText,
  createDrawingFileRecordFromFile,
  deriveEstimateItems,
  extractPdfTextFromFile,
  getDrawingFileType
} from "@/lib/estimation/service";
import type {
  DrawingFileRecord,
  EstimateItemRecord,
  EstimationTabKey,
  PdfTextExtractionResult,
  ProjectEstimateState,
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
  const seed = useMemo(() => createEstimationSampleData(), []);
  const [activeTab, setActiveTab] = useState<EstimationTabKey>("drawing-estimate");
  const [projectStates, setProjectStates] = useState<ProjectEstimateState[]>(() =>
    createSampleProjectEstimateStates(seed)
  );
  const [selectedProjectId, setSelectedProjectId] = useState(seed.projectId);
  const [candidates, setCandidates] = useState(() => seed.extractionCandidates);
  const [matches, setMatches] = useState(() => seed.estimateItemMatches);
  const [pdfTextResults, setPdfTextResults] = useState<PdfTextExtractionResult[]>([]);
  const [importedSheetName, setImportedSheetName] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    "샘플 도면/적산 데이터가 있는 프로젝트와 도면 데이터가 없는 프로젝트 흐름을 함께 확인할 수 있습니다."
  );

  const selectedProject = projectStates.find((project) => project.projectId === selectedProjectId);
  const activeProject = selectedProject ?? projectStates[0];
  const drawingFiles = activeProject.drawingFiles;
  const activeDrawingFileIds = new Set(drawingFiles.map((file) => file.id));
  const activePdfTextResults = pdfTextResults.filter((result) =>
    result.pages.some((page) => activeDrawingFileIds.has(page.drawingFileId))
  );
  const drawingDataExists =
    activeProject.drawingDataStatus === "exists" || activeProject.drawingFiles.length > 0;
  const visibleCandidates = candidates.filter((candidate) => {
    if (candidate.sourceLabel === "uploaded_pdf") {
      return activeDrawingFileIds.has(candidate.drawingFileId);
    }

    return activeProject.projectId === seed.projectId;
  });

  const estimateItems: EstimateItemRecord[] = deriveEstimateItems({
    candidates: visibleCandidates,
    matches,
    standardItems: seed.standardItems
  });
  const scheduleSummaries = buildScheduleCategorySummaries(seed.scheduleForecastItems);
  const reviewNeededScheduleItems = seed.scheduleForecastItems.filter(
    (item) => item.status !== "linked"
  );

  const matchingNeededCount = visibleCandidates.filter(
    (candidate) => candidate.reviewStatus === "needs_standard_match"
  ).length;

  const convertedPageCount = drawingFiles.reduce((count, file) => {
    if (file.status === "converted" || file.status === "analyzed") {
      return count + (file.pageCount ?? 0);
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
      footnote: "프로젝트에 연결된 PDF/PNG/JPG 도면 수",
      tone: "blue"
    },
    {
      key: "converted",
      label: "변환 완료 페이지 수",
      value: `${convertedPageCount}`,
      footnote: "이번 단계의 신규 업로드는 변환 대기 상태로 유지",
      tone: "green"
    },
    {
      key: "candidates",
      label: "추출 후보 수",
      value: `${visibleCandidates.length}`,
      footnote: "sample data 후보와 업로드 PDF 후보 합산",
      tone: "blue"
    },
    {
      key: "matchingNeeded",
      label: "품셈 매칭 필요 항목 수",
      value: `${matchingNeededCount}`,
      footnote: "자동 확정되지 않은 후보 상태 표시",
      tone: "amber"
    },
    {
      key: "approved",
      label: "승인된 적산 항목 수",
      value: `${estimateItems.length}`,
      footnote: "승인 또는 수정 승인된 항목만 반영",
      tone: "green"
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
    setNotice("검토 상태가 반영되었습니다. 승인된 항목은 적산내역 테이블에 즉시 반영됩니다.");
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

    setNotice("표준품셈 검토 결과를 반영했습니다. 필요하면 품셈 매칭 필요 상태로 다시 돌릴 수 있습니다.");
  };

  const addDrawingFileToActiveProject = (record: DrawingFileRecord) => {
    setProjectStates((current) =>
      current.map((project) =>
        project.projectId === activeProject.projectId
          ? {
              ...project,
              drawingDataStatus: "exists",
              drawingFiles: [{ ...record, projectId: project.projectId }, ...project.drawingFiles]
            }
          : project
      )
    );
  };

  const updateDrawingFileInActiveProject = (
    fileId: string,
    updates: Partial<DrawingFileRecord>
  ) => {
    setProjectStates((current) =>
      current.map((project) =>
        project.projectId === activeProject.projectId
          ? {
              ...project,
              drawingFiles: project.drawingFiles.map((file) =>
                file.id === fileId ? { ...file, ...updates } : file
              )
            }
          : project
      )
    );
  };

  const handleDrawingUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const acceptedRecords: DrawingFileRecord[] = [];
    const messages: string[] = [];

    for (const file of Array.from(files)) {
      const fileType = getDrawingFileType(file);

      if (fileType === "dwg") {
        messages.push(
          "DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한 뒤 업로드해주세요."
        );
        continue;
      }

      if (fileType === "unsupported") {
        messages.push(`${file.name}: 지원하지 않는 파일 형식입니다. PDF, PNG, JPG 도면을 업로드해주세요.`);
        continue;
      }

      const record = createDrawingFileRecordFromFile(file);
      acceptedRecords.push(record);
      addDrawingFileToActiveProject(record);

      if (fileType !== "pdf") {
        continue;
      }

      setNotice(`${file.name} PDF 텍스트를 추출하는 중입니다.`);

      try {
        const result = await extractPdfTextFromFile(file);
        const resultPages =
          result.pages.length > 0
            ? result.pages
            : [
                {
                  id: `${record.id}-text-page-failed`,
                  drawingFileId: record.id,
                  pageNumber: 1,
                  text: "",
                  textLength: 0,
                  extractionStatus: "failed" as const
                }
              ];
        const linkedResult: PdfTextExtractionResult = {
          ...result,
          pages: resultPages.map((page) => ({
            ...page,
            id: `${record.id}-text-page-${page.pageNumber}`,
            drawingFileId: record.id
          }))
        };
        const pdfCandidates = createCandidatesFromPdfText(linkedResult, record.id);

        setPdfTextResults((current) => [
          linkedResult,
          ...current.filter((item) => item.pages[0]?.drawingFileId !== record.id)
        ]);
        setCandidates((current) => [
          ...pdfCandidates,
          ...current.filter((candidate) => candidate.drawingFileId !== record.id)
        ]);
        updateDrawingFileInActiveProject(record.id, {
          pageCount: linkedResult.pageCount,
          conversionStatus:
            linkedResult.status === "failed" ? "텍스트 추출 실패" : "텍스트 추출 완료",
          message: linkedResult.message,
          debugMessage: linkedResult.debugMessage
        });

        if (linkedResult.pageCount <= 0) {
          messages.push(
            `${file.name}: PDF 로딩에 실패해 페이지 수를 확인하지 못했습니다. ${linkedResult.debugMessage ?? ""}`
          );
        } else if (linkedResult.status === "failed") {
          messages.push(
            `${file.name}: ${linkedResult.pageCount}페이지를 확인했지만 텍스트 추출에 실패했습니다. 이미지 기반 분석이 필요합니다.`
          );
        } else {
          messages.push(
            `${file.name}: ${linkedResult.pageCount}페이지를 확인했고 PDF 텍스트 후보 ${pdfCandidates.length}건을 생성했습니다.`
          );
        }
      } catch {
        updateDrawingFileInActiveProject(record.id, {
          conversionStatus: "텍스트 추출 실패",
          message: "PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다."
        });
        messages.push(
          `${file.name}: PDF 텍스트 추출에 실패했습니다. 다음 단계에서 이미지 기반 분석이 필요합니다.`
        );
      }
    }

    if (acceptedRecords.length > 0) {
      const lastMessage = acceptedRecords[acceptedRecords.length - 1].message;
      messages.unshift(lastMessage ?? "도면 파일이 업로드 목록에 추가되었습니다.");
    }

    setNotice(messages.join(" "));
  };

  const handleImportSpreadsheet = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];
    setImportedSheetName(file.name);
    setNotice(
      `${file.name} 파일이 선택되었습니다. 현재 MVP에서는 파일명만 표시하고, forecast 데이터는 샘플 세트를 사용합니다.`
    );
  };

  const projectFlowMessage = drawingDataExists
    ? "저장된 도면/적산 데이터가 있습니다. 도면 추출 후보와 적산내역을 확인할 수 있습니다."
    : "이 프로젝트에는 아직 도면 데이터가 없습니다. PDF 도면을 업로드하면 적산내역 초안 생성 흐름을 시작할 수 있습니다.";

  return (
    <div className="space-y-4">
      <Card className="section-enter bg-[#f6fbf7]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-primary">적산 파트 MVP 업데이트</p>
            <h2 className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-foreground">
              프로젝트별 도면 데이터 상태와 업로드 흐름
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-slate">
              이번 단계는 실제 AI 분석이 아니라 프로젝트 선택, 도면 데이터 유무 확인, PDF/이미지 업로드
              메타데이터 반영, 이후 Supabase와 PDF/IFC 파이프라인으로 이어질 구조를 준비합니다.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>
      </Card>

      <Card className="section-enter">
        <SectionHeading
          title="프로젝트 선택"
          description="샘플 프로젝트 상태로 도면 데이터가 있는 흐름과 없는 흐름을 확인합니다."
          action={
            <Badge tone={drawingDataExists ? "green" : "amber"}>
              {drawingDataExists ? "도면 데이터 있음" : "도면 데이터 없음"}
            </Badge>
          }
        />
        <div className="flex flex-wrap gap-2">
          {projectStates.map((project) => {
            const selected = project.projectId === activeProject.projectId;

            return (
              <Button
                key={project.projectId}
                className="min-h-[42px] rounded-[16px] px-4 text-[13px]"
                onClick={() => {
                  setSelectedProjectId(project.projectId);
                  setNotice(
                    project.drawingDataStatus === "exists"
                      ? "저장된 도면/적산 데이터가 있습니다. 도면 추출 후보와 적산내역을 확인할 수 있습니다."
                      : "이 프로젝트에는 아직 도면 데이터가 없습니다. PDF 도면을 업로드하면 적산내역 초안 생성 흐름을 시작할 수 있습니다."
                  );
                }}
                type="button"
                variant={selected ? "primary" : "secondary"}
              >
                {project.projectName}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 rounded-[18px] bg-[#f8fbf9] px-4 py-3 text-[12px] leading-5 text-slate">
          {projectFlowMessage}
        </div>
      </Card>

      <Card className="section-enter">
        <SectionHeading
          title="적산 파트"
          description="두 탭 전환으로 도면 기반 적산과 예상공정 대시보드를 확인합니다."
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
            drawingDataExists={drawingDataExists}
            notice={notice}
            onSelectFiles={handleDrawingUpload}
          />
          <UploadedDrawingFilesTable drawingFiles={drawingFiles} />
          <PdfTextExtractionSummary results={activePdfTextResults} />

          {drawingDataExists ? (
            <>
              <DrawingExtractionTable
                candidates={visibleCandidates}
                onChangeStatus={handleCandidateStatusChange}
              />
              <StandardMatchTable
                candidates={visibleCandidates}
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
          ) : null}

          <EstimationDataStrategyCard />
          <IfcExpansionNotice />
        </>
      ) : (
        <>
          <ScheduleForecastDashboard
            categorySummaries={scheduleSummaries}
            estimateItems={estimateItems}
            importedSheetName={importedSheetName}
            onImportSpreadsheet={handleImportSpreadsheet}
            reviewNeededItems={reviewNeededScheduleItems}
            scheduleItems={seed.scheduleForecastItems}
          />
          <IfcExpansionNotice />
        </>
      )}
    </div>
  );
}
