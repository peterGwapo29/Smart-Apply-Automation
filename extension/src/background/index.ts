// Background Service Worker for JobStreet Quick Apply
chrome.runtime.onInstalled.addListener(() => {
  console.log('[JobStreet Quick Apply] Service Worker initialized successfully.');
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
  }
  return true;
});
