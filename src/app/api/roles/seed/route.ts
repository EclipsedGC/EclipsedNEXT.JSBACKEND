import { NextRequest } from 'next/server'
import { execute } from '@/lib/db'
import { apiResponse, apiError } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

/**
 * POST /api/roles/seed
 * 
 * Seeds initial guild roles (development/setup only)
 */
export async function POST(request: NextRequest) {
  try {
    // Define initial roles - organized in 5 rows x 3 columns
    const roles = [
      // TOP COMMAND - Row 1
      { name: 'Main Guildmaster', description: 'Primary guild leader overseeing all operations', cluster_name: 'Row 1', cluster_level: 'top-command', display_order: 1 },
      { name: 'Operations Manager', description: 'Manages day-to-day guild operations', cluster_name: 'Row 1', cluster_level: 'top-command', display_order: 2 },
      { name: 'Technical Manager', description: 'Oversees technical systems and infrastructure', cluster_name: 'Row 1', cluster_level: 'top-command', display_order: 3 },
      
      // TOP COMMAND - Row 2
      { name: 'Alt Guildmaster', description: 'Secondary guild leader and strategic advisor', cluster_name: 'Row 2', cluster_level: 'top-command', display_order: 4 },
      { name: 'Raid Director', description: 'Leads raid strategy and progression', cluster_name: 'Row 2', cluster_level: 'top-command', display_order: 5 },
      { name: 'Council', description: 'Guild council member providing guidance and oversight', cluster_name: 'Row 2', cluster_level: 'top-command', display_order: 6 },
      
      // TOP COMMAND - Row 3
      { name: 'Recruitment Director', description: 'Oversees all recruitment efforts', cluster_name: 'Row 3', cluster_level: 'top-command', display_order: 7 },
      { name: 'Discord Manager', description: 'Manages Discord server and community', cluster_name: 'Row 3', cluster_level: 'top-command', display_order: 8 },
      { name: 'Human Resources', description: 'Manages guild member relations and welfare', cluster_name: 'Row 3', cluster_level: 'top-command', display_order: 9 },
      
      // MANAGEMENT - Row 4
      { name: 'Log Analyst', description: 'Analyzes combat logs and performance metrics', cluster_name: 'Row 4', cluster_level: 'middle-management', display_order: 10 },
      { name: 'Class Specialist', description: 'Provides class-specific guidance and coaching', cluster_name: 'Row 4', cluster_level: 'middle-management', display_order: 11 },
      { name: 'Event and Social Coordinator', description: 'Organizes guild events and social activities', cluster_name: 'Row 4', cluster_level: 'middle-management', display_order: 12 },
      
      // RECRUITMENT SPECIALISTS - Row 5
      { name: 'Recruiting – Mythic Specialist', description: 'Recruits for Mythic progression teams', cluster_name: 'Row 5', cluster_level: 'recruiting-specialists', display_order: 13 },
      { name: 'Recruiting – AOTC Specialist', description: 'Recruits for Ahead of the Curve teams', cluster_name: 'Row 5', cluster_level: 'recruiting-specialists', display_order: 14 },
      { name: 'Recruiting – Casual and Social Specialist', description: 'Recruits for social and casual content', cluster_name: 'Row 5', cluster_level: 'recruiting-specialists', display_order: 15 },
    ]

    // Clear existing non-team-specific roles
    await execute('DELETE FROM guild_roles WHERE is_team_specific = 0')

    // Insert roles
    for (const role of roles) {
      await execute(
        `INSERT INTO guild_roles (name, description, cluster_name, cluster_level, display_order, is_team_specific)
         VALUES (?, ?, ?, ?, ?, 0)`,
        [role.name, role.description, role.cluster_name, role.cluster_level, role.display_order]
      )
    }

    return apiResponse({ 
      message: 'Roles seeded successfully',
      count: roles.length 
    })
  } catch (error) {
    console.error('Seed roles error:', error)
    return apiError('Failed to seed roles', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
