/**
 * POST /api/enrich-player-card
 * 
 * Enriches a player card with data from Warcraft Logs API
 * 
 * Input:
 * {
 *   warcraftLogsUrl: string,
 *   seasonKey?: string (default: "latest")
 * }
 * 
 * Output:
 * {
 *   success: true,
 *   data: {
 *     warcraftLogsUrl: string,
 *     characterName: string,
 *     realm: string,
 *     region: string,
 *     class: string | null,
 *     spec: string | null,
 *     avatarUrl: string | null,
 *     bestKillLatestSeason: {...} | null,
 *     classSpec: string | null,
 *     updatedAt: string,
 *     fetchStatus: 'complete' | 'partial' | 'failed',
 *     errorMessage?: string
 *   }
 * }
 */

import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'
import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'
import { 
  findCachedCharacter, 
  upsertCacheEntry,
  isCacheStale 
} from '@/lib/character-enrichment-cache'
import { getActiveSeasonConfig } from '@/lib/season-config'
import { 
  fetchWarcraftLogsCharacter,
  fetchWarcraftLogsCharacterById,
  fetchCharacterZoneProgression,
  isWarcraftLogsConfigured 
} from '@/lib/warcraft-logs-client'

// TTL for cache in hours
const CACHE_TTL_HOURS = 6

// Difficulty mapping (WCL uses numeric difficulty values)
const DIFFICULTY_MAP: { [key: number]: 'Mythic' | 'Heroic' | 'Normal' } = {
  5: 'Mythic',
  4: 'Heroic',
  3: 'Normal',
}

const DIFFICULTY_RANK = {
  'Mythic': 3,
  'Heroic': 2,
  'Normal': 1,
}

/**
 * Compute the best boss kill from zone progression data
 * Returns the deepest boss kill with the hardest difficulty
 */
function computeBestBossKill(
  progression: {
    encounters: Array<{
      encounterId: number
      encounterName: string
      kills: Array<{ difficulty: number; killDate?: number }>
    }>
  },
  encounterOrder: number[],
  encounterNames: Array<{ id: number; name: string }>
): PlayerCard['bestKillLatestSeason'] {
  if (!progression.encounters || progression.encounters.length === 0) {
    console.log('[Best Kill] No encounters found in progression data')
    return null
  }

  console.log('[Best Kill] Processing encounters:', progression.encounters.map(e => `${e.encounterName} (${e.encounterId})`).join(', '))
  console.log('[Best Kill] Encounter order:', encounterOrder)
  console.log('[Best Kill] Encounter names:', encounterNames)

  let bestKill: {
    bossId: number
    bossName: string
    difficulty: 'Mythic' | 'Heroic' | 'Normal'
    orderIndex: number
  } | null = null

  // Iterate through encounter order (deepest boss = highest orderIndex)
  for (let orderIndex = encounterOrder.length - 1; orderIndex >= 0; orderIndex--) {
    const encounterId = encounterOrder[orderIndex]
    const encounter = progression.encounters.find(e => e.encounterId === encounterId)

    console.log(`[Best Kill] Checking orderIndex ${orderIndex}, encounterId ${encounterId}:`, encounter ? `Found ${encounter.encounterName} with ${encounter.kills.length} kills` : 'Not found')

    if (!encounter || encounter.kills.length === 0) {
      continue // No kill for this boss
    }

    // Find hardest difficulty killed
    let hardestDifficulty: 'Mythic' | 'Heroic' | 'Normal' | null = null
    for (const kill of encounter.kills) {
      const difficultyName = DIFFICULTY_MAP[kill.difficulty]
      console.log(`[Best Kill]   Kill difficulty: ${kill.difficulty} => ${difficultyName}`)
      if (difficultyName) {
        if (!hardestDifficulty || DIFFICULTY_RANK[difficultyName] > DIFFICULTY_RANK[hardestDifficulty]) {
          hardestDifficulty = difficultyName
        }
      }
    }

    if (hardestDifficulty) {
      // Found a kill! This is the deepest boss (we iterate from deepest to first)
      const bossNameEntry = encounterNames.find(e => e.id === encounterId)
      bestKill = {
        bossId: encounterId,
        bossName: bossNameEntry?.name || `Boss ${encounterId}`,
        difficulty: hardestDifficulty,
        orderIndex,
      }
      console.log(`[Best Kill] ✅ Selected best kill: ${hardestDifficulty} ${bestKill.bossName} (orderIndex: ${orderIndex})`)
      break
    }
  }

  if (!bestKill) {
    console.log('[Best Kill] No valid kills found')
  }

  return bestKill
}

