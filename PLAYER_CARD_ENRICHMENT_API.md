# Player Card Enrichment API

## Overview
API endpoint for enriching player cards with Warcraft Logs data, including intelligent caching and graceful degradation.

## Endpoint

### POST `/api/enrich-player-card`

Enriches a player card with performance data from Warcraft Logs API.

---

## Request

### Body
```json
{
  "warcraftLogsUrl": "https://www.warcraftlogs.com/character/us/area-52/playername",
  "seasonKey": "latest"  // optional, defaults to "latest"
}
```

### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `warcraftLogsUrl` | string | Yes | Valid Warcraft Logs character profile URL |
| `seasonKey` | string | No | Season identifier (default: "latest") |

---

## Response

### Success (200)
```json
{
  "success": true,
  "message": "Player card enriched successfully",
  "data": {
    "characterName": "Playername",
    "realm": "area-52",
    "region": "US",
    "mostPlayedSpec": "Blood",
    "bestKillLatestSeason": {
      "encounterName": "Queen Ansurek",
      "difficulty": "Mythic",
      "killDate": "2026-01-15T10:30:00Z",
      "rankPercent": 95.5
    },
    "classSpec": "Death Knight Blood",
    "updatedAt": "2026-02-01T12:00:00Z",
    "fetchStatus": "complete"
  }
}
```

### Error (400 - Invalid URL)
```json
{
  "success": false,
  "message": "Invalid Warcraft Logs URL: Invalid region 'xx'. Must be one of: US, EU, KR, TW, CN"
}
```

### Error (503 - API Not Configured)
```json
{
  "success": false,
  "message": "Warcraft Logs API is not configured and no cached data is available"
}
```

---

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `characterName` | string | Normalized character name (capitalized) |
| `realm` | string | Realm slug (lowercase) |
| `region` | string | Region code (uppercase: US, EU, KR, TW, CN) |
| `mostPlayedSpec` | string \| null | Most frequently played specialization |
| `bestKillLatestSeason` | object \| null | Best performance in current season |
| `classSpec` | string \| null | Full class and spec name (e.g., "Death Knight Blood") |
| `updatedAt` | string | ISO datetime of last update |
| `fetchStatus` | string | Status: "complete", "partial", or "failed" |
| `errorMessage` | string | (Optional) Error details if fetch failed |

### Best Kill Object
| Field | Type | Description |
|-------|------|-------------|
| `encounterName` | string | Boss name |
| `difficulty` | string | Difficulty: "Normal", "Heroic", or "Mythic" |
| `killDate` | string \| null | ISO datetime of kill |
| `rankPercent` | number | Performance percentile (0-100) |

---

## Caching Behavior

### Cache TTL: 6 hours

The endpoint uses intelligent caching to reduce API calls:

1. **Cache Hit (Fresh)**: Returns cached data immediately
2. **Cache Miss**: Fetches from WCL API and caches result
3. **Cache Hit (Stale)**: Fetches fresh data and updates cache
4. **Fetch Failed (with cache)**: Returns stale cached data
5. **Fetch Failed (no cache)**: Returns partial card with error

### Cache Key
```
(region, realm, characterName, seasonKey)
```

---

## Error Handling

### Graceful Degradation

The API implements multi-level fallback:

```
┌─────────────────────────────────────────────────────┐
│ 1. Check Cache (TTL: 6 hours)                       │
│    ✅ Fresh → Return cached data                    │
│    ⚠️  Stale → Proceed to fetch                     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 2. Fetch from Warcraft Logs API                     │
│    ✅ Success → Update cache, return fresh data     │
│    ❌ Failed → Check if cache exists                │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 3. Fallback Handling                                │
│    ✅ Cache exists → Return stale data + error msg  │
│    ❌ No cache → Return partial card + error msg    │
└─────────────────────────────────────────────────────┘
```

### Partial Card (Fetch Failed, No Cache)
```json
{
  "characterName": "Playername",
  "realm": "area-52",
  "region": "US",
  "mostPlayedSpec": null,
  "bestKillLatestSeason": null,
  "classSpec": null,
  "updatedAt": "2026-02-01T12:00:00Z",
  "fetchStatus": "failed",
  "errorMessage": "Character not found in Warcraft Logs"
}
```

---

## Usage Examples

### Basic Usage (Frontend)
```typescript
async function enrichPlayerCard(warcraftLogsUrl: string) {
  const response = await fetch('http://localhost:3001/api/enrich-player-card', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ warcraftLogsUrl }),
  })
  
  const result = await response.json()
  
  if (result.success) {
    return result.data
  } else {
    throw new Error(result.message)
  }
}
```

