/**
 * Character Enrichment Cache Types
 * 
 * Stores cached external API enrichment results for WoW characters.
 */

export type FetchStatus = 'complete' | 'partial' | 'failed'

export interface CharacterEnrichmentCache {
  id: number
  character_id: string | null // WCL character ID for stable identification
  region: string
  realm: string
  character_name: string
  season_key: string
  player_card: Record<string, any> // JSON object stored as TEXT
  wcl_last_fetched_at: string | null // ISO datetime string
  blizzard_last_fetched_at: string | null // ISO datetime string
  fetch_status: FetchStatus
  error_message: string | null
  created_at: string // ISO datetime string
  updated_at: string // ISO datetime string
}

export interface CharacterEnrichmentCacheCreate {
  character_id?: string | null
  region: string
  realm: string
  character_name: string
  season_key?: string
  player_card?: Record<string, any>
  wcl_last_fetched_at?: string | null
  blizzard_last_fetched_at?: string | null
  fetch_status?: FetchStatus
  error_message?: string | null
}

export interface CharacterEnrichmentCacheUpdate {
  character_id?: string | null
  player_card?: Record<string, any>
  wcl_last_fetched_at?: string | null
  blizzard_last_fetched_at?: string | null
  fetch_status?: FetchStatus
  error_message?: string | null
}

export interface CharacterLookup {
  region: string
  realm: string
  character_name: string
  season_key?: string
}
