import * as React from "react"
import { SessionList } from "./SessionList"
import { QuickActions } from "./QuickActions"
import { ProcessingStats, calculateStatsFromSessions } from "./ProcessingStats"
import { cn } from "~/lib/utils"
import type { SessionData } from "./SessionCard"

export interface SessionDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  sessions: SessionData[]
  isLoading?: boolean
  onViewDetails?: (session: SessionData) => void
  onRetry?: (session: SessionData) => void
  onCopyNote?: (session: SessionData) => void
  onOpenWatchFolder?: () => void
  onManageTemplates?: () => void
  onOpenSettings?: () => void
  onViewHistory?: () => void
  onRefresh?: () => void
  onManageS3Credentials?: () => void
  isRefreshing?: boolean
}

const SessionDashboard = React.forwardRef<HTMLDivElement, SessionDashboardProps>(
  (
    {
      className,
      sessions,
      isLoading,
      onViewDetails,
      onRetry,
      onCopyNote,
      onOpenWatchFolder,
      onManageTemplates,
      onOpenSettings,
      onViewHistory,
      onRefresh,
      onManageS3Credentials,
      isRefreshing,
      ...props
    },
    ref
  ) => {
    // Calculate stats from sessions
    const stats = React.useMemo(
      () => calculateStatsFromSessions(sessions),
      [sessions]
    )

    // Separate sessions by status for display
    const sessionsNeedingInput = sessions.filter(
      (s) => s.status === "gaps_detected"
    )
    const sessionsInProgress = sessions.filter((s) =>
      ["pending", "transcribing", "transcribed", "mapping", "completing"].includes(
        s.status
      )
    )
    const sessionsCompleted = sessions.filter((s) => s.status === "completed")
    const sessionsFailed = sessions.filter((s) => s.status === "failed")

    // Sort each group by date (most recent first)
    const sortByDate = (a: SessionData, b: SessionData) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

    const sortedSessions = [
      ...sessionsNeedingInput.sort(sortByDate),
      ...sessionsInProgress.sort(sortByDate),
      ...sessionsCompleted.sort(sortByDate),
      ...sessionsFailed.sort(sortByDate),
    ]

    return (
      <div
        ref={ref}
        className={cn("space-y-6", className)}
        data-testid="session-dashboard"
        {...props}
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your clinical documentation sessions
            </p>
          </div>
        </div>

        {/* Stats and Quick Actions Row */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ProcessingStats stats={stats} className="lg:col-span-2" />
          <QuickActions
            onOpenWatchFolder={onOpenWatchFolder}
            onManageTemplates={onManageTemplates}
            onOpenSettings={onOpenSettings}
            onViewHistory={onViewHistory}
            onRefresh={onRefresh}
            onManageS3Credentials={onManageS3Credentials}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Sessions Needing Attention */}
        {sessionsNeedingInput.length > 0 && !isLoading && (
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
              Needs Your Input
              <span className="text-sm font-normal text-muted-foreground">
                ({sessionsNeedingInput.length})
              </span>
            </h2>
            <SessionList
              sessions={sessionsNeedingInput}
              onViewDetails={onViewDetails}
              onRetry={onRetry}
              onCopyNote={onCopyNote}
            />
          </section>
        )}

        {/* Recent Recordings Section */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Recordings</h2>
          <SessionList
            sessions={sortedSessions}
            isLoading={isLoading}
            onViewDetails={onViewDetails}
            onRetry={onRetry}
            onCopyNote={onCopyNote}
          />
        </section>
      </div>
    )
  }
)
SessionDashboard.displayName = "SessionDashboard"

export { SessionDashboard }
