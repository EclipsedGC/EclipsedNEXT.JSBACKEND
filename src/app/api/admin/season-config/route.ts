/**
 * GET /api/admin/season-config
 * 
 * Returns the active season configuration
 */

import { NextRequest } from 'next/server'
import { getActiveSeasonConfig } from '@/lib/season-config'
import { successResponse, errorResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

export async function GET(request: NextRequest) {
  try {
    console.log('[season-config] GET - Fetching active season config')

    const activeConfig = await getActiveSeasonConfig()

    if (!activeConfig) {
      return successResponse(
        null,
        'No active season configuration found'
      )
    }

    // Transform to camelCase for frontend
    const response = {
      id: activeConfig.id,
      tierName: activeConfig.tier_name,
      wclTierUrl: activeConfig.wcl_tier_url,
      wclZoneId: activeConfig.wcl_zone_id,
      encounterOrder: activeConfig.encounter_order,
      encounterNames: activeConfig.encounter_names,
      isActive: activeConfig.is_active,
      createdAt: activeConfig.created_at,
      updatedAt: activeConfig.updated_at,
    }

    return successResponse(response, 'Active season configuration retrieved')
  } catch (error) {
    console.error('[season-config] GET error:', error)
    return errorResponse(
      'Failed to fetch season configuration',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}
