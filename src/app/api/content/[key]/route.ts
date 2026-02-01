import { NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface SiteContent {
  id: number
  key: string
  title: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/content/[key]
 * 
 * Get site content by key (PUBLIC - no auth required)
 * Example: GET /api/content/about-us
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params
    const content = await queryOne<SiteContent>(
      'SELECT * FROM site_content WHERE key = ?',
      [key]
    )

    if (!content) {
      return apiError('Content not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse(content)
  } catch (error) {
    console.error('Get content error:', error)
    return apiError('Failed to fetch content', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/content/[key]
 * 
 * Update site content (GUILD_MASTER and COUNCIL only)
 * Body: { title?, content? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Only GUILD_MASTER and COUNCIL can edit content
  const user = authResult.user
  if (user.rank !== 'GUILD_MASTER' && user.rank !== 'COUNCIL') {
    return apiError(
      'Only Guild Master and Council can edit site content',
      HttpStatus.FORBIDDEN
    )
  }

  try {
    const { key } = await params
    
    // Check if content exists
    const existingContent = await queryOne<SiteContent>(
      'SELECT * FROM site_content WHERE key = ?',
      [key]
    )

    if (!existingContent) {
      return apiError('Content not found', HttpStatus.NOT_FOUND)
    }

    const body = await request.json()
    const { title, content } = body

    // Build update query
    const updates: string[] = []
    const values: any[] = []

    if (title !== undefined) {
      updates.push('title = ?')
      values.push(title)
    }

    if (content !== undefined) {
      updates.push('content = ?')
      values.push(content)
    }

    if (updates.length === 0) {
      return apiError('No updates provided', HttpStatus.BAD_REQUEST)
    }

    // Add updated_at
    updates.push("updated_at = DATETIME('now')")

    // Add key to values
    values.push(key)

    // Execute update
    await execute(
      `UPDATE site_content SET ${updates.join(', ')} WHERE key = ?`,
      values
    )

    // Get updated content
    const updatedContent = await queryOne<SiteContent>(
      'SELECT * FROM site_content WHERE key = ?',
      [key]
    )

    return apiResponse(updatedContent)
  } catch (error) {
    console.error('Update content error:', error)
    return apiError('Failed to update content', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
