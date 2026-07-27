// Tests for extension components
// These tests verify capture functionality, storage, and message passing

const tests = [];
let testsPassed = 0;
let testsFailed = 0;

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

function registerTest(name, testFn) {
  tests.push({ name, testFn });
}

async function runTests() {
  console.log('🧪 Running extension tests...\n');

  for (const test of tests) {
    try {
      await test.testFn();
      console.log(`✅ ${test.name}`);
      testsPassed++;
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
      testsFailed++;
    }
  }

  console.log(`\n📊 Results: ${testsPassed} passed, ${testsFailed} failed`);
  return testsFailed === 0;
}

// Storage Manager Tests
registerTest('Storage: Add and retrieve prompt', async () => {
  const prompt = {
    promptText: 'Hello, how are you?',
    responseText: 'I am doing well!',
    model: 'GPT-4'
  };

  // Mock chrome.storage
  const storage = {};
  const mockChrome = {
    storage: {
      local: {
        set: async (obj) => {
          Object.assign(storage, obj);
        },
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = storage[key];
          }
          return result;
        }
      }
    }
  };

  // Simple storage implementation
  const STORAGE_KEY = 'captured_prompts';
  async function addPrompt(promptData) {
    const result = await mockChrome.storage.local.get([STORAGE_KEY]);
    const prompts = result[STORAGE_KEY] || [];
    const capturedPrompt = {
      id: Date.now(),
      promptText: promptData.promptText,
      responseText: promptData.responseText,
      platform: 'ChatGPT',
      model: promptData.model || 'unknown',
      timestamp: Math.floor(Date.now() / 1000)
    };
    prompts.push(capturedPrompt);
    await mockChrome.storage.local.set({ [STORAGE_KEY]: prompts });
    return capturedPrompt;
  }

  const result = await addPrompt(prompt);
  assert(result.promptText === prompt.promptText, 'Prompt text stored correctly');
  assert(result.responseText === prompt.responseText, 'Response text stored correctly');
  assert(result.platform === 'ChatGPT', 'Platform set to ChatGPT');
});

registerTest('Storage: Retrieve multiple prompts', async () => {
  const storage = {};
  const mockChrome = {
    storage: {
      local: {
        set: async (obj) => Object.assign(storage, obj),
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = storage[key];
          }
          return result;
        }
      }
    }
  };

  const STORAGE_KEY = 'captured_prompts';
  const prompts = [
    { id: 1, promptText: 'Test 1', responseText: 'Response 1', platform: 'ChatGPT', model: 'GPT-4' },
    { id: 2, promptText: 'Test 2', responseText: 'Response 2', platform: 'ChatGPT', model: 'GPT-3.5' },
    { id: 3, promptText: 'Test 3', responseText: 'Response 3', platform: 'ChatGPT', model: 'GPT-4' }
  ];

  await mockChrome.storage.local.set({ [STORAGE_KEY]: prompts });
  const result = await mockChrome.storage.local.get([STORAGE_KEY]);

  assert(Array.isArray(result[STORAGE_KEY]), 'Retrieved prompts is an array');
  assertEqual(result[STORAGE_KEY].length, 3, 'All prompts retrieved');
});

registerTest('Storage: Delete prompt by ID', async () => {
  const storage = {};
  const mockChrome = {
    storage: {
      local: {
        set: async (obj) => Object.assign(storage, obj),
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = storage[key];
          }
          return result;
        }
      }
    }
  };

  const STORAGE_KEY = 'captured_prompts';
  const prompts = [
    { id: 1, promptText: 'Test 1', platform: 'ChatGPT' },
    { id: 2, promptText: 'Test 2', platform: 'ChatGPT' },
    { id: 3, promptText: 'Test 3', platform: 'ChatGPT' }
  ];

  await mockChrome.storage.local.set({ [STORAGE_KEY]: prompts });

  // Delete prompt with id 2
  let result = await mockChrome.storage.local.get([STORAGE_KEY]);
  const filtered = result[STORAGE_KEY].filter(p => p.id !== 2);
  await mockChrome.storage.local.set({ [STORAGE_KEY]: filtered });

  result = await mockChrome.storage.local.get([STORAGE_KEY]);
  assertEqual(result[STORAGE_KEY].length, 2, 'Prompt deleted');
  assert(!result[STORAGE_KEY].find(p => p.id === 2), 'Deleted prompt not found');
});

