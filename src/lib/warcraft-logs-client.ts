/**
 * Warcraft Logs API Client
 * 
 * Handles fetching character data from Warcraft Logs API v2 (GraphQL)
 */

import { getWCLClassName } from './wcl-class-map'

interface WarcraftLogsConfig {
  clientId?: string
  clientSecret?: string
  apiUrl?: string
}

interface WarcraftLogsToken {
  access_token: string
  expires_in: number
  token_type: string
}

interface WarcraftLogsCharacterData {
  errors?: Array<{ message: string }>
  data: {
    characterData: {
      character: {
        id: number
        name: string
        server: {
          name: string
          region: {
            slug: string
          }
        }
        classID: number
        zoneRankings: any // Raw JSON from WCL
      }
    }
  }
}

interface ParsedWarcraftLogsData {
  characterId?: string
  characterName: string
  realm: string
  region: string
  class: string | null
  spec: string | null
  mostPlayedSpec: string | null
  bestKillLatestSeason: {
    encounterName: string
    difficulty: string
    killDate: string | null
    rankPercent: number
  } | null
  classSpec: string | null
  avatarUrl: string | null
}

/**
 * Get OAuth token for Warcraft Logs API
 */
async function getWarcraftLogsToken(config: WarcraftLogsConfig): Promise<string> {
  const clientId = config.clientId || process.env.WCL_CLIENT_ID
  const clientSecret = config.clientSecret || process.env.WCL_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    const error = new Error('Warcraft Logs API credentials not configured')
    ;(error as any).code = 'WCL_CONFIG_MISSING'
    throw error
  }
  
  const tokenUrl = 'https://www.warcraftlogs.com/oauth/token'
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[WCL OAuth] Requesting token from:', tokenUrl)
  }
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    
    if (!response.ok) {
      const responseText = await response.text()
      console.error('[WCL OAuth] Failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500)
      })
      const error = new Error(`WCL OAuth failed: ${response.status} ${response.statusText}`)
      ;(error as any).code = 'WCL_OAUTH_FAILED'
      ;(error as any).status = response.status
      throw error
    }
    
    const data: WarcraftLogsToken = await response.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[WCL OAuth] Token obtained successfully')
    }
    
    return data.access_token
  } catch (fetchError) {
    if (fetchError instanceof Error && (fetchError as any).code) {
      throw fetchError
    }
    console.error('[WCL OAuth] Network error:', fetchError)
    const error = new Error('Network error connecting to Warcraft Logs OAuth')
    ;(error as any).code = 'WCL_OAUTH_NETWORK_ERROR'
    throw error
  }
}

/**
 * Fetch character data from Warcraft Logs API
 */
export async function fetchWarcraftLogsCharacter(
  region: string,
  realm: string,
  characterName: string,
  config: WarcraftLogsConfig = {}
): Promise<ParsedWarcraftLogsData> {
  const apiUrl = config.apiUrl || 'https://www.warcraftlogs.com/api/v2/client'
  
  // Get OAuth token
  const token = await getWarcraftLogsToken(config)
  
  // GraphQL query to fetch character rankings
  const query = `
    query ($name: String!, $serverSlug: String!, $serverRegion: String!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          id
          name
          server {
            name
            region {
              slug
            }
          }
          classID
          zoneRankings
        }
      }
    }
  `
  
  const variables = {
    name: characterName,
    serverSlug: realm,
    serverRegion: region.toUpperCase(),
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log('[WCL GraphQL] Request:', {
      endpoint: apiUrl,
      variables,
      queryLength: query.length
    })
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })
    
    if (!response.ok) {
      const responseText = await response.text()
      console.error('[WCL GraphQL] HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500)
      })
      const error = new Error(`WCL GraphQL request failed: ${response.status}`)
      ;(error as any).code = 'WCL_GRAPHQL_FAILED'
      ;(error as any).status = response.status
      throw error
    }
    
    const response_data: WarcraftLogsCharacterData = await response.json()
    
    // Debug: Log the full API response (dev only)
    if (process.env.NODE_ENV === 'development') {
      const responseText = JSON.stringify(response_data, null, 2)
      console.log('[WCL GraphQL] Response (first 500 chars):', responseText.substring(0, 500))
      console.log('[WCL GraphQL] data exists:', !!response_data.data)
      console.log('[WCL GraphQL] characterData exists:', !!response_data.data?.characterData)
      console.log('[WCL GraphQL] character exists:', !!response_data.data?.characterData?.character)
    }
    
    if (!response_data.data?.characterData?.character) {
      // Check if there's an error in the response
      if (response_data.errors && Array.isArray(response_data.errors)) {
        const errorMessages = response_data.errors.map(e => e.message).join(', ')
        console.error('[WCL GraphQL] API returned errors:', errorMessages)
        const error = new Error(`WCL API error: ${errorMessages}`)
        ;(error as any).code = 'WCL_GRAPHQL_ERROR'
        throw error
      }
      const error = new Error('Character not found on Warcraft Logs')
      ;(error as any).code = 'WCL_CHARACTER_NOT_FOUND'
      throw error
    }
    
    // Parse and normalize the data
    return parseWarcraftLogsResponse(response_data)
  } catch (fetchError) {
    if (fetchError instanceof Error && (fetchError as any).code) {
      throw fetchError
    }
    console.error('[WCL GraphQL] Network error:', fetchError)
    const error = new Error('Network error connecting to Warcraft Logs API')
    ;(error as any).code = 'WCL_GRAPHQL_NETWORK_ERROR'
    throw error
  }
}

