"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { RebarMemberType } from "@/lib/estimation/types";

type RebarReferenceItem = {
  title: string;
  detail: string;
};

const referenceGuideMap: Record<Exclude<RebarMemberType, "unknown">, RebarReferenceItem[]> = {
  footing: [
    { title: "철근 규격/간격", detail: "S-303 구조일람표-3" },
    { title: "기초 크기/두께", detail: "S-303 구조일람표-3" },
    { title: "위치/반복 개수", detail: "S-221~S-225 구조평면도" },
    { title: "정착/이음/갈고리/피복", detail: "구조 일반사항" }
  ],
  beam: [
    { title: "보 단면/상하부근/늑근", detail: "S-302 구조일람표-2" },
    { title: "보 길이/위치/반복 개수", detail: "S-222~S-225 구조평면도" },
    { title: "피복 40mm note", detail: "S-302 note 또는 구조 일반사항" },
    { title: "정착/이음/갈고리", detail: "구조 일반사항" }
  ],
  column: [
    { title: "기둥 단면/주근/띠철근", detail: "S-302 구조일람표-2" },
    { title: "위치/높이/반복 개수", detail: "구조평면도 및 단면도" },
    { title: "이음/정착/띠철근 보강구간", detail: "구조 일반사항" }
  ],
  slab: [
    { title: "두께/X-Y 방향/상하부근", detail: "S-301 구조일람표-1" },
    { title: "슬래브 영역/길이/폭", detail: "S-221~S-225 구조평면도" },
    { title: "피복/정착/이음", detail: "구조 일반사항" }
  ],
  wall: [
    { title: "벽체명/위치/두께", detail: "S-221 등 구조평면도" },
    { title: "수직근/수평근/면수", detail: "벽체 배근상세도 또는 구조 일반사항" },
    { title: "벽 높이", detail: "단면도" },
    { title: "주의", detail: "배근 상세가 불명확하면 별도 확인 필요" }
  ]
};

export function getRebarReferenceItems(memberType: RebarMemberType) {
  return memberType === "unknown" ? [] : referenceGuideMap[memberType];
}

export function RebarReferenceGuide({ memberType }: { memberType: RebarMemberType }) {
  const [expanded, setExpanded] = useState(false);
  const items = getRebarReferenceItems(memberType);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[14px] border border-border bg-[#f8fafc]">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        <span className="text-[13px] font-bold text-foreground">참조 도면 안내</span>
        <ChevronDown
          className={[
            "h-4 w-4 text-slate transition",
            expanded ? "rotate-180" : ""
          ].join(" ")}
        />
      </button>
      {expanded ? (
        <ul className="grid gap-2 border-t border-border px-4 py-3 text-[12px] leading-5 text-slate">
          {items.map((item) => (
            <li key={`${item.title}-${item.detail}`}>
              <span className="font-semibold text-foreground">{item.title}:</span> {item.detail}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
