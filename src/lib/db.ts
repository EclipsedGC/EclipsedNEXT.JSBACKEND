import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

// This module is our database abstraction layer.
// It currently uses SQLite under the hood, but the API is generic
// (async functions returning Promises), so we can swap engines later.

const defaultDbPath = path.join(process.cwd(), 'database', 'app.db')
const dbPath = process.env.SQLITE_PATH || defaultDbPath

// Ensure directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

// Single shared SQLite connection
const db = new Database(dbPath)

// Initialise schema (idempotent)
function initSchema() {
  // Items table (for /api/items)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      price REAL,
      stock INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now'))
    )
  `).run()

  // Test table (for /api/test)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS test (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT NOT NULL UNIQUE,
      amount REAL NOT NULL,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now'))
    )
  `).run()

  // Teams table with team data fields
  db.prepare(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      roster TEXT DEFAULT '[]',
      progress TEXT DEFAULT '{}',
      team_info TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now'))
    )
  `).run()

  // Users table with rank-based access control
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      rank TEXT NOT NULL CHECK(rank IN ('GUILD_MASTER', 'COUNCIL', 'TEAM_LEAD')),
      team_id INTEGER,
      warcraft_logs_url TEXT,
      bio TEXT,
      discord_username TEXT,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `).run()

  // Create index for faster lookups
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_users_rank ON users(rank)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id)
  `).run()

  // Add new profile fields if they don't exist (migration)
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN warcraft_logs_url TEXT`).run()
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN bio TEXT`).run()
  } catch (e) {
    // Column already exists
  }
  
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN discord_username TEXT`).run()
  } catch (e) {
    // Column already exists
  }

  // Add team_directive column to teams table (migration)
  try {
    db.prepare(`ALTER TABLE teams ADD COLUMN team_directive TEXT DEFAULT 'AOTC' CHECK(team_directive IN ('Mythic CE', 'Mythic Progression', 'AOTC / Light Mythic', 'AOTC', 'Learning / Casual'))`).run()
  } catch (e) {
    // Column already exists
  }

  // Site content table for editable public pages
  db.prepare(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now'))
    )
  `).run()

  // Create index for faster content lookups
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_site_content_key ON site_content(key)
  `).run()

  // Password recovery requests table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS password_recovery_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'resolved')) DEFAULT 'pending',
      created_at TEXT DEFAULT (DATETIME('now')),
      resolved_at TEXT,
      resolved_by INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `).run()

  // Create indexes for recovery requests
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_recovery_user_id ON password_recovery_requests(user_id)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_recovery_status ON password_recovery_requests(status)
  `).run()

  // Guild roles table for command flow map
  db.prepare(`
    CREATE TABLE IF NOT EXISTS guild_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      cluster_name TEXT NOT NULL,
      cluster_level TEXT NOT NULL CHECK(cluster_level IN ('top-command', 'middle-management', 'recruiting-specialists', 'team-leadership')),
      display_order INTEGER DEFAULT 0,
      is_team_specific INTEGER DEFAULT 0,
      team_id INTEGER,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
    )
  `).run()

  // Role assignments table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (DATETIME('now')),
      FOREIGN KEY (role_id) REFERENCES guild_roles(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(role_id, user_id)
    )
  `).run()

  // Create indexes for roles
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_guild_roles_cluster ON guild_roles(cluster_level, cluster_name)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_role_assignments_role ON role_assignments(role_id)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_role_assignments_user ON role_assignments(user_id)
  `).run()

  // Character enrichment cache table for external API data
  db.prepare(`
    CREATE TABLE IF NOT EXISTS character_enrichment_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id TEXT,
      region TEXT NOT NULL,
      realm TEXT NOT NULL,
      character_name TEXT NOT NULL,
      season_key TEXT NOT NULL DEFAULT 'latest',
      player_card TEXT DEFAULT '{}',
      wcl_last_fetched_at TEXT,
      blizzard_last_fetched_at TEXT,
      fetch_status TEXT NOT NULL CHECK(fetch_status IN ('complete', 'partial', 'failed')) DEFAULT 'partial',
      error_message TEXT,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now')),
      UNIQUE(region, realm, character_name, season_key)
    )
  `).run()
  
  // Add character_id column if it doesn't exist (migration)
  try {
    db.prepare(`ALTER TABLE character_enrichment_cache ADD COLUMN character_id TEXT`).run()
    console.log('✅ Added character_id column to character_enrichment_cache')
  } catch (error: any) {
    // Column already exists or other error
    if (!error.message?.includes('duplicate column')) {
      console.log('ℹ️  character_id column already exists or migration not needed')
    }
  }

  // Create indexes for character enrichment cache
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_character_cache_lookup ON character_enrichment_cache(region, realm, character_name)
  `).run()
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_character_cache_id ON character_enrichment_cache(character_id)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_character_cache_season ON character_enrichment_cache(season_key)
  `).run()

  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_character_cache_status ON character_enrichment_cache(fetch_status)
  `).run()

  // Season Config table for raid tier configuration
  db.prepare(`
    CREATE TABLE IF NOT EXISTS season_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tier_name TEXT NOT NULL,
      wcl_tier_url TEXT NOT NULL,
      wcl_zone_id INTEGER NOT NULL,
      encounter_order TEXT NOT NULL DEFAULT '[]',
      encounter_names TEXT NOT NULL DEFAULT '[]',
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (DATETIME('now')),
      updated_at TEXT DEFAULT (DATETIME('now'))
    )
  `).run()

  // Create index for active season config
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_season_config_active ON season_config(is_active)
  `).run()

  // Insert default "about-us" content if not exists
  db.prepare(`
    INSERT OR IGNORE INTO site_content (key, title, content)
    VALUES ('about-us', 'About Us', '<h1>Welcome to Eclipsed</h1><p>Edit this content from your dashboard!</p>')
  `).run()

  // Migration: Add team data columns if they don't exist
  try {
    // Check if roster column exists
    const columns = db.prepare('PRAGMA table_info(teams)').all() as any[]
    const hasRoster = columns.some((col: any) => col.name === 'roster')
    
    if (!hasRoster) {
      db.prepare(`ALTER TABLE teams ADD COLUMN roster TEXT DEFAULT '[]'`).run()
      db.prepare(`ALTER TABLE teams ADD COLUMN progress TEXT DEFAULT '{}'`).run()
      db.prepare(`ALTER TABLE teams ADD COLUMN team_info TEXT DEFAULT '{}'`).run()
      console.log('✅ Team data columns added successfully')
    }
  } catch (error) {
    // Columns might already exist, that's okay
    console.log('Team data columns already exist or migration not needed')
  }
}

