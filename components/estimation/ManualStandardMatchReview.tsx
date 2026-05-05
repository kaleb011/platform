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

const HOLD_OPTION_ID = "__hold_manual_match__";

type Recommendation = {
  reason: string;
  type: "hold" | "option";
  option?: ManualStandardMatchOption;
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

function getCandidateSearchText(candidate: DrawingExtractionCandidateRecord | undefined) {
  if (!candidate) {
    return "";
  }

  return [
    candidate.normalizedValue,
    candidate.extractedText,
    candidate.sourceTextSnippet,
    candidate.sourceNote,
    candidate.drawingTitle
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function getPreferredOptionIds(candidate: DrawingExtractionCandidateRecord | undefined) {
  const source = getCandidateSearchText(candidate);

  if (
    (includesAny(source, ["thk"]) &&
      !includesAny(source, ["경질우레탄", "글라스울", "단열재", "패널"])) ||
    (includesAny(source, ["콘크리트"]) &&
      includesAny(source, ["d900", "d300", "d200"]) &&
      !includesAny(source, ["철근콘크리트", "슬라브", "기둥", "콘크리트 보"]))
  ) {
    return [HOLD_OPTION_ID];
  }

  if (includesAny(source, ["thk", "경질우레탄", "글라스울", "단열재", "패널"])) {
    return ["manual-insulation"];
  }

  if (includesAny(source, ["아스콘", "포장", "보도블럭", "경계석"])) {
    return ["manual-ascon", "manual-block", "manual-curb"];
  }

  if (includesAny(source, ["우수관", "오수관", "pvc이중벽관", "빗물받이", "맨홀"])) {
    return [
      "manual-rain-pipe",
      "manual-sewer-pipe",
      "manual-pvc-pipe",
      "manual-catch-basin",
      "manual-manhole"
    ];
  }

  if (includesAny(source, ["석고보드", "벽체"])) {
    return ["manual-gypsum-wall"];
  }

  if (includesAny(source, ["방화문", "문", "창호"])) {
    return ["manual-fire-door"];
  }

  return [];
}

function getRecommendationReason(candidate: DrawingExtractionCandidateRecord | undefined) {
  const source = getCandidateSearchText(candidate);

  if (
    (includesAny(source, ["thk"]) &&
      !includesAny(source, ["경질우레탄", "글라스울", "단열재", "패널"])) ||
    (includesAny(source, ["콘크리트"]) &&
      includesAny(source, ["d900", "d300", "d200"]) &&
      !includesAny(source, ["철근콘크리트", "슬라브", "기둥", "콘크리트 보"]))
  ) {
    return "후보명이 규격 조각 중심이라 자동 확정이 어렵습니다.";
  }

  if (includesAny(source, ["thk", "경질우레탄", "글라스울", "단열재", "패널"])) {
    return "THK / 단열재 키워드 감지";
  }

  if (includesAny(source, ["아스콘", "포장", "보도블럭", "경계석"])) {
    return "포장 관련 키워드 감지";
  }

  if (includesAny(source, ["우수관", "오수관", "pvc이중벽관", "빗물받이", "맨홀"])) {
    return "배수관·맨홀 키워드 감지";
  }

  if (includesAny(source, ["석고보드", "벽체"])) {
    return "석고보드 / 벽체 키워드 감지";
  }

  if (includesAny(source, ["방화문", "문", "창호"])) {
    return "창호·문 키워드 감지";
  }

  return "자동 규칙으로 확정하기 어려워 수동 선택이 필요합니다.";
}

function getSortedOptions(
  candidate: DrawingExtractionCandidateRecord | undefined,
  options: ManualStandardMatchOption[]
) {
  const preferredIds = getPreferredOptionIds(candidate);

  if (preferredIds.length === 0) {
    return options;
  }

  return [...options].sort((left, right) => {
    const leftIndex = preferredIds.indexOf(left.id);
    const rightIndex = preferredIds.indexOf(right.id);
    const leftRank = leftIndex >= 0 ? leftIndex : Number.MAX_SAFE_INTEGER;
    const rightRank = rightIndex >= 0 ? rightIndex : Number.MAX_SAFE_INTEGER;

    return leftRank - rightRank;
  });
}

function getRecommendation(
  candidate: DrawingExtractionCandidateRecord | undefined,
  sortedOptions: ManualStandardMatchOption[]
): Recommendation {
  const preferredIds = getPreferredOptionIds(candidate);

  if (preferredIds[0] === HOLD_OPTION_ID) {
    return {
      reason: getRecommendationReason(candidate),
      type: "hold"
    };
  }

  return {
    option: sortedOptions[0],
    reason: getRecommendationReason(candidate),
    type: "option"
  };
}

export function ManualStandardMatchReview({
  candidates,
  matches,
  options,
  onApproveManualMatch,
  onChangeStatus
}: ManualStandardMatchReviewProps) {
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
          const sortedOptions = getSortedOptions(candidate, options);
          const preferredIds = getPreferredOptionIds(candidate);
          const shouldSuggestHold = preferredIds[0] === HOLD_OPTION_ID;
          const recommendation = getRecommendation(candidate, sortedOptions);
          const selectedOptionId = selectedOptions[match.id] ?? "";
          const selectedOption = sortedOptions.find((option) => option.id === selectedOptionId);
          const canApprove = Boolean(
            selectedOptionId && selectedOptionId !== HOLD_OPTION_ID && selectedOption
          );

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

              <div className="mt-3 rounded-[16px] bg-[#fff8e6] px-3 py-3 text-[12px] leading-5">
                <p className="font-semibold text-foreground">
                  추천 후보:{" "}
                  {recommendation.type === "hold"
                    ? "품셈 매칭 보류"
                    : recommendation.option?.label ?? "직접 선택 필요"}
                </p>
                <p className="mt-1 text-slate">추천 사유: {recommendation.reason}</p>
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

              <label
                className="mt-4 block text-[12px] font-medium text-slate"
                htmlFor={`manual-${match.id}`}
              >
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
                <option value="">표준품셈 항목 선택</option>
                {shouldSuggestHold ? (
                  <option value={HOLD_OPTION_ID}>품셈 매칭 보류</option>
                ) : null}
                {sortedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.workCategory}
                  </option>
                ))}
              </select>

              {selectedOption ? (
                <p className="mt-2 text-[12px] leading-5 text-slate">
                  {selectedOption.standardItemName} / {selectedOption.workCategory} / {selectedOption.unit}
                </p>
              ) : selectedOptionId === HOLD_OPTION_ID ? (
                <p className="mt-2 text-[12px] leading-5 text-slate">
                  이 항목은 자동 확정하지 않고 보류합니다. 필요하면 아래 보류 버튼을 사용하세요.
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  className="min-h-[38px] rounded-[14px] px-3 text-[12px]"
                  disabled={!canApprove}
                  onClick={() => {
                    if (!canApprove) {
                      return;
                    }

                    onApproveManualMatch(match.id, selectedOptionId);
                  }}
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
