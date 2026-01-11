import * as React from "react"
import { SessionCard, type SessionData } from "./SessionCard"
import { cn } from "~/lib/utils"
import { FileAudio, Loader2 } from "lucide-react"

export interface SessionListProps extends React.HTMLAttributes<HTMLDivElement> {
  sessions: SessionData[]
  isLoading?: boolean
  onViewDetails?: (session: SessionData) => void
  onRetry?: (session: SessionData) => void
  onCopyNote?: (session: SessionData) => void
}

const SessionList = React.forwardRef<HTMLDivElement, SessionListProps>(
  (
    { className, sessions, isLoading, onViewDetails, onRetry, onCopyNote, ...props },
    ref
  ) => {
    if (isLoading) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-muted-foreground",
            className
          )}
          data-testid="session-list-loading"
          {...props}
        >
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading sessions...</p>
        </div>
      )
    }

    if (sessions.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center py-12 text-muted-foreground",
            className
          )}
          data-testid="session-list-empty"
          {...props}
        >
          <FileAudio className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No recordings yet</p>
          <p className="text-xs mt-1">
            Drop an audio file into the watch folder to get started
          </p>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
        data-testid="session-list"
        {...props}
      >
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onViewDetails={onViewDetails}
            onRetry={onRetry}
            onCopyNote={onCopyNote}
          />
        ))}
      </div>
    )
  }
)
SessionList.displayName = "SessionList"

export { SessionList }
