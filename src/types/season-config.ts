/**
 * Season Config Types
 * 
 * For managing current raid tier configuration
 */

export interface EncounterInfo {
  id: number
  name: string
}

export interface SeasonConfig {
  id: number
  tier_name: string
  wcl_tier_url: string
  wcl_zone_id: number
  encounter_order: number[]
  encounter_names: EncounterInfo[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SeasonConfigCreate {
  tier_name: string
  wcl_tier_url: string
  wcl_zone_id: number
  encounter_order: number[]
  encounter_names: EncounterInfo[]
  is_active?: boolean
}

export interface SeasonConfigUpdate {
  tier_name?: string
  wcl_tier_url?: string
  wcl_zone_id?: number
  encounter_order?: number[]
  encounter_names?: EncounterInfo[]
  is_active?: boolean
}

export interface SeasonConfigImportRequest {
  wclTierUrl: string
}

export interface SeasonConfigImportResponse {
  wclZoneId: number
  encounterOrder: number[]
  encounterNames: EncounterInfo[]
}

export interface SeasonConfigSaveRequest {
  tierName: string
  wclTierUrl: string
  wclZoneId: number
  encounterOrder: number[]
  encounterNames: EncounterInfo[]
}
