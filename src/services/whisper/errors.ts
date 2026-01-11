/**
 * Whisper Service Errors
 * Custom error classes for Whisper transcription operations
 */

export class WhisperError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly exitCode?: number;

  constructor(
    message: string,
    code: string,
    retryable: boolean = false,
    exitCode?: number
  ) {
    super(message);
    this.name = 'WhisperError';
    this.code = code;
    this.retryable = retryable;
    this.exitCode = exitCode;
    Object.setPrototypeOf(this, WhisperError.prototype);
  }
}

export class WhisperNotFoundError extends WhisperError {
  public readonly executablePath: string;

  constructor(executablePath: string) {
    super(
      `Whisper executable not found at: ${executablePath}`,
      'WHISPER_NOT_FOUND',
      false
    );
    this.name = 'WhisperNotFoundError';
    this.executablePath = executablePath;
    Object.setPrototypeOf(this, WhisperNotFoundError.prototype);
  }
}

export class WhisperModelNotFoundError extends WhisperError {
  public readonly model: string;
  public readonly modelPath: string;

  constructor(model: string, modelPath: string) {
    super(
      `Whisper model '${model}' not found at: ${modelPath}`,
      'MODEL_NOT_FOUND',
      false
    );
    this.name = 'WhisperModelNotFoundError';
    this.model = model;
    this.modelPath = modelPath;
    Object.setPrototypeOf(this, WhisperModelNotFoundError.prototype);
  }
}

export class WhisperTimeoutError extends WhisperError {
  public readonly timeoutMs: number;
  public readonly audioFilePath: string;

  constructor(timeoutMs: number, audioFilePath: string) {
    super(
      `Whisper transcription timed out after ${timeoutMs}ms for: ${audioFilePath}`,
      'TIMEOUT_ERROR',
      true
    );
    this.name = 'WhisperTimeoutError';
    this.timeoutMs = timeoutMs;
    this.audioFilePath = audioFilePath;
    Object.setPrototypeOf(this, WhisperTimeoutError.prototype);
  }
}

export class WhisperAudioError extends WhisperError {
  public readonly audioFilePath: string;
  public readonly audioFormat?: string;
  public readonly reason: string;

  constructor(audioFilePath: string, reason: string, audioFormat?: string) {
    super(
      `Audio file error for '${audioFilePath}': ${reason}`,
      'AUDIO_ERROR',
      false
    );
    this.name = 'WhisperAudioError';
    this.audioFilePath = audioFilePath;
    this.audioFormat = audioFormat;
    this.reason = reason;
    Object.setPrototypeOf(this, WhisperAudioError.prototype);
  }
}

export class WhisperProcessError extends WhisperError {
  public readonly stderr: string;

  constructor(message: string, exitCode: number, stderr: string) {
    super(
      `Whisper process error: ${message}`,
      'PROCESS_ERROR',
      exitCode !== 0 && exitCode !== 1, // Exit codes 2+ might be retryable (resource issues)
      exitCode
    );
    this.name = 'WhisperProcessError';
    this.stderr = stderr;
    Object.setPrototypeOf(this, WhisperProcessError.prototype);
  }
}

export class WhisperOutputParseError extends WhisperError {
  public readonly rawOutput: string;

  constructor(message: string, rawOutput: string) {
    super(
      `Failed to parse Whisper output: ${message}`,
      'OUTPUT_PARSE_ERROR',
      false
    );
    this.name = 'WhisperOutputParseError';
    this.rawOutput = rawOutput;
    Object.setPrototypeOf(this, WhisperOutputParseError.prototype);
  }
}

export class WhisperQueueError extends WhisperError {
  public readonly sessionId?: string;
  public readonly queueItemId?: string;

  constructor(message: string, sessionId?: string, queueItemId?: string) {
    super(
      `Queue error: ${message}`,
      'QUEUE_ERROR',
      true
    );
    this.name = 'WhisperQueueError';
    this.sessionId = sessionId;
    this.queueItemId = queueItemId;
    Object.setPrototypeOf(this, WhisperQueueError.prototype);
  }
}

export class WhisperLockError extends WhisperError {
  public readonly queueItemId: string;
  public readonly lockedBy?: string;
  public readonly lockedUntil?: Date;

