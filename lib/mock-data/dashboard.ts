import type {
  DashboardHeaderInfo,
  DashboardSummaryStat,
  MaterialPriceItem,
  ProgressItem,
  QuickActionItem,
  WorkSummaryItem
} from "@/lib/types/dashboard";

export const dashboardHeader: DashboardHeaderInfo = {
  siteName: "안산 소규모 주상복합 신축",
  dateLabel: "2026.04.23 목요일",
  status: "정상 운영"
};

export const dashboardSummaryStats: DashboardSummaryStat[] = [
  {
    id: "progress",
    label: "전체 공정 진행률",
    value: "62%",
    description: "계획 대비 +3%",
    icon: "gauge",
    tone: "green"
  },
  {
    id: "workers",
    label: "오늘 작업 인원",
    value: "18명",
    description: "협력사 포함",
    icon: "users",
    tone: "blue"
  },
  {
    id: "equipment",
    label: "장비 가동 수",
    value: "4대",
    description: "가동 4 / 대기 1",
    icon: "truck",
    tone: "amber"
  },
  {
    id: "reports",
    label: "미작성 작업일보 수",
    value: "2건",
    description: "오후 입력 필요",
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
    team: "토목팀",
    note: "기초 정리 및 점검 완료"
  },
  {
    id: "rebar",
    name: "철근 배근",
    progress: 72,
    status: "정상",
    team: "철근팀",
    note: "1층 배근 진행 중"
  },
  {
    id: "formwork",
    name: "거푸집 설치",
    progress: 58,
    status: "지연",
    team: "골조팀",
    note: "동측 보강 작업 반영"
  },
  {
    id: "concrete",
    name: "콘크리트 타설",
    progress: 36,
    status: "위험",
    team: "타설팀",
    note: "우천 가능성으로 일정 검토"
  }
];

export const workSummaryItems: WorkSummaryItem[] = [
  { id: "task-1", text: "1층 철근 배근 진행" },
  { id: "task-2", text: "동측 거푸집 보강 완료" },
  { id: "task-3", text: "타설 전 안전 점검 예정" }
];

export const workSummaryMeta = {
  safetyStatus: "안전 확인 필요",
  note: "오후 우천 가능성으로 외부 작업 조정 검토"
};

export const materialPriceItems: MaterialPriceItem[] = [
  {
    id: "rebar",
    name: "철근",
    currentPrice: "98만 원/톤",
    changeRate: "+2.1%",
    direction: "상승"
  },
  {
    id: "cement",
    name: "시멘트",
    currentPrice: "11.2만 원/톤",
    changeRate: "0.0%",
    direction: "보합"
  },
  {
    id: "ready-mix",
    name: "레미콘",
    currentPrice: "8.4만 원/㎥",
    changeRate: "-1.3%",
    direction: "하락"
  }
];

export const quickActionItems: QuickActionItem[] = [
  {
    id: "go-progress",
    label: "공정 보기",
    icon: "bar-chart",
    description: "진행 현황 빠르게 확인"
  },
  {
    id: "write-report",
    label: "작업일보 작성",
    icon: "clipboard-pen",
    description: "오늘 작업 내용 정리"
  },
  {
    id: "check-estimate",
    label: "적산 확인",
    icon: "calculator",
    description: "자재 및 수량 검토"
  },
  {
    id: "view-materials",
    label: "자재 시세 보기",
    icon: "package",
    description: "단가 변동 요약 확인"
  }
];
