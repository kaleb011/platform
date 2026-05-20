"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { DrawingFileRecord, DrawingFileStatus } from "@/lib/estimation/types";

type UploadedDrawingFilesTableProps = {
  drawingFiles: DrawingFileRecord[];
};

const statusToneMap: Record<DrawingFileStatus, "gray" | "amber" | "blue" | "green" | "red"> = {
  uploaded: "green",
  converting: "amber",
  converted: "blue",
  analyzed: "green",
  failed: "red"
};

const statusLabelMap: Record<DrawingFileStatus, string> = {
  uploaded: "업로드 완료",
  converting: "변환 중",
  converted: "변환 완료",
  analyzed: "분석 완료",
  failed: "실패"
};

function formatUploadedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getNextAction(file: DrawingFileRecord): string {
  if (file.fileType === "pdf") {
    return "PDF → PNG 변환 및 도면 이미지 분석 예정";
  }

  if (file.fileType === "png" || file.fileType === "jpg") {
    return "이미지 도면 분석 예정";
  }

  if (file.fileType === "dwg") {
    return "PDF 변환 후 재업로드 필요";
  }

  return "지원 형식 확인 필요";
}

function getUserMessage(file: DrawingFileRecord): string | null {
  if (file.fileType === "pdf" && typeof file.pageCount === "number" && file.pageCount > 0) {
    return `${file.pageCount}페이지 확인 완료. PDF 텍스트 후보를 생성했습니다. 이미지 기반 도면 요소 분석은 다음 단계에서 진행됩니다.`;
  }

  return file.message ?? null;
}

function getPageCountLabel(file: DrawingFileRecord): string {
  if (typeof file.pageCount === "number" && file.pageCount > 0) {
    return `${file.pageCount} page`;
  }

  if (file.fileType === "pdf" && file.conversionStatus === "텍스트 추출 실패") {
    return "확인 실패";
  }

  return "확인 예정";
}

function getSummary(drawingFiles: DrawingFileRecord[]) {
  const pdfCount = drawingFiles.filter((file) => file.fileType === "pdf").length;
  const analyzedCount = drawingFiles.filter((file) => file.status === "analyzed").length;
  const convertedCount = drawingFiles.filter(
    (file) => file.status === "converted" || file.status === "analyzed"
  ).length;
  const totalPages = drawingFiles.reduce(
    (sum, file) => sum + (typeof file.pageCount === "number" ? file.pageCount : 0),
    0
  );

  return { analyzedCount, convertedCount, pdfCount, totalPages };
}

export function UploadedDrawingFilesTable({ drawingFiles }: UploadedDrawingFilesTableProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const summary = useMemo(() => getSummary(drawingFiles), [drawingFiles]);
  const visibleFiles = detailOpen ? drawingFiles : drawingFiles.slice(0, 2);
  const ToggleIcon = detailOpen ? ChevronDown : ChevronRight;

  return (
    <Card className="section-enter min-w-0 overflow-hidden">
      <SectionHeading
        title="업로드된 도면 목록"
        description="업로드한 도면의 파일 정보, 페이지 확인 상태, 다음 분석 작업을 확인합니다."
        action={
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge tone="blue">{drawingFiles.length}건</Badge>
            {drawingFiles.length > 0 ? (
              <Button
                aria-expanded={detailOpen}
                className="min-h-[32px] rounded-[11px] px-2 text-[11px]"
                onClick={() => setDetailOpen((current) => !current)}
                type="button"
                variant="ghost"
              >
                <ToggleIcon className="mr-1 h-3.5 w-3.5" />
                {detailOpen ? "간략히" : "상세"}
              </Button>
            ) : null}
          </div>
        }
      />

      {drawingFiles.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-border bg-[#f8fbf9] px-4 py-6 text-center text-[13px] text-slate">
          아직 업로드된 도면이 없습니다. PDF, PNG, JPG 도면을 선택하면 이 목록에 표시됩니다.
        </div>
      ) : (
        <div className="grid min-w-0 gap-3">
          <div className="grid grid-cols-2 gap-2 text-[11px] lg:grid-cols-4">
            <div className="rounded-[14px] bg-[#f8fafc] px-3 py-2">
              <p className="font-medium text-slate">PDF</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{summary.pdfCount}</p>
            </div>
            <div className="rounded-[14px] bg-[#f8fafc] px-3 py-2">
              <p className="font-medium text-slate">페이지</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{summary.totalPages}</p>
            </div>
            <div className="rounded-[14px] bg-[#eef6ff] px-3 py-2">
              <p className="font-medium text-slate">변환/분석</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{summary.convertedCount}</p>
            </div>
            <div className="rounded-[14px] bg-[#e8f9ef] px-3 py-2">
              <p className="font-medium text-slate">분석 완료</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{summary.analyzedCount}</p>
            </div>
          </div>

          <div className="grid min-w-0 gap-2">
            {visibleFiles.map((file) => (
              <article
                className="min-w-0 rounded-[16px] border border-border bg-white px-3 py-3"
                key={file.id}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-foreground">
                      {file.fileName}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate">
                      {file.fileType.toUpperCase()} · {file.fileSizeLabel} ·{" "}
                      {formatUploadedAt(file.uploadedAt)}
                    </p>
                  </div>
                  <Badge tone={statusToneMap[file.status]}>{statusLabelMap[file.status]}</Badge>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate">
                  <div className="min-w-0 rounded-[12px] bg-[#f8fafc] px-2 py-2">
                    <p className="font-medium">변환 상태</p>
                    <p className="mt-1 break-words font-semibold text-foreground">
                      {file.conversionStatus}
                    </p>
                  </div>
                  <div className="min-w-0 rounded-[12px] bg-[#f8fafc] px-2 py-2">
                    <p className="font-medium">페이지</p>
                    <p className="mt-1 font-semibold text-foreground">{getPageCountLabel(file)}</p>
                  </div>
                </div>

                {detailOpen ? (
                  <div className="mt-3 grid gap-2 text-[11px] leading-4 text-slate">
                    {getUserMessage(file) ? (
                      <p className="rounded-[12px] bg-[#f8fbf9] px-3 py-2">
                        {getUserMessage(file)}
                      </p>
                    ) : null}
                    <p className="rounded-[12px] bg-[#f8fafc] px-3 py-2">
                      다음 작업: {getNextAction(file)}
                    </p>
                    {file.debugMessage ? (
                      <details className="rounded-[12px] bg-[#fff8ea] px-3 py-2 text-[#7a4a05]">
                        <summary className="cursor-pointer font-semibold">상세 로그 보기</summary>
                        <p className="mt-1 break-words">처리 로그: {file.debugMessage}</p>
                      </details>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          {!detailOpen && drawingFiles.length > visibleFiles.length ? (
            <p className="rounded-[14px] border border-dashed border-border bg-[#f8fafc] px-3 py-2 text-[11px] leading-4 text-slate">
              나머지 {drawingFiles.length - visibleFiles.length}건은 상세 보기에서 확인할 수 있습니다.
            </p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
