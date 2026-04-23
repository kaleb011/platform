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
  siteName: "상록 스마트하우스 신축 현장",
  siteMeta: "안산 상록구 본오동 | 소규모 공동주택 1개동",
  dateLabel: "2026년 4월 23일 목요일",
  weatherLabel: "흐림 18°C",
  status: "정상 운영",
  alertCount: 3
};

export const dashboardHero: DashboardHeroInfo = {
  title: "오늘 현장 브리핑",
  headline: "1층 철근 배근과 동측 거푸집 보강을 오전 안에 마감하는 일정입니다.",
  description:
    "오후 1시 이후 약한 비 예보가 있어 외부 양중과 타설 준비는 점심 전 우선 진행이 필요합니다.",
  chips: ["출역 18명", "우천 대비", "타설 준비중"]
};

export const dashboardSummaryStats: DashboardSummaryStat[] = [
  {
    id: "progress",
    label: "전체 공정",
    value: "62%",
    description: "주간 목표 대비 +3%",
    footnote: "골조 공정 안정권",
    icon: "gauge",
    tone: "green"
  },
  {
    id: "workers",
    label: "오늘 작업 인원",
    value: "18명",
    description: "직영 6 / 협력 12",
    footnote: "철근팀 5명 집중 배치",
    icon: "users",
    tone: "blue"
  },
  {
    id: "equipment",
    label: "장비 가동 수",
    value: "4대",
    description: "가동 4 / 대기 1",
    footnote: "크레인, 절단기 정상",
    icon: "truck",
    tone: "amber"
  },
  {
    id: "reports",
    label: "미작성 작업일보",
    value: "2건",
    description: "골조팀, 설비팀",
    footnote: "오후 5시 전 입력 필요",
    icon: "clipboard",
    tone: "red"
  }
];

export const progressItems: ProgressItem[] = [
  {
    id: "foundation",
    name: "기초공사",
    progress: 100,
    status: "완료",
    team: "토목팀 4명",
    area: "지하 기초 구간",
    note: "기초 정리와 잔여 점검까지 마쳐 다음 공정 인수 완료"
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
    name: "거푸집 설치",
    progress: 58,
    status: "지연",
    team: "골조팀 4명",
    area: "동측 보강 구간",
    note: "재사용 자재 교체로 반나절 지연, 오후 인원 보강 필요"
  },
  {
    id: "concrete",
    name: "콘크리트 타설",
    progress: 36,
    status: "위험",
    team: "타설팀 5명",
    area: "1층 슬래브 예정",
    note: "우천 가능성으로 당일 타설 여부 재검토 필요"
  }
];

export const workSummaryItems: WorkSummaryItem[] = [
  {
    id: "task-1",
    title: "1층 철근 배근",
    detail: "A구역 벽체 및 슬래브 배근 진행, 오후 검측 전 마감 예정"
  },
  {
    id: "task-2",
    title: "동측 거푸집 보강",
    detail: "보강재 교체 후 수직도 재확인, 점심 전 재작업 마무리 목표"
  },
  {
    id: "task-3",
    title: "콘크리트 타설 준비",
    detail: "펌프카 14:00 대기, 우천 시 내일 오전 일정으로 전환 검토"
  }
];

export const workSummaryMeta: WorkSummaryMeta = {
  safetyStatus: "보호구 재확인",
  safetyNote: "안전모, 안전대, 절단기 방호커버를 오전 작업 전 다시 확인해야 합니다.",
  issueSummary: "오후 비 예보로 외부 양중 동선을 짧게 조정하고 타설 시점을 재검토할 필요가 있습니다."
};

export const materialPriceItems: MaterialPriceItem[] = [
  {
    id: "rebar",
    name: "철근",
    currentPrice: "98만 원/톤",
    changeRate: "+2.1%",
    direction: "상승",
    note: "수도권 주요 매입처 평균"
  },
  {
    id: "cement",
    name: "시멘트",
    currentPrice: "11.2만 원/톤",
    changeRate: "0.0%",
    direction: "보합",
    note: "이번 주 계약 단가 유지"
  },
  {
    id: "ready-mix",
    name: "레미콘",
    currentPrice: "8.4만 원/㎥",
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
    description: "주요 공종 진행률과 지연 공정을 확인",
    hint: "상세 화면 연결 예정"
  },
  {
    id: "write-report",
    label: "작업일보 작성",
    icon: "clipboard-pen",
    description: "오늘 작업 내용과 특이사항을 바로 기록",
    hint: "입력 폼 연결 예정"
  },
  {
    id: "check-estimate",
    label: "적산 확인",
    icon: "calculator",
    description: "수량과 예상 투입 자재를 빠르게 조회",
    hint: "집계 화면 준비중"
  },
  {
    id: "view-materials",
    label: "자재 시세 보기",
    icon: "package",
    description: "주요 자재 단가 흐름을 한눈에 확인",
    hint: "시세 차트 연결 예정"
  }
];

// TODO: replace this mock module with dashboard API response mapping
