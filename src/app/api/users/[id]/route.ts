import { NextRequest } from 'next/server'
import { query, execute, queryOne } from '@/lib/db'
import { hashPassword, User } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-middleware'
import { canManageUsers } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * GET /api/users/[id]
 * 
 * Get a single user by ID (GUILD_MASTER only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can view users', HttpStatus.FORBIDDEN)
  }

  try {
    const user = await queryOne<User>(
      'SELECT id, username, rank, team_id, created_at, updated_at FROM users WHERE id = ?',
      [params.id]
    )

    if (!user) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse(user)
  } catch (error) {
    console.error('Get user error:', error)
    return apiError('Failed to fetch user', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/users/[id]
 * 
 * Update a user (GUILD_MASTER only)
 * Body: { username?, rank?, teamId? }
 * 
 * Note: Use /api/users/[id]/password to change password
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can update users', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { username, rank, teamId } = body

    // Check if user exists
    const existingUser = await queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      [params.id]
    )

    if (!existingUser) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []

    if (username !== undefined) {
      updates.push('username = ?')
      values.push(username)
    }

    if (rank !== undefined) {
      const validRanks = ['GUILD_MASTER', 'COUNCIL', 'TEAM_LEAD']
      if (!validRanks.includes(rank)) {
        return apiError('Invalid rank', HttpStatus.BAD_REQUEST)
      }

      // Validate teamId rules for new rank
      if (rank === 'TEAM_LEAD' && teamId === undefined && !existingUser.team_id) {
        return apiError('Team Lead must have a team assigned', HttpStatus.BAD_REQUEST)
      }

      updates.push('rank = ?')
      values.push(rank)
    }

    if (teamId !== undefined) {
      const finalRank = rank !== undefined ? rank : existingUser.rank

      // Validate teamId rules
      if (finalRank === 'TEAM_LEAD' && !teamId) {
        return apiError('Team Lead must have a team assigned', HttpStatus.BAD_REQUEST)
      }

      if ((finalRank === 'GUILD_MASTER' || finalRank === 'COUNCIL') && teamId) {
        return apiError('Guild Master and Council cannot be assigned to a team', HttpStatus.BAD_REQUEST)
      }

      updates.push('team_id = ?')
      values.push(teamId || null)
    }

    if (updates.length === 0) {
      return apiError('No updates provided', HttpStatus.BAD_REQUEST)
    }

    // Add updated_at
    updates.push("updated_at = DATETIME('now')")

    // Add user ID to values
    values.push(params.id)

    // Execute update
    await execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Get updated user
    const updatedUser = await queryOne<User>(
      'SELECT id, username, rank, team_id, created_at, updated_at FROM users WHERE id = ?',
      [params.id]
    )

    return apiResponse(updatedUser)
  } catch (error: any) {
    console.error('Update user error:', error)

    if (error.message?.includes('UNIQUE')) {
      return apiError('Username already exists', HttpStatus.CONFLICT)
    }

    return apiError('Failed to update user', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * DELETE /api/users/[id]
 * 
 * Delete a user (GUILD_MASTER only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can delete users', HttpStatus.FORBIDDEN)
  }

  try {
    // Check if user exists
    const user = await queryOne<User>(
      'SELECT id FROM users WHERE id = ?',
      [params.id]
    )

    if (!user) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    // Prevent deleting yourself
    if (user.id === authResult.user.userId) {
      return apiError('Cannot delete your own account', HttpStatus.BAD_REQUEST)
    }

    // Delete user
    await execute('DELETE FROM users WHERE id = ?', [params.id])

    return apiResponse({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    return apiError('Failed to delete user', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
