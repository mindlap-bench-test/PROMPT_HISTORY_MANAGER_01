import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from './database.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

const db = new Database();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all prompts with optional sorting
app.get('/api/prompts', async (req, res) => {
  try {
    const sortBy = req.query.sort || 'date'; // 'date', 'date-asc'
    const prompts = await db.getAllPrompts(sortBy);
    res.json({
      success: true,
      count: prompts.length,
      prompts: prompts.map(p => formatPrompt(p))
    });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search prompts
app.get('/api/search', async (req, res) => {
  try {
    const { q, sort } = req.query;
    const sortBy = sort || 'date';

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        count: 0,
        results: []
      });
    }

    const results = await db.searchPrompts(q, sortBy);
    res.json({
      success: true,
      query: q,
      count: results.length,
      results: results.map(p => formatPrompt(p))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get prompt by ID
app.get('/api/prompts/:id', async (req, res) => {
  try {
    const prompt = await db.getPromptById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ success: false, error: 'Prompt not found' });
    }
    res.json({ success: true, prompt: formatPrompt(prompt) });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add a new prompt
app.post('/api/prompts', async (req, res) => {
  try {
    const { promptText, responseText, platform, model, timestamp } = req.body;

    if (!promptText) {
      return res.status(400).json({ success: false, error: 'promptText is required' });
    }

    const id = await db.addPrompt(promptText, responseText || '', platform || '', model || '', timestamp);
    const prompt = await db.getPromptById(id);

    res.status(201).json({
      success: true,
      prompt: formatPrompt(prompt)
    });
  } catch (error) {
    console.error('Error adding prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a prompt
app.delete('/api/prompts/:id', async (req, res) => {
  try {
    await db.deletePrompt(req.params.id);
    res.json({ success: true, message: 'Prompt deleted' });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Seed database with sample data if empty
app.post('/api/seed', async (req, res) => {
  try {
    const prompts = await db.getAllPrompts();
    if (prompts.length > 0) {
      return res.json({ success: false, message: 'Database already has prompts' });
    }

    const samplePrompts = [
      {
        prompt: 'Write a unit test for a JavaScript async function',
        response: 'Here\'s a comprehensive unit test for async functions using Jest...',
        platform: 'ChatGPT',
        model: 'GPT-4',
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 5
      },
      {
        prompt: 'Explain the difference between async/await and Promises',
        response: 'Async/await is syntactic sugar over Promises that makes asynchronous code look synchronous...',
        platform: 'ChatGPT',
        model: 'GPT-3.5',
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 3
      },
      {
        prompt: 'How do I implement full-text search in SQLite?',
        response: 'SQLite provides FTS5 (Full-Text Search) module for efficient text searching...',
        platform: 'ChatGPT',
        model: 'GPT-4',
        timestamp: Math.floor(Date.now() / 1000) - 86400 * 2
      },
      {
        prompt: 'Create a React component for a search bar',
        response: 'Here\'s a reusable React search component with debouncing and state management...',
        platform: 'ChatGPT',
        model: 'GPT-4',
        timestamp: Math.floor(Date.now() / 1000) - 3600
      },
      {
        prompt: 'Best practices for API error handling',
        response: 'API error handling should include proper HTTP status codes, error messages, and retry logic...',
        platform: 'ChatGPT',
        model: 'GPT-3.5',
        timestamp: Math.floor(Date.now() / 1000) - 1800
      }
    ];

    for (const p of samplePrompts) {
      await db.addPrompt(p.prompt, p.response, p.platform, p.model, p.timestamp);
    }

    res.json({ success: true, message: `Seeded ${samplePrompts.length} prompts` });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function formatPrompt(prompt) {
  return {
    id: prompt.id,
    promptText: prompt.prompt_text,
    responseText: prompt.response_text,
    platform: prompt.platform,
    model: prompt.model,
    timestamp: prompt.timestamp,
    date: prompt.timestamp ? new Date(prompt.timestamp * 1000).toISOString() : null
  };
}

const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
  });
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
