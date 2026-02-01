import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { hashPassword, User } from '@/lib/auth'
import { requireAuth } from '@/lib/auth-middleware'
import { canManageUsers } from '@/lib/permissions'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * GET /api/users
 * 
 * Get all users (GUILD_MASTER only)
 * Returns list of all users without password hashes
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Check permission
  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can view users', HttpStatus.FORBIDDEN)
  }

  try {
    const users = await query<User>(
      'SELECT id, username, rank, team_id, created_at, updated_at FROM users ORDER BY created_at DESC'
    )

    return apiResponse(users)
  } catch (error) {
    console.error('Get users error:', error)
    return apiError('Failed to fetch users', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

/**
 * POST /api/users
 * 
 * Create a new user (GUILD_MASTER only)
 * Body: { username, password, rank, teamId? }
 * 
 * Rules:
 * - TEAM_LEAD must have a teamId
 * - GUILD_MASTER and COUNCIL must NOT have a teamId
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  // Check permission
  if (!canManageUsers(authResult.user)) {
    return apiError('Only Guild Master can create users', HttpStatus.FORBIDDEN)
  }

  try {
    const body = await request.json()
    const { username, password, rank, teamId } = body

    // Validate input
    if (!username || !password || !rank) {
      return apiError('Username, password, and rank are required', HttpStatus.BAD_REQUEST)
    }

    // Validate rank
    const validRanks = ['GUILD_MASTER', 'COUNCIL', 'TEAM_LEAD']
    if (!validRanks.includes(rank)) {
      return apiError('Invalid rank', HttpStatus.BAD_REQUEST)
    }

    // Validate teamId rules
    if (rank === 'TEAM_LEAD' && !teamId) {
      return apiError('Team Lead must have a team assigned', HttpStatus.BAD_REQUEST)
    }

    if ((rank === 'GUILD_MASTER' || rank === 'COUNCIL') && teamId) {
      return apiError('Guild Master and Council cannot be assigned to a team', HttpStatus.BAD_REQUEST)
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Insert user
    const result = await execute(
      'INSERT INTO users (username, password_hash, rank, team_id) VALUES (?, ?, ?, ?)',
      [username, passwordHash, rank, teamId || null]
    )

    // Get the created user
    const newUser = await query<User>(
      'SELECT id, username, rank, team_id, created_at, updated_at FROM users WHERE id = ?',
      [result.lastInsertRowid]
    )

    return apiResponse(newUser[0], HttpStatus.CREATED)
  } catch (error: any) {
    console.error('Create user error:', error)
    
    // Handle unique constraint violation
    if (error.message?.includes('UNIQUE')) {
      return apiError('Username already exists', HttpStatus.CONFLICT)
    }

    return apiError('Failed to create user', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
