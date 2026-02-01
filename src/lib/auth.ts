import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Types for our auth system
export type UserRank = 'GUILD_MASTER' | 'COUNCIL' | 'TEAM_LEAD'

export interface User {
  id: number
  username: string
  rank: UserRank
  team_id: number | null
  created_at: string
  updated_at: string
}

export interface JWTPayload {
  userId: number
  username: string
  rank: UserRank
  teamId: number | null
}

// Secret key for JWT (in production, use environment variable!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

/**
 * Hash a password using bcrypt
 * This is what you do when creating a new user
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Compare a plain password with a hashed password
 * This is what you do when someone tries to log in
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * Generate a JWT token for a user
 * This token will be sent to the frontend and stored there
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    rank: user.rank,
    teamId: user.team_id,
  }

  // Token expires in 7 days
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verify and decode a JWT token
 * Returns the user info if valid, null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Extract token from Authorization header
 * Expects format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // Remove "Bearer " prefix
}
