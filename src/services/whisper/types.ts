/**
 * Whisper Service Types
 * Type definitions for Whisper.cpp transcription service
 */

// Supported Whisper model types
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'large-v2' | 'large-v3';

// Supported audio formats
export type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'ogg' | 'webm';

// Transcription status
export type TranscriptionStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'retrying';

// Whisper transcription options
export interface WhisperTranscriptionOptions {
  model?: WhisperModel;
  language?: string;
  translate?: boolean;
  temperature?: number;
  bestOf?: number;
  beamSize?: number;
  wordTimestamps?: boolean;
  threads?: number;
  processors?: number;
  outputFormat?: 'json' | 'text' | 'srt' | 'vtt';
  maxSegmentLength?: number;
  splitOnWord?: boolean;
  noSpeechThreshold?: number;
}

// Word-level timing information
export interface WordTiming {
  word: string;
  start: number;
  end: number;
  probability: number;
}

// Segment from Whisper transcription
export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avgLogprob: number;
  compressionRatio: number;
  noSpeechProb: number;
  words?: WordTiming[];
}

// Full transcription result from Whisper.cpp
export interface WhisperTranscriptionResult {
  text: string;
  segments: WhisperSegment[];
  language: string;
  duration: number;
  processingTimeMs: number;
}

// Transcription request for queue
export interface TranscriptionRequest {
  sessionId: string;
  audioFilePath: string;
  audioFormat: AudioFormat;
  options?: WhisperTranscriptionOptions;
  priority?: number;
}

// Progress callback for real-time updates
export interface TranscriptionProgress {
  sessionId: string;
  status: TranscriptionStatus;
  progress: number; // 0-100
  currentSegment?: number;
  totalSegments?: number;
  estimatedTimeRemaining?: number; // in seconds
  message?: string;
}

// Progress callback function type
export type ProgressCallback = (progress: TranscriptionProgress) => void;

// Queue item with additional processing info
export interface QueueItem {
  id: string;
  sessionId: string;
  audioFilePath: string;
  audioFormat: AudioFormat;
  options?: WhisperTranscriptionOptions;
  priority: number;
  attempts: number;
  maxAttempts: number;
  isProcessing: boolean;
  lockedUntil?: Date;
  lockedBy?: string;
  lastError?: string;
  scheduledFor: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Queue processing options
export interface QueueProcessingOptions {
  workerId?: string;
  batchSize?: number;
  lockDurationMs?: number;
  pollIntervalMs?: number;
  maxConcurrent?: number;
}

// Service response wrapper
export interface WhisperServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
  model?: WhisperModel;
}

// Health check response
export interface WhisperHealthCheckResult {
  available: boolean;
  executablePath: string;
  modelsAvailable: WhisperModel[];
  version?: string;
}

// Transcription completion result
export interface TranscriptionCompletionResult {
  transcriptionId: string;
  sessionId: string;
  status: TranscriptionStatus;
  fullText?: string;
  segmentsCount?: number;
  language?: string;
  processingDurationMs?: number;
  errorMessage?: string;
}
