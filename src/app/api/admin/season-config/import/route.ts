/**
 * POST /api/admin/season-config/import
 * 
 * Imports encounter data from a Warcraft Logs tier URL
 */

import { NextRequest } from 'next/server'
import { parseWclZoneIdFromUrl } from '@/lib/parse-wcl-zone-url'
import { fetchWarcraftLogsZoneEncounters } from '@/lib/warcraft-logs-client'
import { successResponse, errorResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'
import { requireAuth } from '@/lib/auth-middleware'
import { canManageUsers } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  try {
    console.log('[season-config/import] POST - Importing boss list from WCL')

    // Verify authentication and check for guild master rank
    const authResult = requireAuth(request)
    if (authResult.error) return authResult.error

    if (!canManageUsers(authResult.user)) {
      return errorResponse(
        'Only Guild Masters can manage season configuration',
        HttpStatus.FORBIDDEN
      )
    }

    const body = await request.json()
    const { wclTierUrl } = body

    if (!wclTierUrl || typeof wclTierUrl !== 'string') {
      return errorResponse(
        'wclTierUrl is required and must be a string',
        HttpStatus.BAD_REQUEST
      )
    }

    // Parse the zone ID from the URL
    let zoneId: number
    try {
      const parsed = parseWclZoneIdFromUrl(wclTierUrl)
      zoneId = parsed.zoneId
      console.log(`[season-config/import] Parsed zone ID: ${zoneId}`)
    } catch (parseError) {
      console.error('[season-config/import] URL parsing error:', parseError)
      return errorResponse(
        parseError instanceof Error ? parseError.message : 'Invalid WCL tier URL',
        HttpStatus.BAD_REQUEST
      )
    }

    // Fetch encounters from WCL API
    try {
      const zoneData = await fetchWarcraftLogsZoneEncounters(zoneId)
      
      console.log(`[season-config/import] Fetched ${zoneData.encounters.length} encounters for zone ${zoneId}`)

      const encounterOrder = zoneData.encounters.map(e => e.id)
      const encounterNames = zoneData.encounters.map(e => ({
        id: e.id,
        name: e.name,
      }))

      return successResponse(
        {
          wclZoneId: zoneData.zoneId,
          zoneName: zoneData.zoneName,
          encounterOrder,
          encounterNames,
        },
        'Boss list imported successfully'
      )
    } catch (wclError) {
      const errorCode = (wclError as any).code || 'UNKNOWN'
      const errorMessage = wclError instanceof Error ? wclError.message : 'Unknown error'
      
      console.error(`[season-config/import] ${errorCode}:`, errorMessage)
      
      // Return specific error messages based on failure type
      if (errorCode === 'WCL_OAUTH_FAILED') {
        return errorResponse(
          'Could not authenticate with Warcraft Logs. Please check API credentials.',
          HttpStatus.BAD_GATEWAY
        )
      }
      
      if (errorCode === 'WCL_GRAPHQL_FAILED' || errorCode === 'WCL_GRAPHQL_ERROR') {
        return errorResponse(
          'Warcraft Logs API request failed. Please try again later.',
          HttpStatus.BAD_GATEWAY
        )
      }
      
      if (errorCode === 'WCL_ZONE_NOT_FOUND') {
        return errorResponse(
          `Zone ${zoneId} not found on Warcraft Logs. Please verify the URL is correct.`,
          HttpStatus.BAD_REQUEST
        )
      }
      
      return errorResponse(
        `Failed to fetch encounters from Warcraft Logs: ${errorMessage}`,
        HttpStatus.BAD_GATEWAY
      )
    }
  } catch (error) {
    console.error('[season-config/import] Unexpected error:', error)
    return errorResponse(
      'Failed to import boss list',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}