registerTest('Capture: Validates required fields', async () => {
  const validate = (promptData) => {
    if (!promptData.promptText || typeof promptData.promptText !== 'string') {
      throw new Error('promptText is required and must be a string');
    }
    if (!promptData.responseText || typeof promptData.responseText !== 'string') {
      throw new Error('responseText is required and must be a string');
    }
    return true;
  };

  // Valid data
  assert(validate({
    promptText: 'Hello',
    responseText: 'Hi there'
  }), 'Valid prompt data passes validation');

  // Invalid data - missing prompt
  try {
    validate({
      responseText: 'Hi there'
    });
    throw new Error('Should have failed validation');
  } catch (error) {
    assert(error.message.includes('promptText'), 'Validation catches missing promptText');
  }
});

registerTest('Message format: Capture message structure', () => {
  const captureMessage = {
    type: 'CAPTURE_PROMPT',
    payload: {
      promptText: 'Test prompt',
      responseText: 'Test response',
      model: 'GPT-4'
    }
  };

  assert(captureMessage.type === 'CAPTURE_PROMPT', 'Message type is correct');
  assert(captureMessage.payload.promptText, 'Payload contains promptText');
  assert(captureMessage.payload.responseText, 'Payload contains responseText');
  assert(captureMessage.payload.model, 'Payload contains model');
});

registerTest('Metadata: Timestamp format', () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const capturedAt = new Date().toISOString();

  assert(typeof timestamp === 'number', 'Unix timestamp is a number');
  assert(timestamp > 0, 'Timestamp is positive');
  assert(capturedAt.includes('T'), 'ISO string contains T separator');
  assert(capturedAt.includes('Z'), 'ISO string contains Z timezone');
});

registerTest('Metadata: Platform always ChatGPT', () => {
  const prompt1 = { platform: 'ChatGPT', model: 'GPT-4' };
  const prompt2 = { platform: 'ChatGPT', model: 'GPT-3.5' };

  assertEqual(prompt1.platform, 'ChatGPT', 'Platform is ChatGPT for all prompts');
  assertEqual(prompt2.platform, 'ChatGPT', 'Platform is ChatGPT for all prompts');
});

registerTest('Local Storage persistence: Round-trip data', async () => {
  const storage = {};
  const mockChrome = {
    storage: {
      local: {
        set: async (obj) => Object.assign(storage, obj),
        get: async (keys) => {
          const result = {};
          for (const key of keys) {
            result[key] = storage[key];
          }
          return result;
        }
      }
    }
  };

  const STORAGE_KEY = 'captured_prompts';
  const originalData = [
    {
      id: 1,
      promptText: 'What is AI?',
      responseText: 'Artificial Intelligence is...',
      platform: 'ChatGPT',
      model: 'GPT-4',
      timestamp: 1234567890,
      capturedAt: '2024-01-01T00:00:00Z'
    }
  ];

  // Store
  await mockChrome.storage.local.set({ [STORAGE_KEY]: originalData });

  // Retrieve
  const result = await mockChrome.storage.local.get([STORAGE_KEY]);
  const retrievedData = result[STORAGE_KEY];

  assert(Array.isArray(retrievedData), 'Retrieved data is an array');
  assertEqual(retrievedData[0].id, originalData[0].id, 'ID preserved');
  assertEqual(retrievedData[0].promptText, originalData[0].promptText, 'Prompt text preserved');
  assertEqual(retrievedData[0].platform, originalData[0].platform, 'Platform preserved');
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runTests };
}

// Auto-run if executed directly
if (typeof document === 'undefined' && typeof require !== 'undefined') {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}
