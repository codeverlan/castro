import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import {
  Calendar,
  Clock,
  User,
  MapPin,
  FileAudio,
  Send,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Mic,
} from "lucide-react"
import type { CalendarAppointment, DailySchedule } from "~/services/intakeq/types"
import type { SessionData } from "./SessionCard"

export interface ScheduleViewProps extends React.HTMLAttributes<HTMLDivElement> {
  schedule: DailySchedule | null
  sessions: SessionData[]
  isLoading?: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
  onDateChange?: (date: string) => void
  onLinkSession?: (appointmentId: string, sessionId: string) => void
  onSendToIntakeQ?: (appointment: CalendarAppointment, session: SessionData) => void
  onStartRecording?: (appointment: CalendarAppointment) => void
  selectedDate?: string
}

// Status badge colors
const statusColors: Record<string, string> = {
  Confirmed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  Unconfirmed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  Completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  Canceled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  NoShow: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

// Session status indicators
const sessionStatusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  completed: {
    icon: <Check className="h-3 w-3" />,
    color: "text-green-600 bg-green-50",
    label: "Note Ready",
  },
  processing: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: "text-blue-600 bg-blue-50",
    label: "Processing",
  },
  gaps_detected: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-orange-600 bg-orange-50",
    label: "Needs Input",
  },
  failed: {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "text-red-600 bg-red-50",
    label: "Failed",
  },
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const ScheduleView = React.forwardRef<HTMLDivElement, ScheduleViewProps>(
  (
    {
      className,
      schedule,
      sessions,
      isLoading,
      isRefreshing,
      onRefresh,
      onDateChange,
      onLinkSession,
      onSendToIntakeQ,
      onStartRecording,
      selectedDate,
      ...props
    },
    ref
  ) => {
    // Find matching session for an appointment based on time proximity
    const findMatchingSession = React.useCallback(
      (appointment: CalendarAppointment): SessionData | undefined => {
        // First check if appointment has a linked session
        if (appointment.linkedSessionId) {
          return sessions.find((s) => s.id === appointment.linkedSessionId)
        }

        // Auto-match by time: find sessions created within 30 mins of appointment start
        const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}:00`)
        const thirtyMinsMs = 30 * 60 * 1000

        return sessions.find((session) => {
          // Skip if session already has a client assigned
          if (session.clientId) return false

          const sessionDate = new Date(session.createdAt)
          const timeDiff = Math.abs(sessionDate.getTime() - appointmentDate.getTime())
          return timeDiff <= thirtyMinsMs
        })
      },
      [sessions]
    )

    // Navigate to previous/next day
    const navigateDay = (direction: "prev" | "next") => {
      if (!selectedDate || !onDateChange) return
      const date = new Date(selectedDate + "T00:00:00")
      date.setDate(date.getDate() + (direction === "prev" ? -1 : 1))
      onDateChange(date.toISOString().split("T")[0])
    }

    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-muted-foreground",
            className
          )}
          {...props}
        >
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading schedule...</p>
        </div>
      )
    }

    if (!schedule) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-muted-foreground",
            className
          )}
          {...props}
        >
          <Calendar className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No schedule available</p>
          <p className="text-xs mt-1">Configure IntakeQ API key in settings</p>
        </div>
      )
    }

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Header with date navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDay("prev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">{formatDate(schedule.date)}</h2>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigateDay("next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {schedule.totalAppointments} appointments
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Appointments list */}
        {schedule.appointments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No appointments scheduled</p>
              <p className="text-xs mt-1">Appointments from IntakeQ will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {schedule.appointments.map((appointment) => {
              const matchedSession = findMatchingSession(appointment)
              const sessionStatus = matchedSession
                ? ["transcribing", "mapping", "completing"].includes(matchedSession.status)
                  ? "processing"
                  : matchedSession.status
                : null

              return (
                <Card
                  key={appointment.id}
                  className={cn(
                    "transition-all",
                    matchedSession?.status === "completed" &&
                      "ring-2 ring-green-400 dark:ring-green-500",
                    sessionStatus === "gaps_detected" &&
                      "ring-2 ring-orange-400 dark:ring-orange-500"
                  )}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      {/* Time column */}
                      <div className="flex-shrink-0 w-24 text-center">
                        <div className="text-lg font-semibold">
                          {formatTime(appointment.startTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {appointment.duration} min
                        </div>
                      </div>

                      {/* Client info column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium truncate">
                            {appointment.clientName}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              statusColors[appointment.status] || "bg-gray-100"
                            )}
                          >
                            {appointment.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {appointment.serviceName && (
                            <span>{appointment.serviceName}</span>
                          )}
                          {appointment.locationName && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointment.locationName}
                            </span>
                          )}
                          <span>{appointment.practitionerName}</span>
                        </div>
                      </div>

                      {/* Recording/Note status column */}
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {matchedSession ? (
                          <>
                            {/* Session status badge */}
                            {sessionStatus && sessionStatusConfig[sessionStatus] && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                                  sessionStatusConfig[sessionStatus].color
                                )}
                              >
                                {sessionStatusConfig[sessionStatus].icon}
                                {sessionStatusConfig[sessionStatus].label}
                              </span>
                            )}

                            {/* Send to IntakeQ button */}
                            {matchedSession.status === "completed" &&
                              matchedSession.hasNote && (
                                <Button
                                  size="sm"
                                  className="h-8 bg-indigo-600 hover:bg-indigo-700"
                                  onClick={() =>
                                    onSendToIntakeQ?.(appointment, matchedSession)
                                  }
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Send
                                </Button>
                              )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <FileAudio className="h-3 w-3" />
                              No recording
                            </span>
                            {onStartRecording && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8"
                                onClick={() => onStartRecording(appointment)}
                              >
                                <Mic className="h-3 w-3 mr-1" />
                                Record
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }
)
ScheduleView.displayName = "ScheduleView"

export { ScheduleView }
