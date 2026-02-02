# ID-Based Warcraft Logs URL Support

## ✅ Feature Complete: Support for ID-Based Character URLs

Successfully added support for ID-based Warcraft Logs character URLs in addition to the standard region/realm/character format.

---

## 📦 Supported URL Formats

### Format 1: Full Character URL (Original)
```
https://www.warcraftlogs.com/character/us/area-52/playername
https://www.warcraftlogs.com/character/eu/silvermoon/charactername
```

### Format 2: ID-Based Character URL (NEW ✨)
```
https://www.warcraftlogs.com/character/id/64213375
https://www.warcraftlogs.com/character/id/12345678
```

Both formats are now fully supported!

---

## 🔧 Implementation Details

### 1. Updated `warcraft-logs-parser.ts`

#### New Types
```typescript
export interface ParsedWarcraftLogsCharacter {
  region: string
  realm: string
  characterName: string
}

export interface ParsedWarcraftLogsCharacterId {
  characterId: string
  isIdBased: true
}
```

#### Enhanced Parser
- Detects URL format automatically
- Returns different type based on URL format
- Validates character ID (must be numeric)
- Provides helpful error messages for invalid URLs

#### URL Detection Logic
```typescript
if (secondPart === 'id') {
  // ID-based URL
  return {
    characterId: thirdPart,
    isIdBased: true,
  }
} else {
  // Full format URL
  return {
    region: secondPart,
    realm: thirdPart,
    characterName: fourthPart,
  }
}
```

---

### 2. Updated `warcraft-logs-client.ts`

#### New Function: `fetchWarcraftLogsCharacterById()`
Fetches character data using character ID instead of region/realm/name.

**GraphQL Query:**
```graphql
query GetCharacterById($characterId: Int!) {
  characterData {
    character(id: $characterId) {
      name
      server {
        name
        region
      }
      zoneRankings
    }
  }
}
```

**Returns:**
```typescript
{
  characterName: string
  realm: string
  region: string
  mostPlayedSpec: string | null
  bestKillLatestSeason: { ... } | null
  classSpec: string | null
}
```

---

### 3. Updated `enrich-player-card` API Route

#### Enhanced Flow

```
1. Parse URL (detects format automatically)
   ↓
2. Check if ID-based URL?
   ├─ YES → Fetch character data by ID from WCL
   │         ↓
   │      Get region/realm/name from response
   │         ↓
   │      Check cache for this character
   │         ↓
   │      Return cached or fresh data
   │
   └─ NO → Continue with existing logic
            (region/realm/name format)
```

#### ID-Based URL Handling
```typescript
if ('isIdBased' in parsed && parsed.isIdBased) {
  // 1. Fetch character data by ID
  const wclData = await fetchWarcraftLogsCharacterById(parsed.characterId)
  
  // 2. Check cache using resolved region/realm/name
  const cachedData = await findCachedCharacter({
    region: wclData.region,
    realm: wclData.realm,
    character_name: wclData.characterName,
    season_key: seasonKey,
  })
  
  // 3. Return cached or fresh data
  // ...
}
```

---

## 🎯 Benefits

### User Experience
- ✅ **Flexible URL Input**: Users can paste either URL format
- ✅ **No Manual Conversion**: System automatically handles ID-based URLs
- ✅ **Consistent Output**: Both formats produce the same player card

### Technical
- ✅ **Smart Caching**: ID-based URLs are resolved once, then cached by region/realm/name
- ✅ **No Duplicate Data**: Character cached once regardless of URL format used
- ✅ **Error Handling**: Clear error messages for invalid URLs or missing characters

---

## 🔄 Data Flow Example

### Scenario: User submits ID-based URL

```
User submits:
https://www.warcraftlogs.com/character/id/64213375
        ↓
parseWarcraftLogsCharacterUrl() detects ID format
        ↓
Returns: { characterId: "64213375", isIdBased: true }
        ↓
fetchWarcraftLogsCharacterById("64213375")
        ↓
WCL API returns:
{
  name: "Playername",
  server: { name: "Area 52", region: "US" }
}
        ↓
Check cache for: US / Area 52 / Playername
        ↓
If cached → Return cached data
If not → Build new player card
        ↓
Cache as: region=US, realm=area-52, character_name=Playername
        ↓
Return player card to frontend
```

---

## 🧪 Testing

### Test Case 1: ID-Based URL (New Character)
**Input:**
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/id/64213375"
}
```

**Expected:**
1. System fetches character data by ID from WCL
2. Resolves to region/realm/name
3. Creates new player card
4. Caches under region/realm/name
5. Returns player card

---

### Test Case 2: ID-Based URL (Cached Character)
**Input:**
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/id/64213375"
}
```

