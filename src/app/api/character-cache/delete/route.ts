/**
 * DELETE /api/character-cache
 * Delete a character enrichment cache entry
 * 
 * Query params:
 * - region: string (required)
 * - realm: string (required)
 * - characterName: string (required)
 * - seasonKey: string (optional, defaults to 'latest')
 */

import { NextRequest } from 'next/server'
import { apiResponse } from '@/lib/api-response'
import { deleteCacheEntry } from '@/lib/character-enrichment-cache'
import { HttpStatus } from '@/lib/http-status'

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const region = searchParams.get('region')
    const realm = searchParams.get('realm')
    const characterName = searchParams.get('characterName')
    const seasonKey = searchParams.get('seasonKey') || 'latest'

    // Validate required parameters
    if (!region || !realm || !characterName) {
      return apiResponse.error(
        'Missing required parameters: region, realm, and characterName are required',
        HttpStatus.BAD_REQUEST
      )
    }

    const deleted = await deleteCacheEntry({
      region,
      realm,
      character_name: characterName,
      season_key: seasonKey,
    })

    if (!deleted) {
      return apiResponse.error('Cache entry not found', HttpStatus.NOT_FOUND)
    }

    return apiResponse.success(null, 'Cache entry deleted successfully')
  } catch (error) {
    console.error('Error deleting character cache:', error)
    return apiResponse.error('Failed to delete character cache', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
