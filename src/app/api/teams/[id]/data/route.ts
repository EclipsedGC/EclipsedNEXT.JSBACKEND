import { NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { canEditTeam } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * TEAM DATA ROUTE
 * 
 * This route handles getting and updating team data ONLY
 * Team name and description editing is NOT allowed here
 * Only in Account Manager (admin area)
 * 
 * PERMISSION RULES:
 * - GUILD_MASTER: Can access ANY team
 * - COUNCIL: Can access ANY team
 * - TEAM_LEAD: Can ONLY access their assigned team
 */

interface Team {
  id: number
  name: string
  description: string | null
  roster: string  // JSON string
  progress: string  // JSON string
  team_info: string  // JSON string
  created_at: string
  updated_at: string
}

/**
 * GET /api/teams/[id]/data
 * 
 * Get team data for editing
 * Returns: roster, progress, teamInfo as JSON
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const teamId = parseInt(params.id)

    // SERVER-SIDE PERMISSION CHECK
    // This is critical - never trust the frontend!
    if (!canEditTeam(authResult.user, teamId)) {
      return apiError(
        'You do not have permission to access this team',
        HttpStatus.FORBIDDEN
      )
    }

    // Get team from database
    const team = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    )

    if (!team) {
      return apiError('Team not found', HttpStatus.NOT_FOUND)
    }

    // Parse JSON strings and return
    const teamData = {
      id: team.id,
      name: team.name,  // Read-only in Team Manager
      description: team.description,  // Read-only in Team Manager
      roster: JSON.parse(team.roster || '[]'),
      progress: JSON.parse(team.progress || '{}'),
      teamInfo: JSON.parse(team.team_info || '{}'),
      created_at: team.created_at,
      updated_at: team.updated_at,
    }

    return apiResponse(teamData)
  } catch (error) {
    console.error('Get team data error:', error)
    return apiError('Failed to fetch team data', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * PATCH /api/teams/[id]/data
 * 
 * Update team data ONLY
 * Body: { roster?, progress?, teamInfo? }
 * 
 * IMPORTANT:
 * - Team name CANNOT be changed here
 * - Team description CANNOT be changed here
 * - Only roster, progress, and teamInfo can be updated
 * - Changes affect ONLY this team (never other teams)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Check authentication
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const teamId = parseInt(params.id)

    // SERVER-SIDE PERMISSION CHECK
    if (!canEditTeam(authResult.user, teamId)) {
      return apiError(
        'You do not have permission to edit this team',
        HttpStatus.FORBIDDEN
      )
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
    const { roster, progress, teamInfo } = body

    // Build update query for data fields ONLY
    const updates: string[] = []
    const values: any[] = []

    // Only update fields that are provided
    if (roster !== undefined) {
      updates.push('roster = ?')
      values.push(JSON.stringify(roster))
    }

    if (progress !== undefined) {
      updates.push('progress = ?')
      values.push(JSON.stringify(progress))
    }

    if (teamInfo !== undefined) {
      updates.push('team_info = ?')
      values.push(JSON.stringify(teamInfo))
    }

    if (updates.length === 0) {
      return apiError('No updates provided', HttpStatus.BAD_REQUEST)
    }

    // Add updated_at timestamp
    updates.push("updated_at = DATETIME('now')")

    // Add team ID to values
    values.push(teamId)

    // Execute update - affects ONLY this team
    await execute(
      `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
      values
    )

    // Get updated team data
    const updatedTeam = await queryOne<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [teamId]
    )

    if (!updatedTeam) {
      return apiError('Failed to fetch updated team', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    // Return updated data
    const teamData = {
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      roster: JSON.parse(updatedTeam.roster || '[]'),
      progress: JSON.parse(updatedTeam.progress || '{}'),
      teamInfo: JSON.parse(updatedTeam.team_info || '{}'),
      updated_at: updatedTeam.updated_at,
    }

    return apiResponse(teamData)
  } catch (error: any) {
    console.error('Update team data error:', error)
    
    // Handle JSON parsing errors
    if (error.message?.includes('JSON')) {
      return apiError('Invalid JSON format', HttpStatus.BAD_REQUEST)
    }

    return apiError('Failed to update team data', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
