/**
 * Test Helper for Warcraft Logs Parser
 * 
 * Simple test runner without external dependencies.
 * Run with: node --loader ts-node/esm src/lib/__tests__/warcraft-logs-parser.test.ts
 * Or manually test individual cases.
 */

import {
  parseWarcraftLogsCharacterUrl,
  isWarcraftLogsCharacterUrl,
  buildWarcraftLogsCharacterUrl,
} from '../warcraft-logs-parser'

// Simple test utilities
interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✅ ${name}`)
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error) 
    })
    console.log(`❌ ${name}`)
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    )
  }
}

function assertThrows(fn: () => void, expectedMessage?: string) {
  let threw = false
  let actualMessage = ''
  
  try {
    fn()
  } catch (error) {
    threw = true
    actualMessage = error instanceof Error ? error.message : String(error)
  }
  
  if (!threw) {
    throw new Error('Expected function to throw an error')
  }
  
  if (expectedMessage && !actualMessage.includes(expectedMessage)) {
    throw new Error(
      `Expected error message to include "${expectedMessage}", got: "${actualMessage}"`
    )
  }
}

// ============================================================================
// TESTS
// ============================================================================

console.log('\n🧪 Running Warcraft Logs Parser Tests\n')

// Valid URL Tests
test('parses valid US realm URL with https', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/us/area-52/testchar'
  )
  assertEqual(result, {
    region: 'US',
    realm: 'area-52',
    characterName: 'Testchar',
  })
})

test('parses valid EU realm URL', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/eu/silvermoon/mycharacter'
  )
  assertEqual(result, {
    region: 'EU',
    realm: 'silvermoon',
    characterName: 'Mycharacter',
  })
})

test('parses URL without https prefix', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'www.warcraftlogs.com/character/us/area-52/testchar'
  )
  assertEqual(result, {
    region: 'US',
    realm: 'area-52',
    characterName: 'Testchar',
  })
})

test('parses URL with http (not https)', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'http://www.warcraftlogs.com/character/kr/azshara/koreanchar'
  )
  assertEqual(result, {
    region: 'KR',
    realm: 'azshara',
    characterName: 'Koreanchar',
  })
})

test('normalizes region to uppercase', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/US/area-52/testchar'
  )
  assertEqual(result.region, 'US')
})

test('normalizes realm to lowercase slug', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/us/Area-52/testchar'
  )
  assertEqual(result.realm, 'area-52')
})

test('capitalizes character name properly', () => {
  const result = parseWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/us/area-52/TESTCHAR'
  )
  assertEqual(result.characterName, 'Testchar')
})

test('handles all valid regions', () => {
  const regions = ['us', 'eu', 'kr', 'tw', 'cn']
  regions.forEach(region => {
    const result = parseWarcraftLogsCharacterUrl(
      `https://www.warcraftlogs.com/character/${region}/test-realm/testchar`
    )
    assertEqual(result.region, region.toUpperCase())
  })
})

// Invalid URL Tests
test('throws on empty string', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl(''),
    'cannot be empty'
  )
})

test('throws on null/undefined', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl(null as any),
    'required'
  )
})

test('throws on invalid domain', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.google.com/character/us/area-52/test'),
    'Invalid domain'
  )
})

test('throws on invalid region', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/xx/area-52/test'),
    'Invalid region'
  )
})

test('throws on empty realm', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us//test'),
    'Realm cannot be empty'
  )
})

test('throws on invalid realm characters', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us/area_52/test'),
    'Invalid realm slug'
  )
})

test('throws on empty character name', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us/area-52/'),
    'Invalid URL structure'
  )
})

test('throws on character name too short', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us/area-52/a'),
    'Must be between 2 and 12 characters'
  )
})

test('throws on character name too long', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us/area-52/verylongnamehere'),
    'Must be between 2 and 12 characters'
  )
})

test('throws on character name with numbers', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us/area-52/test123'),
    'Must contain only letters'
  )
})

test('throws on wrong URL path (not /character/)', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/guild/us/area-52/test'),
    "Expected '/character/...'"
  )
})

test('throws on incomplete URL structure', () => {
  assertThrows(
    () => parseWarcraftLogsCharacterUrl('https://www.warcraftlogs.com/character/us'),
    'Invalid URL structure'
  )
})

// isWarcraftLogsCharacterUrl Tests
test('isWarcraftLogsCharacterUrl returns true for valid URL', () => {
  const result = isWarcraftLogsCharacterUrl(
    'https://www.warcraftlogs.com/character/us/area-52/testchar'
  )
  assertEqual(result, true)
})

test('isWarcraftLogsCharacterUrl returns false for invalid URL', () => {
  const result = isWarcraftLogsCharacterUrl(
    'https://www.google.com'
  )
  assertEqual(result, false)
})

test('isWarcraftLogsCharacterUrl returns false for empty string', () => {
  const result = isWarcraftLogsCharacterUrl('')
  assertEqual(result, false)
})

// buildWarcraftLogsCharacterUrl Tests
test('buildWarcraftLogsCharacterUrl creates valid URL', () => {
  const url = buildWarcraftLogsCharacterUrl('US', 'Area-52', 'TestChar')
  assertEqual(
    url,
    'https://www.warcraftlogs.com/character/us/area-52/testchar'
  )
})

test('buildWarcraftLogsCharacterUrl normalizes inputs', () => {
  const url = buildWarcraftLogsCharacterUrl('us', 'AREA-52', 'TESTCHAR')
  assertEqual(
    url,
    'https://www.warcraftlogs.com/character/us/area-52/testchar'
  )
})

test('buildWarcraftLogsCharacterUrl throws on invalid region', () => {
  assertThrows(
    () => buildWarcraftLogsCharacterUrl('XX', 'area-52', 'test'),
    'Invalid region'
  )
})

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(60))
console.log('📊 Test Summary')
console.log('='.repeat(60))

const passed = results.filter(r => r.passed).length
const failed = results.filter(r => !r.passed).length
const total = results.length

console.log(`Total: ${total} tests`)
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)

if (failed > 0) {
  console.log('\n❌ Failed Tests:')
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}`)
    console.log(`    ${r.error}`)
  })
}

console.log('\n' + '='.repeat(60) + '\n')

// Exit with error code if any tests failed
if (failed > 0) {
  process.exit(1)
}