  constructor(queueItemId: string, lockedBy?: string, lockedUntil?: Date) {
    super(
      `Queue item ${queueItemId} is locked by ${lockedBy || 'another worker'}`,
      'LOCK_ERROR',
      true
    );
    this.name = 'WhisperLockError';
    this.queueItemId = queueItemId;
    this.lockedBy = lockedBy;
    this.lockedUntil = lockedUntil;
    Object.setPrototypeOf(this, WhisperLockError.prototype);
  }
}

export class WhisperMaxRetriesError extends WhisperError {
  public readonly sessionId: string;
  public readonly attempts: number;
  public readonly maxAttempts: number;
  public readonly lastError?: string;

  constructor(sessionId: string, attempts: number, maxAttempts: number, lastError?: string) {
    super(
      `Maximum retry attempts (${maxAttempts}) exceeded for session ${sessionId}`,
      'MAX_RETRIES_ERROR',
      false
    );
    this.name = 'WhisperMaxRetriesError';
    this.sessionId = sessionId;
    this.attempts = attempts;
    this.maxAttempts = maxAttempts;
    this.lastError = lastError;
    Object.setPrototypeOf(this, WhisperMaxRetriesError.prototype);
  }
}

export class WhisperResourceError extends WhisperError {
  public readonly resourceType: 'memory' | 'disk' | 'cpu';
  public readonly required?: number;
  public readonly available?: number;

  constructor(
    resourceType: 'memory' | 'disk' | 'cpu',
    message: string,
    required?: number,
    available?: number
  ) {
    super(
      `Insufficient ${resourceType}: ${message}`,
      'RESOURCE_ERROR',
      true // Resource issues might resolve on retry
    );
    this.name = 'WhisperResourceError';
    this.resourceType = resourceType;
    this.required = required;
    this.available = available;
    Object.setPrototypeOf(this, WhisperResourceError.prototype);
  }
}

// Error factory for converting exit codes to typed errors
export function createWhisperError(
  exitCode: number,
  stderr: string,
  audioFilePath?: string
): WhisperError {
  // Common exit codes from whisper.cpp
  switch (exitCode) {
    case 1:
      // General error - check stderr for more info
      if (stderr.includes('model') && stderr.includes('not found')) {
        const modelMatch = stderr.match(/model[:\s]+(\S+)/i);
        return new WhisperModelNotFoundError(
          modelMatch?.[1] || 'unknown',
          'unknown'
        );
      }
      if (stderr.includes('audio') || stderr.includes('file')) {
        return new WhisperAudioError(
          audioFilePath || 'unknown',
          stderr.trim() || 'Unknown audio error'
        );
      }
      return new WhisperProcessError('General error', exitCode, stderr);

    case 2:
      // Invalid arguments
      return new WhisperProcessError('Invalid arguments', exitCode, stderr);

    case 3:
      // Model loading error
      const modelMatch = stderr.match(/ggml-(\S+)\.bin/);
      return new WhisperModelNotFoundError(
        modelMatch?.[1] || 'unknown',
        stderr
      );

    case 137:
    case 9:
      // Killed (likely OOM)
      return new WhisperResourceError(
        'memory',
        'Process was killed, possibly due to out of memory'
      );

    default:
      return new WhisperProcessError(
        `Process exited with code ${exitCode}`,
        exitCode,
        stderr
      );
  }
}

// Type guard for WhisperError
export function isWhisperError(error: unknown): error is WhisperError {
  return error instanceof WhisperError;
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (isWhisperError(error)) {
    return error.retryable;
  }
  // Network/system errors are typically retryable
  if (error instanceof Error) {
    const retryablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'EBUSY',
      'EAGAIN',
      'ENOMEM',
      'EMFILE',
      'ENFILE',
    ];
    return retryablePatterns.some(pattern => error.message.includes(pattern));
  }
  return false;
}

// Get error severity for logging
export function getErrorSeverity(error: unknown): 'debug' | 'info' | 'warning' | 'error' | 'critical' {
  if (!isWhisperError(error)) {
    return 'error';
  }

  switch (error.code) {
    case 'LOCK_ERROR':
      return 'info'; // Expected in concurrent processing
    case 'TIMEOUT_ERROR':
    case 'RESOURCE_ERROR':
      return 'warning';
    case 'WHISPER_NOT_FOUND':
    case 'MODEL_NOT_FOUND':
    case 'MAX_RETRIES_ERROR':
      return 'critical';
    case 'AUDIO_ERROR':
    case 'OUTPUT_PARSE_ERROR':
    case 'PROCESS_ERROR':
      return 'error';
    default:
      return 'error';
  }
}
