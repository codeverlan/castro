// Castro IntakeQ Bridge - Popup Script

// DOM Elements
const noNoteState = document.getElementById('no-note');
const noteReadyState = document.getElementById('note-ready');
const errorState = document.getElementById('error');
const pasteBtn = document.getElementById('paste-btn');
const clearBtn = document.getElementById('clear-btn');
const retryBtn = document.getElementById('retry-btn');
const mappingsLink = document.getElementById('mappings-link');

// Note info elements
const clientNameEl = document.getElementById('client-name');
const dosEl = document.getElementById('dos');
const noteTypeEl = document.getElementById('note-type');
const sectionsEl = document.getElementById('sections');
const errorMessageEl = document.getElementById('error-message');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkPendingNote();
});

// Check if there's already a pending note
async function checkPendingNote() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_NOTE' });
    if (response.note) {
      showNoteReady(response.note);
    } else {
      showNoNote();
    }
  } catch (error) {
    showNoNote();
  }
}

// Show no note state
function showNoNote() {
  noNoteState.classList.remove('hidden');
  noteReadyState.classList.add('hidden');
  errorState.classList.add('hidden');
}

// Show note ready state
function showNoteReady(note) {
  noNoteState.classList.add('hidden');
  noteReadyState.classList.remove('hidden');
  errorState.classList.add('hidden');

  // Populate note info
  clientNameEl.textContent = note.client?.name || 'Unknown';
  dosEl.textContent = formatDate(note.dateOfService) || 'Not specified';
  noteTypeEl.textContent = note.noteType || 'Not specified';

  // Show sections
  if (note.sections && note.sections.length > 0) {
    const sectionNames = note.sections.map(s => s.name).join(', ');
    sectionsEl.textContent = `${note.sections.length} sections: ${sectionNames}`;
  } else {
    sectionsEl.textContent = 'No sections';
  }
}

// Show error state
function showError(message) {
  noNoteState.classList.add('hidden');
  noteReadyState.classList.add('hidden');
  errorState.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

// Validate Castro note payload
function validateNotePayload(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  if (!data.sessionId) {
    throw new Error('Missing session ID');
  }
  if (!data.sections || !Array.isArray(data.sections)) {
    throw new Error('Missing or invalid sections');
  }
  return true;
}

// Paste from clipboard
pasteBtn.addEventListener('click', async () => {
  try {
    // Read from clipboard
    const text = await navigator.clipboard.readText();

    if (!text) {
      showError('Clipboard is empty. Copy a note from Castro first.');
      return;
    }

    // Parse JSON
    let noteData;
    try {
      noteData = JSON.parse(text);
    } catch {
      showError('Clipboard does not contain valid Castro note data.');
      return;
    }

    // Validate
    try {
      validateNotePayload(noteData);
    } catch (e) {
      showError(`Invalid note data: ${e.message}`);
      return;
    }

    // Store in background
    await chrome.runtime.sendMessage({
      type: 'SET_PENDING_NOTE',
      data: noteData
    });

    // Update UI
    showNoteReady(noteData);

  } catch (error) {
    if (error.message.includes('clipboard')) {
      showError('Cannot access clipboard. Please allow clipboard permission.');
    } else {
      showError(`Error: ${error.message}`);
    }
  }
});

// Clear pending note
clearBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_NOTE' });
  showNoNote();
});

// Retry after error
retryBtn.addEventListener('click', () => {
  showNoNote();
});

// Open mappings page
mappingsLink.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({
    url: chrome.runtime.getURL('mapping/mapping.html')
  });
});
