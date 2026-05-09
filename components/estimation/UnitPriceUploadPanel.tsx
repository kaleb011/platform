"use client";

import { FileSpreadsheet, Upload } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

type UnitPriceUploadPanelProps = {
  fileName: string | null;
  itemCount: number;
  onSelectFile: (files: FileList | null) => void;
  parseStatus: "idle" | "parsing" | "success" | "failed";
  errorMessage?: string | null;
};

const statusLabel = {
  idle: "업로드 대기",
  parsing: "파싱 중",
  success: "파싱 완료",
  failed: "파싱 실패"
} as const;

const statusTone = {
  idle: "gray",
  parsing: "amber",
  success: "green",
  failed: "red"
} as const;

export function UnitPriceUploadPanel({
  fileName,
  itemCount,
  onSelectFile,
  parseStatus,
  errorMessage
}: UnitPriceUploadPanelProps) {
  return (
    <Card className="section-enter">
      <SectionHeading
        title="참고용 건축공사 표준일위대가 업로드"
        description="2026년 건축공사 표준일위대가 Excel 파일을 참고용 단가자료로 읽습니다. 최종 금액은 사용자가 입력한 공사단가를 우선 사용합니다."
        action={<Badge tone={statusTone[parseStatus]}>{statusLabel[parseStatus]}</Badge>}
      />

      <label className="block">
        <input
          accept=".xlsx,.xls"
          className="sr-only"
          onChange={(event) => onSelectFile(event.target.files)}
          type="file"
        />
        <span className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-[14px] bg-primary px-4 text-[13px] font-semibold text-white">
          <Upload className="mr-2 h-4 w-4" />
          일위대가 Excel 선택
        </span>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">파일명</p>
          <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-foreground">
            {fileName ?? "선택된 파일 없음"}
          </p>
        </div>
        <div className="rounded-[16px] bg-[#f8fbf9] px-3 py-3">
          <p className="text-[11px] font-medium text-slate">파싱된 항목</p>
          <p className="mt-1 text-[18px] font-bold text-foreground">{itemCount}</p>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-[16px] bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700">
          {errorMessage}
        </p>
      ) : (
        <p className="mt-3 rounded-[16px] bg-[#f8fbf9] px-4 py-3 text-[12px] leading-5 text-slate">
          현재 단계에서는 일위대가 시트만 로컬 상태로 읽습니다. 일위대가상세 시트와 DB 저장은 후속 단계에서 연결합니다.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-[12px] text-slate">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span>사용 시트: 일위대가 / 데이터 시작: 4행</span>
      </div>
    </Card>
  );
}
