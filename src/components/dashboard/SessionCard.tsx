import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { StatusBadge, type SessionStatus } from "./StatusBadge"
import { cn } from "~/lib/utils"
import {
  FileAudio,
  Clock,
  Calendar,
  Play,
  Eye,
  Copy,
  MoreHorizontal,
  RefreshCw,
  Send
} from "lucide-react"

export interface SessionData {
  id: string
  status: SessionStatus
  audioFilePath: string
  audioFormat: string
  audioDuration?: number | null
  metadata?: Record<string, unknown> | null
  createdAt: string
  templateName?: string
  hasNote?: boolean
  errorMessage?: string | null
  // IntakeQ integration fields
  clientId?: string | null
  clientName?: string | null
  dateOfService?: string | null
  intakeqNoteType?: string | null
}

export interface SessionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  session: SessionData
  onViewDetails?: (session: SessionData) => void
  onRetry?: (session: SessionData) => void
  onCopyNote?: (session: SessionData) => void
  onSendToIntakeQ?: (session: SessionData) => void
}

// Format duration from seconds to mm:ss or hh:mm:ss
function formatDuration(seconds?: number | null): string {
  if (!seconds) return "--:--"
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Format date to relative time or date string
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

// Extract filename from path
function getFileName(path: string): string {
  return path.split("/").pop() || path
}

const SessionCard = React.forwardRef<HTMLDivElement, SessionCardProps>(
  ({ className, session, onViewDetails, onRetry, onCopyNote, onSendToIntakeQ, ...props }, ref) => {
    const isProcessing = ["transcribing", "mapping", "completing"].includes(session.status)
    const isCompleted = session.status === "completed"
    const isFailed = session.status === "failed"
    const needsInput = session.status === "gaps_detected"

    return (
      <Card
        ref={ref}
        className={cn(
          "transition-all hover:shadow-md",
          needsInput && "ring-2 ring-orange-400 dark:ring-orange-500",
          isFailed && "opacity-80",
          className
        )}
        data-testid={`session-card-${session.id}`}
        {...props}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileAudio className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-medium truncate" title={getFileName(session.audioFilePath)}>
                {getFileName(session.audioFilePath)}
              </CardTitle>
            </div>
            <StatusBadge status={session.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Session metadata */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(session.audioDuration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(session.createdAt)}</span>
            </div>
            {session.templateName && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground/70">Template:</span>
                <span className="truncate max-w-[100px]" title={session.templateName}>
                  {session.templateName}
                </span>
              </div>
            )}
          </div>

          {/* Error message for failed sessions */}
          {isFailed && session.errorMessage && (
            <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-md">
              {session.errorMessage}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            {isCompleted && session.hasNote && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onCopyNote?.(session)}
                  data-testid="copy-note-button"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => onSendToIntakeQ?.(session)}
                  data-testid="send-to-intakeq-button"
                >
                  <Send className="h-3 w-3 mr-1" />
                  IntakeQ
                </Button>
              </>
            )}

            {needsInput && (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs"
                onClick={() => onViewDetails?.(session)}
                data-testid="fill-gaps-button"
              >
                <Play className="h-3 w-3 mr-1" />
                Fill Gaps
              </Button>
            )}

            {isFailed && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onRetry?.(session)}
                data-testid="retry-button"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}

            {!needsInput && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => onViewDetails?.(session)}
                data-testid="view-details-button"
              >
                <Eye className="h-3 w-3 mr-1" />
                Details
              </Button>
            )}

            {isProcessing && (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                <span className="animate-pulse">Processing...</span>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
SessionCard.displayName = "SessionCard"

export { SessionCard, formatDuration, formatDate, getFileName }
