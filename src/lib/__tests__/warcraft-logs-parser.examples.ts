/**
 * Warcraft Logs Parser - Usage Examples
 * 
 * Demonstrates how to use the parser in various scenarios
 */

import { 
  parseWarcraftLogsCharacterUrl,
  isWarcraftLogsCharacterUrl,
  buildWarcraftLogsCharacterUrl,
  type ParsedWarcraftLogsCharacter 
} from './warcraft-logs-parser'

// ============================================================================
// Example 1: Basic URL Parsing
// ============================================================================

function example1_BasicParsing() {
  console.log('Example 1: Basic URL Parsing')
  console.log('================================\n')
  
  const url = 'https://www.warcraftlogs.com/character/us/area-52/playername'
  
  try {
    const result = parseWarcraftLogsCharacterUrl(url)
    console.log('Input:', url)
    console.log('Parsed:', result)
    // Output:
    // {
    //   region: 'US',
    //   realm: 'area-52',
    //   characterName: 'Playername'
    // }
  } catch (error) {
    console.error('Error:', error)
  }
  
  console.log('\n')
}

// ============================================================================
// Example 2: Handling Invalid URLs
// ============================================================================

function example2_ErrorHandling() {
  console.log('Example 2: Error Handling')
  console.log('================================\n')
  
  const invalidUrls = [
    'https://www.google.com/test',
    'https://www.warcraftlogs.com/character/xx/area-52/test',
    'https://www.warcraftlogs.com/character/us/area-52/a',
    'https://www.warcraftlogs.com/character/us/area-52/test123',
  ]
  
  invalidUrls.forEach(url => {
    try {
      parseWarcraftLogsCharacterUrl(url)
      console.log(`✅ ${url} - Valid`)
    } catch (error) {
      console.log(`❌ ${url}`)
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  })
  
  console.log('\n')
}

// ============================================================================
// Example 3: Validation Before Processing
// ============================================================================

function example3_PreValidation() {
  console.log('Example 3: Pre-Validation')
  console.log('================================\n')
  
  const userInput = 'https://www.warcraftlogs.com/character/us/area-52/testchar'
  
  // Quick validation check
  if (isWarcraftLogsCharacterUrl(userInput)) {
    console.log('✅ URL is valid, proceeding to parse...')
    const result = parseWarcraftLogsCharacterUrl(userInput)
    console.log('Parsed:', result)
  } else {
    console.log('❌ URL is invalid')
  }
  
  console.log('\n')
}

// ============================================================================
// Example 4: Building URLs
// ============================================================================

function example4_BuildingUrls() {
  console.log('Example 4: Building URLs')
  console.log('================================\n')
  
  // Build URL from components
  const url = buildWarcraftLogsCharacterUrl('US', 'Area-52', 'TestChar')
  console.log('Built URL:', url)
  // Output: https://www.warcraftlogs.com/character/us/area-52/testchar
  
  // Parse it back
  const parsed = parseWarcraftLogsCharacterUrl(url)
  console.log('Parsed back:', parsed)
  
  console.log('\n')
}

// ============================================================================
// Example 5: API Endpoint Usage (Pseudo-code)
// ============================================================================

function example5_ApiEndpoint() {
  console.log('Example 5: API Endpoint Usage (Pseudo-code)')
  console.log('=============================================\n')
  
  console.log(`
  // In your API route:
  import { parseWarcraftLogsCharacterUrl } from '@/lib/warcraft-logs-parser'
  import { apiResponse } from '@/lib/api-response'
  import { HttpStatus } from '@/lib/http-status'
  
  export async function POST(request: NextRequest) {
    const { warcraftLogsUrl } = await request.json()
    
    try {
      const { region, realm, characterName } = 
        parseWarcraftLogsCharacterUrl(warcraftLogsUrl)
      
      // Use the parsed data...
      return apiResponse.success({ region, realm, characterName })
      
    } catch (error) {
      return apiResponse.error(
        error instanceof Error ? error.message : 'Invalid URL',
        HttpStatus.BAD_REQUEST
      )
    }
  }
  `)
  
  console.log('\n')
}

// ============================================================================
// Example 6: Form Submission with Optional URL
// ============================================================================

function example6_FormSubmission() {
  console.log('Example 6: Form Submission with Optional URL')
  console.log('=============================================\n')
  
  // Simulate form data
  const formData = {
    warcraftLogsUrl: 'https://www.warcraftlogs.com/character/us/area-52/player',
    manualRegion: 'EU',
    manualRealm: 'Silvermoon',
    manualName: 'Backup',
  }
  
  let characterData: ParsedWarcraftLogsCharacter | null = null
  
  // Try to parse WCL URL first
  if (formData.warcraftLogsUrl) {
    try {
      characterData = parseWarcraftLogsCharacterUrl(formData.warcraftLogsUrl)
      console.log('✅ Using data from Warcraft Logs URL:', characterData)
    } catch (error) {
      console.log('⚠️  WCL URL invalid, falling back to manual input')
      console.log('   Error:', error instanceof Error ? error.message : String(error))
    }
  }
  
  // Fallback to manual input if URL parsing failed
  if (!characterData) {
    characterData = {
      region: formData.manualRegion,
      realm: formData.manualRealm.toLowerCase(),
      characterName: formData.manualName,
    }
    console.log('✅ Using manual input:', characterData)
  }
  
  console.log('\n')
}

// ============================================================================
// Example 7: Batch Validation
// ============================================================================

function example7_BatchValidation() {
  console.log('Example 7: Batch Validation')
  console.log('================================\n')
  
  const urls = [
    'https://www.warcraftlogs.com/character/us/area-52/player1',
    'https://www.warcraftlogs.com/character/eu/silvermoon/player2',
    'https://www.warcraftlogs.com/character/kr/azshara/player3',
    'https://www.google.com/invalid',
  ]
  
  const results = urls.map(url => ({
    url,
    isValid: isWarcraftLogsCharacterUrl(url),
  }))
  
  console.log('Validation Results:')
  results.forEach(r => {
    console.log(`${r.isValid ? '✅' : '❌'} ${r.url}`)
  })
  
  const validCount = results.filter(r => r.isValid).length
  console.log(`\nValid URLs: ${validCount}/${results.length}`)
  
  console.log('\n')
}

// ============================================================================
// Run All Examples
// ============================================================================

if (require.main === module) {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 Warcraft Logs Parser - Usage Examples')
  console.log('='.repeat(60) + '\n')
  
  example1_BasicParsing()
  example2_ErrorHandling()
  example3_PreValidation()
  example4_BuildingUrls()
  example5_ApiEndpoint()
  example6_FormSubmission()
  example7_BatchValidation()
  
  console.log('='.repeat(60))
  console.log('✅ All examples completed')
  console.log('='.repeat(60) + '\n')
}
