"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildRebarDetailAdjustmentPreset,
  getGeneralRuleSummary
} from "@/lib/estimation/rebar-general-rules";
import type {
  RebarDetailAdjustmentPreset,
  RebarQuantityCandidateRecord
} from "@/lib/estimation/types";

type RebarGeneralRulePanelProps = {
  candidate: RebarQuantityCandidateRecord;
  onApplyPreset: (preset: RebarDetailAdjustmentPreset) => void;
};

export function RebarGeneralRulePanel({
  candidate,
  onApplyPreset
}: RebarGeneralRulePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const { notes, preset } = getGeneralRuleSummary(candidate);
  const preview = [
    `피복 ${preset.coverMm}mm`,
    `정착 ${preset.developmentLengthMm || "표 확인"}mm`,
    `이음 ${preset.spliceLengthMm || "표 확인"}mm`,
    `후크 ${preset.hookLengthMm || "표 확인"}mm`,
    `LOSS ${(preset.lossRate * 100).toFixed(1)}%`
  ];

  return (
    <section className="rounded-[14px] border border-[#c7d7fe] bg-[#f8fbff] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13px] font-bold text-foreground">고급 보정 참고 기준</h4>
            <Badge tone={preset.warnings.length > 0 ? "amber" : "blue"}>
              {preset.warnings.length > 0 ? "표 확인 필요" : "추천값"}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate">
            피복, 정착, 이음, 후크는 상세 보정 참고 기준입니다. 구조도면과 상충할 경우
            구조도면을 우선하고, 사용자가 검토 후 적용합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-[34px] rounded-[12px] px-3 text-[12px]"
            onClick={() => onApplyPreset(buildRebarDetailAdjustmentPreset(candidate))}
            type="button"
            variant="secondary"
          >
            구조일반사항 추천값 적용
          </Button>
          <Button
            aria-expanded={expanded}
            className="min-h-[34px] rounded-[12px] px-3 text-[12px]"
            onClick={() => setExpanded((current) => !current)}
            type="button"
            variant="ghost"
          >
            {expanded ? "간략히" : "기준 보기"}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {preview.map((item) => (
          <Badge key={item} tone="gray">
            {item}
          </Badge>
        ))}
      </div>

      {preset.warnings.length > 0 ? (
        <div className="mt-3 grid gap-1.5 rounded-[12px] bg-[#fff8ea] px-3 py-2 text-[11px] leading-5 text-[#7a4a05]">
          {preset.warnings.slice(0, 4).map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-3 grid gap-2 text-[11px] leading-5 text-slate">
          {notes.map((note) => (
            <p className="rounded-[10px] bg-white px-3 py-2" key={note}>
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
