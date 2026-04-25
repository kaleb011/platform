"use client";

import { FileArchive, FileImage, FileUp, FileWarning, ScanSearch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { DrawingFileRecord } from "@/lib/estimation/types";

type DrawingUploadPanelProps = {
  drawingFiles: DrawingFileRecord[];
  notice: string | null;
  onSelectFiles: (files: FileList | null) => void;
};

const statusToneMap = {
  uploaded: "gray",
  converting: "amber",
  converted: "blue",
  analyzed: "green",
  failed: "red"
} as const;

const statusLabelMap = {
  uploaded: "업로드됨",
  converting: "변환 중",
  converted: "변환 완료",
  analyzed: "분석 완료",
  failed: "실패"
} as const;

export function DrawingUploadPanel({
  drawingFiles,
  notice,
  onSelectFiles
}: DrawingUploadPanelProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="도면 업로드"
        description="PDF/PNG 기반 업로드와 변환 상태를 먼저 검증하는 MVP 단계입니다."
        action={<Badge tone="blue">SAMPLE + LOCAL</Badge>}
      />

      <div className="rounded-[22px] border border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-primary">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              도면 입력 → 후보 추출 → 표준품셈 매칭 → 사용자 검수
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate">
              실제 AI 판독과 PDF/PNG 변환은 다음 단계에서 연결하고, 이번에는 업로드 UI와 샘플
              워크플로를 우선 검증합니다.
            </p>
            <label className="mt-3 inline-flex cursor-pointer">
              <input
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                className="hidden"
                multiple
                onChange={(event) => onSelectFiles(event.target.files)}
                type="file"
              />
              <span className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-primary px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,0.24)]">
                PDF/PNG/DWG 선택
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <FileArchive className="h-4 w-4 text-primary" />
            권장 입력
          </div>
          <p className="mt-2 text-[13px] font-semibold text-foreground">PDF 원본, PNG 샘플 이미지</p>
        </div>
        <div className="rounded-[20px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <FileImage className="h-4 w-4 text-primary" />
            변환 정책
          </div>
          <p className="mt-2 text-[13px] font-semibold text-foreground">
            페이지별 overview/tile PNG 구조 분리
          </p>
        </div>
        <div className="rounded-[20px] bg-[#fff8ea] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#7a4a05]">
            <FileWarning className="h-4 w-4" />
            DWG 안내
          </div>
          <p className="mt-2 text-[13px] font-semibold text-[#7a4a05]">
            DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한
            뒤 업로드해주세요.
          </p>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-[18px] border border-[#dbe7df] bg-white px-4 py-3 text-[12px] leading-5 text-slate">
          {notice}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {drawingFiles.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-semibold text-foreground">{file.fileName}</p>
                <Badge tone={statusToneMap[file.status]}>{statusLabelMap[file.status]}</Badge>
              </div>
              <p className="mt-1 text-[12px] text-slate">
                {file.fileType.toUpperCase()} · {file.pageCount} page · 업로드 {file.uploadedAt.slice(0, 10)}
              </p>
            </div>
            <Button className="min-h-[38px] rounded-[14px] px-3 text-[12px]" variant="ghost">
              <ScanSearch className="mr-1 h-4 w-4" />
              상태보기
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
