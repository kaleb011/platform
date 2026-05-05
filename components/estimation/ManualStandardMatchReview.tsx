"use client";

import { useMemo, useState } from "react";
import { Check, PauseCircle, SearchX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  DrawingExtractionCandidateRecord,
  EstimateItemMatchRecord,
  ManualStandardMatchOption,
  ReviewStatus
} from "@/lib/estimation/types";

type ManualStandardMatchReviewProps = {
  candidates: DrawingExtractionCandidateRecord[];
  matches: EstimateItemMatchRecord[];
  options: ManualStandardMatchOption[];
  onApproveManualMatch: (matchId: string, optionId: string) => void;
  onChangeStatus: (matchId: string, reviewStatus: ReviewStatus) => void;
};

function getCandidateLabel(candidate: DrawingExtractionCandidateRecord | undefined) {
  if (!candidate) {
    return "-";
  }

  return candidate.normalizedValue ?? candidate.extractedText;
}

function getSourceLabel(candidate: DrawingExtractionCandidateRecord | undefined) {
  if (!candidate) {
    return "-";
  }

  return [
    candidate.sourceFileName ? `출처파일: ${candidate.sourceFileName}` : null,
    candidate.sourcePage ? `PDF p.${candidate.sourcePage}` : null
  ]
    .filter(Boolean)
    .join(" / ");
}

export function ManualStandardMatchReview({
  candidates,
  matches,
  options,
  onApproveManualMatch,
  onChangeStatus
}: ManualStandardMatchReviewProps) {
  const defaultOptionId = options[0]?.id ?? "";
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const candidateMap = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.id, candidate])),
    [candidates]
  );

  if (matches.length === 0) {
    return (
      <Card className="section-enter bg-[#f8fbf9]">
        <SectionHeading
          title="수동 품셈 매칭 검토"
          description="자동 규칙으로 확정하기 어려운 항목이 있으면 이 영역에서 직접 표준품셈 후보를 선택합니다."
          action={<Badge tone="green">검토 대기 0</Badge>}
        />
        <p className="rounded-[16px] bg-white px-4 py-3 text-[12px] leading-5 text-slate">
          현재 수동 매칭이 필요한 항목이 없습니다.
        </p>
      </Card>
    );
  }

  return (
    <Card className="section-enter bg-[#f8fbf9]">
      <SectionHeading
        title="수동 품셈 매칭 검토"
        description="자동 규칙으로 확정하기 어려운 항목입니다. 표준품셈 후보를 직접 선택한 뒤 승인하면 적산내역에 반영됩니다."
        action={<Badge tone="amber">검토 대기 {matches.length}</Badge>}
      />

      <div className="grid grid-cols-1 gap-3">
        {matches.map((match) => {
          const candidate = candidateMap.get(match.drawingExtractionId);
          const selectedOptionId = selectedOptions[match.id] ?? defaultOptionId;
          const selectedOption = options.find((option) => option.id === selectedOptionId);

          return (
            <div key={match.id} className="rounded-[18px] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[14px] font-semibold text-foreground">
                    {getCandidateLabel(candidate)}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-slate">
                    {getSourceLabel(candidate)}
                  </p>
                </div>
                <Badge tone="amber">품셈 매칭 필요</Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-5">
                <div className="rounded-[14px] bg-[#f8fbf9] px-3 py-2">
                  <p className="font-medium text-slate">현재 공종</p>
                  <p className="mt-1 text-foreground">{match.displayWorkCategory ?? "검토 필요"}</p>
                </div>
                <div className="rounded-[14px] bg-[#f8fbf9] px-3 py-2">
                  <p className="font-medium text-slate">현재 품셈 항목</p>
                  <p className="mt-1 text-foreground">
                    {match.displayStandardItemName ?? "품셈 매칭 필요"}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#f8fbf9] px-3 py-2">
                  <p className="font-medium text-slate">수량</p>
                  <p className="mt-1 text-foreground">
                    {match.quantityReviewRequired ? "검토 필요" : candidate?.quantity ?? "-"}
                  </p>
                </div>
                <div className="rounded-[14px] bg-[#f8fbf9] px-3 py-2">
                  <p className="font-medium text-slate">단위</p>
                  <p className="mt-1 text-foreground">{match.displayUnit ?? candidate?.unit ?? "-"}</p>
                </div>
              </div>

              {candidate?.sourceTextSnippet ? (
                <p className="mt-3 line-clamp-3 rounded-[14px] bg-[#f8fbf9] px-3 py-2 text-[12px] leading-5 text-slate">
                  {candidate.sourceTextSnippet}
                </p>
              ) : null}

              <label className="mt-4 block text-[12px] font-medium text-slate" htmlFor={`manual-${match.id}`}>
                추천 표준품셈 후보
              </label>
              <select
                className="mt-2 min-h-[42px] w-full rounded-[14px] border border-border bg-white px-3 text-[13px] text-foreground outline-none"
                id={`manual-${match.id}`}
                onChange={(event) =>
                  setSelectedOptions((current) => ({
                    ...current,
                    [match.id]: event.target.value
                  }))
                }
                value={selectedOptionId}
              >
                {options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.workCategory}
                  </option>
                ))}
              </select>

              {selectedOption ? (
                <p className="mt-2 text-[12px] leading-5 text-slate">
                  {selectedOption.standardItemName} / {selectedOption.workCategory} / {selectedOption.unit}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
                  disabled={!selectedOptionId}
                  onClick={() => onApproveManualMatch(match.id, selectedOptionId)}
                  type="button"
                  variant="secondary"
                >
                  <Check className="mr-1 h-3.5 w-3.5" />
                  수동 매칭 승인
                </Button>
                <Button
                  className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
                  onClick={() => onChangeStatus(match.id, "pending")}
                  type="button"
                  variant="ghost"
                >
                  <PauseCircle className="mr-1 h-3.5 w-3.5" />
                  보류
                </Button>
                <Button
                  className="col-span-2 min-h-[38px] rounded-[14px] px-3 text-[12px]"
                  onClick={() => onChangeStatus(match.id, "rejected")}
                  type="button"
                  variant="ghost"
                >
                  <SearchX className="mr-1 h-3.5 w-3.5" />
                  제외
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
