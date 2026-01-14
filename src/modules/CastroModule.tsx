/**
 * Castro Module Component
 * Main wrapper component for embedding Castro in LMHG-Workspace
 */

import * as React from 'react';
import { toast } from 'sonner';
import { SessionDashboard, type SessionData } from '~/components/dashboard';
import { RecordingDialog } from '~/components/recording';
import { useEmbedding } from '~/lib/embedding-context';
import { api, configureApiClient } from '~/lib/api-client';
import type { DailySchedule, CalendarAppointment } from '~/services/intakeq/types';

export type CastroView = 'dashboard' | 'templates' | 'history' | 'settings';

export interface CastroModuleProps {
  /** Initial view to display */
  initialView?: CastroView;
  /** Callback when user navigates to a different view */
  onViewChange?: (view: CastroView, params?: Record<string, unknown>) => void;
  /** API base URL (defaults to http://localhost:3001) */
  apiBaseUrl?: string;
  /** User ID from host application */
  userId?: string;
  /** Custom className */
  className?: string;
}

/**
 * Castro Module - Embeddable clinical documentation component
 */
export function CastroModule({
  initialView = 'dashboard',
  onViewChange,
  apiBaseUrl = 'http://localhost:3001',
  userId,
  className,
}: CastroModuleProps) {
  const { isEmbedded, navigate } = useEmbedding();

  // Configure API client on mount
  React.useEffect(() => {
    if (apiBaseUrl) {
      configureApiClient({ baseUrl: apiBaseUrl });
    }
  }, [apiBaseUrl]);

  const [currentView, setCurrentView] = React.useState<CastroView>(initialView);
  const [sessions, setSessions] = React.useState<SessionData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Schedule view state
  const [schedule, setSchedule] = React.useState<DailySchedule | null>(null);
  const [isScheduleLoading, setIsScheduleLoading] = React.useState(false);
  const [isScheduleRefreshing, setIsScheduleRefreshing] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().split('T')[0]
  );
  const [intakeqConfigured, setIntakeqConfigured] = React.useState(false);

  // Recording dialog state
  const [isRecordingDialogOpen, setIsRecordingDialogOpen] = React.useState(false);
  const [recordingAppointmentContext, setRecordingAppointmentContext] = React.useState<
    | {
        clientName: string;
        date: string;
        time: string;
      }
    | undefined
  >(undefined);

  // Handle view changes
  const handleViewChange = React.useCallback(
    (view: CastroView, params?: Record<string, unknown>) => {
      setCurrentView(view);
      if (onViewChange) {
        onViewChange(view, params);
      } else if (isEmbedded) {
        navigate(`/castro/${view}`, params);
      }
    },
    [isEmbedded, navigate, onViewChange]
  );

  // Fetch sessions from API
  const fetchSessions = React.useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      }
      const result = await api.sessions.list({ limit: 50 });
      if (result.data) {
        setSessions(result.data as SessionData[]);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch schedule from IntakeQ
  const fetchSchedule = React.useCallback(
    async (date: string, showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsScheduleRefreshing(true);
        } else {
          setIsScheduleLoading(true);
        }

        const result = await api.intakeq.getAppointments({ date });

        if (result.error?.code === 'INTAKEQ_NOT_CONFIGURED') {
          setIntakeqConfigured(false);
          setSchedule(null);
        } else if (result.data) {
          setIntakeqConfigured(true);
          setSchedule(result.data as DailySchedule);
        }
      } catch (error) {
        console.error('Error fetching schedule:', error);
        setIntakeqConfigured(false);
      } finally {
        setIsScheduleLoading(false);
        setIsScheduleRefreshing(false);
      }
    },
    []
  );

  // Check IntakeQ config
  const checkIntakeQConfig = React.useCallback(async () => {
    try {
      const result = await api.intakeq.getSettings();
      const configured = (result.data as { configured?: boolean })?.configured === true;
      setIntakeqConfigured(configured);

      if (configured) {
        fetchSchedule(selectedDate);
      }
    } catch (error) {
      setIntakeqConfigured(false);
    }
  }, [fetchSchedule, selectedDate]);

  // Initial load
  React.useEffect(() => {
    fetchSessions();
    checkIntakeQConfig();
  }, [fetchSessions, checkIntakeQConfig]);

  // Auto-refresh for active processing
  React.useEffect(() => {
    const interval = setInterval(() => {
      const hasActiveProcessing = sessions.some((s) =>
        ['pending', 'transcribing', 'transcribed', 'mapping', 'completing'].includes(
          s.status
        )
      );
      if (hasActiveProcessing) {
        fetchSessions();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessions, fetchSessions]);

  // Handler functions
  const handleViewDetails = (session: SessionData) => {
    handleViewChange('dashboard', { sessionId: session.id });
  };

  const handleRetry = async (session: SessionData) => {
    console.log('Retry session:', session.id);
    await fetchSessions(true);
  };

  const handleCopyNote = async (session: SessionData) => {
    try {
      const result = await api.notes.getBySession(session.id);
      const noteContent =
        (result.data as { plainTextContent?: string; noteContent?: string })
          ?.plainTextContent ||
        (result.data as { noteContent?: string })?.noteContent;

      if (noteContent) {
        await navigator.clipboard.writeText(noteContent);
        toast.success('Note copied to clipboard');
      }
    } catch (error) {
      console.error('Error copying note:', error);
      toast.error('Failed to copy note');
    }
  };

  const handleSendToIntakeQ = async (session: SessionData) => {
    try {
      const sectionsResult = await api.sessions.getSections(session.id);
      const sections = (sectionsResult.data || []) as Array<{
        sectionName: string;
        finalContent?: string;
        processedContent?: string;
        confidenceScore?: number;
      }>;

      const payload = {
        sessionId: session.id,
        client: {
          name: (session as { clientName?: string }).clientName || 'Unknown Client',
          intakeqId: (session as { clientId?: string }).clientId || undefined,
        },
        dateOfService:
          (session as { dateOfService?: string }).dateOfService ||
          new Date().toISOString().split('T')[0],
        noteType:
          (session as { intakeqNoteType?: string }).intakeqNoteType ||
          session.templateName ||
          'Progress Note',
        sections: sections.map((section) => ({
          name: section.sectionName,
          content: section.finalContent || section.processedContent || '',
          confidence: section.confidenceScore || 0,
        })),
        timestamp: new Date().toISOString(),
      };

      await navigator.clipboard.writeText(JSON.stringify(payload));
      toast.success('Note ready for IntakeQ! Open the Castro extension in your browser.');
    } catch (error) {
      console.error('Error preparing IntakeQ payload:', error);
      toast.error('Failed to prepare note for IntakeQ');
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    fetchSchedule(date);
  };

  const handleRefreshSchedule = () => {
    fetchSchedule(selectedDate, true);
  };

  const handleSendAppointmentToIntakeQ = async (
    appointment: CalendarAppointment,
    session: SessionData
  ) => {
    try {
      const sectionsResult = await api.sessions.getSections(session.id);
      const sections = (sectionsResult.data || []) as Array<{
        sectionName: string;
        finalContent?: string;
        processedContent?: string;
        confidenceScore?: number;
      }>;

      const payload = {
        sessionId: session.id,
        client: {
          name: appointment.clientName,
          intakeqId: appointment.clientId.toString(),
        },
        dateOfService: appointment.date,
        noteType: appointment.serviceName || session.templateName || 'Progress Note',
        sections: sections.map((section) => ({
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
      };

      await navigator.clipboard.writeText(JSON.stringify(payload));
      toast.success(`Note for ${appointment.clientName} ready! Open the Castro extension.`);
    } catch (error) {
      console.error('Error preparing IntakeQ payload:', error);
      toast.error('Failed to prepare note for IntakeQ');
    }
  };

  const handleManageTemplates = () => handleViewChange('templates');
  const handleOpenSettings = () => handleViewChange('settings');
  const handleManageS3Credentials = () => handleViewChange('settings', { tab: 's3' });
  const handleViewHistory = () => handleViewChange('history');
  const handleRefresh = () => fetchSessions(true);

  const handleRecordOrUpload = () => {
    setRecordingAppointmentContext(undefined);
    setIsRecordingDialogOpen(true);
  };

  const handleStartRecordingForAppointment = (appointment: CalendarAppointment) => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    setRecordingAppointmentContext({
      clientName: appointment.clientName,
      date: new Date(appointment.date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }),
      time: formatTime(appointment.startTime),
    });
    setIsRecordingDialogOpen(true);
  };

  const handleRecordingComplete = () => {
    toast.success('Recording uploaded successfully!');
    fetchSessions(true);
  };

  const sessionOptions = sessions.map((session) => ({
    id: session.id,
    label:
      session.audioFilePath?.split('/').pop() || `Session ${session.id.slice(0, 8)}`,
    date: session.createdAt,
    status: session.status,
  }));

  // Render based on current view
  if (currentView === 'dashboard') {
    return (
      <div className={className}>
        <SessionDashboard
          sessions={sessions}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onViewDetails={handleViewDetails}
          onRetry={handleRetry}
          onCopyNote={handleCopyNote}
          onSendToIntakeQ={handleSendToIntakeQ}
          onManageTemplates={handleManageTemplates}
          onOpenSettings={handleOpenSettings}
          onViewHistory={handleViewHistory}
          onRefresh={handleRefresh}
          onManageS3Credentials={handleManageS3Credentials}
          onRecordOrUpload={handleRecordOrUpload}
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

        <RecordingDialog
          open={isRecordingDialogOpen}
          onOpenChange={setIsRecordingDialogOpen}
          sessions={sessionOptions}
          isLoadingSessions={isLoading}
          onComplete={handleRecordingComplete}
          appointmentContext={recordingAppointmentContext}
        />
      </div>
    );
  }

  // Placeholder for other views
  return (
    <div className={className}>
      <div className="p-8 text-center text-muted-foreground">
        View: {currentView}
        <br />
        <button
          onClick={() => handleViewChange('dashboard')}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

export default CastroModule;
