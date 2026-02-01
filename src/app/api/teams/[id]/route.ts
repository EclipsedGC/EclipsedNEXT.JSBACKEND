import { NextRequest } from 'next/server'
import { query, execute, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { canAccessTeam, canEditTeam, isGuildMaster } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface Team {
  id: number
  name: string
  description: string | null
  roster: string
  progress: string
  team_info: string
  team_directive: string | null
  created_at: string
  updated_at: string
}

interface TeamProgress {
  completed: number
  total: number
  difficulty: 'Normal' | 'Heroic' | 'Mythic'
}

/**
 * GET /api/teams/[id]
 * 
 * Get a single team
 * Access rules:
 * - GUILD_MASTER & COUNCIL: Can view any team
 * - TEAM_LEAD: Can only view their assigned team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const teamId = parseInt(params.id)

    // Check permission
    if (!canAccessTeam(authResult.user, teamId)) {
      return apiError('You do not have access to this team', HttpStatus.FORBIDDEN)
    }

    const team = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    )

    if (!team) {
      return apiError('Team not found', HttpStatus.NOT_FOUND)
    }

    // Parse JSON fields for frontend
    const parsedTeam = {
      ...team,
      roster: team.roster ? JSON.parse(team.roster) : [],
      progress: team.progress ? JSON.parse(team.progress) : { completed: 0, total: 9, difficulty: 'Normal' },
      team_info: team.team_info ? JSON.parse(team.team_info) : {}
    }

    return apiResponse(parsedTeam)
  } catch (error) {
    console.error('Get team error:', error)
    return apiError('Failed to fetch team', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/teams/[id]
 * 
 * Update a team
 * Access rules:
 * - GUILD_MASTER & COUNCIL: Can edit any team
 * - TEAM_LEAD: Can only edit their assigned team
 * 
 * Body: { name?, description? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const teamId = parseInt(params.id)

    // Check permission
    if (!canEditTeam(authResult.user, teamId)) {
      return apiError('You do not have permission to edit this team', HttpStatus.FORBIDDEN)
    }

    // Check if team exists
    const existingTeam = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    )

    if (!existingTeam) {
      return apiError('Team not found', HttpStatus.NOT_FOUND)
    }

    const body = await request.json()
    const { name, description, progress, roster, team_info, team_directive } = body

    // Validate team_directive if provided
    const VALID_DIRECTIVES = ['Mythic CE', 'Mythic Progression', 'AOTC / Light Mythic', 'AOTC', 'Learning / Casual']
    if (team_directive !== undefined && team_directive !== null && !VALID_DIRECTIVES.includes(team_directive)) {
      return apiError('Invalid team directive', HttpStatus.BAD_REQUEST)
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }

    if (description !== undefined) {
      updates.push('description = ?')
      values.push(description || null)
    }

    if (progress !== undefined) {
      updates.push('progress = ?')
      values.push(JSON.stringify(progress))
    }

    if (roster !== undefined) {
      updates.push('roster = ?')
      values.push(JSON.stringify(roster))
    }

    if (team_info !== undefined) {
      updates.push('team_info = ?')
      values.push(JSON.stringify(team_info))
    }

    if (team_directive !== undefined) {
      updates.push('team_directive = ?')
      values.push(team_directive)
    }

    if (updates.length === 0) {
      return apiError('No updates provided', HttpStatus.BAD_REQUEST)
    }

    // Add updated_at
    updates.push("updated_at = DATETIME('now')")

    // Add team ID to values
    values.push(teamId)

    // Execute update
    await execute(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Get updated team
    const updatedTeam = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    )

    // Parse JSON fields for frontend
    const parsedUpdatedTeam = {
      ...updatedTeam,
      roster: updatedTeam?.roster ? JSON.parse(updatedTeam.roster) : [],
      progress: updatedTeam?.progress ? JSON.parse(updatedTeam.progress) : { completed: 0, total: 9, difficulty: 'Normal' },
      team_info: updatedTeam?.team_info ? JSON.parse(updatedTeam.team_info) : {}
    }

    return apiResponse(parsedUpdatedTeam)
  } catch (error: any) {
    console.error('Update team error:', error)

    if (error.message?.includes('UNIQUE')) {
      return apiError('Team name already exists', HttpStatus.CONFLICT)
    }

    return apiError('Failed to update team', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * DELETE /api/teams/[id]
 * 
 * Delete a team (GUILD_MASTER only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Only Guild Master can delete teams
  if (!isGuildMaster(authResult.user)) {
    return apiError('Only Guild Master can delete teams', HttpStatus.FORBIDDEN)
  }

  try {
    const teamId = parseInt(params.id)

    // Check if team exists
    const team = await queryOne<Team>(
      'SELECT id FROM teams WHERE id = ?',
      [teamId]
    )

    if (!team) {
      return apiError('Team not found', HttpStatus.NOT_FOUND)
    }

    // Auto-unassign any users from this team
    await execute('UPDATE users SET team_id = NULL WHERE team_id = ?', [teamId])

    // Delete team
    await execute('DELETE FROM teams WHERE id = ?', [teamId])

    return apiResponse({ message: 'Team deleted successfully' })
  } catch (error) {
    console.error('Delete team error:', error)
    return apiError('Failed to delete team', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
