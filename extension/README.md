# ChatGPT Prompt Capture Extension

A browser extension that captures prompts and responses from ChatGPT in real-time.

## Features

- **Real-time Capture**: Automatically captures prompts and responses as you use ChatGPT
- **Persistent Storage**: Stores captured data locally in browser storage
- **Popup Interface**: Quick view of recent captures with metadata (platform, model, timestamp)
- **Easy Management**: Delete individual prompts or clear all at once
- **Metadata Extraction**: Automatically captures model information and timestamps

## Installation

### Development Mode (Chrome/Edge)

1. Clone or download this extension directory
2. Open your browser and navigate to the extensions page:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension directory
6. The extension should now appear in your extensions list

### Usage

1. Visit [ChatGPT](https://chatgpt.com) or [Chat.OpenAI.com](https://chat.openai.com)
2. Start asking questions or having conversations
3. The extension automatically captures each prompt and response
4. Click the extension icon in your toolbar to view captured prompts
5. See metadata like platform, model, and timestamp for each capture

## Architecture

### Files

- **manifest.json** - Extension configuration and permissions
- **background.js** - Service worker handling message passing and storage
- **content.js** - Content script that loads the capture module
- **chatgpt-capture.js** - ChatGPT-specific DOM monitoring and extraction logic
- **popup.html** - UI for viewing captured prompts
- **popup.js** - Popup interface logic
- **storage.js** - Utility class for storage operations
- **tests.js** - Unit tests for storage and message formats

### Data Flow

```
ChatGPT Page
    ↓
chatgpt-capture.js (DOM observer, monitors for new messages)
    ↓
chrome.runtime.sendMessage() (sends to background worker)
    ↓
background.js (receives, validates, stores)
    ↓
chrome.storage.local (persistent storage)
    ↓
popup.js (displays in popup when requested)
```

## Storage Format

Each captured prompt is stored with the following structure:

```json
{
  "id": 1234567890,
  "promptText": "What is machine learning?",
  "responseText": "Machine learning is...",
  "platform": "ChatGPT",
  "model": "GPT-4",
  "timestamp": 1234567890,
  "capturedAt": "2024-01-15T14:30:00.000Z"
}
```

### Fields

- **id**: Unique identifier (Unix milliseconds timestamp)
- **promptText**: The user's prompt/question
- **responseText**: ChatGPT's response
- **platform**: Always "ChatGPT" for this extension
- **model**: Detected model name (e.g., "GPT-4", "GPT-3.5", "unknown")
- **timestamp**: Unix epoch seconds
- **capturedAt**: ISO 8601 formatted timestamp

## Permissions

The extension requires:

- **storage**: Access to store captured prompts locally
- **scripting**: To inject capture logic into ChatGPT pages
- **host_permissions**: Access to chatgpt.com, www.chatgpt.com, and chat.openai.com

## Testing

Tests are included in `tests.js` and verify:

- Storage operations (add, retrieve, delete)
- Message format validation
- Metadata preservation
- Timestamp formatting
- Platform identification

To run tests:
```bash
node tests.js
```

## Known Limitations

- **DOM Selectors**: ChatGPT's UI structure changes frequently; some selectors may need adjustment
- **Model Detection**: Model detection is heuristic-based and may not always be 100% accurate
- **Partial Responses**: If ChatGPT is still generating a response when the page closes, the partial response is captured
- **Single Platform**: Currently only captures from ChatGPT (other AI platforms would require additional platform-specific modules)

## Future Enhancements

- [ ] Sync with backend API for cloud storage
- [ ] Search and filter captured prompts
- [ ] Export prompts to file (JSON, CSV, PDF)
- [ ] Tagging and organization
- [ ] Deduplication of similar prompts
- [ ] Analytics and statistics
- [ ] Support for other AI platforms

## Development

### Adding Support for New Platforms

1. Create a new platform module (e.g., `claude-capture.js`)
2. Implement DOM monitoring and extraction logic
3. Send captured data using the same message format
4. Update `manifest.json` with the platform's URLs
5. Update `content.js` to load the new module

### Debugging

Enable extension debugging:
1. Right-click the extension icon
2. Select "Inspect popup" or "Inspect views"
3. Check the console for capture logs

The extension logs successful captures to the console:
```
[Prompt Capture] Prompt captured successfully: 1234567890
```

## License

ISC

## Support

For issues or feature requests, check the project repository or contact the maintainers.
