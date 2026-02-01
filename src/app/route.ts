import { NextResponse } from 'next/server'
import { HttpStatus } from '@/lib/http-status'

// Root route - return API information as JSON only (no HTML)
export async function GET() {
  return NextResponse.json(
    {
      message: 'REST API Backend',
      version: '1.0.0',
      endpoints: {
        health: '/api/health',
        items: {
          list: 'GET /api/items',
          get: 'GET /api/items/[id]',
          create: 'POST /api/items',
          update: 'PUT /api/items/[id]',
          patch: 'PATCH /api/items/[id]',
          delete: 'DELETE /api/items/[id]',
        },
        test: {
          list: 'GET /api/test',
          getById: 'GET /api/test/[id]',
          getByTransactionId: 'GET /api/test/transaction/[transaction_id]',
          create: 'POST /api/test',
          update: 'PUT /api/test/[id]',
          patch: 'PATCH /api/test/[id]',
          delete: 'DELETE /api/test/[id]',
        },
      },
    },
    {
      status: HttpStatus.OK,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}
