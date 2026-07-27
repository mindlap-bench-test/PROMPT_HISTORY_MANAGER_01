// Background service worker - Handles message passing and storage

const STORAGE_KEY = 'captured_prompts';

// Add a new prompt capture
async function addPrompt(promptData) {
  const prompts = await getPrompts();
  const capturedPrompt = {
    id: Date.now(),
    promptText: promptData.promptText,
    responseText: promptData.responseText,
    platform: 'ChatGPT',
    model: promptData.model || 'unknown',
    timestamp: Math.floor(Date.now() / 1000),
    capturedAt: new Date().toISOString()
  };
  prompts.push(capturedPrompt);
  await chrome.storage.local.set({ [STORAGE_KEY]: prompts });
  return capturedPrompt;
}

// Get all stored prompts
async function getPrompts() {
  const result = await chrome.storage.local.get([STORAGE_KEY]);
  return result[STORAGE_KEY] || [];
}

// Delete a prompt by ID
async function deletePrompt(id) {
  const prompts = await getPrompts();
  const filtered = prompts.filter(p => p.id !== id);
  await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_PROMPT') {
    handlePromptCapture(message.payload, sendResponse);
  } else if (message.type === 'GET_PROMPTS') {
    handleGetPrompts(sendResponse);
  } else if (message.type === 'DELETE_PROMPT') {
    handleDeletePrompt(message.payload.id, sendResponse);
  }
});

async function handlePromptCapture(payload, sendResponse) {
  try {
    const captured = await addPrompt({
      promptText: payload.promptText,
      responseText: payload.responseText,
      model: payload.model
    });
    sendResponse({ success: true, data: captured });
  } catch (error) {
    console.error('Error capturing prompt:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetPrompts(sendResponse) {
  try {
    const prompts = await getPrompts();
    sendResponse({ success: true, data: prompts });
  } catch (error) {
    console.error('Error retrieving prompts:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleDeletePrompt(id, sendResponse) {
  try {
    await deletePrompt(id);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    sendResponse({ success: false, error: error.message });
  }
}
