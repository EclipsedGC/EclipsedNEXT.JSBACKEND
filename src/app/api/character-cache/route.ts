/**
 * GET /api/character-cache
 * Query character enrichment cache
 * 
 * Query params:
 * - region: string (required)
 * - realm: string (required)
 * - characterName: string (required)
 * - seasonKey: string (optional, defaults to 'latest')
 */

import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-response'
import { findCachedCharacter, findAllSeasonsByCharacter } from '@/lib/character-enrichment-cache'
import { HttpStatus } from '@/lib/http-status'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const region = searchParams.get('region')
    const realm = searchParams.get('realm')
    const characterName = searchParams.get('characterName')
    const seasonKey = searchParams.get('seasonKey') || 'latest'
    const allSeasons = searchParams.get('allSeasons') === 'true'

    // Validate required parameters
    if (!region || !realm || !characterName) {
      return apiResponse.error(
        'Missing required parameters: region, realm, and characterName are required',
        HttpStatus.BAD_REQUEST
      )
    }

    // If allSeasons is true, return all seasons for this character
    if (allSeasons) {
      const cache = await findAllSeasonsByCharacter(region, realm, characterName)
      return apiResponse.success(cache)
    }

    // Otherwise, return cache for specific season
    const cache = await findCachedCharacter({
      region,
      realm,
      character_name: characterName,
      season_key: seasonKey,
    })

    if (!cache) {
      return apiResponse.error('Cache entry not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse.success(cache)
  } catch (error) {
    console.error('Error fetching character cache:', error)
    return apiResponse.error('Failed to fetch character cache', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