interface PlayerCard {
  warcraftLogsUrl: string
  characterName: string
  realm: string
  region: string
  class: string | null
  spec: string | null
  avatarUrl: string | null
  bestKillLatestSeason: {
    bossId: number
    bossName: string
    difficulty: 'Mythic' | 'Heroic' | 'Normal'
    orderIndex: number
  } | null
  classSpec: string | null
  updatedAt: string
  fetchStatus: 'complete' | 'partial' | 'failed'
  errorMessage?: string
  seasonConfigUpdatedAt?: string
}

/**
 * GET /api/enrich-player-card
 * 
 * Health check endpoint for debugging
 * Returns the status of required dependencies
 */
export async function GET() {
  // Debug: Log environment variables (safely)
  console.log('[enrich-player-card] GET health check')
  console.log('[enrich-player-card] WCL_CLIENT_ID exists:', !!process.env.WCL_CLIENT_ID)
  console.log('[enrich-player-card] WCL_CLIENT_SECRET exists:', !!process.env.WCL_CLIENT_SECRET)
  console.log('[enrich-player-card] WCL_CLIENT_ID value (first 10 chars):', process.env.WCL_CLIENT_ID?.substring(0, 10))
  
  const hasWclToken = isWarcraftLogsConfigured()
  
  let hasDb = false
  try {
    await findCachedCharacter({ region: 'US', realm: 'test', character_name: 'test', season_key: 'latest' })
    hasDb = true
  } catch (dbError) {
    console.error('[enrich-player-card] GET health check - DB error:', dbError)
    hasDb = false
  }
  
  return successResponse({
    ok: hasWclToken && hasDb,
    hasWclToken,
    hasDb,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('[enrich-player-card] POST request received')
    
    // Check if WCL credentials are configured
    if (!isWarcraftLogsConfigured()) {
      console.error('[enrich-player-card] Missing WCL credentials')
      return errorResponse(
        'Warcraft Logs API credentials not configured. Please contact administrator.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }
    
    // Check database connectivity
    try {
      await findCachedCharacter({ region: 'US', realm: 'test', character_name: 'test', season_key: 'latest' })
    } catch (dbError) {
      console.error('[enrich-player-card] Database connectivity check failed:', dbError)
      return errorResponse(
        'Database unavailable. Please try again later.',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }

    const body = await request.json()
    const { warcraftLogsUrl, seasonKey = 'latest', forceRefresh = false } = body

    console.log('[enrich-player-card] Request body:', { warcraftLogsUrl, seasonKey, forceRefresh })

    // Load active season config (optional, won't block if missing)
    let seasonConfigUpdatedAt: string | undefined
    let activeSeasonConfig: Awaited<ReturnType<typeof getActiveSeasonConfig>> | null = null
    try {
      activeSeasonConfig = await getActiveSeasonConfig()
      if (activeSeasonConfig) {
        seasonConfigUpdatedAt = activeSeasonConfig.updated_at
        console.log(`[enrich-player-card] Active season config: ${activeSeasonConfig.tier_name} (Zone ${activeSeasonConfig.wcl_zone_id})`)
      } else {
        console.log('[enrich-player-card] No active season config found')
      }
    } catch (seasonConfigError) {
      console.warn('[enrich-player-card] Failed to load season config (non-fatal):', seasonConfigError)
    }

    // Validate input
    if (!warcraftLogsUrl || typeof warcraftLogsUrl !== 'string') {
      console.error('[enrich-player-card] Validation failed: missing or invalid warcraftLogsUrl')
      return errorResponse(
        'warcraftLogsUrl is required and must be a string',
        HttpStatus.BAD_REQUEST
      )
    }

    // Parse and validate the Warcraft Logs URL
    let parsed
    try {
      parsed = parseWarcraftLogsCharacterUrl(warcraftLogsUrl)
      console.log('[enrich-player-card] Parsed URL:', parsed)
    } catch (error) {
      console.error('[enrich-player-card] URL parsing failed:', error instanceof Error ? error.message : error)
      return errorResponse(
        `Invalid Warcraft Logs URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        HttpStatus.BAD_REQUEST
      )
    }

    // Check if this is an ID-based URL
    if (parsed.type === 'id') {
      // Handle ID-based URL
      console.log(`🔍 Detected ID-based URL for character ID: ${parsed.characterId}`)
      
      // Check if WCL API is configured
      if (!isWarcraftLogsConfigured()) {
        return errorResponse(
          'Warcraft Logs API is not configured. Cannot resolve character ID.',
          HttpStatus.SERVICE_UNAVAILABLE
        )
      }
      
      // Fetch character data by ID from WCL
      try {
        console.log(`🔄 Fetching character data by ID: ${parsed.characterId}`)
        const wclData = await fetchWarcraftLogsCharacterById(parsed.characterId)
        
        // Check cache (unless forceRefresh is true)
        let cachedData = null
        if (!forceRefresh) {
          try {
            cachedData = await findCachedCharacter({
              region: wclData.region,
              realm: wclData.realm,
              character_name: wclData.characterName,
              season_key: seasonKey,
            })
          } catch (dbError) {
            console.error('[enrich] DB_READ_FAILED:', dbError)
            // Continue without cache
          }
        } else {
          console.log('🔄 forceRefresh=true, skipping cache check')
        }
        
        // If we have fresh cache, return it
        if (cachedData && !isCacheStale(cachedData, CACHE_TTL_HOURS)) {
          console.log(`✅ Cache hit for ${wclData.characterName}-${wclData.realm}-${wclData.region}`)
          const playerCard = buildPlayerCardFromCache(cachedData, parsed.originalUrl, seasonConfigUpdatedAt)
          return successResponse(playerCard)
        }
        
        // Fetch best boss kill from active season tier
        const bestKill = await fetchBestBossKill(
          wclData.region,
          wclData.realm,
          wclData.characterName,
          activeSeasonConfig
        )
        
        // Build player card from fresh WCL data
        const playerCard: PlayerCard = {
          warcraftLogsUrl: parsed.originalUrl,
          characterName: wclData.characterName,
          realm: wclData.realm,
          region: wclData.region,
          class: wclData.class,
          spec: wclData.spec,
          avatarUrl: wclData.avatarUrl,
          bestKillLatestSeason: bestKill,
          classSpec: wclData.classSpec,
          updatedAt: new Date().toISOString(),
          fetchStatus: 'complete',
        }

        if (seasonConfigUpdatedAt) {
          playerCard.seasonConfigUpdatedAt = seasonConfigUpdatedAt
        }

        // Update cache with characterId
        try {
          await upsertCacheEntry({
            character_id: wclData.characterId,
            region: wclData.region,
            realm: wclData.realm,
            character_name: wclData.characterName,
            season_key: seasonKey,
            player_card: playerCard,
            wcl_last_fetched_at: new Date().toISOString(),
            fetch_status: 'complete',
            error_message: null,
          })
        } catch (dbError) {
          console.error('[enrich] DB_WRITE_FAILED:', dbError)
          // Continue, we can still return the data
        }

        console.log(`✅ Successfully enriched ${wclData.characterName}-${wclData.realm}-${wclData.region} from ID`)
        return successResponse(playerCard, 'Player card enriched successfully')
        
      } catch (idFetchError) {
        const errorCode = (idFetchError as any).code || 'UNKNOWN'
        const errorMessage = idFetchError instanceof Error ? idFetchError.message : 'Unknown error'
        
        console.error(`[enrich] ${errorCode}:`, errorMessage)
        if (idFetchError instanceof Error && idFetchError.stack) {
          console.error('[enrich] Stack:', idFetchError.stack)
        }
        
        // Return specific error codes based on failure type
        if (errorCode === 'WCL_OAUTH_FAILED') {
          return errorResponse(
            new Error('Could not authenticate with Warcraft Logs'),
            HttpStatus.BAD_GATEWAY
          )
        }
        
        if (errorCode === 'WCL_GRAPHQL_FAILED' || errorCode === 'WCL_GRAPHQL_ERROR') {
          return errorResponse(
            new Error('Warcraft Logs API request failed'),
            HttpStatus.BAD_GATEWAY
          )
        }
        
        if (errorCode === 'WCL_CHARACTER_NOT_FOUND' || errorMessage.includes('not found')) {
          return errorResponse(
            new Error(`Character not found on Warcraft Logs. The character may have been deleted, transferred, or the URL is outdated. Please provide an updated Warcraft Logs character URL.`),
            HttpStatus.BAD_GATEWAY
          )
        }
        
        return errorResponse(
          new Error(`Warcraft Logs API error: ${errorMessage}`),
          HttpStatus.BAD_GATEWAY
        )
      }
    }

    // Full format URL (region/realm/character)
    const { region, realm, characterName, originalUrl } = parsed

    // Look up cache (unless forceRefresh is true)
    let cachedData = null
    if (!forceRefresh) {
      cachedData = await findCachedCharacter({
        region,
        realm,
        character_name: characterName,
        season_key: seasonKey,
      })
    } else {
      console.log('🔄 forceRefresh=true, skipping cache check')
    }

    // Check if cache is fresh
    if (cachedData && !isCacheStale(cachedData, CACHE_TTL_HOURS)) {
      console.log(`✅ Cache hit for ${characterName}-${realm}-${region} (age: ${getAgeInHours(cachedData.updated_at).toFixed(1)}h)`)
      
      // Return cached player card
      return successResponse(
        buildPlayerCardFromCache(cachedData, originalUrl, seasonConfigUpdatedAt),
        'Player card returned from cache'
      )
    }

    // Check if WCL API is configured
    if (!isWarcraftLogsConfigured()) {
      console.warn('⚠️  Warcraft Logs API credentials not configured')
      
      // Return cached data if available, even if stale
      if (cachedData) {
        return successResponse(
          buildPlayerCardFromCache(cachedData, originalUrl, seasonConfigUpdatedAt),
          'WCL API not configured. Returning stale cached data.'
        )
      }
      
      // No cache and no API access
      return errorResponse(
        'Warcraft Logs API is not configured and no cached data is available',
        HttpStatus.SERVICE_UNAVAILABLE
      )
    }

    // Fetch fresh data from Warcraft Logs
    console.log(`🔄 Fetching fresh data for ${characterName}-${realm}-${region}`)
    
    try {
      const wclData = await fetchWarcraftLogsCharacter(region, realm, characterName)
      
      // Fetch best boss kill from active season tier
      const bestKill = await fetchBestBossKill(
        region,
        realm,
        characterName,
        activeSeasonConfig
      )
      
      // Build player card
      const playerCard: PlayerCard = {
        warcraftLogsUrl: originalUrl,
        characterName: wclData.characterName,
        realm: wclData.realm,
        region: wclData.region,
        class: wclData.class,
        spec: wclData.spec,
        avatarUrl: wclData.avatarUrl,
        bestKillLatestSeason: bestKill,
        classSpec: wclData.classSpec,
        updatedAt: new Date().toISOString(),
        fetchStatus: 'complete',
      }

      if (seasonConfigUpdatedAt) {
        playerCard.seasonConfigUpdatedAt = seasonConfigUpdatedAt
      }

      // Update cache with characterId if available
      await upsertCacheEntry({
        character_id: wclData.characterId,
        region,
        realm,
        character_name: characterName,
        season_key: seasonKey,
        player_card: playerCard,
        wcl_last_fetched_at: new Date().toISOString(),
        fetch_status: 'complete',
        error_message: null,
      })

      console.log(`✅ Successfully enriched ${characterName}-${realm}-${region}`)
      
      return successResponse(playerCard, 'Player card enriched successfully')
      
    } catch (wclError) {
      const errorCode = (wclError as any).code || 'UNKNOWN'
      const errorMessage = wclError instanceof Error ? wclError.message : 'Unknown error fetching from Warcraft Logs'
      
      console.error(`[enrich] ${errorCode}:`, errorMessage)
      if (wclError instanceof Error && wclError.stack) {
        console.error('[enrich] Stack:', wclError.stack)
      }
      
      // If we have cached data, return it even though fetch failed
      if (cachedData) {
        console.log('[enrich] Returning stale cached data due to fetch failure')
        
        // Update cache with error info
        try {
          await upsertCacheEntry({
            region,
            realm,
            character_name: characterName,
            season_key: seasonKey,
            fetch_status: 'failed',
            error_message: errorMessage,
          })
        } catch (dbError) {
          console.error('[enrich] DB_UPDATE_FAILED:', dbError)
        }
        
        const playerCard = buildPlayerCardFromCache(cachedData, originalUrl, seasonConfigUpdatedAt)
        playerCard.errorMessage = `Failed to fetch fresh data: ${errorMessage}. Returning cached data.`
        
        return successResponse(playerCard, 'Returning cached data (fetch failed)')
      }
      
      // No cache available, return specific error based on failure type
      if (errorCode === 'WCL_OAUTH_FAILED') {
        return errorResponse(
          new Error('Could not authenticate with Warcraft Logs'),
          HttpStatus.BAD_GATEWAY
        )
      }
      
      if (errorCode === 'WCL_GRAPHQL_FAILED' || errorCode === 'WCL_GRAPHQL_ERROR') {
        return errorResponse(
          new Error('Warcraft Logs API request failed'),
          HttpStatus.BAD_GATEWAY
        )
      }
      
      if (errorCode === 'WCL_CHARACTER_NOT_FOUND' || errorMessage.includes('not found')) {
        return errorResponse(
          new Error(`Character not found on Warcraft Logs. The character may have been deleted, transferred, or doesn't exist. Please verify the character name, realm, and region.`),
          HttpStatus.BAD_GATEWAY
        )
      }
      
      return errorResponse(
        new Error(`Warcraft Logs API error: ${errorMessage}`),
        HttpStatus.BAD_GATEWAY
      )
    }
    
  } catch (error) {
    console.error('[enrich-player-card] Unexpected error:', error)
    if (error instanceof Error) {
      console.error('[enrich-player-card] Error message:', error.message)
      console.error('[enrich-player-card] Error stack:', error.stack)
    }
    return errorResponse(
      'An unexpected server error occurred. Please try again later.',
      HttpStatus.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * Fetch zone progression and compute best boss kill for a character
 * Returns null if no active season config or if fetching fails
 */
async function fetchBestBossKill(
  region: string,
  realm: string,
  characterName: string,
  activeSeasonConfig: Awaited<ReturnType<typeof getActiveSeasonConfig>> | null
): Promise<PlayerCard['bestKillLatestSeason']> {
  if (!activeSeasonConfig) {
    console.log('[Best Kill] No active season config, skipping zone progression fetch')
    return null
  }

  try {
    console.log(`[Best Kill] Fetching zone progression for ${characterName}-${realm}-${region} (Zone ${activeSeasonConfig.wcl_zone_id})`)
    
    const progression = await fetchCharacterZoneProgression(
      region,
      realm,
      characterName,
      activeSeasonConfig.wcl_zone_id
    )

    const bestKill = computeBestBossKill(
      progression,
      activeSeasonConfig.encounter_order,
      activeSeasonConfig.encounter_names
    )

    if (bestKill) {
      console.log(`[Best Kill] ✅ Found: ${bestKill.difficulty} ${bestKill.bossName}`)
    } else {
      console.log(`[Best Kill] ⚠️  No kills found in current tier`)
    }

    return bestKill
  } catch (error) {
    console.error('[Best Kill] ❌ Failed to fetch zone progression:', error)
    // Non-fatal: return null so the rest of the player card still works
    return null
  }
}

/**
 * Build player card from cached data
 */
function buildPlayerCardFromCache(cached: any, warcraftLogsUrl: string, seasonConfigUpdatedAt?: string): PlayerCard {
  const playerCard = cached.player_card || {}
  
  const result: PlayerCard = {
    warcraftLogsUrl,
    characterName: cached.character_name,
    realm: cached.realm,
    region: cached.region,
    class: playerCard.class || null,
    spec: playerCard.spec || null,
    avatarUrl: playerCard.avatarUrl || null,
    bestKillLatestSeason: playerCard.bestKillLatestSeason || null,
    classSpec: playerCard.classSpec || null,
    updatedAt: cached.updated_at,
    fetchStatus: cached.fetch_status || 'partial',
    errorMessage: cached.error_message || undefined,
  }

  if (seasonConfigUpdatedAt) {
    result.seasonConfigUpdatedAt = seasonConfigUpdatedAt
  }

  return result
}

/**
 * Get cache age in hours
 */
function getAgeInHours(updatedAt: string): number {
  const updated = new Date(updatedAt)
  const now = new Date()
  return (now.getTime() - updated.getTime()) / (1000 * 60 * 60)
}
