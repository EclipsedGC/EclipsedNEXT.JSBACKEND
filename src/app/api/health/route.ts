import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { testConnection } from '@/lib/db'
import { HttpStatus } from '@/lib/http-status'

// GET /api/health - Health check endpoint
export async function GET(req: NextRequest) {
  try {
    const dbConnected = await testConnection()

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbConnected ? 'connected' : 'disconnected',
    }

    const statusCode = dbConnected ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE

    return successResponse(health, 'Health check completed', statusCode)
  } catch (error) {
    return errorResponse(error, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
