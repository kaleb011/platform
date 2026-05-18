import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

type DrawingPageEvidencePreviewProps = {
  fileName?: string;
  pageNumber?: number;
  drawingNo?: string;
  drawingTitle?: string;
  sourceSnippet?: string;
};

export function DrawingPageEvidencePreview({
  fileName,
  pageNumber,
  drawingNo,
  drawingTitle,
  sourceSnippet
}: DrawingPageEvidencePreviewProps) {
  return (
    <div className="rounded-[12px] border border-border bg-white px-3 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-bold text-foreground">PDF 페이지 근거 미리보기 1차</p>
          <p className="mt-1 text-[11px] leading-4 text-slate">
            {pageNumber ? `PDF p.${pageNumber}` : "PDF 페이지 미확인"}
            {drawingNo ? ` / ${drawingNo}` : ""}
            {drawingTitle ? ` ${drawingTitle}` : ""}
          </p>
        </div>
        <Button
          className="min-h-[34px] rounded-[12px] px-3 text-[11px]"
          disabled
          title="현재 MVP는 PDF 텍스트 근거를 우선 표시합니다."
          variant="secondary"
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          {pageNumber ? `PDF p.${pageNumber} 확인` : "PDF 페이지 확인"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate">
        현재 MVP는 PDF 텍스트 근거를 표시하며, 페이지 이미지 미리보기는 후속 개선 범위입니다.
        {fileName ? ` 파일: ${fileName}` : ""}
      </p>
      {sourceSnippet ? (
        <p className="mt-2 line-clamp-3 rounded-[10px] bg-[#f8fafc] px-3 py-2 text-[11px] leading-5 text-slate">
          {sourceSnippet}
        </p>
      ) : null}
    </div>
  );
}
