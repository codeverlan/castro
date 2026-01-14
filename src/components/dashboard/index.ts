// Dashboard components for session management UI
export { StatusBadge, statusBadgeVariants, statusConfig } from "./StatusBadge"
export type { StatusBadgeProps, SessionStatus } from "./StatusBadge"

export { SessionCard, formatDuration, formatDate, getFileName } from "./SessionCard"
export type { SessionCardProps, SessionData } from "./SessionCard"

export { SessionList } from "./SessionList"
export type { SessionListProps } from "./SessionList"

export { QuickActions } from "./QuickActions"
export type { QuickActionsProps, QuickAction } from "./QuickActions"

export { ProcessingStats, calculateStatsFromSessions } from "./ProcessingStats"
export type { ProcessingStatsProps, ProcessingStatsData } from "./ProcessingStats"

export { SessionDashboard } from "./SessionDashboard"
export type { SessionDashboardProps } from "./SessionDashboard"

export { ScheduleView } from "./ScheduleView"
export type { ScheduleViewProps } from "./ScheduleView"
