# Enhanced Error Handling & Debugging for Player Card Enrichment API

## ✅ Complete: Improved Reliability and Debugging

Successfully enhanced the `/api/enrich-player-card` endpoint with better error handling, detailed server-side logging, and a health check endpoint.

---

## 🔧 Changes Made

### 1. **Proper HTTP Status Codes**

#### Before:
- Most errors returned generic 500 or inconsistent status codes

#### After:
- ✅ **400 Bad Request**: Invalid input (missing/malformed `warcraftLogsUrl`)
- ✅ **502 Bad Gateway**: Warcraft Logs API failures (upstream errors)
- ✅ **503 Service Unavailable**: Missing WCL credentials or database unavailable
- ✅ **500 Internal Server Error**: Unexpected server errors only

---

### 2. **Enhanced Server-Side Logging**

All errors now log with consistent format:
```typescript
console.error('[enrich-player-card] error description', error)
if (error instanceof Error) {
  console.error('[enrich-player-card] Error message:', error.message)
  console.error('[enrich-player-card] Error stack:', error.stack)
}
```

#### Logging Examples:
```
[enrich-player-card] POST request received
[enrich-player-card] Request body: { warcraftLogsUrl: '...', seasonKey: 'latest' }
[enrich-player-card] Parsed URL: { type: 'id', characterId: '64213375', originalUrl: '...' }
[enrich-player-card] WCL API fetch failed: Error: Character not found
[enrich-player-card] Error stack: ...
```

---

### 3. **Pre-Flight Dependency Checks**

#### WCL Credentials Check:
```typescript
if (!isWarcraftLogsConfigured()) {
  console.error('[enrich-player-card] Missing WCL credentials')
  return errorResponse(
    'Warcraft Logs API credentials not configured. Please contact administrator.',
    HttpStatus.SERVICE_UNAVAILABLE // 503
  )
}
```

#### Database Connectivity Check:
```typescript
try {
  await findCachedCharacter({ region: 'US', realm: 'test', character_name: 'test', season_key: 'latest' })
} catch (dbError) {
  console.error('[enrich-player-card] Database connectivity check failed:', dbError)
  return errorResponse(
    'Database unavailable. Please try again later.',
    HttpStatus.SERVICE_UNAVAILABLE // 503
  )
}
```

---

### 4. **Health Check Endpoint (NEW)**

#### **GET /api/enrich-player-card**

Returns system status for debugging:

```typescript
{
  "success": true,
  "data": {
    "ok": true,              // Overall health (hasWclToken && hasDb)
    "hasWclToken": true,     // WCL credentials configured
    "hasDb": true,           // Database connectivity
    "timestamp": "2026-02-01T12:00:00.000Z"
  }
}
```

#### Usage:
```bash
# Quick health check
curl http://localhost:3001/api/enrich-player-card

# Expected response when healthy:
{
  "success": true,
  "data": {
    "ok": true,
    "hasWclToken": true,
    "hasDb": true,
    "timestamp": "2026-02-01..."
  }
}

# Expected response when WCL not configured:
{
  "success": true,
  "data": {
    "ok": false,
    "hasWclToken": false,  // ← Problem identified
    "hasDb": true,
    "timestamp": "2026-02-01..."
  }
}
```

---

### 5. **Improved Error Messages**

#### Before:
```json
{
  "success": false,
  "message": "An unexpected error occurred"
}
```

#### After (Bad Request):
```json
{
  "success": false,
  "message": "Invalid Warcraft Logs URL: Invalid URL structure. Expected format: https://www.warcraftlogs.com/character/{region}/{realm}/{characterName}"
}
```

#### After (Upstream API Failure):
```json
{
  "success": false,
  "message": "Warcraft Logs API error: Character with ID 64213375 not found on Warcraft Logs"
}
```

#### After (Service Unavailable):
```json
{
  "success": false,
  "message": "Warcraft Logs API credentials not configured. Please contact administrator."
}
```

---

## 🔍 Debugging Guide

### Problem: Getting 503 errors

