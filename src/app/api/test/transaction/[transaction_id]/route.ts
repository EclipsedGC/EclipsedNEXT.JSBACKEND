import { NextRequest } from 'next/server'
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response'
import { queryOne } from '@/lib/db'
import { BadRequestError } from '@/lib/errors'

// GET /api/test/transaction/[transaction_id] - Get a test record by transaction_id
export async function GET(
  req: NextRequest,
  { params }: { params: { transaction_id: string } }
) {
  try {
    const transactionId = params.transaction_id

    if (!transactionId || transactionId.trim().length === 0) {
      throw new BadRequestError('transaction_id is required')
    }

    const record = await queryOne(
      'SELECT * FROM test WHERE transaction_id = ?',
      [transactionId.trim()]
    )

    if (!record) {
      return notFoundResponse('Test record not found')
    }

    return successResponse(record, 'Test record retrieved successfully')
  } catch (error) {
    return errorResponse(error)
  }
}
