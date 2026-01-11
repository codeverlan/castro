// Schema index - exports all database schemas and types
// This is the main entry point for importing schema definitions

// Note Templates
export {
  // Tables
  noteTemplates,
  templateSections,
  templateFields,
  // Enums
  fieldTypeEnum,
  templateStatusEnum,
  // Relations
  noteTemplatesRelations,
  templateSectionsRelations,
  templateFieldsRelations,
  // Types
  type NoteTemplate,
  type NewNoteTemplate,
  type TemplateSection,
  type NewTemplateSection,
  type TemplateField,
  type NewTemplateField,
} from './noteTemplates';

// Sessions
export {
  // Tables
  sessions,
  sessionSectionContent,
  sessionGaps,
  finalNotes,
  // Enums
  sessionStatusEnum,
  audioFormatEnum,
  // Relations
  sessionsRelations,
  sessionSectionContentRelations,
  sessionGapsRelations,
  finalNotesRelations,
  // Types
  type Session,
  type NewSession,
  type SessionSectionContent,
  type NewSessionSectionContent,
  type SessionGap,
  type NewSessionGap,
  type FinalNote,
  type NewFinalNote,
} from './sessions';

// Transcriptions
export {
  // Tables
  transcriptions,
  transcriptionSegments,
  transcriptionQueue,
  // Enums
  transcriptionStatusEnum,
  whisperModelEnum,
  // Relations
  transcriptionsRelations,
  transcriptionSegmentsRelations,
  transcriptionQueueRelations,
  // Types
  type Transcription,
  type NewTranscription,
  type TranscriptionSegment,
  type NewTranscriptionSegment,
  type TranscriptionQueueItem,
  type NewTranscriptionQueueItem,
} from './transcriptions';

// Audit Logs
export {
  // Tables
  auditLogs,
  systemEvents,
  processingMetrics,
  // Enums
  auditActionEnum,
  auditSeverityEnum,
  // Relations
  auditLogsRelations,
  processingMetricsRelations,
  // Types
  type AuditLog,
  type NewAuditLog,
  type SystemEvent,
  type NewSystemEvent,
  type ProcessingMetric,
  type NewProcessingMetric,
} from './auditLogs';
