import { NextResponse } from 'next/server'
import { HttpStatus } from './http-status'
import { handleError } from './errors'

// Standard API response interface
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

// Success response helper
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status: statusCode }
  )
}

// Error response helper
export function errorResponse(
  error: unknown,
  statusCode?: number
): NextResponse<ApiResponse> {
  const errorData = handleError(error)
  const finalStatusCode = statusCode || errorData.statusCode

  return NextResponse.json(
    {
      success: false,
      message: errorData.message,
      ...(errorData.errors && { errors: errorData.errors }),
    },
    { status: finalStatusCode }
  )
}

// Created response (201)
export function createdResponse<T>(
  data: T,
  message?: string
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message || 'Resource created successfully', HttpStatus.CREATED)
}

// No content response (204)
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: HttpStatus.NO_CONTENT })
}

// Not found response (404)
export function notFoundResponse(message?: string): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message: message || 'Resource not found',
    },
    { status: HttpStatus.NOT_FOUND }
  )
}

// Paginated response helper
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(total / limit)

  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    },
    { status: HttpStatus.OK }
  )
}

// Simple success response (alias for auth system)
export function apiResponse<T>(
  data: T,
  statusCode: number = HttpStatus.OK
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: statusCode }
  )
}

// Simple error response (alias for auth system)
export function apiError(
  message: string,
  statusCode: number = HttpStatus.BAD_REQUEST
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status: statusCode }
  )
}