**Step 1**: Check health endpoint
```bash
curl http://localhost:3001/api/enrich-player-card
```

**Step 2**: Review response
- If `hasWclToken: false` → Check `.env.local` for `WCL_CLIENT_ID` and `WCL_CLIENT_SECRET`
- If `hasDb: false` → Check database file permissions and connectivity

**Step 3**: Check server logs
```
[enrich-player-card] Missing WCL credentials
  → Action: Add WCL credentials to .env.local

[enrich-player-card] Database connectivity check failed
  → Action: Check database file exists and is readable
```

---

### Problem: Getting 502 errors

**Server logs will show**:
```
[enrich-player-card] WCL API fetch failed: Error: Failed to get WCL token: 401 Unauthorized
[enrich-player-card] Error message: Failed to get WCL token: 401 Unauthorized
[enrich-player-card] Error stack: ...
```

**Common causes**:
- Invalid WCL credentials
- WCL API rate limiting
- WCL API downtime
- Network connectivity issues

---

### Problem: Getting 400 errors

**Server logs will show**:
```
[enrich-player-card] URL parsing failed: Invalid URL structure. Expected format: ...
```

**Common causes**:
- Malformed Warcraft Logs URL
- Missing URL
- Wrong URL format (e.g., using raid report URL instead of character URL)

---

## 📊 Status Code Reference

| Code | Meaning | Common Causes | Client Action |
|------|---------|---------------|---------------|
| 200 | Success | Player card enriched successfully | Display player card |
| 400 | Bad Request | Invalid/missing `warcraftLogsUrl` | Show validation error to user |
| 502 | Bad Gateway | Warcraft Logs API failure | Retry later, show "WCL unavailable" |
| 503 | Service Unavailable | Missing WCL credentials or DB down | Contact admin, show maintenance message |
| 500 | Internal Server Error | Unexpected server error | Report to admin with timestamp |

---

## 🔒 Security

- ✅ **No secrets exposed**: Only booleans and safe messages returned
- ✅ **WCL credentials hidden**: Health check returns `hasWclToken: boolean`, not actual token
- ✅ **Database details hidden**: Only connectivity status, no connection strings
- ✅ **Error messages sanitized**: No stack traces or internal paths in API responses
- ✅ **Detailed logs server-side only**: Full error details logged to server console only

---

## 🧪 Testing

### Test 1: Health Check
```bash
curl http://localhost:3001/api/enrich-player-card
```
**Expected**: `{ success: true, data: { ok: true, hasWclToken: true, hasDb: true, ... } }`

### Test 2: Valid ID-based URL
```bash
curl -X POST http://localhost:3001/api/enrich-player-card \
  -H "Content-Type: application/json" \
  -d '{"warcraftLogsUrl":"https://www.warcraftlogs.com/character/id/64213375"}'
```
**Expected**: `200 OK` with player card data

### Test 3: Invalid URL
```bash
curl -X POST http://localhost:3001/api/enrich-player-card \
  -H "Content-Type: application/json" \
  -d '{"warcraftLogsUrl":"invalid-url"}'
```
**Expected**: `400 Bad Request` with clear error message

### Test 4: Missing URL
```bash
curl -X POST http://localhost:3001/api/enrich-player-card \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Expected**: `400 Bad Request` - "warcraftLogsUrl is required and must be a string"

---

## 📝 Server Log Format

All logs use consistent prefix for easy grepping:

```bash
# Filter all enrichment API logs
grep "\[enrich-player-card\]" backend.log

# Filter only errors
grep "\[enrich-player-card\].*error" backend.log
```

---

## 🚀 Deployment Notes

### Environment Variables Required:
```env
WCL_CLIENT_ID=your_client_id
WCL_CLIENT_SECRET=your_client_secret
```

### Health Check Integration:
Add to your monitoring system:
```
GET /api/enrich-player-card
Alert if: data.ok === false
Check every: 5 minutes
```

---

**Status**: ✅ Complete!  
**Next**: Refresh any page to trigger backend recompilation, then test the health endpoint

The enhanced error handling will make debugging much easier!
