import { NextRequest } from 'next/server'
import { queryOne, query, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface User {
  id: number
  username: string
  rank: string
}

interface RecoveryRequest {
  id: number
  user_id: number
  status: 'pending' | 'resolved'
  created_at: string
  resolved_at: string | null
  resolved_by: number | null
}

interface RecoveryWithUser extends RecoveryRequest {
  username: string
}

/**
 * POST /api/auth/recovery
 * 
 * Create a password recovery request (PUBLIC - no auth required)
 * Body: { username: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username } = body

    if (!username) {
      return apiError('Username is required', HttpStatus.BAD_REQUEST)
    }

    // Check if user exists
    const user = await queryOne<User>(
      'SELECT id, username, rank FROM users WHERE username = ?',
      [username]
    )

    if (!user) {
      // Don't reveal if username doesn't exist
      return apiError('Username not found', HttpStatus.NOT_FOUND)
    }

    // Don't allow recovery requests for Guildmasters
    if (user.rank === 'GUILD_MASTER') {
      return apiError('Recovery not available for this account', HttpStatus.FORBIDDEN)
    }

    // Check for existing pending request
    const existingRequest = await queryOne<RecoveryRequest>(
      'SELECT * FROM password_recovery_requests WHERE user_id = ? AND status = ?',
      [user.id, 'pending']
    )

    if (existingRequest) {
      return apiError('A recovery request is already pending', HttpStatus.CONFLICT)
    }

    // Check rate limit - max 1 request per 24 hours per user
    const recentRequest = await queryOne<RecoveryRequest>(
      `SELECT * FROM password_recovery_requests 
       WHERE user_id = ? 
       AND datetime(created_at) > datetime('now', '-24 hours')`,
      [user.id]
    )

    if (recentRequest) {
      return apiError('Please wait 24 hours before submitting another request', HttpStatus.TOO_MANY_REQUESTS)
    }

    // Create recovery request
    await execute(
      'INSERT INTO password_recovery_requests (user_id, status) VALUES (?, ?)',
      [user.id, 'pending']
    )

    return apiResponse({
      message: 'Recovery request submitted successfully',
      username: user.username
    })
  } catch (error) {
    console.error('Create recovery request error:', error)
    return apiError('Failed to create recovery request', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * GET /api/auth/recovery
 * 
 * Get all pending recovery requests (GUILD_MASTER only)
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  // Only Guildmaster can view recovery requests
  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can view recovery requests', HttpStatus.FORBIDDEN)
  }

  try {
    const requests = await query<RecoveryWithUser>(
      `SELECT 
        r.id,
        r.user_id,
        r.status,
        r.created_at,
        r.resolved_at,
        r.resolved_by,
        u.username
       FROM password_recovery_requests r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    )

    return apiResponse(requests)
  } catch (error) {
    console.error('Get recovery requests error:', error)
    return apiError('Failed to fetch recovery requests', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
