import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface GuildRole {
  id: number
  name: string
  description: string
  cluster_name: string
  cluster_level: string
  display_order: number
  is_team_specific: number
  team_id: number | null
  team_name?: string
}

interface RoleAssignment {
  role_id: number
  user_id: number
  username: string
}

interface RoleWithAssignments extends GuildRole {
  assigned_users: Array<{ id: number; username: string }>
}

/**
 * GET /api/roles
 * 
 * Get all guild roles with their assignments (PUBLIC)
 * Returns roles grouped by cluster with assigned users
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all roles with team info
    const roles = await query<GuildRole>(
      `SELECT 
        r.*,
        t.name as team_name
       FROM guild_roles r
       LEFT JOIN teams t ON r.team_id = t.id
       ORDER BY r.cluster_level, r.display_order`
    )

    // Fetch all role assignments with user info
    const assignments = await query<RoleAssignment>(
      `SELECT 
        ra.role_id,
        ra.user_id,
        u.username
       FROM role_assignments ra
       JOIN users u ON ra.user_id = u.id`
    )

    // Combine roles with their assignments
    const rolesWithAssignments: RoleWithAssignments[] = roles.map(role => ({
      ...role,
      assigned_users: assignments
        .filter(a => a.role_id === role.id)
        .map(a => ({ id: a.user_id, username: a.username }))
    }))

    return apiResponse(rolesWithAssignments)
  } catch (error) {
    console.error('Get roles error:', error)
    return apiError('Failed to fetch roles', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * POST /api/roles
 * 
 * Create a new role (GUILD_MASTER only)
 * Body: { name, description, cluster_name, cluster_level, display_order, is_team_specific, team_id }
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  // Only Guildmaster can create roles
  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can create roles', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { name, description, cluster_name, cluster_level, display_order, is_team_specific, team_id } = body

    if (!name || !cluster_name || !cluster_level) {
      return apiError('Name, cluster_name, and cluster_level are required', HttpStatus.BAD_REQUEST)
    }

    const result = await execute(
      `INSERT INTO guild_roles (name, description, cluster_name, cluster_level, display_order, is_team_specific, team_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description || '',
        cluster_name,
        cluster_level,
        display_order || 0,
        is_team_specific ? 1 : 0,
        team_id || null
      ]
    )

    return apiResponse({ 
      id: result.lastInsertRowid,
      message: 'Role created successfully'
    }, HttpStatus.CREATED)
  } catch (error) {
    console.error('Create role error:', error)
    return apiError('Failed to create role', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
