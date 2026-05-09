"use client";

import { FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { PdfTextExtractionResult } from "@/lib/estimation/types";

type PdfTextExtractionSummaryProps = {
  results: PdfTextExtractionResult[];
};

function getPreview(text: string): string {
  if (text.length <= 500) {
    return text;
  }

  return `${text.slice(0, 500)}...`;
}

export function PdfTextExtractionSummary({ results }: PdfTextExtractionSummaryProps) {
  const pages = results.flatMap((result) => result.pages);
  const successCount = pages.filter((page) => page.extractionStatus === "success").length;
  const emptyCount = pages.filter((page) => page.extractionStatus === "empty").length;
  const failedCount = pages.filter((page) => page.extractionStatus === "failed").length;
  const pageCount = results.reduce((count, result) => count + result.pageCount, 0);

  return (
    <Card className="section-enter">
      <SectionHeading
        title="PDF 텍스트 추출 상태"
        description="PDF에서 읽힌 텍스트 일부만 요약해 보여줍니다. 이미지 기반 OCR은 다음 단계 대상입니다."
        action={<Badge tone={results.length > 0 ? "green" : "gray"}>{results.length}개 PDF</Badge>}
      />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <p className="text-[12px] font-semibold text-slate">전체 페이지</p>
          <p className="mt-2 text-[22px] font-bold text-foreground">{pageCount}</p>
        </div>
        <div className="rounded-[18px] bg-[#f8fbf9] p-4">
          <p className="text-[12px] font-semibold text-slate">추출 성공</p>
          <p className="mt-2 text-[22px] font-bold text-foreground">{successCount}</p>
        </div>
        <div className="rounded-[18px] bg-[#fff8ea] p-4">
          <p className="text-[12px] font-semibold text-[#7a4a05]">텍스트 없음</p>
          <p className="mt-2 text-[22px] font-bold text-[#7a4a05]">{emptyCount}</p>
        </div>
        <div className="rounded-[18px] bg-[#feeceb] p-4">
          <p className="text-[12px] font-semibold text-[#b42318]">추출 실패</p>
          <p className="mt-2 text-[22px] font-bold text-[#b42318]">{failedCount}</p>
        </div>
      </section>

      {results.length === 0 ? (
        <div className="mt-3 rounded-[18px] border border-dashed border-border bg-[#f8fbf9] px-4 py-6 text-center text-[13px] text-slate">
          PDF를 업로드하면 페이지 수와 텍스트 추출 요약이 이 영역에 표시됩니다.
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {results.map((result) => (
            <details
              key={`${result.fileName}-${result.pages[0]?.drawingFileId ?? result.pageCount}`}
              className="rounded-[18px] border border-border bg-white px-4 py-3"
              open={result.status !== "success"}
            >
              <summary className="cursor-pointer text-[13px] font-semibold text-foreground">
                {result.fileName} · {result.pageCount} page ·{" "}
                {result.status === "failed"
                  ? "일부 페이지에서 텍스트를 읽지 못했습니다."
                  : `${result.pageCount}페이지 중 ${
                      result.pages.filter((page) => page.extractionStatus === "success").length
                    }페이지에서 텍스트를 읽었습니다.`}
              </summary>
              {result.pages.some((page) => page.extractionStatus === "failed") ? (
                <p className="mt-3 rounded-[14px] bg-[#fff8ea] px-3 py-2 text-[12px] leading-5 text-[#7a4a05]">
                  일부 페이지에서 텍스트를 읽지 못했습니다. 이미지 기반 분석이 필요할 수 있습니다.
                </p>
              ) : (
                <p className="mt-3 rounded-[14px] bg-[#f8fbf9] px-3 py-2 text-[12px] leading-5 text-slate">
                  PDF 텍스트가 추출되었습니다.
                </p>
              )}
              {result.debugMessage ? (
                <details className="mt-3 rounded-[14px] bg-[#fff8ea] px-3 py-2 text-[11px] leading-5 text-[#7a4a05]">
                  <summary className="cursor-pointer font-semibold">
                    {result.pages.some((page) => page.extractionStatus === "failed")
                      ? "상세 오류 보기"
                      : "상세 로그 보기"}
                  </summary>
                  <p className="mt-1 break-words">처리 로그: {result.debugMessage}</p>
                </details>
              ) : null}
              <div className="mt-3 space-y-2">
                {result.pages.map((page) => (
                  <div key={page.id} className="rounded-[14px] bg-[#f8fbf9] px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[12px] font-semibold text-slate">
                        <FileText className="h-4 w-4 text-primary" />
                        Page {page.pageNumber}
                      </div>
                      <Badge tone={page.extractionStatus === "success" ? "green" : "amber"}>
                        {page.extractionStatus === "success"
                          ? `${page.textLength}자`
                          : page.extractionStatus === "empty"
                            ? "텍스트 없음"
                            : "실패"}
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-slate">
                      {page.text ? getPreview(page.text) : "추출된 텍스트가 없습니다."}
                    </p>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
