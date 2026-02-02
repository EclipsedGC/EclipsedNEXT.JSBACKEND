# Warcraft Logs API - Setup Verification

## ✅ Configuration Complete!

Your Warcraft Logs API credentials have been configured:

```
Client ID: a0faa785-d707-4730-b7aa-803698b6abc0
Client Secret: D0T3oEPxGO39CCCy2w8QlWfJ9sRjuxuTImlvuKBB
Backend Port: 3001
```

---

## 🚀 Testing the API

### Option 1: PowerShell (Windows)

```powershell
$body = @{
    warcraftLogsUrl = "https://www.warcraftlogs.com/character/us/area-52/YOURCHARNAME"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/enrich-player-card" -Method POST -ContentType "application/json" -Body $body
```

### Option 2: cURL

```bash
curl -X POST http://localhost:3001/api/enrich-player-card \
  -H "Content-Type: application/json" \
  -d '{"warcraftLogsUrl":"https://www.warcraftlogs.com/character/us/area-52/YOURCHARNAME"}'
```

### Option 3: Frontend Fetch

```javascript
const response = await fetch('http://localhost:3001/api/enrich-player-card', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    warcraftLogsUrl: 'https://www.warcraftlogs.com/character/us/area-52/YOURCHARNAME'
  })
})

const result = await response.json()
console.log(result)
```

---

## 🔍 What to Expect

### First Request (Cache Miss)
- ⏱️ Takes 500-2000ms (fetching from WCL API)
- 📊 Returns enriched player card with:
  - Character name, realm, region
  - Most played spec
  - Best kill in current season
  - Class/spec information
- 💾 Data saved to cache

### Second Request (Cache Hit)
- ⚡ Takes 10-50ms (from cache)
- 📦 Returns same data instantly
- 💬 Message: "Player card returned from cache"

### Example Success Response:
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

---

## ⚠️ Possible Errors & Solutions

### Error: "Character not found in Warcraft Logs"
**Cause**: Character doesn't exist or has no logs  
**Solution**: Use a valid character with WCL logs

### Error: "Invalid Warcraft Logs URL"
**Cause**: URL format is incorrect  
**Solution**: Use format: `https://www.warcraftlogs.com/character/{region}/{realm}/{name}`

### Error: "Failed to get WCL token"
**Cause**: Invalid API credentials  
**Solution**: Verify credentials in `.env.local`, restart backend

### Error: "ECONNREFUSED"
**Cause**: Backend not running  
**Solution**: Start backend with `npm run dev` in backend directory

---

## 🎯 Quick Test Checklist

- [ ] Backend running on port 3001
- [ ] `.env.local` file exists with credentials
- [ ] Can access: http://localhost:3001/api/health
- [ ] Test enrichment with valid WCL character URL
- [ ] Verify response has `fetchStatus: "complete"`
- [ ] Test again (should be cached, much faster)
- [ ] Check backend console logs for success messages

---

## 📝 Backend Console Logs

Watch for these messages:

```
✅ Cache hit for Playername-area-52-US (age: 2.5h)
🔄 Fetching fresh data for Playername-area-52-US
✅ Successfully enriched Playername-area-52-US
```

If you see errors:
```
❌ WCL API fetch failed: [error details]
⚠️  Returning stale cached data due to fetch failure
```

---

## 🔄 If You Need to Restart Backend

1. Stop current backend (Ctrl+C in terminal)
2. Navigate to backend directory:
   ```
   cd "C:\Users\kitan\OneDrive\Desktop\Websites\next.js BACKEND"
   ```
3. Start backend:
   ```
   npm run dev
   ```
4. Wait for "Ready on http://localhost:3001"

---

## 📊 Cache Information

- **TTL**: 6 hours
- **Location**: SQLite `character_enrichment_cache` table
- **Key**: `(region, realm, characterName, seasonKey)`
- **Auto-refresh**: Stale cache triggers background fetch

---

## 🎉 You're All Set!

The player card enrichment system is now configured and ready to use!

Try it with a real character URL and watch the magic happen! ✨
