import { test, describe } from 'node:test';
import assert from 'node:assert';
import Database from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'test-prompts.db');

// Clean up test database before and after tests
function cleanupTestDb() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
}

describe('Database - Prompt Storage and Search', () => {
  let db;

  // Setup
  test('should create database instance', async () => {
    cleanupTestDb();
    db = new Database();
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // Add prompts
  test('should add a prompt to database', async () => {
    const id = await db.addPrompt(
      'What is async/await?',
      'Async/await is a way to handle asynchronous operations in JavaScript...',
      'ChatGPT',
      'GPT-4',
      Math.floor(Date.now() / 1000)
    );
    assert.strictEqual(typeof id, 'number');
    assert(id > 0, 'ID should be positive');
  });

  test('should add multiple prompts', async () => {
    const id1 = await db.addPrompt('Test prompt 1', 'Response 1', 'ChatGPT', 'GPT-4');
    const id2 = await db.addPrompt('Test prompt 2', 'Response 2', 'Claude', 'Claude-2');
    const id3 = await db.addPrompt('Test prompt 3', 'Response 3', 'ChatGPT', 'GPT-3.5');

    assert(id1 > 0 && id2 > 0 && id3 > 0, 'All IDs should be positive');
  });

  // Retrieve prompts
  test('should get all prompts', async () => {
    const prompts = await db.getAllPrompts();
    assert.strictEqual(Array.isArray(prompts), true);
    assert(prompts.length >= 3, 'Should have at least 3 prompts');
  });

  test('should get prompt by ID', async () => {
    const id = await db.addPrompt('Get by ID test', 'Response text', 'Platform', 'Model');
    const prompt = await db.getPromptById(id);

    assert.strictEqual(prompt.id, id);
    assert.strictEqual(prompt.prompt_text, 'Get by ID test');
    assert.strictEqual(prompt.response_text, 'Response text');
  });

  // Full-text search
  test('should search prompts by keyword in prompt text', async () => {
    const results = await db.searchPrompts('async');
    assert(results.length > 0, 'Should find prompts containing "async"');
    assert(results.some(r => r.prompt_text.includes('async')), 'Result should contain search term');
  });

  test('should search prompts by keyword in response text', async () => {
    const results = await db.searchPrompts('asynchronous');
    assert(results.length > 0, 'Should find prompts with response containing keyword');
  });

  test('should search prompts case-insensitively', async () => {
    const results = await db.searchPrompts('TEST');
    assert(results.length > 0, 'Should find prompts regardless of case');
  });

  test('should return empty results for non-matching query', async () => {
    const results = await db.searchPrompts('xyznonexistent123');
    assert.strictEqual(Array.isArray(results), true);
    assert.strictEqual(results.length, 0, 'Should return empty array for no matches');
  });

  test('should handle empty search query', async () => {
    const results = await db.searchPrompts('');
    assert.strictEqual(results.length, 0, 'Empty query should return no results');
  });

  test('should search with multiple keywords', async () => {
    const results = await db.searchPrompts('prompt response');
    assert(Array.isArray(results), 'Should return array');
  });

  // Sorting
  test('should sort prompts by date descending (newest first)', async () => {
    const now = Math.floor(Date.now() / 1000);
    await db.addPrompt('Old prompt', 'Response', 'Platform', 'Model', now - 1000);
    await db.addPrompt('New prompt', 'Response', 'Platform', 'Model', now);

    const results = await db.getAllPrompts('date');
    assert.strictEqual(results[0].prompt_text, 'New prompt', 'Newest should be first');
    assert.strictEqual(results[results.length - 1].prompt_text, 'Old prompt', 'Oldest should be last');
  });

  test('should sort prompts by date ascending (oldest first)', async () => {
    const results = await db.getAllPrompts('date-asc');
    const timestamps = results.map(r => r.timestamp);

    for (let i = 1; i < timestamps.length; i++) {
      assert(timestamps[i] >= timestamps[i - 1], 'Should be sorted in ascending order');
    }
  });

  // Metadata
  test('should preserve all metadata when storing and retrieving', async () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const id = await db.addPrompt(
      'API request documentation prompt',
      'Here is how to document an API...',
      'ChatGPT',
      'GPT-4 Turbo',
      timestamp
    );

    const prompt = await db.getPromptById(id);

    assert.strictEqual(prompt.platform, 'ChatGPT');
    assert.strictEqual(prompt.model, 'GPT-4 Turbo');
    assert.strictEqual(prompt.timestamp, timestamp);
    assert.strictEqual(prompt.prompt_text, 'API request documentation prompt');
    assert.strictEqual(prompt.response_text, 'Here is how to document an API...');
  });

  // Delete
  test('should delete a prompt', async () => {
    const id = await db.addPrompt('To delete', 'Response', 'Platform', 'Model');
    await db.deletePrompt(id);

    const prompt = await db.getPromptById(id);
    assert.strictEqual(prompt, undefined, 'Prompt should be deleted');
  });

  test('should not find deleted prompt in search results', async () => {
    const id = await db.addPrompt('Unique deletion test prompt xyz', 'Response', 'Platform', 'Model');
    await db.deletePrompt(id);

    const results = await db.searchPrompts('deletion test prompt xyz');
    assert.strictEqual(results.length, 0, 'Deleted prompt should not appear in search');
  });

  // Cleanup
  test('should close database connection', async () => {
    await db.close();
    cleanupTestDb();
  });
});

describe('Database - Acceptance Criteria', () => {
  let db;

  test('setup test database', async () => {
    cleanupTestDb();
    db = new Database();
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('User can search for previously captured prompts by keyword and retrieve results with metadata intact', async () => {
    // Add sample prompts like they would be captured by the extension
    const prompts = [
      {
        text: 'Write a function to validate email addresses',
        response: 'Here is a robust email validation regex and explanation...',
        platform: 'ChatGPT',
        model: 'GPT-4'
      },
      {
        text: 'How to optimize database queries',
        response: 'Database optimization involves indexing, query planning, and caching...',
        platform: 'ChatGPT',
        model: 'GPT-3.5'
      },
      {
        text: 'Create a responsive CSS grid layout',
        response: 'CSS Grid is powerful for creating responsive layouts...',
        platform: 'ChatGPT',
        model: 'GPT-4'
      }
    ];

    const ids = [];
    for (const p of prompts) {
      const id = await db.addPrompt(p.text, p.response, p.platform, p.model);
      ids.push(id);
    }

    // Search by keyword
    const results = await db.searchPrompts('email');
    assert(results.length > 0, 'Should find email validation prompt');

    // Verify metadata is intact
    const emailResult = results.find(r => r.prompt_text.includes('email'));
    assert(emailResult, 'Should find email prompt');
    assert.strictEqual(emailResult.platform, 'ChatGPT', 'Platform metadata should be intact');
    assert.strictEqual(emailResult.model, 'GPT-4', 'Model metadata should be intact');
    assert(emailResult.timestamp, 'Timestamp should be present');

    // Search another term
    const cssResults = await db.searchPrompts('CSS');
    assert(cssResults.length > 0, 'Should find CSS prompt');
    assert(cssResults.some(r => r.prompt_text.includes('CSS')), 'CSS prompt should be in results');

    // Search response text
    const indexResults = await db.searchPrompts('indexing');
    assert(indexResults.length > 0, 'Should find prompts by response text');

    await db.close();
  });
});
