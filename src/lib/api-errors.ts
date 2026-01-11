/**
 * API Error Classes
 * Custom error classes for consistent API error handling
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public errors?: Array<{ path: string; message: string }>
  ) {
    super(400, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(409, message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error') {
    super(500, message, 'INTERNAL_ERROR');
    this.name = 'InternalServerError';
  }
}

/**
 * Create a JSON error response from an error
 */
export function createErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof ValidationError && error.errors
            ? { errors: error.errors }
            : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle Zod validation errors
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
    return Response.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errors: zodError.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
      { status: 400 }
    );
  }

  // Handle generic errors
  console.error('Unhandled error:', error);
  return Response.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}
