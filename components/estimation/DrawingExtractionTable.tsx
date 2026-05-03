"use client";

import { Check, Pencil, SearchX, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { DrawingExtractionCandidateRecord, ReviewStatus } from "@/lib/estimation/types";

type DrawingExtractionTableProps = {
  candidates: DrawingExtractionCandidateRecord[];
  onChangeStatus: (candidateId: string, reviewStatus: ReviewStatus) => void;
};

const toneMap = {
  pending: "gray",
  accepted: "green",
  rejected: "red",
  edited: "blue",
  needs_standard_match: "amber"
} as const;

const labelMap = {
  pending: "대기",
  accepted: "승인",
  rejected: "제외",
  edited: "수정 승인",
  needs_standard_match: "품셈 매칭 필요"
} as const;

export function DrawingExtractionTable({
  candidates,
  onChangeStatus
}: DrawingExtractionTableProps) {
  const uploadedPdfCount = candidates.filter(
    (candidate) => candidate.sourceLabel === "uploaded_pdf"
  ).length;

  return (
    <Card className="section-enter">
      <SectionHeading
        title="도면 분석 결과 후보"
        description="샘플 후보와 업로드 PDF 텍스트 기반 후보를 함께 표시합니다."
        action={<Badge tone="blue">PDF 후보 {uploadedPdfCount}건</Badge>}
      />

      <div className="overflow-x-auto">
        <table className="min-w-[980px] text-left">
          <thead>
            <tr className="border-b border-border text-[12px] text-slate">
              <th className="px-2 py-3 font-medium">도면</th>
              <th className="px-2 py-3 font-medium">추출유형</th>
              <th className="px-2 py-3 font-medium">후보값</th>
              <th className="px-2 py-3 font-medium">정규화</th>
              <th className="px-2 py-3 font-medium">수량</th>
              <th className="px-2 py-3 font-medium">신뢰도</th>
              <th className="px-2 py-3 font-medium">상태</th>
              <th className="px-2 py-3 font-medium">검수</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className="border-b border-border/70 align-top">
                <td className="px-2 py-4">
                  <p className="text-[13px] font-semibold text-foreground">
                    {candidate.drawingNo}
                  </p>
                  <p className="mt-1 text-[12px] text-slate">{candidate.drawingTitle}</p>
                  <Badge
                    className="mt-2"
                    tone={candidate.sourceLabel === "uploaded_pdf" ? "green" : "gray"}
                  >
                    {candidate.sourceLabel === "uploaded_pdf" ? "uploaded_pdf" : "sample"}
                  </Badge>
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {candidate.extractedType}
                </td>
                <td className="px-2 py-4">
                  <p className="text-[13px] font-semibold text-foreground">
                    {candidate.extractedText}
                  </p>
                  <p className="mt-1 text-[12px] text-slate">{candidate.sourceNote}</p>
                  {candidate.sourceTextSnippet ? (
                    <p className="mt-1 text-[11px] leading-4 text-slate">
                      {candidate.sourceTextSnippet}
                    </p>
                  ) : null}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {candidate.normalizedValue ?? "-"}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {candidate.quantity ?? "-"} {candidate.unit ?? ""}
                </td>
                <td className="px-2 py-4 text-[13px] text-foreground">
                  {candidate.confidence ? `${Math.round(candidate.confidence * 100)}%` : "-"}
                </td>
                <td className="px-2 py-4">
                  <Badge tone={toneMap[candidate.reviewStatus]}>
                    {labelMap[candidate.reviewStatus]}
                  </Badge>
                </td>
                <td className="px-2 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                      onClick={() => onChangeStatus(candidate.id, "accepted")}
                      variant="secondary"
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      승인
                    </Button>
                    <Button
                      className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                      onClick={() => onChangeStatus(candidate.id, "edited")}
                      variant="ghost"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      수정
                    </Button>
                    <Button
                      className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                      onClick={() => onChangeStatus(candidate.id, "rejected")}
                      variant="ghost"
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      제외
                    </Button>
                    <Button
                      className="min-h-[36px] rounded-[14px] px-3 text-[12px]"
                      onClick={() => onChangeStatus(candidate.id, "needs_standard_match")}
                      variant="ghost"
                    >
                      <SearchX className="mr-1 h-3.5 w-3.5" />
                      품셈 매칭 필요
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
