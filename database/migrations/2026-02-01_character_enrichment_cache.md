# Character Enrichment Cache Migration

**Date**: 2026-02-01  
**Version**: 1.1.0

## Overview
Added a new database table `character_enrichment_cache` to store cached external API enrichment results for WoW characters.

## Database Changes

### New Table: `character_enrichment_cache`

```sql
CREATE TABLE IF NOT EXISTS character_enrichment_cache (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
```

### Indexes
- `idx_character_cache_lookup` on `(region, realm, character_name)` - for fast character lookups
- `idx_character_cache_season` on `(season_key)` - for season-based queries
- `idx_character_cache_status` on `(fetch_status)` - for monitoring fetch failures

### Constraints
- **Unique constraint**: `(region, realm, character_name, season_key)` - ensures one cache entry per character per season
- **Check constraint**: `fetch_status IN ('complete', 'partial', 'failed')` - validates status values

## Fields Description

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER | Primary key |
| `region` | TEXT | WoW region (US, EU, KR, TW) |
| `realm` | TEXT | Server/realm name |
| `character_name` | TEXT | Character name |
| `season_key` | TEXT | Season identifier (default: 'latest') |
| `player_card` | TEXT | JSON object containing enriched character data |
| `wcl_last_fetched_at` | TEXT | ISO datetime of last Warcraft Logs fetch |
| `blizzard_last_fetched_at` | TEXT | ISO datetime of last Blizzard API fetch |
| `fetch_status` | TEXT | Status: 'complete', 'partial', or 'failed' |
| `error_message` | TEXT | Error details if fetch failed |
| `created_at` | TEXT | ISO datetime when record was created |
| `updated_at` | TEXT | ISO datetime when record was last updated |

## New Files Added

### Types
- `src/types/character-enrichment.ts` - TypeScript type definitions

### Services
- `src/lib/character-enrichment-cache.ts` - Database service functions

### API Routes
- `src/app/api/character-cache/route.ts` - GET endpoint for querying cache
- `src/app/api/character-cache/upsert/route.ts` - POST endpoint for creating/updating cache
- `src/app/api/character-cache/delete/route.ts` - DELETE endpoint for removing cache

## API Usage Examples

### Query Cache Entry
```http
GET /api/character-cache?region=US&realm=Area%2052&characterName=Playername&seasonKey=latest
```

### Query All Seasons for a Character
```http
GET /api/character-cache?region=US&realm=Area%2052&characterName=Playername&allSeasons=true
```

### Create or Update Cache Entry
```http
POST /api/character-cache/upsert
Content-Type: application/json

{
  "region": "US",
  "realm": "Area 52",
  "characterName": "Playername",
  "seasonKey": "latest",
  "playerCard": {
    "class": "Death Knight",
    "spec": "Blood",
    "itemLevel": 626
  },
  "wclLastFetchedAt": "2026-02-01T12:00:00Z",
  "fetchStatus": "complete"
}
```

### Delete Cache Entry
```http
DELETE /api/character-cache/delete?region=US&realm=Area%2052&characterName=Playername&seasonKey=latest
```

## Migration Steps

This migration is **automatic** and runs when the server starts. The table will be created if it doesn't exist.

### Manual Migration (if needed)
If you need to manually apply this migration:

1. Stop the backend server
2. Open `database/app.db` with a SQLite client
3. Run the SQL commands from the "New Table" section above
4. Restart the server

### Rollback
To rollback this migration:

```sql
DROP TABLE IF EXISTS character_enrichment_cache;
```

**Warning**: This will delete all cached character enrichment data.

## Notes

- The cache is designed to reduce external API calls by storing enriched character data
- The `player_card` field stores JSON data as TEXT (automatically parsed/stringified by the service layer)
- The unique constraint ensures no duplicate entries per character per season
- The `fetch_status` field helps track partial or failed enrichment attempts
- Datetime fields are stored as ISO 8601 TEXT format for SQLite compatibility
- A helper function `isCacheStale()` is provided to check if cache needs refreshing

## Future Enhancements

- Add automatic cache invalidation based on `updated_at` timestamps
- Implement background job to refresh stale cache entries
- Add metrics/monitoring for cache hit rates
- Implement cache warming for popular characters
