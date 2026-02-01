/**
 * Character Enrichment Cache Service
 * 
 * Provides database operations for the character enrichment cache.
 */

import { query, queryOne, execute } from './db'
import type {
  CharacterEnrichmentCache,
  CharacterEnrichmentCacheCreate,
  CharacterEnrichmentCacheUpdate,
  CharacterLookup,
  FetchStatus,
} from '../types/character-enrichment'

/**
 * Find a cached character by region, realm, character name, and season
 */
export async function findCachedCharacter(
  lookup: CharacterLookup
): Promise<CharacterEnrichmentCache | null> {
  const seasonKey = lookup.season_key || 'latest'
  
  const row = await queryOne<any>(
    `SELECT * FROM character_enrichment_cache 
     WHERE region = ? AND realm = ? AND character_name = ? AND season_key = ?`,
    [lookup.region, lookup.realm, lookup.character_name, seasonKey]
  )

  if (!row) return null

  return {
    ...row,
    player_card: row.player_card ? JSON.parse(row.player_card) : {},
  }
}

/**
 * Create a new cache entry
 */
export async function createCacheEntry(
  data: CharacterEnrichmentCacheCreate
): Promise<CharacterEnrichmentCache> {
  const seasonKey = data.season_key || 'latest'
  const playerCard = JSON.stringify(data.player_card || {})
  const fetchStatus = data.fetch_status || 'partial'

  const result = await execute(
    `INSERT INTO character_enrichment_cache 
     (region, realm, character_name, season_key, player_card, wcl_last_fetched_at, blizzard_last_fetched_at, fetch_status, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.region,
      data.realm,
      data.character_name,
      seasonKey,
      playerCard,
      data.wcl_last_fetched_at || null,
      data.blizzard_last_fetched_at || null,
      fetchStatus,
      data.error_message || null,
    ]
  )

  const created = await queryOne<any>(
    `SELECT * FROM character_enrichment_cache WHERE id = ?`,
    [result.lastInsertRowid]
  )

  return {
    ...created,
    player_card: created.player_card ? JSON.parse(created.player_card) : {},
  }
}

/**
 * Update an existing cache entry
 */
export async function updateCacheEntry(
  lookup: CharacterLookup,
  updates: CharacterEnrichmentCacheUpdate
): Promise<CharacterEnrichmentCache | null> {
  const seasonKey = lookup.season_key || 'latest'
  
  // Build dynamic update query
  const fields: string[] = []
  const values: any[] = []

  if (updates.player_card !== undefined) {
    fields.push('player_card = ?')
    values.push(JSON.stringify(updates.player_card))
  }
  if (updates.wcl_last_fetched_at !== undefined) {
    fields.push('wcl_last_fetched_at = ?')
    values.push(updates.wcl_last_fetched_at)
  }
  if (updates.blizzard_last_fetched_at !== undefined) {
    fields.push('blizzard_last_fetched_at = ?')
    values.push(updates.blizzard_last_fetched_at)
  }
  if (updates.fetch_status !== undefined) {
    fields.push('fetch_status = ?')
    values.push(updates.fetch_status)
  }
  if (updates.error_message !== undefined) {
    fields.push('error_message = ?')
    values.push(updates.error_message)
  }

  // Always update updated_at
  fields.push(`updated_at = DATETIME('now')`)

  if (fields.length === 1) {
    // No fields to update except updated_at
    return findCachedCharacter(lookup)
  }

  // Add WHERE clause parameters
  values.push(lookup.region, lookup.realm, lookup.character_name, seasonKey)

  await execute(
    `UPDATE character_enrichment_cache 
     SET ${fields.join(', ')}
     WHERE region = ? AND realm = ? AND character_name = ? AND season_key = ?`,
    values
  )

  return findCachedCharacter(lookup)
}

/**
 * Upsert: Create or update a cache entry
 */
export async function upsertCacheEntry(
  data: CharacterEnrichmentCacheCreate & CharacterEnrichmentCacheUpdate
): Promise<CharacterEnrichmentCache> {
  const lookup: CharacterLookup = {
    region: data.region,
    realm: data.realm,
    character_name: data.character_name,
    season_key: data.season_key,
  }

  const existing = await findCachedCharacter(lookup)

  if (existing) {
    const updated = await updateCacheEntry(lookup, data)
    return updated!
  } else {
    return createCacheEntry(data)
  }
}

/**
 * Delete a cache entry
 */
export async function deleteCacheEntry(lookup: CharacterLookup): Promise<boolean> {
  const seasonKey = lookup.season_key || 'latest'

  const result = await execute(
    `DELETE FROM character_enrichment_cache 
     WHERE region = ? AND realm = ? AND character_name = ? AND season_key = ?`,
    [lookup.region, lookup.realm, lookup.character_name, seasonKey]
  )

  return result.changes > 0
}

/**
 * Get all cache entries for a specific character (across all seasons)
 */
export async function findAllSeasonsByCharacter(
  region: string,
  realm: string,
  characterName: string
): Promise<CharacterEnrichmentCache[]> {
  const rows = await query<any>(
    `SELECT * FROM character_enrichment_cache 
     WHERE region = ? AND realm = ? AND character_name = ?
     ORDER BY season_key DESC`,
    [region, realm, characterName]
  )

  return rows.map((row) => ({
    ...row,
    player_card: row.player_card ? JSON.parse(row.player_card) : {},
  }))
}

/**
 * Check if cache is stale (needs refresh)
 * Returns true if the cache hasn't been updated in the specified hours
 */
export function isCacheStale(
  cache: CharacterEnrichmentCache | null,
  maxAgeHours: number = 24
): boolean {
  if (!cache) return true
  
  const updatedAt = new Date(cache.updated_at)
  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
  
  return hoursSinceUpdate >= maxAgeHours
}
