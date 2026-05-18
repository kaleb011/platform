"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { DrawingPageEvidencePreview } from "@/components/estimation/DrawingPageEvidencePreview";
import { Badge } from "@/components/ui/badge";
import {
  buildCandidateRowSummary,
  getDetectedRebarPatterns,
  getReferenceDrawingLabel,
  getSourceTypeLabel
} from "@/lib/estimation/rebar-evidence";
import { getRebarCandidateSourceGroup } from "@/lib/estimation/rebar-quantity";
import type { DrawingSheetIndexRecord, RebarQuantityCandidateRecord } from "@/lib/estimation/types";

type RebarSourceEvidencePanelProps = {
  candidate: RebarQuantityCandidateRecord;
  drawingSheets: DrawingSheetIndexRecord[];
};

function sourceGroupLabel(candidate: RebarQuantityCandidateRecord) {
  const group = getRebarCandidateSourceGroup(candidate);
  if (group === "schedule") return "구조일람표 기반";
  if (group === "plan") return "구조평면도 기반";
  return "일반 노트 기반";
}

export function RebarSourceEvidencePanel({
  candidate,
  drawingSheets
}: RebarSourceEvidencePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const sourceSheet = drawingSheets.find(
    (sheet) =>
      sheet.sourcePage === candidate.sourcePage &&
      (!candidate.sourceFileName || sheet.sourceFileName === candidate.sourceFileName)
  );
  const patterns = getDetectedRebarPatterns(candidate);
  const rowSummary = buildCandidateRowSummary(candidate);

  return (
    <section className="rounded-[14px] border border-border bg-[#f8fafc]">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="text-[13px] font-bold text-foreground">근거 페이지 확인</span>
        <ChevronDown
          className={["h-4 w-4 text-slate transition", expanded ? "rotate-180" : ""].join(" ")}
        />
      </button>
      {expanded ? (
        <div className="grid gap-3 border-t border-border px-4 py-4">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[10px] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate">출처 페이지</p>
              <p className="mt-1 text-[12px] font-bold text-foreground">
                {candidate.sourcePage ? `PDF p.${candidate.sourcePage}` : "페이지 미확인"}
              </p>
            </div>
            <div className="rounded-[10px] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate">도면번호/도면명</p>
              <p className="mt-1 text-[12px] font-bold text-foreground">
                {sourceSheet?.drawingNo ?? candidate.drawingNo ?? "도면번호 미확인"}{" "}
                {sourceSheet?.drawingTitle ?? "도면명 미확인"}
              </p>
            </div>
            <div className="rounded-[10px] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate">출처 유형</p>
              <p className="mt-1 text-[12px] font-bold text-foreground">{getSourceTypeLabel(candidate)}</p>
            </div>
            <div className="rounded-[10px] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate">후보 분류</p>
              <p className="mt-1 text-[12px] font-bold text-foreground">{sourceGroupLabel(candidate)}</p>
            </div>
          </div>

          <DrawingPageEvidencePreview
            drawingNo={sourceSheet?.drawingNo ?? candidate.drawingNo ?? undefined}
            drawingTitle={sourceSheet?.drawingTitle ?? undefined}
            fileName={candidate.sourceFileName}
            pageNumber={candidate.sourcePage}
            sourceSnippet={candidate.sourceTextSnippet}
          />

          <div className="rounded-[12px] border border-border bg-white px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] font-bold text-foreground">후보 행 요약</p>
              <Badge tone="amber">사용자 확인 필요</Badge>
            </div>
            <div className="mt-2 grid gap-1.5 text-[12px] leading-5 text-slate">
              <p><span className="font-semibold text-foreground">부재명:</span> {rowSummary.memberName}</p>
              <p><span className="font-semibold text-foreground">감지 철근:</span> {rowSummary.detectedRebar}</p>
              <p><span className="font-semibold text-foreground">참조도면:</span> {getReferenceDrawingLabel(candidate)}</p>
              <p><span className="font-semibold text-foreground">상태:</span> {rowSummary.status}</p>
              {rowSummary.surroundingText ? (
                <p><span className="font-semibold text-foreground">주변 문장:</span> {rowSummary.surroundingText}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[12px] border border-dashed border-border bg-white px-3 py-3 text-[11px] leading-5 text-slate">
            감지된 철근 패턴: {patterns.length > 0 ? patterns.join(", ") : "명확한 철근 패턴 없음"}
          </div>
        </div>
      ) : null}
    </section>
  );
}
