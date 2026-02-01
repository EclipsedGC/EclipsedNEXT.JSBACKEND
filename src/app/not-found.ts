import { NextResponse } from 'next/server'
import { HttpStatus } from '@/lib/http-status'

// Handle 404 for all non-API routes - return JSON instead of HTML
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: 'Route not found. This is an API-only backend.',
      availableEndpoints: {
        root: 'GET /',
        health: 'GET /api/health',
        items: 'GET /api/items',
      },
    },
    { status: HttpStatus.NOT_FOUND }
  )
}
