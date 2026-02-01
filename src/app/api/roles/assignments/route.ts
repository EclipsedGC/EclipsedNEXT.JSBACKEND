import { NextRequest } from 'next/server'
import { query, queryOne, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * POST /api/roles/assignments
 * 
 * Assign a user to a role (GUILD_MASTER only)
 * Body: { role_id, user_id }
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can assign roles', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { role_id, user_id } = body

    if (!role_id || !user_id) {
      return apiError('role_id and user_id are required', HttpStatus.BAD_REQUEST)
    }

    // Check if role exists
    const role = await queryOne('SELECT * FROM guild_roles WHERE id = ?', [role_id])
    if (!role) {
      return apiError('Role not found', HttpStatus.NOT_FOUND)
    }

    // Check if user exists
    const targetUser = await queryOne('SELECT * FROM users WHERE id = ?', [user_id])
    if (!targetUser) {
      return apiError('User not found', HttpStatus.NOT_FOUND)
    }

    // Check if assignment already exists
    const existing = await queryOne(
      'SELECT * FROM role_assignments WHERE role_id = ? AND user_id = ?',
      [role_id, user_id]
    )

    if (existing) {
      return apiError('User already assigned to this role', HttpStatus.CONFLICT)
    }

    // Create assignment
    await execute(
      'INSERT INTO role_assignments (role_id, user_id) VALUES (?, ?)',
      [role_id, user_id]
    )

    return apiResponse({ 
      message: 'User assigned to role successfully'
    }, HttpStatus.CREATED)
  } catch (error) {
    console.error('Assign role error:', error)
    return apiError('Failed to assign role', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * DELETE /api/roles/assignments
 * 
 * Remove a user from a role (GUILD_MASTER only)
 * Body: { role_id, user_id }
 */
export async function DELETE(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can remove role assignments', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { role_id, user_id } = body

    if (!role_id || !user_id) {
      return apiError('role_id and user_id are required', HttpStatus.BAD_REQUEST)
    }

    const result = await execute(
      'DELETE FROM role_assignments WHERE role_id = ? AND user_id = ?',
      [role_id, user_id]
    )

    if (result.changes === 0) {
      return apiError('Assignment not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse({ message: 'User removed from role successfully' })
  } catch (error) {
    console.error('Remove role assignment error:', error)
    return apiError('Failed to remove role assignment', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
