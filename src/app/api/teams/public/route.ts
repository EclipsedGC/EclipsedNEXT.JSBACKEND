import { query } from '@/lib/db'
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
 * GET /api/teams/public
 * 
 * Get all teams (public endpoint, no authentication required)
 * Used for the public "Apply Here" page
 * Returns team data with parsed JSON fields
 */
export async function GET() {
  try {
    const teams = await query<Team>('SELECT * FROM teams ORDER BY name')

    // Parse JSON fields for frontend
    const parsedTeams = teams.map(team => ({
      ...team,
      roster: team.roster ? JSON.parse(team.roster) : [],
      progress: team.progress ? JSON.parse(team.progress) : { completed: 0, total: 9, difficulty: 'Normal' },
      team_info: team.team_info ? JSON.parse(team.team_info) : {}
    }))

    return apiResponse(parsedTeams)
  } catch (error) {
    console.error('Get public teams error:', error)
    return apiError('Failed to fetch teams', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
