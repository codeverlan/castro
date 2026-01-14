import * as React from "react"
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "~/components/ui/button"
import {
  HistoryFilters,
  HistoryTable,
  AuditTrailViewer,
  type HistorySession,
} from "~/components/history"
import { PageContainer, PageHeader } from "~/navigation"
import { RefreshCw } from "lucide-react"

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
        toast.success("Note copied to clipboard")
      }
    } catch (error) {
      console.error("Error copying note:", error)
    }
  }

  return (
    <PageContainer data-testid="history-page">
      {/* Header */}
      <PageHeader
        title="Session History"
        description="Browse and search historical documentation sessions"
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="history-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

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
    </PageContainer>
  )
}
