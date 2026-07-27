// ChatGPT-specific prompt and response interception

class ChatGPTCapture {
  constructor() {
    this.lastCapturedPrompts = new Set();
    this.mutationObserver = null;
    this.initializeCapture();
  }

  initializeCapture() {
    // Set up mutation observer to monitor for new messages
    this.setupMutationObserver();
    // Also listen for dynamically added content
    this.setupMessageListener();
  }

  setupMutationObserver() {
    const config = {
      childList: true,
      subtree: true,
      characterData: true
    };

    this.mutationObserver = new MutationObserver(() => {
      this.captureMessages();
    });

    // Start observing the main content area
    const mainContainer = document.querySelector('[role="main"]') || document.querySelector('main') || document.body;
    if (mainContainer) {
      this.mutationObserver.observe(mainContainer, config);
    }
  }

  setupMessageListener() {
    // Listen for message containers being added to the DOM
    setInterval(() => {
      this.captureMessages();
    }, 500);
  }

  captureMessages() {
    const messages = this.getAllMessages();

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const promptText = this.extractPromptText(message);

      if (promptText && !this.lastCapturedPrompts.has(promptText)) {
        // Found a new prompt, now look for its response
        const response = this.findResponseAfter(messages, i);

        if (response) {
          const responseText = this.extractResponseText(response);
          const model = this.extractModelInfo();

          this.capturePromptResponse(promptText, responseText, model);
          this.lastCapturedPrompts.add(promptText);
        }
      }
    }
  }

  getAllMessages() {
    // Try multiple selectors to be compatible with different ChatGPT versions
    const selectors = [
      'div[data-message-id]',
      'div[data-testid*="message"]',
      '[role="article"]',
      'div.group.relative'
    ];

    let messages = [];
    for (const selector of selectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > messages.length) {
        messages = Array.from(found);
      }
    }

    return messages;
  }

  extractPromptText(messageElement) {
    // Check if this is a user message (prompt)
    const isUserMessage =
      messageElement.className.includes('group-user') ||
      messageElement.className.includes('from-user') ||
      messageElement.querySelector('[data-testid*="user"]') ||
      messageElement.textContent.match(/You\s*$/);

    if (!isUserMessage) {
      return null;
    }

    // Extract text from message content
    const textElement = messageElement.querySelector('[data-testid*="content"], .prose, p, div[role="paragraph"]');
    if (textElement) {
      return textElement.textContent.trim();
    }

    // Fallback: get all text from the message
    const text = messageElement.textContent.trim();
    return text.length > 0 ? text : null;
  }

  extractResponseText(messageElement) {
    // Extract text from assistant response
    const textElements = messageElement.querySelectorAll('p, div[role="paragraph"], .prose *');
    let responseText = '';

    for (const elem of textElements) {
      if (elem.nodeType === Node.TEXT_NODE || elem.children.length === 0) {
        responseText += (elem.textContent || '') + ' ';
      }
    }

    return responseText.trim() || messageElement.textContent.trim();
  }

  findResponseAfter(messages, promptIndex) {
    // Look for the assistant's response after this prompt
    for (let i = promptIndex + 1; i < messages.length; i++) {
      const candidate = messages[i];

      // Check if this looks like an assistant response
      if (this.isAssistantMessage(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  isAssistantMessage(messageElement) {
    // Check various indicators that this is an assistant message
    return (
      messageElement.className.includes('group-assistant') ||
      messageElement.className.includes('from-assistant') ||
      messageElement.querySelector('[data-testid*="assistant"]') ||
      messageElement.querySelector('button[aria-label*="Copy"]') || // Copy button typically on assistant messages
      messageElement.textContent.includes('ChatGPT') ||
      !messageElement.className.includes('from-user')
    );
  }

  extractModelInfo() {
    // Try to find model name from UI
    const modelSelectors = [
      '[data-testid*="model"]',
      'span:contains("GPT")',
      'button:contains("GPT")'
    ];

    for (const selector of modelSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(/GPT-[\d\.]+|GPT|Claude|Gemini|Model/i);
        if (match) {
          return match[0];
        }
      }
    }

    // Look in more general text
    const headerText = document.querySelector('header, nav, [role="banner"]')?.textContent || '';
    const match = headerText.match(/GPT-[\d\.]+|GPT-4|GPT-3.5|Claude|Gemini/i);

    return match ? match[0] : 'ChatGPT';
  }

  capturePromptResponse(promptText, responseText, model) {
    // Send to background worker
    chrome.runtime.sendMessage({
      type: 'CAPTURE_PROMPT',
      payload: {
        promptText,
        responseText,
        model
      }
    }, (response) => {
      if (response && response.success) {
        console.log('[Prompt Capture] Prompt captured successfully:', response.data.id);
      } else if (response && response.error) {
        console.error('[Prompt Capture] Error:', response.error);
      }
    });
  }

  stop() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chatgptCapture = new ChatGPTCapture();
  });
} else {
  window.chatgptCapture = new ChatGPTCapture();
}
