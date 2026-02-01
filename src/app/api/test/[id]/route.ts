import { NextRequest } from 'next/server'
import { successResponse, noContentResponse, errorResponse, notFoundResponse } from '@/lib/api-response'
import { query, queryOne } from '@/lib/db'
import { BadRequestError, ValidationError } from '@/lib/errors'

// GET /api/test/[id] - Get a single test record by ID
async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid record ID')
    }

    const record = await queryOne('SELECT * FROM test WHERE id = ?', [id])

    if (!record) {
      return notFoundResponse('Test record not found')
    }

    return successResponse(record, 'Test record retrieved successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// GET /api/test/transaction/[transaction_id] - Get a record by transaction_id
// Note: This would need a separate route file, but for now we'll use the ID route

// PUT /api/test/[id] - Update a test record (full update)
async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid record ID')
    }

    // Check if record exists
    const existing = await queryOne('SELECT * FROM test WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Test record not found')
    }

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

    // Check for duplicate transaction_id (excluding current record)
    const duplicate = await queryOne(
      'SELECT id FROM test WHERE transaction_id = ? AND id != ?',
      [body.transaction_id.trim(), id]
    )
    if (duplicate) {
      throw new ValidationError('Record with this transaction_id already exists', {
        transaction_id: ['Record with this transaction_id already exists'],
      })
    }

    // Update record
    await query(
      "UPDATE test SET transaction_id = ?, amount = ?, updated_at = DATETIME('now') WHERE id = ?",
      [body.transaction_id.trim(), amount, id]
    )

    // Get updated record
    const updatedRecord = await queryOne('SELECT * FROM test WHERE id = ?', [id])

    if (!updatedRecord) {
      throw new Error('Failed to retrieve updated record')
    }

    return successResponse(updatedRecord, 'Test record updated successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH /api/test/[id] - Partially update a test record
async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid record ID')
    }

    // Check if record exists
    const existing = await queryOne('SELECT * FROM test WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Test record not found')
    }

    const body = await req.json()

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []

    if (body.transaction_id !== undefined) {
      if (typeof body.transaction_id !== 'string' || body.transaction_id.trim().length === 0) {
        throw new ValidationError('transaction_id must be a non-empty string', {
          transaction_id: ['transaction_id must be a non-empty string'],
        })
      }

      // Check for duplicate transaction_id (excluding current record)
      const duplicate = await queryOne(
        'SELECT id FROM test WHERE transaction_id = ? AND id != ?',
        [body.transaction_id.trim(), id]
      )
      if (duplicate) {
        throw new ValidationError('Record with this transaction_id already exists', {
          transaction_id: ['Record with this transaction_id already exists'],
        })
      }

      updates.push('transaction_id = ?')
      values.push(body.transaction_id.trim())
    }

    if (body.amount !== undefined) {
      const amount = parseFloat(body.amount)
      if (isNaN(amount) || amount < 0) {
        throw new ValidationError('amount must be a valid positive number', {
          amount: ['amount must be a valid positive number'],
        })
      }

      updates.push('amount = ?')
      values.push(amount)
    }

    if (updates.length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    updates.push("updated_at = DATETIME('now')")
    values.push(id)

    // Update record
    await query(`UPDATE test SET ${updates.join(', ')} WHERE id = ?`, values)

    // Get updated record
    const updatedRecord = await queryOne('SELECT * FROM test WHERE id = ?', [id])

    if (!updatedRecord) {
      throw new Error('Failed to retrieve updated record')
    }

    return successResponse(updatedRecord, 'Test record updated successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/test/[id] - Delete a test record
async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid record ID')
    }

    // Check if record exists
    const existing = await queryOne('SELECT id FROM test WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Test record not found')
    }

    // Delete record
    await query('DELETE FROM test WHERE id = ?', [id])

    return noContentResponse()
  } catch (error) {
    return errorResponse(error)
  }
}

export { GET, PUT, PATCH, DELETE }
