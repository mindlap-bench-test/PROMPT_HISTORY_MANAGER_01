# Prompt History Manager

A complete system for capturing, storing, and searching ChatGPT prompts and responses.

## Components

### 1. **ChatGPT Capture Extension** (`/extension`)
Browser extension that automatically captures prompts and responses from ChatGPT.

- **Real-time capture** via DOM monitoring
- **Local storage** persistence using chrome.storage.local
- **Popup UI** for viewing recent captures
- **Metadata extraction** (platform, model, timestamp)

**Installation:** Load unpacked from the `extension/` directory in Chrome/Edge Developer Mode

[See Extension README](./extension/README.md)

### 2. **Backend API & Dashboard** (`/public`, `server.js`, `database.js`)
Express server with SQLite database and React dashboard for searching and managing prompts.

- **Full-text search** via FTS5 virtual table
- **REST API** for prompt operations (GET, POST, DELETE)
- **Dashboard UI** with search, sorting, and metadata display
- **Sample data** endpoint for testing

**Setup:**
```bash
npm install
npm start  # Runs on http://localhost:3000
```

[See IMPLEMENTATION.md](./IMPLEMENTATION.md) for detailed API documentation

## System Architecture

```
┌─────────────────────────────┐
│   ChatGPT Extension         │
│   (Browser - story #7)      │
├─────────────────────────────┤
│ Capture prompts + responses │
│ Store in chrome.storage     │
│ Send to API (future)        │
└──────────────┬──────────────┘
               │ HTTP POST
               ▼
┌─────────────────────────────┐
│   Express API Server        │
│   (Node.js - story #5)      │
├─────────────────────────────┤
│ POST   /api/prompts         │
│ GET    /api/prompts         │
│ GET    /api/search          │
│ DELETE /api/prompts/:id     │
└──────────────┬──────────────┘
               │ SQL
               ▼
┌─────────────────────────────┐
│   SQLite Database (FTS5)    │
│   (story #5)                │
├─────────────────────────────┤
│ Full-text search index      │
│ Prompt and response storage │
└─────────────────────────────┘
               ▲
               │ HTTP GET
┌──────────────┴──────────────┐
│   React Dashboard           │
│   (Browser - story #5)      │
├─────────────────────────────┤
│ Search prompts              │
│ View with metadata          │
│ Sort by date                │
└─────────────────────────────┘
```

## Quick Start

### Development Setup

1. **Start the backend:**
   ```bash
   npm install
   npm start
   ```
   Backend runs at `http://localhost:3000`

2. **Load the extension:**
   - Open `chrome://extensions/`
   - Enable Developer Mode
   - Click "Load unpacked"
   - Select the `extension/` directory

3. **Visit ChatGPT:**
   - Go to https://chatgpt.com
   - Start a conversation
   - Prompts are automatically captured to chrome.storage.local
   - Click extension icon to view captures

4. **View in Dashboard:**
   - Open `http://localhost:3000` in your browser
   - Use the search interface (currently shows seeded sample data)
   - To sync extension data, extension would POST captures to `/api/prompts`

## Stories & Progress

- **Story #5**: Dashboard & Backend API - ✅ Complete
- **Story #6**: Browser Extension Scaffold - (foundation)
- **Story #7**: ChatGPT Prompt Capture - ✅ Complete

## Data Flow

1. **Capture Phase** (Extension)
   - User interacts with ChatGPT
   - Extension DOM observer detects new messages
   - Extracts prompt text and response text
   - Metadata: platform='ChatGPT', model, timestamp
   - Stores to chrome.storage.local

2. **Sync Phase** (Future Enhancement)
   - Extension would POST captures to `/api/prompts`
   - Backend stores in SQLite database
   - Makes data persistent across browsers/devices

3. **Retrieval Phase** (Dashboard)
   - User searches via dashboard
   - Query goes to `/api/search`
   - Results returned with full metadata
   - Can be sorted by date

## Storage Format

### Extension (chrome.storage.local)
```json
{
  "captured_prompts": [
    {
      "id": 1234567890,
      "promptText": "What is AI?",
      "responseText": "Artificial Intelligence is...",
      "platform": "ChatGPT",
      "model": "GPT-4",
      "timestamp": 1234567890,
      "capturedAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

### Database (prompts table)
```sql
CREATE TABLE prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  platform TEXT,
  model TEXT,
  timestamp INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Testing

### Extension Tests
```bash
node extension/tests.js
```

Verifies:
- Storage operations (add, retrieve, delete)
- Message format and validation
- Metadata preservation
- Timestamp formatting

### Backend Tests
```bash
npm test
```

Verifies:
- Full-text search functionality
- Database operations
- API response formats
- Metadata preservation

## Known Limitations

1. **Extension**: ChatGPT UI selectors may need adjustment if UI changes
2. **Extension**: Model detection is heuristic-based
3. **Dashboard**: Currently shows seeded data (extension sync not implemented)
4. **Platforms**: Only ChatGPT supported (other platforms would need separate capture modules)

## Next Steps

- [ ] Implement extension → API sync (POST captures to `/api/prompts`)
- [ ] Test end-to-end flow
- [ ] Add support for other AI platforms
- [ ] Implement deduplication logic
- [ ] Add organization and tagging features
- [ ] Build analytics dashboard

## Documentation

- [Extension README](./extension/README.md) - Detailed extension docs
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - API and backend documentation
- [extension/tests.js](./extension/tests.js) - Unit tests