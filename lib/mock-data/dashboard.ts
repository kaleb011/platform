import type {
  DashboardHeaderInfo,
  DashboardHeroInfo,
  DashboardSummaryStat,
  MaterialPriceItem,
  ProgressItem,
  QuickActionItem,
  WorkSummaryItem,
  WorkSummaryMeta
} from "@/lib/types/dashboard";

export const dashboardHeader: DashboardHeaderInfo = {
  siteName: "북문 청년주택 리모델링 현장",
  siteMeta: "서울 성북구 · 공동주택 1개동",
  dateLabel: "2026년 4월 25일",
  weatherLabel: "흐림 18°C",
  status: "정상 운영",
  alertCount: 3
};

export const dashboardHero: DashboardHeroInfo = {
  title: "오늘의 현장 브리핑",
  headline: "철근 배근과 동측 거푸집 보강을 우선 마감하고, 오후에는 일보와 적산 검토까지 묶어서 확인합니다.",
  description:
    "오후 1시 이후 비 예보가 있어 외부 작업보다 실내 마감과 점검 흐름을 먼저 맞추는 일정으로 조정했습니다.",
  chips: ["출역 18명", "우천 대비", "검수 우선"]
};

export const dashboardSummaryStats: DashboardSummaryStat[] = [
  {
    id: "progress",
    label: "전체 공정",
    value: "62%",
    description: "주간 목표 대비 +3%",
    footnote: "구조 공정 마감 후 내장 공종 투입 예정",
    icon: "gauge",
    tone: "green"
  },
  {
    id: "workers",
    label: "오늘 작업 인원",
    value: "18명",
    description: "직영 6 / 협력 12",
    footnote: "철근 배근 구간에 5명 집중 배치",
    icon: "users",
    tone: "blue"
  },
  {
    id: "equipment",
    label: "장비 가동",
    value: "4대",
    description: "가동 4 / 대기 1",
    footnote: "크레인과 절단기 정상 상태",
    icon: "truck",
    tone: "amber"
  },
  {
    id: "reports",
    label: "미작성 작업일보",
    value: "2건",
    description: "공조팀, 설비팀",
    footnote: "오후 5시 전 입력 필요",
    icon: "clipboard",
    tone: "red"
  }
];

export const progressItems: ProgressItem[] = [
  {
    id: "foundation",
    name: "기초 정리",
    progress: 100,
    status: "완료",
    team: "토목팀 4명",
    area: "지하 기초 구간",
    note: "기초 정리와 인수 확인까지 마무리되어 다음 공정 인계 준비 완료"
  },
  {
    id: "rebar",
    name: "철근 배근",
    progress: 72,
    status: "정상",
    team: "철근팀 5명",
    area: "1층 A구역",
    note: "슬래브 배근 진행 중이며 오늘 목표 80%까지 무난한 흐름"
  },
  {
    id: "formwork",
    name: "거푸집 보강",
    progress: 58,
    status: "지연",
    team: "공조팀 4명",
    area: "동측 보강 구간",
    note: "부자재 교체와 동선 조정으로 소폭 지연, 오후 인력 보강 예정"
  },
  {
    id: "concrete",
    name: "콘크리트 타설 준비",
    progress: 36,
    status: "위험",
    team: "타설팀 5명",
    area: "1층 슬래브 예정",
    note: "우천 가능성으로 작업 순서 재검토 필요"
  }
];

export const workSummaryItems: WorkSummaryItem[] = [
  {
    id: "task-1",
    title: "1층 철근 배근",
    detail: "A구역 벽체와 슬래브 배근 진행, 오후 검측 전 마감 목표"
  },
  {
    id: "task-2",
    title: "동측 거푸집 보강",
    detail: "보강재 교체 후 수직도와 체결 상태를 재확인"
  },
  {
    id: "task-3",
    title: "콘크리트 타설 사전 준비",
    detail: "타설 시간 전까지 장비 대기와 우천 대응 계획 검토"
  }
];

export const workSummaryMeta: WorkSummaryMeta = {
  safetyStatus: "안전 장구 착용 완료",
  safetyNote: "안전모, 안전대, 절단기 방호커버를 오전 작업 전 다시 확인했습니다.",
  issueSummary: "오후 비 예보로 외부 작업 순서를 일부 조정하고 장비 대기 시점을 앞당길 필요가 있습니다."
};

export const materialPriceItems: MaterialPriceItem[] = [
  {
    id: "rebar",
    name: "철근",
    currentPrice: "98만원/ton",
    changeRate: "+2.1%",
    direction: "상승",
    note: "수도권 주요 매입처 평균가"
  },
  {
    id: "cement",
    name: "시멘트",
    currentPrice: "11.2만원/ton",
    changeRate: "0.0%",
    direction: "보합",
    note: "이번 주 계약 단가 유지"
  },
  {
    id: "ready-mix",
    name: "레미콘",
    currentPrice: "8.4만원/m3",
    changeRate: "-1.3%",
    direction: "하락",
    note: "현장 반입 기준 운송비 포함"
  }
];

export const quickActionItems: QuickActionItem[] = [
  {
    id: "go-progress",
    label: "공정 보기",
    icon: "bar-chart",
    description: "주요 공종 진행률과 지연 이슈 확인",
    hint: "상세 화면 연결 예정"
  },
  {
    id: "write-report",
    label: "작업일보 작성",
    icon: "clipboard-pen",
    description: "오늘 작업 내용과 특이사항 기록",
    hint: "입력 화면 연결 예정"
  },
  {
    id: "check-estimate",
    label: "적산 검토",
    icon: "calculator",
    description: "도면 기반 적산 후보와 승인 내역 확인",
    hint: "이번 스프린트 구현"
  },
  {
    id: "view-materials",
    label: "자재 시세 보기",
    icon: "package",
    description: "주요 자재 단가와 반입 흐름 점검",
    hint: "시세 차트 연결 예정"
  }
];
