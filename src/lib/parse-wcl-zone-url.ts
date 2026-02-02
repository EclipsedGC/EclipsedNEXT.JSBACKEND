/**
 * WCL Zone ID Parsing Utility
 * 
 * Extracts zone IDs from Warcraft Logs tier URLs
 */

export interface ParsedZoneUrl {
  zoneId: number
  originalUrl: string
}

/**
 * Parse WCL zone ID from various URL formats:
 * - https://www.warcraftlogs.com/zone/rankings/44
 * - https://www.warcraftlogs.com/zone/statistics/44
 * - https://www.warcraftlogs.com/zone/reports/44
 * - https://www.warcraftlogs.com/anything?zone=44
 * 
 * @throws Error if URL format is invalid or zone ID cannot be extracted
 */
export function parseWclZoneIdFromUrl(url: string): ParsedZoneUrl {
  try {
    const parsedUrl = new URL(url)
    
    // Check if it's a Warcraft Logs URL
    if (!parsedUrl.hostname.includes('warcraftlogs.com')) {
      throw new Error('URL must be from warcraftlogs.com')
    }

    // Try to extract from /zone/<type>/<id> pattern
    const pathMatch = parsedUrl.pathname.match(/\/zone\/(?:rankings|statistics|reports|encounters?)\/(\d+)/)
    if (pathMatch && pathMatch[1]) {
      const zoneId = parseInt(pathMatch[1], 10)
      if (!isNaN(zoneId) && zoneId > 0) {
        return {
          zoneId,
          originalUrl: url,
        }
      }
    }

    // Try to extract from ?zone=<id> query parameter
    const zoneParam = parsedUrl.searchParams.get('zone')
    if (zoneParam) {
      const zoneId = parseInt(zoneParam, 10)
      if (!isNaN(zoneId) && zoneId > 0) {
        return {
          zoneId,
          originalUrl: url,
        }
      }
    }

    // If we couldn't find a zone ID, provide helpful error message
    throw new Error(
      'Could not extract zone ID from URL. ' +
      'Accepted formats: ' +
      'https://www.warcraftlogs.com/zone/rankings/<id>, ' +
      'https://www.warcraftlogs.com/zone/statistics/<id>, ' +
      'or any WCL URL with ?zone=<id> parameter'
    )
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid URL format')
    }
    throw error
  }
}

/**
 * Validate that a zone ID is a positive integer
 */
export function validateZoneId(zoneId: number): boolean {
  return Number.isInteger(zoneId) && zoneId > 0
}
