import { NextRequest } from 'next/server'
import { successResponse, createdResponse, paginatedResponse, errorResponse } from '@/lib/api-response'
import { query, queryOne, execute } from '@/lib/db'
import { ValidationError } from '@/lib/errors'

// GET /api/items - Get all items with pagination
async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)))
  const offset = (page - 1) * limit
  const search = searchParams.get('search') || ''

  try {
    // Build query with optional search
    let countQuery = 'SELECT COUNT(*) as total FROM items'
    let dataQuery = 'SELECT * FROM items'
    const params: any[] = []

    if (search) {
      const searchCondition = 'WHERE name LIKE ? OR description LIKE ?'
      countQuery += ` ${searchCondition}`
      dataQuery += ` ${searchCondition} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      params.push(`%${search}%`, `%${search}%`, limit, offset)
    } else {
      dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)
    }

    // Get total count
    const [countResult] = await query<{ total: number }>(countQuery, search ? [`%${search}%`, `%${search}%`] : [])
    const total = countResult?.total || 0

    // Get paginated items
    const items = await query(dataQuery, params)

    return paginatedResponse(items, page, limit, total, 'Items retrieved successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/items - Create a new item
async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validation
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new ValidationError('Name is required and must be a non-empty string', {
        name: ['Name is required'],
      })
    }

    if (body.description && typeof body.description !== 'string') {
      throw new ValidationError('Description must be a string', {
        description: ['Description must be a string'],
      })
    }

    // Check for duplicate name
    const existing = await queryOne('SELECT id FROM items WHERE name = ?', [body.name.trim()])
    if (existing) {
      throw new ValidationError('Item with this name already exists', {
        name: ['Item with this name already exists'],
      })
    }

    // Insert new item
    const result = await execute(
      'INSERT INTO items (name, description, price, stock) VALUES (?, ?, ?, ?)',
      [
        body.name.trim(),
        body.description?.trim() || null,
        body.price || null,
        body.stock || null,
      ]
    )

    // Get the created item
    const insertId = Number(result.lastInsertRowid)
    const newItem = await queryOne('SELECT * FROM items WHERE id = ?', [insertId])

    if (!newItem) {
      throw new Error('Failed to retrieve created item')
    }

    return createdResponse(newItem, 'Item created successfully')
  } catch (error) {
    return errorResponse(error)
  }
}

export { GET, POST }