**Expected (if character previously cached):**
1. System fetches character data by ID from WCL
2. Resolves to region/realm/name: US/Area-52/Playername
3. Finds existing cache entry
4. Returns cached data (if fresh within 6 hours)

---

### Test Case 3: Full Format URL (Still Works)
**Input:**
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/us/area-52/playername"
}
```

**Expected:**
1. System parses region/realm/name directly
2. Checks cache
3. Returns cached or fresh data
4. **No change from original behavior**

---

### Test Case 4: Invalid ID
**Input:**
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/id/abc123"
}
```

**Expected:**
```json
{
  "success": false,
  "message": "Invalid Warcraft Logs URL: Invalid character ID 'abc123'. Character ID must be numeric."
}
```

---

### Test Case 5: Character Not Found
**Input:**
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/id/999999999"
}
```

**Expected:**
```json
{
  "success": false,
  "message": "Failed to fetch character data: Character with ID 999999999 not found on Warcraft Logs"
}
```

---

## 📊 Performance Considerations

### Cache Efficiency
- **ID-based URLs are resolved ONCE**: After first lookup, character is cached by region/realm/name
- **Same cache for both formats**: A character submitted via ID or full URL uses the same cache entry
- **6-hour TTL**: Both URL formats respect the same cache TTL

### API Calls
- **ID-based URL (first time)**: 1 WCL API call to resolve ID
- **ID-based URL (cached)**: 1 WCL API call to resolve ID + return cached data (no additional ranking fetch)
- **Full format URL**: 0 or 1 WCL API calls depending on cache state

---

## 🔒 Error Handling

### URL Parsing Errors
- Empty URL
- Invalid domain
- Invalid URL structure
- Non-numeric character ID

### API Errors
- WCL API down
- Character not found
- Invalid credentials
- Rate limiting

### Graceful Degradation
- Returns cached data if WCL fetch fails
- Shows partial player card with error message
- Does not crash the page

---

## 📝 Console Logging

### ID-Based URL Flow
```
📥 Enrich player card request: {
  warcraftLogsUrl: 'https://www.warcraftlogs.com/character/id/64213375',
  seasonKey: 'latest'
}

🔍 Detected ID-based URL for character ID: 64213375

🔄 Fetching character data by ID: 64213375

✅ Cache hit for Playername-area-52-US (age: 2.3h)
   OR
✅ Successfully enriched Playername-area-52-US from ID
```

### Full Format URL Flow (Unchanged)
```
📥 Enrich player card request: {
  warcraftLogsUrl: 'https://www.warcraftlogs.com/character/us/area-52/playername',
  seasonKey: 'latest'
}

✅ Cache hit for Playername-area-52-US (age: 1.5h)
   OR
🔄 Fetching fresh data for Playername-area-52-US
✅ Successfully enriched Playername-area-52-US
```

---

## 🎨 Frontend Integration

### No Changes Required!
The frontend `PlayerCard` component works exactly the same:

```jsx
<PlayerCard
  warcraftLogsUrl={submission.identity.warcraftLogsUrl}
  applicationId={submission.id}
/>
```

Whether the URL is ID-based or full format, the component receives the same `playerCard` object structure.

---

## 🚀 Deployment Notes

### Environment Variables
No new environment variables required. Uses existing:
- `WCL_CLIENT_ID`
- `WCL_CLIENT_SECRET`

### Database
No schema changes required. Uses existing cache table.

### Backward Compatibility
✅ **Fully backward compatible**
- Old applications with full format URLs: Still work
- New applications with ID-based URLs: Now supported

---

**Status**: ✅ Complete and ready to test!  
**Testing**: Refresh the Team Dashboard page with an application that has an ID-based WCL URL  
**Expected**: Player card should load successfully with enriched data

---

## 📚 Related Files Modified

1. `next.js BACKEND/src/lib/warcraft-logs-parser.ts` - Enhanced parser
2. `next.js BACKEND/src/lib/warcraft-logs-client.ts` - New function for ID lookup
3. `next.js BACKEND/src/app/api/enrich-player-card/route.ts` - Updated route logic

**Commit Message Suggestion:**
```
feat: Add support for ID-based Warcraft Logs character URLs

- Enhanced parser to detect and validate both URL formats
- Added fetchWarcraftLogsCharacterById() to resolve IDs
- Updated enrichment API to handle ID-based URLs
- Maintains backward compatibility with full format URLs
- Smart caching: both formats use same cache entry
```
