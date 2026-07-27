// StorageManager - Manages persistent storage of captured prompts
class StorageManager {
  static STORAGE_KEY = 'captured_prompts';

  // Add a new prompt capture
  static async addPrompt(promptData) {
    const prompts = await this.getPrompts();

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
    await chrome.storage.local.set({ [this.STORAGE_KEY]: prompts });
    return capturedPrompt;
  }

  // Get all stored prompts
  static async getPrompts() {
    const result = await chrome.storage.local.get([this.STORAGE_KEY]);
    return result[this.STORAGE_KEY] || [];
  }

  // Get a single prompt by ID
  static async getPrompt(id) {
    const prompts = await this.getPrompts();
    return prompts.find(p => p.id === id);
  }

  // Delete a prompt by ID
  static async deletePrompt(id) {
    const prompts = await this.getPrompts();
    const filtered = prompts.filter(p => p.id !== id);
    await chrome.storage.local.set({ [this.STORAGE_KEY]: filtered });
  }

  // Clear all prompts
  static async clearAll() {
    await chrome.storage.local.set({ [this.STORAGE_KEY]: [] });
  }

  // Get prompt count
  static async getCount() {
    const prompts = await this.getPrompts();
    return prompts.length;
  }

  // Export all prompts as JSON
  static async exportJSON() {
    const prompts = await this.getPrompts();
    return JSON.stringify(prompts, null, 2);
  }
}
