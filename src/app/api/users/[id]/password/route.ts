import { NextRequest } from 'next/server'
import { execute, queryOne } from '@/lib/db'
import { hashPassword, User } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-middleware'
import { canManageUsers } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * PATCH /api/users/[id]/password
 * 
 * Change a user's password (GUILD_MASTER only)
 * Body: { password }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can change passwords', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { password } = body

    if (!password) {
      return apiError('Password is required', HttpStatus.BAD_REQUEST)
    }

    if (password.length < 6) {
      return apiError('Password must be at least 6 characters', HttpStatus.BAD_REQUEST)
    }

    // Check if user exists
    const user = await queryOne<User>(
      'SELECT id FROM users WHERE id = ?',
      [params.id]
    )

    if (!user) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    // Update password
    await execute(
      "UPDATE users SET password_hash = ?, updated_at = DATETIME('now') WHERE id = ?",
      [passwordHash, params.id]
    )

    return apiResponse({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return apiError('Failed to change password', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
