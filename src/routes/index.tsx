import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { SessionDashboard, type SessionData } from '~/components/dashboard'
import { PageContainer } from '~/navigation'
import { RecordingDialog } from '~/components/recording'
import type { DailySchedule, CalendarAppointment } from '~/services/intakeq/types'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const [sessions, setSessions] = React.useState<SessionData[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // Schedule view state
  const [schedule, setSchedule] = React.useState<DailySchedule | null>(null)
  const [isScheduleLoading, setIsScheduleLoading] = React.useState(false)
  const [isScheduleRefreshing, setIsScheduleRefreshing] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split('T')[0]
  )
  const [intakeqConfigured, setIntakeqConfigured] = React.useState(false)

  // Recording dialog state
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = React.useState(false)
  const [recordingAppointmentContext, setRecordingAppointmentContext] = React.useState<{
    clientName: string
    date: string
    time: string
  } | undefined>(undefined)

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

  // Fetch schedule from IntakeQ
  const fetchSchedule = React.useCallback(async (date: string, showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsScheduleRefreshing(true)
      } else {
        setIsScheduleLoading(true)
      }

      const response = await fetch(`/api/intakeq/appointments?date=${date}`)
      const result = await response.json()

      if (result.code === 'INTAKEQ_NOT_CONFIGURED') {
        setIntakeqConfigured(false)
        setSchedule(null)
      } else if (result.data) {
        setIntakeqConfigured(true)
        setSchedule(result.data)
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
      setIntakeqConfigured(false)
    } finally {
      setIsScheduleLoading(false)
      setIsScheduleRefreshing(false)
    }
  }, [])

  // Check IntakeQ config
  const checkIntakeQConfig = React.useCallback(async () => {
    try {
      const response = await fetch('/api/intakeq/settings')
      const result = await response.json()
      setIntakeqConfigured(result.configured === true)

      if (result.configured) {
        // Fetch today's schedule
        fetchSchedule(selectedDate)
      }
    } catch (error) {
      setIntakeqConfigured(false)
    }
  }, [fetchSchedule, selectedDate])

  // Initial load
  React.useEffect(() => {
    fetchSessions()
    checkIntakeQConfig()
  }, [fetchSessions, checkIntakeQConfig])

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
        toast.success('Note copied to clipboard')
      }
    } catch (error) {
      console.error('Error copying note:', error)
    }
  }

  const handleSendToIntakeQ = async (session: SessionData) => {
    try {
      // Fetch the full note data including sections
      const response = await fetch(`/api/notes?sessionId=${session.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch note')
      }
      const noteData = await response.json()

      // Fetch session section content for confidence scores
      const sectionsResponse = await fetch(`/api/sessions/${session.id}/sections`)
      const sectionsData = sectionsResponse.ok ? await sectionsResponse.json() : { data: [] }

      // Build the IntakeQ payload
      const payload = {
        sessionId: session.id,
        client: {
          name: session.clientName || 'Unknown Client',
          intakeqId: session.clientId || undefined,
        },
        dateOfService: session.dateOfService || new Date().toISOString().split('T')[0],
        noteType: session.intakeqNoteType || session.templateName || 'Progress Note',
        sections: (sectionsData.data || []).map((section: {
          sectionName: string
          finalContent?: string
          processedContent?: string
          confidenceScore?: number
        }) => ({
          name: section.sectionName,
          content: section.finalContent || section.processedContent || '',
          confidence: section.confidenceScore || 0,
        })),
        timestamp: new Date().toISOString(),
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(JSON.stringify(payload))
      toast.success('Note ready for IntakeQ! Open the Castro extension in your browser.')
    } catch (error) {
      console.error('Error preparing IntakeQ payload:', error)
      toast.error('Failed to prepare note for IntakeQ')
    }
  }

  // Handle date change in schedule view
  const handleDateChange = (date: string) => {
    setSelectedDate(date)
    fetchSchedule(date)
  }

  // Handle refresh schedule
  const handleRefreshSchedule = () => {
    fetchSchedule(selectedDate, true)
  }

  // Handle send appointment to IntakeQ (from schedule view)
  const handleSendAppointmentToIntakeQ = async (
    appointment: CalendarAppointment,
    session: SessionData
  ) => {
    try {
      // Fetch session section content
      const sectionsResponse = await fetch(`/api/sessions/${session.id}/sections`)
      const sectionsData = sectionsResponse.ok ? await sectionsResponse.json() : { data: [] }

      // Build the IntakeQ payload with appointment data
      const payload = {
        sessionId: session.id,
        client: {
          name: appointment.clientName,
          intakeqId: appointment.clientId.toString(),
        },
        dateOfService: appointment.date,
        noteType: appointment.serviceName || session.templateName || 'Progress Note',
        sections: (sectionsData.data || []).map((section: {
          sectionName: string
          finalContent?: string
          processedContent?: string
          confidenceScore?: number
        }) => ({
          name: section.sectionName,
          content: section.finalContent || section.processedContent || '',
          confidence: section.confidenceScore || 0,
        })),
        timestamp: new Date().toISOString(),
        appointment: {
          id: appointment.intakeqAppointmentId,
          time: appointment.startTime,
          duration: appointment.duration,
          practitioner: appointment.practitionerName,
        },
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(JSON.stringify(payload))
      toast.success(`Note for ${appointment.clientName} ready! Open the Castro extension.`)
    } catch (error) {
      console.error('Error preparing IntakeQ payload:', error)
      toast.error('Failed to prepare note for IntakeQ')
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

  const handleRecordOrUpload = () => {
    setRecordingAppointmentContext(undefined)
    setIsRecordingDialogOpen(true)
  }

  // Handle starting recording for a specific appointment
  const handleStartRecordingForAppointment = (appointment: CalendarAppointment) => {
    // Format time for display
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':')
      const hour = parseInt(hours, 10)
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const displayHour = hour % 12 || 12
      return `${displayHour}:${minutes} ${ampm}`
    }

    setRecordingAppointmentContext({
      clientName: appointment.clientName,
      date: new Date(appointment.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: formatTime(appointment.startTime),
    })
    setIsRecordingDialogOpen(true)
  }

  const handleRecordingComplete = (recordingId: string, sessionId?: string) => {
    toast.success('Recording uploaded successfully!')
    // Refresh sessions to show the new recording
    fetchSessions(true)
  }

  // Transform sessions for the recording dialog's session selector
  const sessionOptions = sessions.map((session) => ({
    id: session.id,
    label: session.audioFilePath?.split('/').pop() || `Session ${session.id.slice(0, 8)}`,
    date: session.createdAt,
    status: session.status,
  }))

  return (
    <PageContainer data-testid="home-page">
      <SessionDashboard
        sessions={sessions}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onViewDetails={handleViewDetails}
        onRetry={handleRetry}
        onCopyNote={handleCopyNote}
        onSendToIntakeQ={handleSendToIntakeQ}
        onOpenWatchFolder={handleOpenWatchFolder}
        onManageTemplates={handleManageTemplates}
        onOpenSettings={handleOpenSettings}
        onViewHistory={handleViewHistory}
        onRefresh={handleRefresh}
        onManageS3Credentials={handleManageS3Credentials}
        onRecordOrUpload={handleRecordOrUpload}
        // Schedule view props
        schedule={schedule}
        isScheduleLoading={isScheduleLoading}
        isScheduleRefreshing={isScheduleRefreshing}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onRefreshSchedule={handleRefreshSchedule}
        onSendAppointmentToIntakeQ={handleSendAppointmentToIntakeQ}
        onStartRecordingForAppointment={handleStartRecordingForAppointment}
        intakeqConfigured={intakeqConfigured}
      />

      {/* Recording Dialog */}
      <RecordingDialog
        open={isRecordingDialogOpen}
        onOpenChange={setIsRecordingDialogOpen}
        sessions={sessionOptions}
        isLoadingSessions={isLoading}
        onComplete={handleRecordingComplete}
        appointmentContext={recordingAppointmentContext}
      />
    </PageContainer>
  )
}
