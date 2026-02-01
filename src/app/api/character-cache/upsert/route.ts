/**
 * POST /api/character-cache/upsert
 * Create or update a character enrichment cache entry
 * 
 * Body:
 * - region: string (required)
 * - realm: string (required)
 * - characterName: string (required)
 * - seasonKey: string (optional, defaults to 'latest')
 * - playerCard: object (optional)
 * - wclLastFetchedAt: string (optional)
 * - blizzardLastFetchedAt: string (optional)
 * - fetchStatus: 'complete' | 'partial' | 'failed' (optional)
 * - errorMessage: string (optional)
 */

import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-response'
import { upsertCacheEntry } from '@/lib/character-enrichment-cache'
import { HttpStatus } from '@/lib/http-status'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      region,
      realm,
      characterName,
      seasonKey,
      playerCard,
      wclLastFetchedAt,
      blizzardLastFetchedAt,
      fetchStatus,
      errorMessage,
    } = body

    // Validate required parameters
    if (!region || !realm || !characterName) {
      return apiResponse.error(
        'Missing required parameters: region, realm, and characterName are required',
        HttpStatus.BAD_REQUEST
      )
    }

    // Validate fetchStatus if provided
    if (fetchStatus && !['complete', 'partial', 'failed'].includes(fetchStatus)) {
      return apiResponse.error(
        'Invalid fetchStatus. Must be one of: complete, partial, failed',
        HttpStatus.BAD_REQUEST
      )
    }

    const cache = await upsertCacheEntry({
      region,
      realm,
      character_name: characterName,
      season_key: seasonKey,
      player_card: playerCard,
      wcl_last_fetched_at: wclLastFetchedAt,
      blizzard_last_fetched_at: blizzardLastFetchedAt,
      fetch_status: fetchStatus,
      error_message: errorMessage,
    })

    return apiResponse.success(cache, 'Character cache updated successfully')
  } catch (error) {
    console.error('Error upserting character cache:', error)
    return apiResponse.error('Failed to update character cache', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
