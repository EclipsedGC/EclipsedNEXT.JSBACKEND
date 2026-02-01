// Custom error classes for different error types

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request') {
    super(message, 400)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409)
  }
}

export class ValidationError extends AppError {
  errors: Record<string, string[]>

  constructor(message: string = 'Validation failed', errors?: Record<string, string[]>) {
    super(message, 422)
    this.errors = errors || {}
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500)
  }
}

// Error handler middleware
export function handleError(error: unknown): {
  statusCode: number
  message: string
  errors?: Record<string, string[]>
  stack?: string
} {
  // Handle known AppError instances
  if (error instanceof AppError) {
    const response: any = {
      statusCode: error.statusCode,
      message: error.message,
    }

    if (error instanceof ValidationError) {
      response.errors = error.errors
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack
    }

    return response
  }

  // Handle MySQL errors
  if (error && typeof error === 'object' && 'code' in error) {
    const mysqlError = error as any

    switch (mysqlError.code) {
      case 'ER_DUP_ENTRY':
        return {
          statusCode: 409,
          message: 'Duplicate entry. Resource already exists.',
        }
      case 'ER_NO_REFERENCED_ROW_2':
        return {
          statusCode: 400,
          message: 'Referenced resource does not exist.',
        }
      case 'ER_BAD_FIELD_ERROR':
        return {
          statusCode: 400,
          message: 'Invalid field in query.',
        }
      case 'ECONNREFUSED':
        return {
          statusCode: 503,
          message: 'Database connection refused. Service unavailable.',
        }
      default:
        return {
          statusCode: 500,
          message: 'Database error occurred.',
          stack: process.env.NODE_ENV === 'development' ? mysqlError.stack : undefined,
        }
    }
  }

  // Handle unknown errors
  return {
    statusCode: 500,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
  }
}
