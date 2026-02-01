import { NextRequest } from 'next/server'
import { successResponse, noContentResponse, errorResponse, notFoundResponse } from '@/lib/api-response'
import { query, queryOne } from '@/lib/db'
import { BadRequestError, ValidationError } from '@/lib/errors'

// GET /api/items/[id] - Get a single item by ID
async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid item ID')
    }

    const item = await queryOne('SELECT * FROM items WHERE id = ?', [id])

    if (!item) {
      return notFoundResponse('Item not found')
    }

    return successResponse(item, 'Item retrieved successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// PUT /api/items/[id] - Update an item (full update)
async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid item ID')
    }

    // Check if item exists
    const existing = await queryOne('SELECT * FROM items WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Item not found')
    }

    const body = await req.json()

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new ValidationError('Name is required and must be a non-empty string', {
        name: ['Name is required'],
      })
    }

    // Check for duplicate name (excluding current item)
    const duplicate = await queryOne('SELECT id FROM items WHERE name = ? AND id != ?', [
      body.name.trim(),
      id,
    ])
    if (duplicate) {
      throw new ValidationError('Item with this name already exists', {
        name: ['Item with this name already exists'],
      })
    }

    // Update item
    await query(
      "UPDATE items SET name = ?, description = ?, price = ?, stock = ?, updated_at = DATETIME('now') WHERE id = ?",
      [
        body.name.trim(),
        body.description?.trim() || null,
        body.price || null,
        body.stock || null,
        id,
      ]
    )

    // Get updated item
    const updatedItem = await queryOne('SELECT * FROM items WHERE id = ?', [id])

    if (!updatedItem) {
      throw new Error('Failed to retrieve updated item')
    }

    return successResponse(updatedItem, 'Item updated successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH /api/items/[id] - Partially update an item
async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid item ID')
    }

    // Check if item exists
    const existing = await queryOne('SELECT * FROM items WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Item not found')
    }

    const body = await req.json()

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new ValidationError('Name must be a non-empty string', {
          name: ['Name must be a non-empty string'],
        })
      }

      // Check for duplicate name (excluding current item)
      const duplicate = await queryOne('SELECT id FROM items WHERE name = ? AND id != ?', [
        body.name.trim(),
        id,
      ])
      if (duplicate) {
        throw new ValidationError('Item with this name already exists', {
          name: ['Item with this name already exists'],
        })
      }

      updates.push('name = ?')
      values.push(body.name.trim())
    }

    if (body.description !== undefined) {
      updates.push('description = ?')
      values.push(body.description?.trim() || null)
    }

    if (body.price !== undefined) {
      updates.push('price = ?')
      values.push(body.price || null)
    }

    if (body.stock !== undefined) {
      updates.push('stock = ?')
      values.push(body.stock || null)
    }

    if (updates.length === 0) {
      throw new BadRequestError('No valid fields to update')
    }

    updates.push("updated_at = DATETIME('now')")
    values.push(id)

    // Update item
    await query(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`, values)

    // Get updated item
    const updatedItem = await queryOne('SELECT * FROM items WHERE id = ?', [id])

    if (!updatedItem) {
      throw new Error('Failed to retrieve updated item')
    }

    return successResponse(updatedItem, 'Item updated successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/items/[id] - Delete an item
async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)

    if (isNaN(id) || id <= 0) {
      throw new BadRequestError('Invalid item ID')
    }

    // Check if item exists
    const existing = await queryOne('SELECT id FROM items WHERE id = ?', [id])
    if (!existing) {
      return notFoundResponse('Item not found')
    }

    // Delete item
    await query('DELETE FROM items WHERE id = ?', [id])

    return noContentResponse()
  } catch (error) {
    return errorResponse(error)
  }
}

export { GET, PUT, PATCH, DELETE }
