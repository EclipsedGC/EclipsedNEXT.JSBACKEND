import { NextRequest } from 'next/server'
import { successResponse, createdResponse, paginatedResponse, errorResponse } from '@/lib/api-response'
import { query, queryOne, execute } from '@/lib/db'
import { ValidationError } from '@/lib/errors'

// GET /api/test - Get all test records with pagination
async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
  const offset = (page - 1) * limit
  const search = searchParams.get('search') || ''

  try {
    // Build query with optional search
    let countQuery = 'SELECT COUNT(*) as total FROM test'
    let dataQuery = 'SELECT * FROM test'
    const params: any[] = []

    if (search) {
      const searchCondition = 'WHERE transaction_id LIKE ?'
      countQuery += ` ${searchCondition}`
      dataQuery += ` ${searchCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      params.push(`%${search}%`, limit, offset)
    } else {
      dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }

    // Get total count
    const [countResult] = await query<{ total: number }>(
      countQuery,
      search ? [`%${search}%`] : []
    )
    const total = countResult?.total || 0

    // Get paginated records
    const records = await query(dataQuery, params)

    return paginatedResponse(records, page, limit, total, 'Test records retrieved successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/test - Create a new test record
async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validation
    if (!body.transaction_id || typeof body.transaction_id !== 'string' || body.transaction_id.trim().length === 0) {
      throw new ValidationError('transaction_id is required and must be a non-empty string', {
        transaction_id: ['transaction_id is required'],
      })
    }

    if (body.amount === undefined || body.amount === null) {
      throw new ValidationError('amount is required', {
        amount: ['amount is required'],
      })
    }

    const amount = parseFloat(body.amount)
    if (isNaN(amount) || amount < 0) {
      throw new ValidationError('amount must be a valid positive number', {
        amount: ['amount must be a valid positive number'],
      })
    }

    // Check for duplicate transaction_id
    const existing = await queryOne(
      'SELECT id FROM test WHERE transaction_id = ?',
      [body.transaction_id.trim()]
    )
    if (existing) {
      throw new ValidationError('Record with this transaction_id already exists', {
        transaction_id: ['Record with this transaction_id already exists'],
      })
    }

    // Insert new record
    const result = await execute(
      'INSERT INTO test (transaction_id, amount) VALUES (?, ?)',
      [body.transaction_id.trim(), amount]
    )

    // Get the created record
    const insertId = Number(result.lastInsertRowid)
    const newRecord = await queryOne('SELECT * FROM test WHERE id = ?', [insertId])

    if (!newRecord) {
      throw new Error('Failed to retrieve created record')
    }

    return createdResponse(newRecord, 'Test record created successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

export { GET, POST }
