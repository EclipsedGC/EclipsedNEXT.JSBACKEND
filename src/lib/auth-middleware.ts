import { NextRequest } from 'next/server'
import { extractTokenFromHeader, verifyToken, JWTPayload } from './auth'

/**
 * Get the authenticated user from the request
 * Extracts the token from the Authorization header and verifies it
 * 
 * Returns the user info if valid, null if not authenticated
 */
export function getAuthUser(request: NextRequest): JWTPayload | null {
  const authHeader = request.headers.get('Authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return null
  }

  return verifyToken(token)
}

/**
 * Require authentication
 * Returns the user if authenticated, or an error response if not
 * 
 * Usage in API routes:
 * const userOrError = requireAuth(request)
 * if ('error' in userOrError) return userOrError.error
 * const user = userOrError.user
 */
export function requireAuth(request: NextRequest): 
  | { user: JWTPayload; error?: never } 
  | { user?: never; error: Response } 
{
  const user = getAuthUser(request)
  
  if (!user) {
    return {
      error: Response.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
  }

  return { user }
}
