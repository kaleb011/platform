import {
  getRebarCandidateSourceGroup,
  isWallRebarDetailReviewRequired
} from "@/lib/estimation/rebar-quantity";
import type {
  RebarMemberType,
  RebarQuantityCandidateRecord,
  RebarReviewCompleteness,
  RebarReviewStatus
} from "@/lib/estimation/types";

export type RebarChecklistItem = {
  id: string;
  label: string;
};

export const rebarChecklistItems: Record<Exclude<RebarMemberType, "unknown">, RebarChecklistItem[]> = {
  footing: [
    { id: "footing-member", label: "구조일람표에서 기초 부재명 확인" },
    { id: "footing-size", label: "기초 폭/길이/두께 확인" },
    { id: "footing-rebar", label: "X/Y 방향 철근 규격 및 간격 확인" },
    { id: "footing-plan", label: "구조평면도에서 위치 및 반복 개수 확인" },
    { id: "footing-general", label: "피복, 정착, 이음, 갈고리 조건 확인" },
    { id: "footing-weight", label: "산출식과 정미중량 확인" }
  ],
  beam: [
    { id: "beam-member", label: "구조일람표에서 보 부재명 확인" },
    { id: "beam-section", label: "보 폭/춤 확인" },
    { id: "beam-rebar", label: "상부근/하부근/늑근 구분 확인" },
    { id: "beam-plan", label: "구조평면도에서 보 길이 및 반복 개수 확인" },
    { id: "beam-general", label: "피복, 정착, 이음, 갈고리 조건 확인" },
    { id: "beam-weight", label: "산출식과 정미중량 확인" }
  ],
  column: [
    { id: "column-member", label: "구조일람표에서 기둥 부재명 확인" },
    { id: "column-section", label: "기둥 폭/춤 확인" },
    { id: "column-rebar", label: "주근/띠철근 구분 확인" },
    { id: "column-height", label: "단면도 또는 구조평면도에서 기둥 높이 확인" },
    { id: "column-general", label: "이음 위치, 정착, 띠철근 보강구간 확인" },
    { id: "column-weight", label: "산출식과 정미중량 확인" }
  ],
  slab: [
    { id: "slab-member", label: "구조일람표에서 슬래브 부재명 및 두께 확인" },
    { id: "slab-rebar", label: "X/Y 방향 및 상부/하부근 구분 확인" },
    { id: "slab-plan", label: "구조평면도에서 슬래브 길이/폭 확인" },
    { id: "slab-general", label: "피복, 정착, 이음 조건 확인" },
    { id: "slab-weight", label: "산출식과 정미중량 확인" }
  ],
  wall: [
    { id: "wall-member", label: "구조평면도에서 벽체 부재명과 두께 확인" },
    { id: "wall-size", label: "벽 길이/높이 확인" },
    { id: "wall-rebar", label: "수직근/수평근 배근 상세 확인" },
    { id: "wall-face", label: "면수 확인" },
    { id: "wall-general", label: "피복, 정착, 이음 조건 확인" },
    { id: "wall-detail", label: "배근 상세가 불명확하면 배근 상세 확인 필요 유지" }
  ]
};

export function getRebarChecklistItems(
  memberType: RebarMemberType,
  candidate?: RebarQuantityCandidateRecord
) {
  if (memberType === "unknown") return [];

  const items = rebarChecklistItems[memberType];

  if (
    memberType !== "beam" ||
    candidate?.position !== "stirrup" ||
    candidate.beamStirrupCalculationMode !== "segmented_spacing"
  ) {
    return items;
  }

  return [
    ...items,
    { id: "beam-stirrup-end-length", label: "보 스터럽 단부 구간 길이 확인" },
    { id: "beam-stirrup-center-length", label: "보 스터럽 중앙부 길이 확인" },
    { id: "beam-stirrup-end-spacing", label: "단부 간격 확인" },
    { id: "beam-stirrup-center-spacing", label: "중앙부 간격 확인" },
    { id: "beam-stirrup-boundary-count", label: "경계 중복 본수 검토" },
    { id: "beam-stirrup-seismic-detail", label: "내진상세 적용 여부 확인" }
  ];
}

export function getChecklistCompletion(candidate: RebarQuantityCandidateRecord) {
  const items = getRebarChecklistItems(candidate.memberType, candidate);
  const checklist = candidate.reviewChecklist ?? {};
  const completed = items.filter((item) => checklist[item.id]).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}

export function resolveReviewCompleteness(
  candidate: RebarQuantityCandidateRecord
): RebarReviewCompleteness {
  const { completed, total } = getChecklistCompletion(candidate);

  if (total === 0 || completed === 0) {
    return "not_started";
  }

  return completed === total ? "complete" : "partial";
}

export function getReviewCompletenessLabel(completeness: RebarReviewCompleteness | undefined) {
  if (completeness === "complete") return "검토 완료";
  if (completeness === "partial") return "일부 검토 미완료";
  return "검토 전";
}

