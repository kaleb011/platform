"use client";

import { Badge } from "@/components/ui/badge";
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
    return "PDF -> PNG 변환 예정";
  }

  if (file.fileType === "png" || file.fileType === "jpg") {
    return "이미지 도면 분석 예정";
  }

  if (file.fileType === "dwg") {
    return "PDF 변환 후 재업로드 필요";
  }

  return "지원 형식 확인 필요";
}

function getPageCountLabel(file: DrawingFileRecord): string {
  if (typeof file.pageCount === "number" && file.pageCount > 0) {
    return `${file.pageCount} page`;
  }

  return "확인 예정";
}

export function UploadedDrawingFilesTable({ drawingFiles }: UploadedDrawingFilesTableProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="업로드된 도면 목록"
        description="이번 단계에서는 파일 메타데이터와 처리 대기 상태만 로컬 상태로 관리합니다."
        action={<Badge tone="blue">{drawingFiles.length}건</Badge>}
      />

      {drawingFiles.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-border bg-[#f8fbf9] px-4 py-6 text-center text-[13px] text-slate">
          아직 업로드된 도면이 없습니다. PDF, PNG, JPG 도면을 선택하면 이 목록에 표시됩니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] text-left">
            <thead>
              <tr className="border-b border-border text-[12px] text-slate">
                <th className="px-2 py-3 font-medium">파일명</th>
                <th className="px-2 py-3 font-medium">형식</th>
                <th className="px-2 py-3 font-medium">크기</th>
                <th className="px-2 py-3 font-medium">업로드 시간</th>
                <th className="px-2 py-3 font-medium">상태</th>
                <th className="px-2 py-3 font-medium">변환 상태</th>
                <th className="px-2 py-3 font-medium">페이지 수</th>
                <th className="px-2 py-3 font-medium">다음 작업</th>
              </tr>
            </thead>
            <tbody>
              {drawingFiles.map((file) => (
                <tr key={file.id} className="border-b border-border/70 align-top">
                  <td className="max-w-[220px] px-2 py-4 text-[13px] font-semibold text-foreground">
                    <span className="block truncate">{file.fileName}</span>
                    {file.message ? (
                      <span className="mt-1 block text-[11px] font-normal leading-4 text-slate">
                        {file.message}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-2 py-4 text-[13px] uppercase text-foreground">
                    {file.fileType}
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">{file.fileSizeLabel}</td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {formatUploadedAt(file.uploadedAt)}
                  </td>
                  <td className="px-2 py-4">
                    <Badge tone={statusToneMap[file.status]}>{statusLabelMap[file.status]}</Badge>
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {file.conversionStatus}
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">
                    {getPageCountLabel(file)}
                  </td>
                  <td className="px-2 py-4 text-[13px] text-foreground">{getNextAction(file)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
