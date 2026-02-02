/**
 * Quick test to verify WCL class ID mapping
 * 
 * Run: npx tsx src/lib/test-wcl-class-map.ts
 */

import { getWCLClassName, WCL_CLASS_ID_TO_NAME } from './wcl-class-map'

console.log('🧪 Testing WCL Class ID Mapping\n')

// Test all class IDs
console.log('📋 Full Mapping:')
Object.entries(WCL_CLASS_ID_TO_NAME).forEach(([id, name]) => {
  console.log(`  ClassID ${id.padStart(2, ' ')} -> ${name}`)
})

console.log('\n✅ Specific Test Cases:')

// Test case from user request: classID 8 should be "Rogue" (alphabetically)
const testCases = [
  { id: 1, expected: 'Death Knight' },
  { id: 2, expected: 'Druid' }, // IMPORTANT: Not Paladin!
  { id: 4, expected: 'Mage' },
  { id: 8, expected: 'Rogue' }, // From user's test request
  { id: 11, expected: 'Warrior' },
  { id: 99, expected: 'Unknown' }, // Invalid ID
]

testCases.forEach(({ id, expected }) => {
  const result = getWCLClassName(id)
  const status = result === expected ? '✅' : '❌'
  console.log(`  ${status} ClassID ${id}: ${result} ${result === expected ? '' : `(expected: ${expected})`}`)
})

console.log('\n🎯 Key Insight: WCL uses ALPHABETICAL ordering, NOT Blizzard\'s standard!')
console.log('   - ClassID 2 = Druid (not Paladin)')
console.log('   - ClassID 6 = Paladin (not Death Knight)')
console.log('   - ClassID 8 = Rogue (not Mage)')
