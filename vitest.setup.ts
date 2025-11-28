// Global setup for vitest
// Returns a teardown function that runs after all tests complete

export default function setup() {
  console.log('[vitest.setup] Starting test suite...');

  // Return teardown function
  return async () => {
    console.log('[vitest.setup] Test suite complete, forcing exit...');
    // Give a brief moment for final output to be flushed
    await new Promise(resolve => setTimeout(resolve, 100));
    // Force exit to prevent hanging on open handles
    process.exit(0);
  };
}
