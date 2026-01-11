import * as React from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { StatusBadge, type SessionStatus } from "~/components/dashboard"
import { cn } from "~/lib/utils"
import {
  Clock,
  FileText,
  MoreVertical,
  Copy,
  History,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react"

// Session data type matching API response
export interface HistorySession {
  id: string
  status: SessionStatus
  audioFileName: string
  audioFormat: string
  audioDuration: number | null
  audioFileSize: number | null
  metadata: Record<string, unknown> | null
  errorMessage: string | null
  processingStartedAt: string | null
  processingCompletedAt: string | null
  createdAt: string
  updatedAt: string
  templateId: string
  templateName: string | null
  templateType: string | null
  hasNote: boolean
  noteWordCount: number | null
  noteExported: boolean
}

export interface HistoryTableProps extends React.HTMLAttributes<HTMLDivElement> {
  sessions: HistorySession[]
  isLoading?: boolean
  // Pagination
  total: number
  limit: number
  offset: number
  onPageChange: (offset: number) => void
  // Actions
  onViewAuditTrail: (session: HistorySession) => void
  onCopyNote?: (session: HistorySession) => void
  onExportNote?: (session: HistorySession) => void
}

// Format duration in seconds to human readable
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

// Format file size
function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "-"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Individual row component
const HistoryRow: React.FC<{
  session: HistorySession
  onViewAuditTrail: () => void
  onCopyNote?: () => void
  onExportNote?: () => void
}> = ({ session, onViewAuditTrail, onCopyNote, onExportNote }) => {
  const [showActions, setShowActions] = React.useState(false)

  return (
    <div
      className="grid grid-cols-[1fr,120px,100px,100px,140px,auto] gap-4 items-center p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0"
      data-testid={`history-row-${session.id}`}
    >
      {/* File Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="font-medium truncate" title={session.audioFileName}>
            {session.audioFileName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>{session.templateType || "Unknown Type"}</span>
          <span>-</span>
          <span>{session.templateName || "Unknown Template"}</span>
        </div>
      </div>

      {/* Status */}
      <div>
        <StatusBadge status={session.status} />
      </div>

      {/* Duration */}
      <div className="text-sm text-muted-foreground">
        {formatDuration(session.audioDuration)}
      </div>

      {/* Word Count */}
      <div className="text-sm text-muted-foreground">
        {session.noteWordCount ? `${session.noteWordCount} words` : "-"}
      </div>

      {/* Date */}
      <div className="text-sm text-muted-foreground">
        <div>{formatDate(session.createdAt)}</div>
        {session.processingCompletedAt && (
          <div className="text-xs text-muted-foreground/70">
            Completed: {formatDate(session.processingCompletedAt)}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setShowActions(!showActions)}
          data-testid={`history-actions-${session.id}`}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>

        {showActions && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowActions(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-50 bg-popover border rounded-md shadow-lg py-1 min-w-[160px]">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  onViewAuditTrail()
                  setShowActions(false)
                }}
                data-testid={`history-audit-${session.id}`}
              >
                <History className="h-4 w-4" />
                View Audit Trail
              </button>
              {session.hasNote && onCopyNote && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    onCopyNote()
                    setShowActions(false)
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Note
                </button>
              )}
              {session.hasNote && onExportNote && (
                <button
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => {
                    onExportNote()
                    setShowActions(false)
                  }}
                >
                  <Download className="h-4 w-4" />
                  Export Note
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const HistoryTable = React.forwardRef<HTMLDivElement, HistoryTableProps>(
  (
    {
      className,
      sessions,
      isLoading,
      total,
      limit,
      offset,
      onPageChange,
      onViewAuditTrail,
      onCopyNote,
      onExportNote,
      ...props
    },
    ref
  ) => {
    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(total / limit)
    const canGoBack = offset > 0
    const canGoForward = offset + limit < total

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr,120px,100px,100px,140px,auto] gap-4 items-center p-4 bg-muted/50 border-b font-medium text-sm text-muted-foreground">
            <div>Recording</div>
            <div>Status</div>
            <div>Duration</div>
            <div>Words</div>
            <div>Date</div>
            <div className="w-8"></div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading sessions...</span>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && sessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No sessions found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}

          {/* Table Body */}
          {!isLoading && sessions.length > 0 && (
            <div data-testid="history-table-body">
              {sessions.map((session) => (
                <HistoryRow
                  key={session.id}
                  session={session}
                  onViewAuditTrail={() => onViewAuditTrail(session)}
                  onCopyNote={onCopyNote ? () => onCopyNote(session) : undefined}
                  onExportNote={onExportNote ? () => onExportNote(session) : undefined}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && sessions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
              <div className="text-sm text-muted-foreground">
                Showing {offset + 1} - {Math.min(offset + sessions.length, total)} of {total} sessions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(offset - limit)}
                  disabled={!canGoBack}
                  data-testid="history-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(offset + limit)}
                  disabled={!canGoForward}
                  data-testid="history-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }
)
HistoryTable.displayName = "HistoryTable"

export { HistoryTable }