export function getDefaultReviewReason(status: RebarReviewStatus) {
  if (status === "accepted") return "사용자 검토 후 승인";
  if (status === "rejected") return "부재 후보 제외";
  return "추가 도면 확인 필요";
}

export function getSourceTypeLabel(candidate: RebarQuantityCandidateRecord) {
  if (candidate.memberListSource === "manual") return "사용자 직접 추가";
  if (candidate.memberListSource === "plan_unmatched") return "구조평면도";
  if (candidate.memberListSource === "note_reference") return "일반 노트";
  if (candidate.memberListSource === "future_review") return "후속 검토 대상";
  if (candidate.memberListSource === "schedule" || candidate.memberListSource === "schedule_with_plan") {
    return "구조일람표";
  }

  const group = getRebarCandidateSourceGroup(candidate);

  if (candidate.sourceFileName == null && candidate.sourcePage == null) return "사용자 직접 추가";
  if (group === "schedule") return "구조일람표";
  if (group === "plan") return "구조평면도";
  if (/GENERAL NOTE|구조 일반사항|정착|이음|갈고리|피복|NOTE/i.test(candidate.sourceTextSnippet ?? "")) {
    return "구조 일반사항";
  }

  return "일반 노트";
}

export function getReferenceDrawingLabel(candidate: RebarQuantityCandidateRecord) {
  if (candidate.memberType === "footing") return "S-303 / S-221~S-225";
  if (candidate.memberType === "beam") return "S-302 / S-222~S-225";
  if (candidate.memberType === "column") return "S-302 / 구조평면도·단면도";
  if (candidate.memberType === "slab") return "S-301 / S-221~S-225";
  if (candidate.memberType === "wall") return "S-221 / 벽체 배근상세도·단면도";
  return "도면 확인 필요";
}

export function getDetectedRebarPatterns(candidate: RebarQuantityCandidateRecord) {
  const snippet = candidate.sourceTextSnippet ?? candidate.rawText ?? "";
  const patterns = new Set<string>();
  const regexes = [/\b\d{1,3}\s*[- ]\s*(?:HD|D)\s*-?\s*\d{2}\b/gi, /\b(?:HD|D)\s*-?\s*\d{2}\s*@\s*\d{2,4}\b/gi];

  regexes.forEach((regex) => {
    Array.from(snippet.matchAll(regex)).forEach((match) => patterns.add(match[0].replace(/\s+/g, "")));
  });

  if (candidate.barCount && candidate.diameter) patterns.add(`${candidate.barCount}-${candidate.diameter}`);
  if (candidate.diameter && candidate.spacingMm) patterns.add(`${candidate.diameter}@${candidate.spacingMm}`);

  return Array.from(patterns);
}

export function buildCandidateRowSummary(candidate: RebarQuantityCandidateRecord) {
  const snippet = (candidate.sourceTextSnippet ?? candidate.rawText ?? "").replace(/\s+/g, " ").trim();
  const memberName = candidate.memberName ?? "부재명 미확인";
  const patterns = getDetectedRebarPatterns(candidate);

  return {
    memberName,
    detectedRebar: patterns.length > 0 ? patterns.join(", ") : candidate.diameter,
    surroundingText: snippet.slice(0, 220),
    status: "표 구조 자동 복원 아님, 텍스트 근거 요약"
  };
}

export function buildRebarReviewEvidenceNote(candidate: RebarQuantityCandidateRecord) {
  const completeness = candidate.reviewCompleteness ?? resolveReviewCompleteness(candidate);
  const completion = getChecklistCompletion(candidate);
  const notes = [
    "정미중량 기준",
    `참조도면: ${getReferenceDrawingLabel(candidate)}`,
    candidate.sourcePage ? `출처페이지: PDF p.${candidate.sourcePage}` : null,
    `출처유형: ${getSourceTypeLabel(candidate)}`,
    getReviewCompletenessLabel(completeness),
    completion.total > 0 ? `체크리스트 ${completion.completed}/${completion.total}` : null,
    isWallRebarDetailReviewRequired(candidate) ? "배근 상세 확인 필요" : null,
    candidate.memberType === "wall" ? "사용자 보정값 기반" : null,
    candidate.approvedReason ?? null,
    candidate.reviewNote ? `검토메모: ${candidate.reviewNote}` : null,
    candidate.appliedGeneralRuleIds?.length
      ? `구조일반사항 적용: ${candidate.appliedGeneralRuleIds.join(", ")}`
      : null,
    candidate.generalRuleReviewRequired ? "구조일반사항 표 확인 필요" : null,
    candidate.generalRuleNotes?.length ? `구조일반사항 메모: ${candidate.generalRuleNotes.join(" / ")}` : null
  ];

  return notes.filter(Boolean).join(" / ");
}
