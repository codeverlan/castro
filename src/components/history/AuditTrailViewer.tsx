import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Bug,
  FileText,
  Mic,
  Brain,
  Copy,
  Download,
  Loader2,
} from "lucide-react"

// Audit log entry type matching API response
export interface AuditLogEntry {
  id: string
  action: string
  severity: string
  actorType: string
  actorId: string | null
  resourceType: string
  resourceId: string | null
  sessionId: string | null
  templateId: string | null
  description: string
  metadata: Record<string, unknown> | null
  previousState: unknown
  newState: unknown
  ipAddress: string | null
  userAgent: string | null
  requestId: string | null
  durationMs: number | null
  createdAt: string
}

export interface AuditTrailViewerProps {
  isOpen: boolean
  onClose: () => void
  sessionId: string
  sessionFileName?: string
}

// Severity icons and colors
const severityConfig: Record<string, { icon: React.ElementType; color: string }> = {
  debug: { icon: Bug, color: "text-gray-500" },
  info: { icon: Info, color: "text-blue-500" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  error: { icon: AlertCircle, color: "text-red-500" },
  critical: { icon: AlertCircle, color: "text-red-700" },
}

// Action icons
const actionIcons: Record<string, React.ElementType> = {
  session_created: Clock,
  session_started: Clock,
  session_completed: CheckCircle2,
  session_failed: AlertCircle,
  transcription_started: Mic,
  transcription_completed: Mic,
  transcription_failed: AlertCircle,
  content_mapped: Brain,
  gap_detected: AlertTriangle,
  gap_resolved: CheckCircle2,
  note_generated: FileText,
  note_exported: Download,
  note_copied: Copy,
}

// Format action name for display
function formatActionName(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// Format timestamp
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

// Format duration
function formatDuration(ms: number | null): string {
  if (ms === null) return "-"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Individual audit log entry component
const AuditLogItem: React.FC<{ entry: AuditLogEntry }> = ({ entry }) => {
  const SeverityIcon = severityConfig[entry.severity]?.icon || Info
  const severityColor = severityConfig[entry.severity]?.color || "text-gray-500"
  const ActionIcon = actionIcons[entry.action] || Clock

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 mt-1">
        <div className={cn("rounded-full p-1.5 bg-muted", severityColor)}>
          <SeverityIcon className="h-3.5 w-3.5" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <ActionIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {formatActionName(entry.action)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(entry.createdAt)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {entry.description}
        </p>
        {entry.durationMs !== null && (
          <p className="text-xs text-muted-foreground mt-1">
            Duration: {formatDuration(entry.durationMs)}
          </p>
        )}
      </div>
    </div>
  )
}

const AuditTrailViewer: React.FC<AuditTrailViewerProps> = ({
  isOpen,
  onClose,
  sessionId,
  sessionFileName,
}) => {
  const [auditLogs, setAuditLogs] = React.useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch audit logs when dialog opens
  React.useEffect(() => {
    if (isOpen && sessionId) {
      const fetchAuditLogs = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await fetch(
            `/api/audit-logs?sessionId=${sessionId}&limit=100`
          )
          if (!response.ok) {
            throw new Error("Failed to fetch audit logs")
          }
          const data = await response.json()
          setAuditLogs(data.data || [])
        } catch (err) {
          setError(err instanceof Error ? err.message : "An error occurred")
        } finally {
          setIsLoading(false)
        }
      }
      fetchAuditLogs()
    }
  }, [isOpen, sessionId])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Audit Trail</DialogTitle>
          <DialogDescription>
            Activity log for session: {sessionFileName || sessionId}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6" data-testid="audit-trail-content">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
            </div>
          ) : error ? (
            <Card className="bg-destructive/10 border-destructive/50">
              <CardContent className="flex items-center gap-2 py-4">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-destructive">{error}</span>
              </CardContent>
            </Card>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No audit logs found for this session.</p>
            </div>
          ) : (
            <div className="space-y-1 divide-y divide-border">
              {auditLogs.map((entry) => (
                <AuditLogItem key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { AuditTrailViewer }
