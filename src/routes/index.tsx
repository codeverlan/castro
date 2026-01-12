import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SessionDashboard, type SessionData } from '~/components/dashboard'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [sessions, setSessions] = React.useState<SessionData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Fetch sessions from API
  const fetchSessions = React.useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true)
      }
      const response = await fetch('/api/sessions?limit=50')
      if (!response.ok) {
        throw new Error('Failed to fetch sessions')
      }
      const data = await response.json()
      setSessions(data.data || [])
    } catch (error) {
      console.error('Error fetching sessions:', error)
      // Keep existing sessions on error
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial load
  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Auto-refresh every 10 seconds for real-time updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      // Only auto-refresh if there are sessions being processed
      const hasActiveProcessing = sessions.some((s) =>
        ['pending', 'transcribing', 'transcribed', 'mapping', 'completing'].includes(s.status)
      )
      if (hasActiveProcessing) {
        fetchSessions()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [sessions, fetchSessions])

  // Handler functions
  const handleViewDetails = (session: SessionData) => {
    // Navigate to session details page (to be implemented)
    console.log('View details for session:', session.id)
    // navigate({ to: `/sessions/${session.id}` })
  }

  const handleRetry = async (session: SessionData) => {
    // Retry failed session (to be implemented)
    console.log('Retry session:', session.id)
    // After implementing retry logic, refresh the list
    await fetchSessions(true)
  }

  const handleCopyNote = async (session: SessionData) => {
    try {
      // Fetch the note content
      const response = await fetch(`/api/notes?sessionId=${session.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch note')
      }
      const data = await response.json()
      const noteContent = data.data?.plainTextContent || data.data?.noteContent

      if (noteContent) {
        await navigator.clipboard.writeText(noteContent)
        // Could add a toast notification here
        console.log('Note copied to clipboard')
      }
    } catch (error) {
      console.error('Error copying note:', error)
    }
  }

  const handleOpenWatchFolder = () => {
    // Open the watch folder (platform-specific, may need Electron/Tauri integration)
    console.log('Open watch folder')
  }

  const handleManageTemplates = () => {
    navigate({ to: '/templates' })
  }

  const handleOpenSettings = () => {
    navigate({ to: '/settings/s3' })
  }

  const handleManageS3Credentials = () => {
    navigate({ to: '/settings/s3' })
  }

  const handleViewHistory = () => {
    navigate({ to: '/history' })
  }

  const handleRefresh = () => {
    fetchSessions(true)
  }

  return (
    <div className="container mx-auto p-6 lg:p-8" data-testid="home-page">
      <SessionDashboard
        sessions={sessions}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onViewDetails={handleViewDetails}
        onRetry={handleRetry}
        onCopyNote={handleCopyNote}
        onOpenWatchFolder={handleOpenWatchFolder}
        onManageTemplates={handleManageTemplates}
        onOpenSettings={handleOpenSettings}
        onViewHistory={handleViewHistory}
        onRefresh={handleRefresh}
        onManageS3Credentials={handleManageS3Credentials}
      />
    </div>
  )
}
