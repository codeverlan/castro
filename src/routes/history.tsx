import * as React from "react"
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { Button } from "~/components/ui/button"
import {
  HistoryFilters,
  HistoryTable,
  AuditTrailViewer,
  type HistorySession,
} from "~/components/history"
import { ArrowLeft, RefreshCw } from "lucide-react"

export const Route = createFileRoute("/history")({
  component: HistoryPage,
})

function HistoryPage() {
  const navigate = useNavigate()

  // Filter state
  const [dateFrom, setDateFrom] = React.useState("")
  const [dateTo, setDateTo] = React.useState("")
  const [status, setStatus] = React.useState("")
  const [templateType, setTemplateType] = React.useState("")
  const [search, setSearch] = React.useState("")

  // Data state
  const [sessions, setSessions] = React.useState<HistorySession[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [total, setTotal] = React.useState(0)
  const [offset, setOffset] = React.useState(0)
  const limit = 20

  // Template types for filter dropdown
  const [templateTypes, setTemplateTypes] = React.useState<string[]>([])

  // Audit trail dialog state
  const [auditSession, setAuditSession] = React.useState<HistorySession | null>(null)

  // Fetch template types on mount
  React.useEffect(() => {
    const fetchTemplateTypes = async () => {
      try {
        const response = await fetch("/api/templates?limit=100")
        if (response.ok) {
          const data = await response.json()
          const types = [...new Set(data.data?.map((t: { templateType: string }) => t.templateType) || [])] as string[]
          setTemplateTypes(types)
        }
      } catch (error) {
        console.error("Error fetching template types:", error)
      }
    }
    fetchTemplateTypes()
  }, [])

  // Fetch sessions
  const fetchSessions = React.useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }

        // Build query params
        const params = new URLSearchParams()
        params.set("limit", limit.toString())
        params.set("offset", offset.toString())

        if (dateFrom) {
          params.set("dateFrom", new Date(dateFrom).toISOString())
        }
        if (dateTo) {
          // Set to end of day
          const endDate = new Date(dateTo)
          endDate.setHours(23, 59, 59, 999)
          params.set("dateTo", endDate.toISOString())
        }
        if (status && status !== "all") {
          params.set("status", status)
        }
        if (templateType && templateType !== "all") {
          params.set("templateType", templateType)
        }
        if (search) {
          params.set("search", search)
        }

        const response = await fetch(`/api/sessions/history?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch sessions")
        }
        const data = await response.json()
        setSessions(data.data || [])
        setTotal(data.pagination?.total ?? 0)
      } catch (error) {
        console.error("Error fetching sessions:", error)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [dateFrom, dateTo, status, templateType, search, offset, limit]
  )

  // Initial fetch
  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Handle filter changes
  const handleApplyFilters = () => {
    setOffset(0) // Reset to first page
    fetchSessions()
  }

  const handleClearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setStatus("")
    setTemplateType("")
    setSearch("")
    setOffset(0)
    // Fetch will be triggered by useEffect
  }

  const handlePageChange = (newOffset: number) => {
    setOffset(newOffset)
  }

  const handleRefresh = () => {
    fetchSessions(true)
  }

  // Handle copying note
  const handleCopyNote = async (session: HistorySession) => {
    try {
      const response = await fetch(`/api/notes?sessionId=${session.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch note")
      }
      const data = await response.json()
      const noteContent = data.data?.plainTextContent || data.data?.noteContent

      if (noteContent) {
        await navigator.clipboard.writeText(noteContent)
        // Could add a toast notification here
        console.log("Note copied to clipboard")
      }
    } catch (error) {
      console.error("Error copying note:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 lg:p-8" data-testid="history-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
            <p className="text-muted-foreground mt-1">
              Browse and search historical documentation sessions
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          data-testid="history-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <HistoryFilters
        className="mb-6"
        dateFrom={dateFrom}
        dateTo={dateTo}
        status={status}
        templateType={templateType}
        search={search}
        templateTypes={templateTypes}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onStatusChange={setStatus}
        onTemplateTypeChange={setTemplateType}
        onSearchChange={setSearch}
        onClearFilters={handleClearFilters}
        onApplyFilters={handleApplyFilters}
        isLoading={isLoading || isRefreshing}
      />

      {/* Results Table */}
      <HistoryTable
        sessions={sessions}
        isLoading={isLoading}
        total={total}
        limit={limit}
        offset={offset}
        onPageChange={handlePageChange}
        onViewAuditTrail={(session) => setAuditSession(session)}
        onCopyNote={handleCopyNote}
      />

      {/* Audit Trail Dialog */}
      <AuditTrailViewer
        isOpen={auditSession !== null}
        onClose={() => setAuditSession(null)}
        sessionId={auditSession?.id || ""}
        sessionFileName={auditSession?.audioFileName}
      />
    </div>
  )
}
