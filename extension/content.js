// Content script - Loads capture modules for ChatGPT

// Load ChatGPT capture module
const script = document.createElement('script');
script.src = chrome.runtime.getURL('chatgpt-capture.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Initialize message handler for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    sendResponse({
      url: window.location.href,
      title: document.title,
      platform: 'ChatGPT'
    });
  }
});
