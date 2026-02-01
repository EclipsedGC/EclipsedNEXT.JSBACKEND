# Warcraft Logs Character URL Parser

## Overview
A robust server-side utility for parsing, validating, and normalizing Warcraft Logs character profile URLs.

## Location
- **Parser**: `src/lib/warcraft-logs-parser.ts`
- **Tests**: `src/lib/__tests__/warcraft-logs-parser.test.ts`

## Usage

### Basic Parsing

```typescript
import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'

try {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/us/area-52/playername'
  )
  
  console.log(result)
  // {
  //   region: 'US',
  //   realm: 'area-52',
  //   characterName: 'Playername'
  // }
} catch (error) {
  // Handle validation error (suitable for 400 Bad Request)
  console.error(error.message)
}
```

### API Endpoint Integration

```typescript
import { NextRequest } from 'next/server'
import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'
import { apiResponse } from '@/lib/api-response'
import { HttpStatus } from '@/lib/http-status'

export async function POST(request: NextRequest) {
  try {
    const { warcraftLogsUrl } = await request.json()
    
    // Parse and validate URL
    const { region, realm, characterName } = parseWarcraftLogsCharacterUrl(warcraftLogsUrl)
    
    // Use parsed data...
    return apiResponse.success({ region, realm, characterName })
    
  } catch (error) {
    // Parser errors are suitable for 400 Bad Request
    return apiResponse.error(
      error instanceof Error ? error.message : 'Invalid URL',
      HttpStatus.BAD_REQUEST
    )
  }
}
```

### Helper Functions

#### Check if URL is Valid
```typescript
import { isWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'

const isValid = isWarcraftLogsCharacterUrl(
  'https://www.warcraftlogs.com/character/us/area-52/test'
)
// Returns: true or false
```

#### Build URL from Components
```typescript
import { buildWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'

const url = buildWarcraftLogsCharacterUrl('US', 'Area-52', 'Playername')
// Returns: https://www.warcraftlogs.com/character/us/area-52/playername
```

## Validation Rules

### Supported URL Formats
✅ `https://www.warcraftlogs.com/character/us/area-52/playername`  
✅ `http://www.warcraftlogs.com/character/eu/silvermoon/testchar`  
✅ `www.warcraftlogs.com/character/us/area-52/playername`  
✅ Mixed case (automatically normalized)

### Region Validation
- **Valid regions**: `US`, `EU`, `KR`, `TW`, `CN`
- Case-insensitive input
- Always returns uppercase (e.g., `US`)

### Realm Validation
- Must contain only: lowercase letters, numbers, hyphens
- Cannot be empty
- Automatically converted to lowercase slug format
- Example: `Area-52` → `area-52`

### Character Name Validation
- **Length**: 2-12 characters (WoW standard)
- **Characters**: Letters only (no numbers or special characters)
- **Normalization**: First letter capitalized, rest lowercase
- Example: `TESTCHAR` → `Testchar`

## Error Messages

All errors thrown are descriptive and suitable for API error responses:

| Scenario | Error Message |
|----------|---------------|
| Empty URL | `URL cannot be empty` |
| Invalid domain | `Invalid domain. Expected warcraftlogs.com, got: {domain}` |
| Invalid region | `Invalid region '{region}'. Must be one of: US, EU, KR, TW, CN` |
| Invalid realm | `Invalid realm slug '{realm}'. Realm must contain only letters, numbers, and hyphens` |
| Empty character name | `Character name cannot be empty` |
| Name too short/long | `Invalid character name length '{name}'. Must be between 2 and 12 characters` |
| Invalid characters | `Invalid character name '{name}'. Must contain only letters` |
| Wrong URL path | `Invalid URL path. Expected '/character/...', got: '/{path}/...'` |
| Incomplete URL | `Invalid URL structure. Expected format: https://www.warcraftlogs.com/character/{region}/{realm}/{characterName}` |

## Running Tests

### Manual Test Execution
```bash
# From backend directory
npx ts-node src/lib/__tests__/warcraft-logs-parser.test.ts
```

### Test Coverage
- ✅ 30+ test cases
- ✅ Valid URL parsing (multiple formats)
- ✅ Region normalization
- ✅ Realm slug validation
- ✅ Character name validation
- ✅ Error handling and messages
- ✅ Helper function validation
- ✅ Edge cases

### Example Test Output
```
🧪 Running Warcraft Logs Parser Tests

✅ parses valid US realm URL with https
✅ parses valid EU realm URL
✅ parses URL without https prefix
✅ normalizes region to uppercase
✅ throws on invalid domain
✅ throws on character name too long
...

============================================================
📊 Test Summary
============================================================
Total: 32 tests
✅ Passed: 32
❌ Failed: 0
============================================================
```

## Integration Examples

### With Application Form Submission
```typescript
import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'

// Parse optional Warcraft Logs URL from form
let parsedCharacter = null
if (warcraftLogsUrl) {
  try {
    parsedCharacter = parseWarcraftLogsCharacterUrl(warcraftLogsUrl)
  } catch (error) {
    return apiResponse.error(
      `Invalid Warcraft Logs URL: ${error.message}`,
      HttpStatus.BAD_REQUEST
    )
  }
}

// Use parsed data or fallback to manual input
const characterData = {
  region: parsedCharacter?.region || manualRegion,
  realm: parsedCharacter?.realm || manualRealm,
  characterName: parsedCharacter?.characterName || manualName,
}
```

### With Character Enrichment Cache
```typescript
import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'
import { findCachedCharacter } from '@/lib/character-enrichment-cache'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('warcraftLogsUrl')
  
  if (!url) {
    return apiResponse.error('URL required', HttpStatus.BAD_REQUEST)
  }
  
  try {
    // Parse URL
    const { region, realm, characterName } = parseWarcraftLogsCharacterUrl(url)
    
    // Check cache
    const cached = await findCachedCharacter({
      region,
      realm,
      character_name: characterName,
      season_key: 'latest'
    })
    
    if (cached) {
      return apiResponse.success(cached)
    }
    
    // Fetch from external API...
    
  } catch (error) {
    return apiResponse.error(
      error instanceof Error ? error.message : 'Invalid URL',
      HttpStatus.BAD_REQUEST
    )
  }
}
```

## TypeScript Types

```typescript
interface ParsedWarcraftLogsCharacter {
  region: string        // Uppercase (US, EU, KR, TW, CN)
  realm: string         // Lowercase slug (area-52, silvermoon)
  characterName: string // Capitalized (Playername)
}
```

## Security Considerations

- ✅ Strict URL validation prevents injection attacks
- ✅ Input sanitization and normalization
- ✅ Character limits enforced
- ✅ Whitelist-based region validation
- ✅ No external network calls (parsing only)
- ✅ Descriptive errors don't leak system information

## Performance

- ⚡ Zero external dependencies
- ⚡ Synchronous operation (no async overhead)
- ⚡ Minimal memory footprint
- ⚡ Efficient regex validation

## Future Enhancements

- [ ] Support for guild URLs
- [ ] Support for report URLs
- [ ] Batch URL validation
- [ ] Custom error classes for typed error handling
- [ ] Integration with proper testing framework (Jest/Vitest)
