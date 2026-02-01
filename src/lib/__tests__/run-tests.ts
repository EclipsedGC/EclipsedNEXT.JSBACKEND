/**
 * Manual Test Runner for Warcraft Logs Parser
 * 
 * This is a simplified test runner that can be executed directly.
 * To run: ts-node src/lib/__tests__/run-tests.ts
 */

// Import and run the tests
import('./warcraft-logs-parser.test')
  .then(() => {
    console.log('✅ All tests completed')
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  })