/**
 * Parse WCL API response into normalized format
 */
function parseWarcraftLogsResponse(response_data: WarcraftLogsCharacterData): ParsedWarcraftLogsData {
  const character = response_data.data.characterData.character
  const region = character.server.region.slug.toUpperCase()
  
  // Use shared WCL class mapping (alphabetical ordering)
  const className = getWCLClassName(character.classID)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WCL Parser] Character: ${character.name}, ClassID: ${character.classID} -> Class: ${className}`)
  }
  
  // zoneRankings is raw JSON, may contain multiple zones/difficulties
  const zoneRankingsData = character.zoneRankings || {}
  
  // Try to extract rankings from the JSON structure
  // The structure varies, but typically: { [zoneId]: { rankings: [...], ... } }
  let allRankings: any[] = []
  
  if (zoneRankingsData && typeof zoneRankingsData === 'object') {
    // Extract all rankings arrays from all zones
    Object.values(zoneRankingsData).forEach((zoneData: any) => {
      if (zoneData && zoneData.rankings && Array.isArray(zoneData.rankings)) {
        allRankings = allRankings.concat(zoneData.rankings)
      }
    })
  }
  
  // Determine most played spec (spec with most kills)
  const specCounts = new Map<string, number>()
  allRankings.forEach(ranking => {
    if (ranking.spec) {
      const spec = ranking.spec
      specCounts.set(spec, (specCounts.get(spec) || 0) + 1)
    }
  })
  
  let mostPlayedSpec: string | null = null
  let maxCount = 0
  specCounts.forEach((count, spec) => {
    if (count > maxCount) {
      maxCount = count
      mostPlayedSpec = spec
    }
  })
  
  // Find best kill (highest rank percent)
  let bestKill: any = null
  allRankings.forEach(ranking => {
    if (ranking.rankPercent && (!bestKill || ranking.rankPercent > bestKill.rankPercent)) {
      bestKill = ranking
    }
  })
  
  // Map difficulty number to name
  const difficultyMap: Record<number, string> = {
    3: 'Normal',
    4: 'Heroic',
    5: 'Mythic',
  }
  
  return {
    characterId: character.id ? String(character.id) : undefined,
    characterName: character.name,
    realm: character.server.name,
    region: region,
    class: className,
    spec: mostPlayedSpec,
    mostPlayedSpec: mostPlayedSpec,
    bestKillLatestSeason: bestKill ? {
      encounterName: bestKill.encounter?.name || bestKill.encounterName || 'Unknown',
      difficulty: difficultyMap[bestKill.difficulty] || 'Unknown',
      killDate: bestKill.killDate ? new Date(bestKill.killDate).toISOString() : null,
      rankPercent: Math.round(bestKill.rankPercent * 100) / 100,
    } : null,
    classSpec: mostPlayedSpec ? `${className} ${mostPlayedSpec}` : className,
    avatarUrl: null, // Not available from WCL, could be added via Blizzard API later
  }
}

/**
 * Check if WCL API credentials are configured
 */
export function isWarcraftLogsConfigured(): boolean {
  return !!(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET)
}

/**
 * Fetch character data from Warcraft Logs API using character ID
 * This resolves an ID-based URL to get the full character details
 */
export async function fetchWarcraftLogsCharacterById(
  characterId: string,
  config: WarcraftLogsConfig = {}
): Promise<ParsedWarcraftLogsData> {
  const apiUrl = config.apiUrl || 'https://www.warcraftlogs.com/api/v2/client'
  const token = await getWarcraftLogsToken(config)
  
  // GraphQL query to fetch character by ID
  const query = `
    query GetCharacterById($characterId: Int!) {
      characterData {
        character(id: $characterId) {
          id
          name
          server {
            name
            region {
              slug
            }
          }
          classID
          zoneRankings
        }
      }
    }
  `
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        characterId: parseInt(characterId, 10),
      },
    }),
  })
  
  if (!response.ok) {
    throw new Error(`WCL API request failed: ${response.status} ${response.statusText}`)
  }
  
  const result: WarcraftLogsCharacterData = await response.json()
  
  if (!result.data?.characterData?.character) {
    // Check for GraphQL errors
    if (result.errors && Array.isArray(result.errors)) {
      const errorMessages = result.errors.map(e => e.message).join(', ')
      throw new Error(`WCL API error: ${errorMessages}`)
    }
    throw new Error(`Character with ID ${characterId} not found on Warcraft Logs`)
  }
  
  // Parse and normalize the data using the shared function
  return parseWarcraftLogsResponse(result)
}

/**
 * Fetch encounter list for a specific zone (raid tier)
 */
export async function fetchWarcraftLogsZoneEncounters(
  zoneId: number,
  wclConfig: WarcraftLogsConfig = {}
): Promise<{
  zoneId: number
  zoneName: string
  encounters: Array<{ id: number; name: string }>
}> {
  const token = await getWarcraftLogsToken(wclConfig)
  const apiUrl = wclConfig.apiUrl || 'https://www.warcraftlogs.com/api/v2/client'

  const query = `
    query ($zoneId: Int!) {
      worldData {
        zone(id: $zoneId) {
          id
          name
          encounters {
            id
            name
          }
        }
      }
    }
  `

  if (process.env.NODE_ENV === 'development') {
    console.log(`[WCL GraphQL] Fetching encounters for zone ${zoneId}`)
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables: {
          zoneId,
        },
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      console.error('[WCL GraphQL] Zone query HTTP error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText.substring(0, 500)
      })
      const error = new Error(`WCL GraphQL request failed: ${response.status}`)
      ;(error as any).code = 'WCL_GRAPHQL_FAILED'
      ;(error as any).status = response.status
      throw error
    }

    const result: any = await response.json()

    if (process.env.NODE_ENV === 'development') {
      const responseText = JSON.stringify(result, null, 2)
      console.log('[WCL GraphQL] Zone response (first 500 chars):', responseText.substring(0, 500))
    }

    if (result.errors && Array.isArray(result.errors)) {
      const errorMessages = result.errors.map((e: any) => e.message).join(', ')
      console.error('[WCL GraphQL] Zone query returned errors:', errorMessages)
      const error = new Error(`WCL API error: ${errorMessages}`)
      ;(error as any).code = 'WCL_GRAPHQL_ERROR'
      throw error
    }

    if (!result.data?.worldData?.zone) {
      const error = new Error(`Zone ${zoneId} not found on Warcraft Logs`)
      ;(error as any).code = 'WCL_ZONE_NOT_FOUND'
      throw error
    }

    const zone = result.data.worldData.zone

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      encounters: zone.encounters || [],
    }
  } catch (fetchError) {
    if (fetchError instanceof Error && (fetchError as any).code) {
      throw fetchError
    }
    console.error('[WCL GraphQL] Network error:', fetchError)
    const error = new Error('Network error connecting to Warcraft Logs API')
    ;(error as any).code = 'WCL_GRAPHQL_NETWORK_ERROR'
    throw error
  }
}

/**
 * Fetch character progression for a specific zone
 * Returns kills organized by encounter and difficulty
 */
export async function fetchCharacterZoneProgression(
  region: string,
  realm: string,
  characterName: string,
  zoneId: number,
  config: WarcraftLogsConfig = {}
): Promise<{
  encounters: Array<{
    encounterId: number
    encounterName: string
    kills: Array<{
      difficulty: number // 3=Normal, 4=Heroic, 5=Mythic
      killDate?: number
    }>
  }>
}> {
  const apiUrl = config.apiUrl || 'https://www.warcraftlogs.com/api/v2/client'
  const token = await getWarcraftLogsToken(config)

  // GraphQL query to fetch character's zone rankings/kills
  const query = `
    query ($name: String!, $serverSlug: String!, $serverRegion: String!, $zoneID: Int!) {
      characterData {
        character(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
          zoneRankings(zoneID: $zoneID)
        }
      }
    }
  `

  const variables = {
    name: characterName,
    serverSlug: realm,
    serverRegion: region.toUpperCase(),
    zoneID: zoneId,
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('[WCL Zone Progression] Request:', {
      endpoint: apiUrl,
      variables,
    })
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      console.error('[WCL Zone Progression] HTTP error:', {
        status: response.status,
        body: responseText.substring(0, 500)
      })
      const error = new Error(`WCL zone progression request failed: ${response.status}`)
      ;(error as any).code = 'WCL_GRAPHQL_FAILED'
      throw error
    }

    const result: any = await response.json()

    if (process.env.NODE_ENV === 'development') {
      const responseText = JSON.stringify(result, null, 2)
      console.log('[WCL Zone Progression] Response (first 1000 chars):', responseText.substring(0, 1000))
    }

    if (result.errors && Array.isArray(result.errors)) {
      const errorMessages = result.errors.map((e: any) => e.message).join(', ')
      console.error('[WCL Zone Progression] API errors:', errorMessages)
      const error = new Error(`WCL API error: ${errorMessages}`)
      ;(error as any).code = 'WCL_GRAPHQL_ERROR'
      throw error
    }

    const zoneRankings = result.data?.characterData?.character?.zoneRankings

    if (process.env.NODE_ENV === 'development') {
      console.log('[WCL Zone Progression] Full zoneRankings object:', JSON.stringify(zoneRankings, null, 2))
    }

    if (!zoneRankings) {
      // Character has no data for this zone (hasn't raided it)
      console.log('[WCL Zone Progression] No zoneRankings data found')
      return { encounters: [] }
    }

    // The difficulty is at the zone level, not per-ranking
    // zoneRankings.difficulty tells us what difficulty these rankings are for
    const zoneDifficulty = zoneRankings.difficulty

    if (process.env.NODE_ENV === 'development') {
      console.log(`[WCL Zone Progression] Zone-level difficulty: ${zoneDifficulty}`)
    }

    // Parse zoneRankings to extract encounter kills
    // zoneRankings has structure: { difficulty: N, rankings: [ {encounter, totalKills, ...}, ... ] }
    const encounters: Map<number, {
      encounterId: number
      encounterName: string
      kills: Array<{ difficulty: number; killDate?: number }>
    }> = new Map()

    if (zoneRankings.rankings && Array.isArray(zoneRankings.rankings)) {
      console.log(`[WCL Zone Progression] Found ${zoneRankings.rankings.length} rankings`)
      for (const ranking of zoneRankings.rankings) {
        const encounterId = ranking.encounter?.id
        const encounterName = ranking.encounter?.name
        const totalKills = ranking.totalKills || 0

        if (process.env.NODE_ENV === 'development') {
          console.log(`[WCL Zone Progression] Ranking: ${encounterName} (ID: ${encounterId}), TotalKills: ${totalKills}, Using zone difficulty: ${zoneDifficulty}`)
        }

        // Only add encounters that have actual kills
        if (encounterId && encounterName && totalKills > 0) {
          if (!encounters.has(encounterId)) {
            encounters.set(encounterId, {
              encounterId,
              encounterName,
              kills: []
            })
          }

          // Use the zone-level difficulty since all rankings are filtered by this difficulty
          encounters.get(encounterId)!.kills.push({
            difficulty: zoneDifficulty,
            killDate: undefined // We could parse this from rankings if needed
          })
        }
      }
    } else {
      console.log('[WCL Zone Progression] No rankings array found in zoneRankings')
    }

    return {
      encounters: Array.from(encounters.values())
    }

  } catch (fetchError) {
    if (fetchError instanceof Error && (fetchError as any).code) {
      throw fetchError
    }
    console.error('[WCL Zone Progression] Network error:', fetchError)
    const error = new Error('Network error fetching zone progression')
    ;(error as any).code = 'WCL_GRAPHQL_NETWORK_ERROR'
    throw error
  }
}

