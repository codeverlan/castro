/**
 * Note Generation Service Errors
 * Custom error classes for clinical note generation operations
 */

export class NoteGenerationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    retryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NoteGenerationError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.context = context;
    Object.setPrototypeOf(this, NoteGenerationError.prototype);
  }
}

/**
 * Session not found or invalid for note generation
 */
export class SessionNotFoundError extends NoteGenerationError {
  public readonly sessionId: string;

  constructor(sessionId: string) {
    super(
      `Session '${sessionId}' not found or not ready for note generation`,
      'SESSION_NOT_FOUND',
      404,
      false,
      { sessionId }
    );
    this.name = 'SessionNotFoundError';
    this.sessionId = sessionId;
    Object.setPrototypeOf(this, SessionNotFoundError.prototype);
  }
}

/**
 * Template not found or invalid
 */
export class TemplateNotFoundError extends NoteGenerationError {
  public readonly templateId: string;

  constructor(templateId: string) {
    super(
      `Note template '${templateId}' not found`,
      'TEMPLATE_NOT_FOUND',
      404,
      false,
      { templateId }
    );
    this.name = 'TemplateNotFoundError';
    this.templateId = templateId;
    Object.setPrototypeOf(this, TemplateNotFoundError.prototype);
  }
}

/**
 * Note not found
 */
export class NoteNotFoundError extends NoteGenerationError {
  public readonly noteId: string;

  constructor(noteId: string) {
    super(
      `Note '${noteId}' not found`,
      'NOTE_NOT_FOUND',
      404,
      false,
      { noteId }
    );
    this.name = 'NoteNotFoundError';
    this.noteId = noteId;
    Object.setPrototypeOf(this, NoteNotFoundError.prototype);
  }
}

/**
 * Insufficient content for note generation
 */
export class InsufficientContentError extends NoteGenerationError {
  public readonly sessionId: string;
  public readonly missingSections?: string[];

  constructor(sessionId: string, missingSections?: string[]) {
    const message = missingSections?.length
      ? `Insufficient content for note generation in session '${sessionId}'. Missing sections: ${missingSections.join(', ')}`
      : `Insufficient content for note generation in session '${sessionId}'`;

    super(
      message,
      'INSUFFICIENT_CONTENT',
      400,
      false,
      { sessionId, missingSections }
    );
    this.name = 'InsufficientContentError';
    this.sessionId = sessionId;
    this.missingSections = missingSections;
    Object.setPrototypeOf(this, InsufficientContentError.prototype);
  }
}

/**
 * LLM processing failure during note generation
 */
export class LLMProcessingError extends NoteGenerationError {
  public readonly operation: string;
  public readonly originalError?: string;

  constructor(operation: string, originalError?: string) {
    super(
      `LLM processing failed during ${operation}: ${originalError || 'Unknown error'}`,
      'LLM_PROCESSING_ERROR',
      500,
      true,
      { operation, originalError }
    );
    this.name = 'LLMProcessingError';
    this.operation = operation;
    this.originalError = originalError;
    Object.setPrototypeOf(this, LLMProcessingError.prototype);
  }
}

/**
 * Invalid JSON response from LLM
 */
export class LLMResponseParseError extends NoteGenerationError {
  public readonly rawResponse?: string;

  constructor(message: string = 'Failed to parse LLM response', rawResponse?: string) {
    super(
      message,
      'LLM_RESPONSE_PARSE_ERROR',
      500,
      true,
      { rawResponse: rawResponse?.substring(0, 500) }
    );
    this.name = 'LLMResponseParseError';
    this.rawResponse = rawResponse;
    Object.setPrototypeOf(this, LLMResponseParseError.prototype);
  }
}

/**
 * Validation error for note generation input
 */
export class NoteValidationError extends NoteGenerationError {
  public readonly field?: string;
  public readonly validationErrors?: string[];

  constructor(message: string, field?: string, validationErrors?: string[]) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      false,
      { field, validationErrors }
    );
    this.name = 'NoteValidationError';
    this.field = field;
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, NoteValidationError.prototype);
  }
}

/**
 * Database operation failure
 */
export class NoteDatabaseError extends NoteGenerationError {
  public readonly operation: string;
  public readonly originalError?: string;

  constructor(operation: string, originalError?: string) {
    super(
      `Database operation failed: ${operation}`,
      'DATABASE_ERROR',
      500,
      true,
      { operation, originalError }
    );
    this.name = 'NoteDatabaseError';
    this.operation = operation;
    this.originalError = originalError;
    Object.setPrototypeOf(this, NoteDatabaseError.prototype);
  }
}

/**
 * Note generation timeout
 */
export class NoteGenerationTimeoutError extends NoteGenerationError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(
      `Note generation timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408,
      true,
      { timeoutMs }
    );
    this.name = 'NoteGenerationTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, NoteGenerationTimeoutError.prototype);
  }
}

/**
 * Error factory for creating appropriate error type
 */
export function createNoteGenerationError(
  code: string,
  message: string,
  context?: Record<string, unknown>
): NoteGenerationError {
  switch (code) {
    case 'SESSION_NOT_FOUND':
      return new SessionNotFoundError(context?.sessionId as string || 'unknown');
    case 'TEMPLATE_NOT_FOUND':
      return new TemplateNotFoundError(context?.templateId as string || 'unknown');
    case 'NOTE_NOT_FOUND':
      return new NoteNotFoundError(context?.noteId as string || 'unknown');
    case 'INSUFFICIENT_CONTENT':
      return new InsufficientContentError(
        context?.sessionId as string || 'unknown',
        context?.missingSections as string[] | undefined
      );
    case 'LLM_PROCESSING_ERROR':
      return new LLMProcessingError(
        context?.operation as string || 'unknown',
        context?.originalError as string | undefined
      );
    case 'VALIDATION_ERROR':
      return new NoteValidationError(
        message,
        context?.field as string | undefined,
        context?.validationErrors as string[] | undefined
      );
    default:
      return new NoteGenerationError(message, code, 500, false, context);
  }
}

/**
 * Type guard for NoteGenerationError
 */
export function isNoteGenerationError(error: unknown): error is NoteGenerationError {
  return error instanceof NoteGenerationError;
}

/**
 * Check if error is retryable
 */
export function isRetryableNoteError(error: unknown): boolean {
  if (isNoteGenerationError(error)) {
    return error.retryable;
  }
  if (error instanceof Error) {
    const retryablePatterns = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'timeout'];
    return retryablePatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  return false;
}
