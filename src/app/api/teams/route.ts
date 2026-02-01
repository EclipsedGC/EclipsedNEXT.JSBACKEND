import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { getAccessibleTeamIds, isGuildMaster } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface Team {
  id: number
  name: string
  description: string | null
  roster: string
  progress: string
  team_info: string
  created_at: string
  updated_at: string
}

/**
 * GET /api/teams
 * 
 * Get all teams that the user can access
 * - GUILD_MASTER & COUNCIL: See all teams
 * - TEAM_LEAD: See only their assigned team
 */
export async function GET(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  try {
    const accessibleTeamIds = getAccessibleTeamIds(authResult.user)

    let teams: Team[]

    if (accessibleTeamIds === null) {
      // User can access all teams
      teams = await query<Team>('SELECT * FROM teams ORDER BY name')
    } else if (accessibleTeamIds.length > 0) {
      // User can access specific teams
      const placeholders = accessibleTeamIds.map(() => '?').join(',')
      teams = await query<Team>(
        `SELECT * FROM teams WHERE id IN (${placeholders}) ORDER BY name`,
        accessibleTeamIds
      )
    } else {
      // User has no team access
      teams = []
    }

    // Parse JSON fields for frontend
    const parsedTeams = teams.map(team => ({
      ...team,
      roster: team.roster ? JSON.parse(team.roster) : [],
      progress: team.progress ? JSON.parse(team.progress) : { completed: 0, total: 9, difficulty: 'Normal' },
      team_info: team.team_info ? JSON.parse(team.team_info) : {}
    }))

    return apiResponse(parsedTeams)
  } catch (error) {
    console.error('Get teams error:', error)
    return apiError('Failed to fetch teams', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * POST /api/teams
 * 
 * Create a new team (GUILD_MASTER only)
 * Body: { name, description? }
 * 
 * Note: We're keeping team creation simple for now
 * In the future, you can add more fields or logic here
 */
export async function POST(request: NextRequest) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Only Guild Master can create teams
  if (!isGuildMaster(authResult.user)) {
    return apiError('Only Guild Master can create teams', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { name, description } = body

    if (!name) {
      return apiError('Team name is required', HttpStatus.BAD_REQUEST)
    }

    // Insert team
    const result = await execute(
      'INSERT INTO teams (name, description) VALUES (?, ?)',
      [name, description || null]
    )

    // Get the created team
    const newTeamResult = await query<Team>(
      'SELECT * FROM teams WHERE id = ?',
      [result.lastInsertRowid]
    )

    const newTeam = newTeamResult[0]

    // Parse JSON fields for frontend
    const parsedNewTeam = {
      ...newTeam,
      roster: newTeam.roster ? JSON.parse(newTeam.roster) : [],
      progress: newTeam.progress ? JSON.parse(newTeam.progress) : { completed: 0, total: 9, difficulty: 'Normal' },
      team_info: newTeam.team_info ? JSON.parse(newTeam.team_info) : {}
    }

    return apiResponse(parsedNewTeam, HttpStatus.CREATED)
  } catch (error: any) {
    console.error('Create team error:', error)

    if (error.message?.includes('UNIQUE')) {
      return apiError('Team name already exists', HttpStatus.CONFLICT)
    }

    return apiError('Failed to create team', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
