// Popup UI controller

const STORAGE_KEY = 'captured_prompts';

document.addEventListener('DOMContentLoaded', async () => {
  await loadPrompts();
  setupEventListeners();
});

async function loadPrompts() {
  try {
    // Get prompts from storage
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const prompts = result[STORAGE_KEY] || [];

    const container = document.getElementById('prompts-container');
    const emptyState = document.getElementById('empty-state');
    const promptCount = document.getElementById('prompt-count');

    promptCount.textContent = prompts.length;

    if (prompts.length === 0) {
      container.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = '';

    // Display prompts in reverse order (newest first)
    const sortedPrompts = [...prompts].reverse();

    for (const prompt of sortedPrompts) {
      const item = createPromptElement(prompt);
      container.appendChild(item);
    }
  } catch (error) {
    console.error('Error loading prompts:', error);
    document.getElementById('prompts-container').innerHTML =
      '<div class="prompt-item" style="color: red;">Error loading prompts</div>';
  }
}

function createPromptElement(prompt) {
  const div = document.createElement('div');
  div.className = 'prompt-item';

  const date = new Date(prompt.capturedAt || prompt.timestamp * 1000);
  const formattedDate = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const promptPreview = prompt.promptText.substring(0, 150) + (prompt.promptText.length > 150 ? '...' : '');
  const responsePreview = (prompt.responseText || 'No response').substring(0, 80) + '...';

  div.innerHTML = `
    <div class="prompt-meta">
      <span class="badge">${prompt.platform || 'ChatGPT'}</span>
      <span class="badge model">${prompt.model || 'Unknown Model'}</span>
      <span class="timestamp">${formattedDate}</span>
    </div>
    <div class="prompt-text">${escapeHtml(promptPreview)}</div>
    <div class="response-preview">${escapeHtml(responsePreview)}</div>
    <div class="actions">
      <button class="btn-delete" data-id="${prompt.id}">Delete</button>
    </div>
  `;

  // Add delete handler
  div.querySelector('.btn-delete').addEventListener('click', async () => {
    await deletePrompt(prompt.id);
  });

  return div;
}

async function deletePrompt(id) {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const prompts = result[STORAGE_KEY] || [];
    const filtered = prompts.filter(p => p.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
    await loadPrompts();
  } catch (error) {
    console.error('Error deleting prompt:', error);
  }
}

function setupEventListeners() {
  document.getElementById('refresh-btn').addEventListener('click', loadPrompts);

  document.getElementById('clear-btn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all captured prompts?')) {
      try {
        await chrome.storage.local.set({ [STORAGE_KEY]: [] });
        await loadPrompts();
      } catch (error) {
        console.error('Error clearing prompts:', error);
      }
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
