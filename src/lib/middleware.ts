import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from './api-response'
import { handleError } from './errors'
import { HttpStatus } from './http-status'

// Async handler wrapper to catch errors
export function asyncHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context)
    } catch (error) {
      console.error('API Error:', error)
      return errorResponse(error)
    }
  }
}

// Method handler - handles different HTTP methods
export function methodHandler(handlers: {
  GET?: (req: NextRequest, context?: any) => Promise<NextResponse>
  POST?: (req: NextRequest, context?: any) => Promise<NextResponse>
  PUT?: (req: NextRequest, context?: any) => Promise<NextResponse>
  PATCH?: (req: NextRequest, context?: any) => Promise<NextResponse>
  DELETE?: (req: NextRequest, context?: any) => Promise<NextResponse>
  OPTIONS?: (req: NextRequest, context?: any) => Promise<NextResponse>
}) {
  return asyncHandler(async (req: NextRequest, context?: any) => {
    const method = req.method as keyof typeof handlers
    const handler = handlers[method]

    if (!handler) {
      return NextResponse.json(
        {
          success: false,
          message: `Method ${method} not allowed`,
        },
        { status: HttpStatus.METHOD_NOT_ALLOWED }
      )
    }

    return await handler(req, context)
  })
}

// Validate request body helper
export async function validateBody<T>(
  req: NextRequest,
  validator: (body: any) => body is T
): Promise<T> {
  try {
    const body = await req.json()
    
    if (!validator(body)) {
      throw new Error('Invalid request body')
    }

    return body
  } catch (error) {
    throw new Error('Invalid JSON in request body')
  }
}

// Get query parameters helper
export function getQueryParams(req: NextRequest): URLSearchParams {
  return new URLSearchParams(req.nextUrl.searchParams)
}

// Get pagination parameters from query
export function getPaginationParams(req: NextRequest): {
  page: number
  limit: number
  offset: number
} {
  const params = getQueryParams(req)
  const page = Math.max(1, parseInt(params.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '10', 10)))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}
