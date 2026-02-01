import { NextRequest } from 'next/server'
import { queryOne, execute } from '@/lib/db'
import { requireAuth } from '@/lib/auth-middleware'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

interface RecoveryRequest {
  id: number
  user_id: number
  status: 'pending' | 'resolved'
}

/**
 * PATCH /api/auth/recovery/[id]
 * 
 * Resolve a recovery request (GUILD_MASTER only)
 * This marks the request as resolved after the Guildmaster has reset the password
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = requireAuth(request)
  if (authResult.error) return authResult.error

  const user = authResult.user

  // Only Guildmaster can resolve recovery requests
  if (user.rank !== 'GUILD_MASTER') {
    return apiError('Only Guild Master can resolve recovery requests', HttpStatus.FORBIDDEN)
  }

  try {
    const { id } = await params
    const requestId = parseInt(id)

    if (isNaN(requestId)) {
      return apiError('Invalid request ID', HttpStatus.BAD_REQUEST)
    }

    // Check if request exists and is pending
    const recoveryRequest = await queryOne<RecoveryRequest>(
      'SELECT * FROM password_recovery_requests WHERE id = ?',
      [requestId]
    )

    if (!recoveryRequest) {
      return apiError('Recovery request not found', HttpStatus.NOT_FOUND)
    }

    if (recoveryRequest.status === 'resolved') {
      return apiError('Recovery request already resolved', HttpStatus.BAD_REQUEST)
    }

    // Mark as resolved
    await execute(
      `UPDATE password_recovery_requests 
       SET status = 'resolved', 
           resolved_at = DATETIME('now'), 
           resolved_by = ? 
       WHERE id = ?`,
      [user.id, requestId]
    )

    return apiResponse({
      message: 'Recovery request resolved successfully'
    })
  } catch (error) {
    console.error('Resolve recovery request error:', error)
    return apiError('Failed to resolve recovery request', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
