/**
 * POST /api/admin/season-config/save
 * 
 * Saves and activates a season configuration
 */

import { NextRequest } from 'next/server'
import { createSeasonConfig } from '@/lib/season-config'
import { successResponse, errorResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'
import { requireAuth } from '@/lib/auth-middleware'
import { canManageUsers } from '@/lib/permissions'
import type { EncounterInfo } from '@/types/season-config'

export async function POST(request: NextRequest) {
  try {
    console.log('[season-config/save] POST - Saving active season config')

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
    const { tierName, wclTierUrl, wclZoneId, encounterOrder, encounterNames } = body

    // Validate required fields
    if (!tierName || typeof tierName !== 'string') {
      return errorResponse(
        'tierName is required and must be a string',
        HttpStatus.BAD_REQUEST
      )
    }

    if (!wclTierUrl || typeof wclTierUrl !== 'string') {
      return errorResponse(
        'wclTierUrl is required and must be a string',
        HttpStatus.BAD_REQUEST
      )
    }

    if (!wclZoneId || typeof wclZoneId !== 'number') {
      return errorResponse(
        'wclZoneId is required and must be a number',
        HttpStatus.BAD_REQUEST
      )
    }

    if (!Array.isArray(encounterOrder)) {
      return errorResponse(
        'encounterOrder is required and must be an array',
        HttpStatus.BAD_REQUEST
      )
    }

    if (!Array.isArray(encounterNames)) {
      return errorResponse(
        'encounterNames is required and must be an array',
        HttpStatus.BAD_REQUEST
      )
    }

    // Save the config (will automatically deactivate others and set this as active)
    const savedConfig = await createSeasonConfig({
      tier_name: tierName,
      wcl_tier_url: wclTierUrl,
      wcl_zone_id: wclZoneId,
      encounter_order: encounterOrder,
      encounter_names: encounterNames as EncounterInfo[],
      is_active: true,
    })

    console.log(`[season-config/save] Saved and activated season config: ${savedConfig.tier_name} (Zone ${savedConfig.wcl_zone_id})`)

    // Transform to camelCase for frontend
    const response = {
      id: savedConfig.id,
      tierName: savedConfig.tier_name,
      wclTierUrl: savedConfig.wcl_tier_url,
      wclZoneId: savedConfig.wcl_zone_id,
      encounterOrder: savedConfig.encounter_order,
      encounterNames: savedConfig.encounter_names,
      isActive: savedConfig.is_active,
      createdAt: savedConfig.created_at,
      updatedAt: savedConfig.updated_at,
    }

    return successResponse(response, 'Season configuration saved and activated')
  } catch (error) {
    console.error('[season-config/save] Error:', error)
    return errorResponse(
      `Failed to save season configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}
