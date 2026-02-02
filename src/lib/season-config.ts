/**
 * Season Config Service
 * 
 * Database operations for raid tier season configuration
 */

import { query, queryOne, execute } from './db'
import type {
  SeasonConfig,
  SeasonConfigCreate,
  SeasonConfigUpdate,
  EncounterInfo,
} from '../types/season-config'

/**
 * Get the currently active season config
 */
export async function getActiveSeasonConfig(): Promise<SeasonConfig | null> {
  const row = await queryOne<any>(
    `SELECT * FROM season_config WHERE is_active = 1 LIMIT 1`
  )

  if (!row) return null

  return parseSeasonConfigRow(row)
}

/**
 * Get a season config by ID
 */
export async function getSeasonConfigById(id: number): Promise<SeasonConfig | null> {
  const row = await queryOne<any>(
    `SELECT * FROM season_config WHERE id = ?`,
    [id]
  )

  if (!row) return null

  return parseSeasonConfigRow(row)
}

/**
 * Get all season configs
 */
export async function getAllSeasonConfigs(): Promise<SeasonConfig[]> {
  const rows = await query<any>(
    `SELECT * FROM season_config ORDER BY is_active DESC, updated_at DESC`
  )

  return rows.map(parseSeasonConfigRow)
}

/**
 * Create a new season config
 */
export async function createSeasonConfig(
  data: SeasonConfigCreate
): Promise<SeasonConfig> {
  const encounterOrder = JSON.stringify(data.encounter_order || [])
  const encounterNames = JSON.stringify(data.encounter_names || [])
  const isActive = data.is_active ? 1 : 0

  // If this should be active, deactivate all others first
  if (data.is_active) {
    await execute(`UPDATE season_config SET is_active = 0 WHERE is_active = 1`)
  }

  const result = await execute(
    `INSERT INTO season_config 
     (tier_name, wcl_tier_url, wcl_zone_id, encounter_order, encounter_names, is_active, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, DATETIME('now'))`,
    [data.tier_name, data.wcl_tier_url, data.wcl_zone_id, encounterOrder, encounterNames, isActive]
  )

  const newConfig = await getSeasonConfigById(result.lastInsertRowid as number)
  if (!newConfig) {
    throw new Error('Failed to retrieve created season config')
  }

  return newConfig
}

/**
 * Update a season config
 */
export async function updateSeasonConfig(
  id: number,
  data: SeasonConfigUpdate
): Promise<SeasonConfig> {
  const existing = await getSeasonConfigById(id)
  if (!existing) {
    throw new Error(`Season config with id ${id} not found`)
  }

  // If setting this as active, deactivate all others first
  if (data.is_active) {
    await execute(`UPDATE season_config SET is_active = 0 WHERE is_active = 1 AND id != ?`, [id])
  }

  const updates: string[] = []
  const values: any[] = []

  if (data.tier_name !== undefined) {
    updates.push('tier_name = ?')
    values.push(data.tier_name)
  }

  if (data.wcl_tier_url !== undefined) {
    updates.push('wcl_tier_url = ?')
    values.push(data.wcl_tier_url)
  }

  if (data.wcl_zone_id !== undefined) {
    updates.push('wcl_zone_id = ?')
    values.push(data.wcl_zone_id)
  }

  if (data.encounter_order !== undefined) {
    updates.push('encounter_order = ?')
    values.push(JSON.stringify(data.encounter_order))
  }

  if (data.encounter_names !== undefined) {
    updates.push('encounter_names = ?')
    values.push(JSON.stringify(data.encounter_names))
  }

  if (data.is_active !== undefined) {
    updates.push('is_active = ?')
    values.push(data.is_active ? 1 : 0)
  }

  if (updates.length === 0) {
    return existing
  }

  updates.push('updated_at = DATETIME(\'now\')')
  values.push(id)

  await execute(
    `UPDATE season_config SET ${updates.join(', ')} WHERE id = ?`,
    values
  )

  const updated = await getSeasonConfigById(id)
  if (!updated) {
    throw new Error('Failed to retrieve updated season config')
  }

  return updated
}

/**
 * Delete a season config
 */
export async function deleteSeasonConfig(id: number): Promise<void> {
  await execute(`DELETE FROM season_config WHERE id = ?`, [id])
}

/**
 * Helper to parse a season config row from the database
 */
function parseSeasonConfigRow(row: any): SeasonConfig {
  return {
    id: row.id,
    tier_name: row.tier_name,
    wcl_tier_url: row.wcl_tier_url,
    wcl_zone_id: row.wcl_zone_id,
    encounter_order: row.encounter_order ? JSON.parse(row.encounter_order) : [],
    encounter_names: row.encounter_names ? JSON.parse(row.encounter_names) : [],
    is_active: Boolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}