### With Error Handling
```typescript
try {
  const playerCard = await enrichPlayerCard(url)
  
  if (playerCard.fetchStatus === 'complete') {
    console.log('✅ Fresh data:', playerCard)
  } else if (playerCard.fetchStatus === 'partial') {
    console.warn('⚠️  Partial data:', playerCard.errorMessage)
  } else {
    console.error('❌ Failed:', playerCard.errorMessage)
  }
  
} catch (error) {
  console.error('Request failed:', error)
}
```

### Backend Integration (Form Submission)
```typescript
import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { warcraftLogsUrl } = await request.json()
  
  // Enrich player card
  const enrichResponse = await fetch('http://localhost:3001/api/enrich-player-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ warcraftLogsUrl }),
  })
  
  const enrichResult = await enrichResponse.json()
  
  if (enrichResult.success) {
    const playerCard = enrichResult.data
    
    // Save to application submission
    await saveApplication({
      characterName: playerCard.characterName,
      realm: playerCard.realm,
      region: playerCard.region,
      mostPlayedSpec: playerCard.mostPlayedSpec,
      bestKill: playerCard.bestKillLatestSeason,
    })
  }
}
```

---

## Performance

### Response Times (Typical)
- **Cache Hit (Fresh)**: 10-50ms
- **Cache Hit (Stale)**: 500-2000ms (includes WCL API call)
- **Cache Miss**: 500-2000ms (includes WCL API call)

### Rate Limiting
- WCL API: Varies by plan (typically 100-300 requests/hour for free tier)
- Caching significantly reduces API calls
- 6-hour TTL means max 4 requests/day per character

### Optimization Tips
1. Use cached data when possible
2. Enrich in background after form submission
3. Display basic info immediately, enriched data when available
4. Consider pre-warming cache for active players

---

## Security

### API Credentials
- Store in environment variables only
- Never expose in client-side code
- Rotate periodically
- Use different credentials for dev/prod

### Input Validation
- ✅ URL structure validated
- ✅ Region whitelist enforced
- ✅ Character name length limits
- ✅ No code injection possible

### Rate Limiting
- Consider implementing per-IP rate limiting
- Monitor WCL API quota usage
- Implement exponential backoff on failures

---

## Configuration

### Required Environment Variables
```env
WCL_CLIENT_ID=your_client_id_here
WCL_CLIENT_SECRET=your_client_secret_here
```

### Get API Credentials
https://www.warcraftlogs.com/api/clients/

### Check Configuration
```typescript
import { isWarcraftLogsConfigured } from '@/lib/warcraft-logs-client'

if (!isWarcraftLogsConfigured()) {
  console.warn('⚠️  WCL API not configured')
}
```

---

## Monitoring

### Log Messages
```
✅ Cache hit for Playername-area-52-US (age: 2.5h)
🔄 Fetching fresh data for Playername-area-52-US
✅ Successfully enriched Playername-area-52-US
❌ WCL API fetch failed: Character not found
⚠️  Returning stale cached data due to fetch failure
```

### Key Metrics to Track
- Cache hit rate
- Average response time
- WCL API success rate
- Number of partial/failed enrichments
- Cache age distribution

---

## Testing

### Manual Test (cURL)
```bash
curl -X POST http://localhost:3001/api/enrich-player-card \
  -H "Content-Type: application/json" \
  -d '{
    "warcraftLogsUrl": "https://www.warcraftlogs.com/character/us/area-52/testchar"
  }'
```

### Test Cases
1. ✅ Valid URL, character exists → Full enrichment
2. ✅ Valid URL, character not found → Partial card
3. ✅ Invalid URL → 400 error
4. ✅ Cache hit (fresh) → Instant response
5. ✅ Cache hit (stale) → Refresh and return
6. ✅ WCL API down + cache exists → Stale data
7. ✅ WCL API down + no cache → Partial card
8. ✅ API not configured + cache exists → Stale data
9. ✅ API not configured + no cache → 503 error

---

## Troubleshooting

### "WCL API not configured"
- Verify `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET` are set
- Restart backend server after setting env vars
- Check `.env.local` file exists and is loaded

### "Character not found"
- Verify character exists on Warcraft Logs
- Check character has logged combat in current season
- Ensure realm slug matches WCL format (lowercase, hyphenated)

### "Failed to get WCL token"
- Verify API credentials are correct
- Check credentials haven't expired
- Ensure network can reach WCL servers

### Slow Response Times
- Check WCL API status
- Verify network latency to WCL servers
- Consider increasing cache TTL
- Monitor rate limiting

---

## Future Enhancements

Potential improvements:
- [ ] Support for guild rankings
- [ ] Historical season data
- [ ] M+ scores integration
- [ ] PvP ratings
- [ ] Achievement tracking
- [ ] Background refresh queue
- [ ] Webhooks for cache updates
