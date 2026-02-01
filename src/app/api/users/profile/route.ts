import { NextRequest } from 'next/server'
import { execute, queryOne } from '@/lib/db'
import { hashPassword, verifyPassword, User } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * GET /api/users/profile
 * 
 * Get current user's own profile data
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const user = await queryOne<User>(
      'SELECT id, username, rank, team_id, warcraft_logs_url, bio, discord_username, created_at, updated_at FROM users WHERE id = ?',
      [authResult.user.userId]
    )

    if (!user) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse(user)
  } catch (error) {
    console.error('Get profile error:', error)
    return apiError('Failed to fetch profile', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/users/profile
 * 
 * Update current user's own profile
 * Body: { username?, warcraftLogsUrl?, bio?, discordUsername? }
 */
export async function PATCH(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const body = await request.json()
    const { username, warcraftLogsUrl, bio, discordUsername } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (username !== undefined) {
      if (username.trim().length < 3) {
        return apiError('Username must be at least 3 characters', HttpStatus.BAD_REQUEST)
      }

      // Check if username is already taken by another user
      const existingUser = await queryOne<User>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username.trim(), authResult.user.userId]
      )

      if (existingUser) {
        return apiError('Username already taken', HttpStatus.CONFLICT)
      }

      updates.push('username = ?')
      values.push(username.trim())
    }

    if (warcraftLogsUrl !== undefined) {
      updates.push('warcraft_logs_url = ?')
      values.push(warcraftLogsUrl?.trim() || null)
    }

    if (bio !== undefined) {
      if (bio && bio.length > 120) {
        return apiError('Bio must be 120 characters or less', HttpStatus.BAD_REQUEST)
      }
      updates.push('bio = ?')
      values.push(bio?.trim() || null)
    }

    if (discordUsername !== undefined) {
      updates.push('discord_username = ?')
      values.push(discordUsername?.trim() || null)
    }

    if (updates.length === 0) {
      return apiError('No updates provided', HttpStatus.BAD_REQUEST)
    }

    // Add updated_at
    updates.push("updated_at = DATETIME('now')")

    // Add user ID to values
    values.push(authResult.user.userId)

    // Update profile
    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Get updated user
    const updatedUser = await queryOne<User>(
      'SELECT id, username, rank, team_id, warcraft_logs_url, bio, discord_username, created_at, updated_at FROM users WHERE id = ?',
      [authResult.user.userId]
    )

    return apiResponse(updatedUser)
  } catch (error: any) {
    console.error('Update profile error:', error)

    if (error.message?.includes('UNIQUE')) {
      return apiError('Username already taken', HttpStatus.CONFLICT)
    }

    return apiError('Failed to update profile', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
