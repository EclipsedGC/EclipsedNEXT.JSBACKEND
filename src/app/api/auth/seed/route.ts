import { execute, queryOne } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * POST /api/auth/seed
 * 
 * ONE-TIME SETUP: Create the initial Guild Master account
 * 
 * This endpoint should only be used once to bootstrap the system.
 * After creating the Guild Master, they can create other users.
 * 
 * Body: { username, password }
 * 
 * IMPORTANT: In production, you should:
 * 1. Remove this endpoint after initial setup
 * 2. Or protect it with an environment variable
 */
export async function POST() {
  try {
    // Check if any Guild Master already exists
    const existingGuildMaster = await queryOne(
      "SELECT id FROM users WHERE rank = 'GUILD_MASTER'"
    )

    if (existingGuildMaster) {
      return apiError(
        'Guild Master already exists. Use the account manager to create additional users.',
        HttpStatus.BAD_REQUEST
      )
    }

    // Default credentials for initial Guild Master
    const username = 'guildmaster'
    const password = 'changeme123' // User should change this immediately!

    const passwordHash = await hashPassword(password)

    // Create Guild Master
    await execute(
      'INSERT INTO users (username, password_hash, rank, team_id) VALUES (?, ?, ?, ?)',
      [username, passwordHash, 'GUILD_MASTER', null]
    )

    return apiResponse({
      message: 'Guild Master created successfully',
      username: username,
      temporaryPassword: password,
      warning: 'PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN',
    })
  } catch (error) {
    console.error('Seed error:', error)
    return apiError('Failed to create Guild Master', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
