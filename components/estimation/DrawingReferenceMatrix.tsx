import { Badge } from "@/components/ui/badge";
import type { RebarMemberType } from "@/lib/estimation/types";

const planReference: Record<RebarMemberType, string> = {
  footing: "S-221~S-225",
  beam: "S-222~S-225",
  column: "S-222~S-225 및 단면도",
  slab: "S-221~S-225",
  wall: "S-221 및 관련 평면도/단면도",
  unknown: "부재 종류 확인 필요"
};

export function DrawingReferenceMatrix({ memberType }: { memberType: RebarMemberType }) {
  return (
    <section className="rounded-[14px] border border-border bg-[#f8fafc] px-4 py-4">
      <h4 className="text-[13px] font-bold text-foreground">관련 도면 역할 구분</h4>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="rounded-[10px] bg-white px-3 py-2">
          <Badge tone="blue">구조일람표 확인값</Badge>
          <p className="mt-2 text-[12px] leading-5 text-slate">철근 규격, 철근 간격, 부재 단면, 부재명</p>
        </div>
        <div className="rounded-[10px] bg-white px-3 py-2">
          <Badge tone="blue">구조평면도 확인값</Badge>
          <p className="mt-2 text-[12px] leading-5 text-slate">
            위치, 반복 개수, 축간 치수, 부재 배치 · 추천: {planReference[memberType]}
          </p>
        </div>
        <div className="rounded-[10px] bg-white px-3 py-2">
          <Badge tone="blue">구조 일반사항 확인값</Badge>
          <p className="mt-2 text-[12px] leading-5 text-slate">피복, 정착, 이음, 갈고리, 보강구간</p>
        </div>
        <div className="rounded-[10px] bg-white px-3 py-2">
          <Badge tone="gray">사용자 판단값</Badge>
          <p className="mt-2 text-[12px] leading-5 text-slate">LOSS율, 반복 개수 보정, 직접 본수, 도면에서 불명확한 길이</p>
        </div>
      </div>
      <div className="mt-3 rounded-[10px] border border-dashed border-border bg-white px-3 py-2 text-[11px] leading-5 text-slate">
        현재 MVP는 축간 치수와 반복 개수를 자동 확정하지 않습니다. 구조평면도에서 동일 부재 배치를 확인한 뒤 사용자 보정값으로 입력합니다.
      </div>
    </section>
  );
}
