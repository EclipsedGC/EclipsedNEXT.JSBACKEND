import { NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * PATCH /api/roles/[id]
 * 
 * Update a role (GUILD_MASTER only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can update roles', HttpStatus.FORBIDDEN)
  }

  try {
    const { id } = await params
    const roleId = parseInt(id)

    if (isNaN(roleId)) {
      return apiError('Invalid role ID', HttpStatus.BAD_REQUEST)
    }

    const body = await request.json()
    const { name, description, cluster_name, cluster_level, display_order } = body

    // Check if role exists
    const role = await queryOne('SELECT * FROM guild_roles WHERE id = ?', [roleId])
    if (!role) {
      return apiError('Role not found', HttpStatus.NOT_FOUND)
    }

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      values.push(description)
    }
    if (cluster_name !== undefined) {
      updates.push('cluster_name = ?')
      values.push(cluster_name)
    }
    if (cluster_level !== undefined) {
      updates.push('cluster_level = ?')
      values.push(cluster_level)
    }
    if (display_order !== undefined) {
      updates.push('display_order = ?')
      values.push(display_order)
    }

    if (updates.length === 0) {
      return apiError('No fields to update', HttpStatus.BAD_REQUEST)
    }

    updates.push("updated_at = DATETIME('now')")
    values.push(roleId)

    await execute(
      `UPDATE guild_roles SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    return apiResponse({ message: 'Role updated successfully' })
  } catch (error) {
    console.error('Update role error:', error)
    return apiError('Failed to update role', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * DELETE /api/roles/[id]
 * 
 * Delete a role (GUILD_MASTER only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can delete roles', HttpStatus.FORBIDDEN)
  }

  try {
    const { id } = await params
    const roleId = parseInt(id)

    if (isNaN(roleId)) {
      return apiError('Invalid role ID', HttpStatus.BAD_REQUEST)
    }

    const result = await execute('DELETE FROM guild_roles WHERE id = ?', [roleId])

    if (result.changes === 0) {
      return apiError('Role not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Delete role error:', error)
    return apiError('Failed to delete role', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
