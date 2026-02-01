import { UserRank, JWTPayload } from './auth'

/**
 * PERMISSION SYSTEM - Beginner Friendly Guide
 * 
 * This file contains all the permission checks for our guild system.
 * Think of it like a bouncer at a club - it checks if you're allowed in.
 * 
 * RANKS from highest to lowest:
 * 1. GUILD_MASTER - Can do everything
 * 2. COUNCIL - Can edit any team, but can't manage users
 * 3. TEAM_LEAD - Can only edit their assigned team
 */

/**
 * Check if user is the Guild Master
 * Only Guild Master can manage users (create, delete, change passwords, etc.)
 */
export function isGuildMaster(user: JWTPayload | null): boolean {
  return user?.rank === 'GUILD_MASTER'
}

/**
 * Check if user is Council or higher
 * Council and Guild Master can view/edit any team
 */
export function isCouncilOrHigher(user: JWTPayload | null): boolean {
  if (!user) return false
  return user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL'
}

/**
 * Check if user can access a specific team
 * 
 * Rules:
 * - GUILD_MASTER: Can access ALL teams
 * - COUNCIL: Can access ALL teams
 * - TEAM_LEAD: Can ONLY access their assigned team
 */
export function canAccessTeam(user: JWTPayload | null, teamId: number): boolean {
  if (!user) return false

  // Guild Master and Council can access any team
  if (user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL') {
    return true
  }

  // Team Lead can only access their assigned team
  if (user.rank === 'TEAM_LEAD') {
    return user.teamId === teamId
  }

  return false
}

/**
 * Check if user can edit a specific team
 * Same rules as canAccessTeam (if you can access it, you can edit it)
 */
export function canEditTeam(user: JWTPayload | null, teamId: number): boolean {
  return canAccessTeam(user, teamId)
}

/**
 * Check if user can manage other users
 * Only GUILD_MASTER can:
 * - Create new users
 * - Delete users
 * - Change user passwords
 * - Change user ranks
 * - Assign users to teams
 */
export function canManageUsers(user: JWTPayload | null): boolean {
  return isGuildMaster(user)
}

/**
 * Check if user can access the Account Manager page
 * Only GUILD_MASTER can access this page
 */
export function canAccessAccountManager(user: JWTPayload | null): boolean {
  return isGuildMaster(user)
}

/**
 * Get all team IDs that a user can access
 * Used for showing the list of teams on the frontend
 * 
 * Returns:
 * - GUILD_MASTER/COUNCIL: null (means "all teams")
 * - TEAM_LEAD: [their team ID]
 * - No user: []
 */
export function getAccessibleTeamIds(user: JWTPayload | null): number[] | null {
  if (!user) return []

  // Guild Master and Council can see all teams
  if (user.rank === 'GUILD_MASTER' || user.rank === 'COUNCIL') {
    return null // null means "all teams"
  }

  // Team Lead can only see their team
  if (user.rank === 'TEAM_LEAD' && user.teamId) {
    return [user.teamId]
  }

  return []
}

/**
 * Validate that a Team Lead has a team assigned
 * Team Leads MUST have a team, otherwise something is wrong
 */
export function validateTeamLeadHasTeam(user: JWTPayload): boolean {
  if (user.rank === 'TEAM_LEAD') {
    return user.teamId !== null && user.teamId !== undefined
  }
  return true // Other ranks don't need a team
}
