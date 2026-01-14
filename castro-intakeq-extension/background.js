// Castro IntakeQ Bridge - Background Service Worker

// Store for pending note data
let pendingNote = null;

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'SET_PENDING_NOTE':
      // Store note data from popup (after clipboard paste)
      pendingNote = message.data;
      // Notify all IntakeQ tabs that a note is ready
      notifyIntakeQTabs();
      sendResponse({ success: true });
      break;

    case 'GET_PENDING_NOTE':
      // Content script requesting current note data
      sendResponse({ note: pendingNote });
      break;

    case 'CLEAR_PENDING_NOTE':
      // Clear after successful fill
      pendingNote = null;
      sendResponse({ success: true });
      break;

    case 'GET_FIELD_MAPPINGS':
      // Get stored field mappings
      chrome.storage.local.get(['fieldMappings'], (result) => {
        sendResponse({ mappings: result.fieldMappings || [] });
      });
      return true; // Keep channel open for async response

    case 'SAVE_FIELD_MAPPING':
      // Save a new field mapping
      chrome.storage.local.get(['fieldMappings'], (result) => {
        const mappings = result.fieldMappings || [];
        const existingIndex = mappings.findIndex(m => m.noteTypeName === message.mapping.noteTypeName);
        if (existingIndex >= 0) {
          mappings[existingIndex] = message.mapping;
        } else {
          mappings.push(message.mapping);
        }
        chrome.storage.local.set({ fieldMappings: mappings }, () => {
          sendResponse({ success: true });
        });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Notify all IntakeQ tabs that a note is ready
async function notifyIntakeQTabs() {
  const tabs = await chrome.tabs.query({
    url: ['https://intakeq.com/*', 'https://*.intakeq.com/*']
  });

  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'NOTE_READY',
        note: pendingNote
      });
    } catch (e) {
      // Tab might not have content script loaded yet
      console.log('Could not notify tab:', tab.id);
    }
  }
}

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Castro IntakeQ Bridge installed');
    // Initialize empty mappings
    chrome.storage.local.set({ fieldMappings: [] });
  } else if (details.reason === 'update') {
    console.log('Castro IntakeQ Bridge updated to', chrome.runtime.getManifest().version);
  }
});
