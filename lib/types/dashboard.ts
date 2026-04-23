export type BadgeTone = "green" | "blue" | "amber" | "red" | "gray";

export type ProgressStatus = "정상" | "지연" | "완료" | "위험";

export type MaterialDirection = "상승" | "보합" | "하락";

export type SummaryIcon = "gauge" | "users" | "truck" | "clipboard";

export type QuickActionIcon = "bar-chart" | "clipboard-pen" | "calculator" | "package";

export interface DashboardHeaderInfo {
  siteName: string;
  siteMeta: string;
  dateLabel: string;
  weatherLabel: string;
  status: string;
  alertCount: number;
}

export interface DashboardHeroInfo {
  title: string;
  headline: string;
  description: string;
  chips: string[];
}

export interface DashboardSummaryStat {
  id: string;
  label: string;
  value: string;
  description: string;
  footnote: string;
  icon: SummaryIcon;
  tone: Exclude<BadgeTone, "gray">;
}

export interface ProgressItem {
  id: string;
  name: string;
  progress: number;
  status: ProgressStatus;
  team: string;
  area: string;
  note: string;
}

export interface WorkSummaryItem {
  id: string;
  title: string;
  detail: string;
}

export interface MaterialPriceItem {
  id: string;
  name: string;
  currentPrice: string;
  changeRate: string;
  direction: MaterialDirection;
  note: string;
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: QuickActionIcon;
  description: string;
  hint: string;
}

export interface WorkSummaryMeta {
  safetyStatus: string;
  safetyNote: string;
  issueSummary: string;
}