initSchema()

// Health check
export async function testConnection(): Promise<boolean> {
  try {
    db.prepare('SELECT 1').get()
    return true
  } catch (error) {
    console.error('Database connection error:', error)
    return false
  }
}

// Execute a query that returns multiple rows
export async function query<T = any>(
  sql: string,
  params?: any[]
): Promise<T[]> {
  try {
    const stmt = db.prepare(sql)
    const rows = params ? stmt.all(...params) : stmt.all()
    return rows as T[]
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Execute a query and return a single row
export async function queryOne<T = any>(
  sql: string,
  params?: any[]
): Promise<T | null> {
  try {
    const stmt = db.prepare(sql)
    const row = params ? stmt.get(...params) : stmt.get()
    return (row as T) ?? null
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Execute a statement (INSERT / UPDATE / DELETE)
export async function execute(
  sql: string,
  params?: any[]
): Promise<{ changes: number; lastInsertRowid: number | bigint }> {
  try {
    const stmt = db.prepare(sql)
    const result = params ? stmt.run(...params) : stmt.run()
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    }
  } catch (error) {
    console.error('Database execute error:', error)
    throw error
  }
}

// For compatibility with previous API (no real pool/close needed for SQLite)
export async function getConnection() {
  return db
}

export async function closePool(): Promise<void> {
  db.close()
}

export default db
