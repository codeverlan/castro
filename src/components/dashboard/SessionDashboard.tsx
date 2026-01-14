import * as React from "react"
import { SessionList } from "./SessionList"
import { ScheduleView } from "./ScheduleView"
import { QuickActions } from "./QuickActions"
import { ProcessingStats, calculateStatsFromSessions } from "./ProcessingStats"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { List, Calendar } from "lucide-react"
import type { SessionData } from "./SessionCard"
import type { DailySchedule, CalendarAppointment } from "~/services/intakeq/types"

export type ViewMode = "list" | "schedule"

export interface SessionDashboardProps extends React.HTMLAttributes<HTMLDivElement> {
  sessions: SessionData[]
  isLoading?: boolean
  onViewDetails?: (session: SessionData) => void
  onRetry?: (session: SessionData) => void
  onCopyNote?: (session: SessionData) => void
  onSendToIntakeQ?: (session: SessionData) => void
  onOpenWatchFolder?: () => void
  onManageTemplates?: () => void
  onOpenSettings?: () => void
  onViewHistory?: () => void
  onRefresh?: () => void
  onManageS3Credentials?: () => void
  onRecordOrUpload?: () => void
  isRefreshing?: boolean
  // Schedule view props
  schedule?: DailySchedule | null
  isScheduleLoading?: boolean
  isScheduleRefreshing?: boolean
  selectedDate?: string
  onDateChange?: (date: string) => void
  onRefreshSchedule?: () => void
  onSendAppointmentToIntakeQ?: (appointment: CalendarAppointment, session: SessionData) => void
  onStartRecordingForAppointment?: (appointment: CalendarAppointment) => void
  intakeqConfigured?: boolean
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
      onSendToIntakeQ,
      onOpenWatchFolder,
      onManageTemplates,
      onOpenSettings,
      onViewHistory,
      onRefresh,
      onManageS3Credentials,
      onRecordOrUpload,
      isRefreshing,
      // Schedule view props
      schedule,
      isScheduleLoading,
      isScheduleRefreshing,
      selectedDate,
      onDateChange,
      onRefreshSchedule,
      onSendAppointmentToIntakeQ,
      onStartRecordingForAppointment,
      intakeqConfigured,
      ...props
    },
    ref
  ) => {
    // View mode state
    const [viewMode, setViewMode] = React.useState<ViewMode>(
      intakeqConfigured ? "schedule" : "list"
    )

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

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "schedule" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setViewMode("schedule")}
              disabled={!intakeqConfigured}
              title={!intakeqConfigured ? "Configure IntakeQ API key in settings" : "Schedule View"}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
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
            onRecordOrUpload={onRecordOrUpload}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Schedule View */}
        {viewMode === "schedule" && (
          <ScheduleView
            schedule={schedule || null}
            sessions={sessions}
            isLoading={isScheduleLoading}
            isRefreshing={isScheduleRefreshing}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onRefresh={onRefreshSchedule}
            onSendToIntakeQ={onSendAppointmentToIntakeQ}
            onStartRecording={onStartRecordingForAppointment}
          />
        )}

        {/* List View */}
        {viewMode === "list" && (
          <>
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
                  onSendToIntakeQ={onSendToIntakeQ}
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
                onSendToIntakeQ={onSendToIntakeQ}
              />
            </section>
          </>
        )}
      </div>
    )
  }
)
SessionDashboard.displayName = "SessionDashboard"

export { SessionDashboard }
