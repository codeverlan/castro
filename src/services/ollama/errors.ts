/**
 * Ollama Service Errors
 * Custom error classes for Ollama API operations
 */

export class OllamaError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'OllamaError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    Object.setPrototypeOf(this, OllamaError.prototype);
  }
}

export class OllamaConnectionError extends OllamaError {
  constructor(message: string = 'Failed to connect to Ollama server') {
    super(message, 'CONNECTION_ERROR', undefined, true);
    this.name = 'OllamaConnectionError';
    Object.setPrototypeOf(this, OllamaConnectionError.prototype);
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(message: string = 'Request to Ollama server timed out') {
    super(message, 'TIMEOUT_ERROR', 408, true);
    this.name = 'OllamaTimeoutError';
    Object.setPrototypeOf(this, OllamaTimeoutError.prototype);
  }
}

export class OllamaModelNotFoundError extends OllamaError {
  public readonly model: string;

  constructor(model: string) {
    super(`Model '${model}' not found on Ollama server`, 'MODEL_NOT_FOUND', 404, false);
    this.name = 'OllamaModelNotFoundError';
    this.model = model;
    Object.setPrototypeOf(this, OllamaModelNotFoundError.prototype);
  }
}

export class OllamaValidationError extends OllamaError {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, false);
    this.name = 'OllamaValidationError';
    this.field = field;
    Object.setPrototypeOf(this, OllamaValidationError.prototype);
  }
}

export class OllamaRateLimitError extends OllamaError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super('Rate limit exceeded on Ollama server', 'RATE_LIMIT_ERROR', 429, true);
    this.name = 'OllamaRateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, OllamaRateLimitError.prototype);
  }
}

export class OllamaServerError extends OllamaError {
  constructor(message: string = 'Internal server error on Ollama server', statusCode: number = 500) {
    super(message, 'SERVER_ERROR', statusCode, true);
    this.name = 'OllamaServerError';
    Object.setPrototypeOf(this, OllamaServerError.prototype);
  }
}

// Error factory for converting HTTP responses to typed errors
export function createOllamaError(
  statusCode: number,
  message?: string,
  model?: string
): OllamaError {
  switch (statusCode) {
    case 404:
      if (model) {
        return new OllamaModelNotFoundError(model);
      }
      return new OllamaError(message || 'Resource not found', 'NOT_FOUND', 404, false);

    case 400:
      return new OllamaValidationError(message || 'Invalid request');

    case 408:
      return new OllamaTimeoutError(message);

    case 429:
      return new OllamaRateLimitError();

    case 500:
    case 502:
    case 503:
    case 504:
      return new OllamaServerError(message, statusCode);

    default:
      return new OllamaError(
        message || `HTTP error ${statusCode}`,
        'HTTP_ERROR',
        statusCode,
        statusCode >= 500
      );
  }
}

// Type guard for OllamaError
export function isOllamaError(error: unknown): error is OllamaError {
  return error instanceof OllamaError;
}

// Check if error is retryable
export function isRetryableError(error: unknown): boolean {
  if (isOllamaError(error)) {
    return error.retryable;
  }
  // Network errors are typically retryable
  if (error instanceof Error) {
    const networkErrors = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];
    return networkErrors.some(code => error.message.includes(code));
  }
  return false;
}
