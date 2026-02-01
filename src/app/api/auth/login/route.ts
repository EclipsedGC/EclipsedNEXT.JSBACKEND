import { NextRequest } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyPassword, generateToken, User } from '@/lib/auth'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * POST /api/auth/login
 * 
 * Login with username and password
 * Returns a JWT token that the frontend should store
 * Also returns failed attempt count for password recovery flow
 * 
 * Body: { username, password }
 * Returns: { success: true, data: { token, user } } or { success: false, message, failedAttempts, userExists }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Validate input
    if (!username || !password) {
      return apiError('Username and password are required', HttpStatus.BAD_REQUEST)
    }

    // Find user by username
    const user = await queryOne<User & { password_hash: string }>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    )

    if (!user) {
      // Don't reveal if username doesn't exist (return generic error)
      return Response.json({
        success: false,
        message: 'Invalid username or password',
        failedAttempts: 0,
        userExists: false
      }, { status: HttpStatus.UNAUTHORIZED })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash)
    if (!isValidPassword) {
      // Password is wrong - this counts as a failed attempt
      // Return userExists: true so frontend can track attempts
      return Response.json({
        success: false,
        message: 'Invalid username or password',
        failedAttempts: 0, // Frontend will track this
        userExists: true,
        username: username,
        isGuildmaster: user.rank === 'GUILD_MASTER'
      }, { status: HttpStatus.UNAUTHORIZED })
    }

    // Generate token
    const token = generateToken(user)

    // Remove password_hash from response
    const { password_hash, ...userWithoutPassword } = user

    return apiResponse({
      token,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('Login error:', error)
    return apiError('Login failed', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
