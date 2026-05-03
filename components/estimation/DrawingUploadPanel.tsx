"use client";

import { FileArchive, FileImage, FileUp, FileWarning } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

type DrawingUploadPanelProps = {
  drawingDataExists: boolean;
  notice: string | null;
  onSelectFiles: (files: FileList | null) => void;
};

export function DrawingUploadPanel({
  drawingDataExists,
  notice,
  onSelectFiles
}: DrawingUploadPanelProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="PDF 도면 업로드"
        description={
          drawingDataExists
            ? "저장된 도면 데이터에 새 PDF/이미지 도면을 추가할 수 있습니다."
            : "도면 데이터가 없는 프로젝트입니다. PDF 도면을 업로드해 적산내역 초안 생성 흐름을 시작하세요."
        }
        action={<Badge tone="blue">LOCAL MVP</Badge>}
      />

      <div className="rounded-[22px] border border-dashed border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-primary">
            <FileUp className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              도면 선택 -> 파일 메타데이터 생성 -> 업로드 목록 반영
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate">
              이번 단계에서는 실제 PDF 분석이나 PNG 변환 없이 파일명, 형식, 크기, 업로드 시간,
              처리 상태를 UI 상태에 반영합니다.
            </p>
            <label className="mt-3 inline-flex cursor-pointer">
              <input
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                className="hidden"
                multiple
                onChange={(event) => {
                  onSelectFiles(event.target.files);
                  event.target.value = "";
                }}
                type="file"
              />
              <span className="inline-flex min-h-[48px] items-center justify-center rounded-[18px] bg-primary px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(3,199,90,0.24)]">
                PDF/PNG/JPG/DWG 선택
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
          <p className="mt-2 text-[13px] font-semibold text-foreground">PDF 원본, PNG/JPG 도면 이미지</p>
        </div>
        <div className="rounded-[20px] bg-[#f8fbf9] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
            <FileImage className="h-4 w-4 text-primary" />
            이번 단계 상태
          </div>
          <p className="mt-2 text-[13px] font-semibold text-foreground">
            PDF는 PNG 변환 대기, 이미지는 분석 대기로 표시
          </p>
        </div>
        <div className="rounded-[20px] bg-[#fff8ea] p-4">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#7a4a05]">
            <FileWarning className="h-4 w-4" />
            DWG 안내
          </div>
          <p className="mt-2 text-[13px] font-semibold leading-5 text-[#7a4a05]">
            DWG 파일은 현재 자동 변환을 지원하지 않습니다. AutoCAD에서 도면별 PDF로 변환한 뒤
            업로드해주세요.
          </p>
        </div>
      </div>

      {notice ? (
        <div className="mt-4 rounded-[18px] border border-[#dbe7df] bg-white px-4 py-3 text-[12px] leading-5 text-slate">
          {notice}
        </div>
      ) : null}
    </Card>
  );
}
