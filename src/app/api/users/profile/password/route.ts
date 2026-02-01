import { NextRequest } from 'next/server'
import { execute, queryOne } from '@/lib/db'
import { hashPassword, verifyPassword, User } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * PATCH /api/users/profile/password
 * 
 * Change current user's own password (requires current password)
 * Body: { currentPassword, newPassword }
 */
export async function PATCH(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return apiError('Current password and new password are required', HttpStatus.BAD_REQUEST)
    }

    if (newPassword.length < 6) {
      return apiError('New password must be at least 6 characters', HttpStatus.BAD_REQUEST)
    }

    // Get user with password hash
    const user = await queryOne<User>(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [authResult.user.userId]
    )

    if (!user) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isValid) {
      return apiError("OOPS, looks like that's not your password. Please try again", HttpStatus.BAD_REQUEST)
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword)

    // Update password
    await execute(
      "UPDATE users SET password_hash = ?, updated_at = DATETIME('now') WHERE id = ?",
      [newPasswordHash, authResult.user.userId]
    )

    return apiResponse({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return apiError('Failed to change password', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
