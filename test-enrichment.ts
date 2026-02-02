/**
 * Quick Test Script for Player Card Enrichment API
 * 
 * Run with: npx ts-node test-enrichment.ts
 * Or manually test with the example URLs below
 */

// Test URLs
const testUrls = [
  'https://www.warcraftlogs.com/character/us/area-52/testchar',
  'https://www.warcraftlogs.com/character/eu/silvermoon/testchar',
]

const API_URL = 'http://localhost:3001/api/enrich-player-card'

async function testEnrichment(warcraftLogsUrl: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${warcraftLogsUrl}`)
  console.log('='.repeat(60))
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        warcraftLogsUrl,
        seasonKey: 'latest',
      }),
    })
    
    const duration = Date.now() - startTime
    const result = await response.json()
    
    console.log(`\nResponse Status: ${response.status}`)
    console.log(`Response Time: ${duration}ms`)
    console.log(`Success: ${result.success}`)
    console.log(`Message: ${result.message}`)
    
    if (result.success && result.data) {
      console.log('\nPlayer Card:')
      console.log(`  Character: ${result.data.characterName}`)
      console.log(`  Realm: ${result.data.realm}`)
      console.log(`  Region: ${result.data.region}`)
      console.log(`  Class/Spec: ${result.data.classSpec || 'N/A'}`)
      console.log(`  Most Played Spec: ${result.data.mostPlayedSpec || 'N/A'}`)
      console.log(`  Fetch Status: ${result.data.fetchStatus}`)
      console.log(`  Updated At: ${result.data.updatedAt}`)
      
      if (result.data.bestKillLatestSeason) {
        console.log('\nBest Kill:')
        console.log(`  Boss: ${result.data.bestKillLatestSeason.encounterName}`)
        console.log(`  Difficulty: ${result.data.bestKillLatestSeason.difficulty}`)
        console.log(`  Parse: ${result.data.bestKillLatestSeason.rankPercent}%`)
        console.log(`  Kill Date: ${result.data.bestKillLatestSeason.killDate || 'N/A'}`)
      }
      
      if (result.data.errorMessage) {
        console.log(`\n⚠️  Error: ${result.data.errorMessage}`)
      }
    } else {
      console.log(`\n❌ Error: ${result.message}`)
    }
    
  } catch (error) {
    console.error(`\n❌ Request failed:`, error)
  }
}

// Manual test instructions
console.log(`
╔════════════════════════════════════════════════════════════╗
║        Player Card Enrichment API - Test Guide            ║
╚════════════════════════════════════════════════════════════╝

✅ Configuration:
   - WCL Client ID: a0faa785-d707-4730-b7aa-803698b6abc0
   - Backend Port: 3001
   - Environment: .env.local configured

📝 Manual Test with cURL:

curl -X POST http://localhost:3001/api/enrich-player-card \\
  -H "Content-Type: application/json" \\
  -d '{"warcraftLogsUrl":"https://www.warcraftlogs.com/character/us/area-52/YOURCHAR"}'

📝 Manual Test with PowerShell:

$body = @{
    warcraftLogsUrl = "https://www.warcraftlogs.com/character/us/area-52/YOURCHAR"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/enrich-player-card" \\
  -Method POST \\
  -ContentType "application/json" \\
  -Body $body

🔍 What to Look For:

1. First Request (No Cache):
   - Should take 500-2000ms
   - Status: "complete" or "partial"
   - Data should be populated

2. Second Request (Cached):
   - Should take 10-50ms
   - Same data returned instantly
   - Message: "Player card returned from cache"

3. Invalid URL:
   - Should return 400 error
   - Clear error message about what's wrong

4. Character Not Found:
   - Should return partial card
   - fetchStatus: "failed"
   - Error message explaining issue

📊 Expected Response:

{
  "success": true,
  "message": "Player card enriched successfully",
  "data": {
    "characterName": "Yourchar",
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

🔧 Troubleshooting:

If you get errors:
1. Verify backend is running on port 3001
2. Check .env.local has the credentials
3. Restart backend after adding credentials
4. Check backend console logs for details
5. Verify WCL API credentials are valid

`)

// Uncomment to run automated tests:
// async function runTests() {
//   for (const url of testUrls) {
//     await testEnrichment(url)
//     await new Promise(resolve => setTimeout(resolve, 1000))
//   }
// }
// runTests()
