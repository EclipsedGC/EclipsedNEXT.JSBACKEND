/**
 * Warcraft Logs Character URL Parser
 * 
 * Parses and validates Warcraft Logs character profile URLs.
 * Supports two formats:
 * 1. Full format: https://www.warcraftlogs.com/character/{region}/{realm}/{characterName}
 * 2. ID format: https://www.warcraftlogs.com/character/id/{characterId}
 */

export type ParsedWarcraftLogsUrl = 
  | {
      type: 'slug'
      region: string
      realm: string
      characterName: string
      originalUrl: string
    }
  | {
      type: 'id'
      characterId: string
      originalUrl: string
    }

/**
 * Valid Warcraft Logs regions
 */
const VALID_REGIONS = ['us', 'eu', 'kr', 'tw', 'cn'] as const
type WarcraftLogsRegion = typeof VALID_REGIONS[number]

/**
 * Normalize region code to uppercase standard format
 */
function normalizeRegion(region: string): string {
  const normalized = region.toLowerCase()
  
  if (!VALID_REGIONS.includes(normalized as WarcraftLogsRegion)) {
    throw new Error(
      `Invalid region '${region}'. Must be one of: ${VALID_REGIONS.join(', ').toUpperCase()}`
    )
  }
  
  return normalized.toUpperCase()
}

/**
 * Validate and normalize realm slug
 * Realm slugs should be lowercase, alphanumeric with hyphens
 */
function normalizeRealmSlug(realm: string): string {
  if (!realm || realm.trim() === '') {
    throw new Error('Realm cannot be empty')
  }
  
  // Convert to lowercase and trim
  const normalized = realm.toLowerCase().trim()
  
  // Check for valid characters (alphanumeric and hyphens)
  if (!/^[a-z0-9-]+$/.test(normalized)) {
    throw new Error(
      `Invalid realm slug '${realm}'. Realm must contain only letters, numbers, and hyphens`
    )
  }
  
  return normalized
}

/**
 * Validate and normalize character name
 */
function normalizeCharacterName(name: string): string {
  if (!name || name.trim() === '') {
    throw new Error('Character name cannot be empty')
  }
  
  // Trim whitespace
  const normalized = name.trim()
  
  // Character names should be 2-12 characters (WoW standard)
  if (normalized.length < 2 || normalized.length > 12) {
    throw new Error(
      `Invalid character name length '${name}'. Must be between 2 and 12 characters`
    )
  }
  
  // Check for valid characters (letters only, case-insensitive)
  if (!/^[a-zA-Z]+$/.test(normalized)) {
    throw new Error(
      `Invalid character name '${name}'. Must contain only letters`
    )
  }
  
  // Capitalize first letter, lowercase rest (standard WoW format)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
}

/**
 * Parse and validate a Warcraft Logs character profile URL
 * 
 * Supported formats:
 * - https://www.warcraftlogs.com/character/us/area-52/playername (full format)
 * - https://www.warcraftlogs.com/character/id/64213375 (ID format)
 * 
 * @param url - The Warcraft Logs character URL to parse
 * @returns Union type with either slug or id format
 * @throws Error with descriptive message if URL is invalid
 */
export function parseWarcraftLogsCharacterUrl(url: string): ParsedWarcraftLogsUrl {
  // Validate input
  if (!url || typeof url !== 'string') {
    throw new Error('URL is required and must be a string')
  }
  
  const trimmedUrl = url.trim()
  
  if (trimmedUrl === '') {
    throw new Error('URL cannot be empty')
  }
  
  // Parse the URL
  let parsedUrl: URL
  try {
    // Handle URLs without protocol
    const urlToParse = trimmedUrl.startsWith('http') 
      ? trimmedUrl 
      : `https://${trimmedUrl}`
    
    parsedUrl = new URL(urlToParse)
  } catch (error) {
    throw new Error(`Invalid URL format: ${trimmedUrl}`)
  }
  
  // Validate hostname
  if (!parsedUrl.hostname.includes('warcraftlogs.com')) {
    throw new Error(
      `Invalid domain. Expected warcraftlogs.com, got: ${parsedUrl.hostname}`
    )
  }
  
  // Extract and validate pathname
  const pathname = parsedUrl.pathname
  
  // Expected format: /character/{region}/{realm}/{characterName}
  // OR: /character/id/{characterId}
  const pathParts = pathname.split('/').filter(part => part !== '')
  
  if (pathParts.length < 2) {
    throw new Error(
      `Invalid URL structure. Expected format: https://www.warcraftlogs.com/character/{region}/{realm}/{characterName} or https://www.warcraftlogs.com/character/id/{characterId}`
    )
  }
  
  const [section, secondPart, thirdPart, fourthPart] = pathParts
  
  // Validate section is 'character'
  if (section !== 'character') {
    throw new Error(
      `Invalid URL path. Expected '/character/...', got: '/${section}/...'`
    )
  }
  
  // Check if this is an ID-based URL (e.g., /character/id/64213375)
  if (secondPart === 'id') {
    if (!thirdPart) {
      throw new Error('Character ID is missing from URL')
    }
    
    // Validate the character ID (should be numeric)
    if (!/^\d+$/.test(thirdPart)) {
      throw new Error(`Invalid character ID '${thirdPart}'. Character ID must be numeric.`)
    }
    
    return {
      type: 'id',
      characterId: thirdPart,
      originalUrl: trimmedUrl,
    }
  }
  
  // Full format validation
  if (pathParts.length < 4) {
    throw new Error(
      `Invalid URL structure. Expected format: https://www.warcraftlogs.com/character/{region}/{realm}/{characterName}`
    )
  }
  
  const region = secondPart
  const realm = thirdPart
  const characterName = fourthPart
  
  // Validate and normalize each component
  try {
    const normalizedRegion = normalizeRegion(region)
    const normalizedRealm = normalizeRealmSlug(realm)
    const normalizedCharacterName = normalizeCharacterName(characterName)
    
    return {
      type: 'slug',
      region: normalizedRegion,
      realm: normalizedRealm,
      characterName: normalizedCharacterName,
      originalUrl: trimmedUrl,
    }
  } catch (error) {
    // Re-throw validation errors with context
    if (error instanceof Error) {
      throw new Error(`URL validation failed: ${error.message}`)
    }
    throw error
  }
}

/**
 * Check if a string looks like a Warcraft Logs character URL
 * (less strict than full parsing, useful for UI validation)
 */
export function isWarcraftLogsCharacterUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  try {
    parseWarcraftLogsCharacterUrl(url)
    return true
  } catch {
    return false
  }
}

/**
 * Build a Warcraft Logs character URL from components
 */
export function buildWarcraftLogsCharacterUrl(
  region: string,
  realm: string,
  characterName: string
): string {
  const normalizedRegion = normalizeRegion(region)
  const normalizedRealm = normalizeRealmSlug(realm)
  const normalizedCharacterName = normalizeCharacterName(characterName)
  
  return `https://www.warcraftlogs.com/character/${normalizedRegion.toLowerCase()}/${normalizedRealm}/${normalizedCharacterName.toLowerCase()}`
}
