// Castro IntakeQ Bridge - Content Script
// Runs on IntakeQ pages to detect note forms and fill fields

// State
let pendingNote = null;
let overlay = null;

// Initialize when DOM is ready
init();

async function init() {
  // Check if there's a pending note
  await checkForPendingNote();

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NOTE_READY') {
      pendingNote = message.note;
      showOverlay();
      sendResponse({ success: true });
    }
    return true;
  });
}

// Check for pending note from background
async function checkForPendingNote() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_PENDING_NOTE' });
    if (response.note) {
      pendingNote = response.note;
      showOverlay();
    }
  } catch (error) {
    console.log('Castro Bridge: No pending note');
  }
}

// Create and show the overlay
function showOverlay() {
  if (!pendingNote) return;

  // Remove existing overlay if present
  removeOverlay();

  // Create overlay container
  overlay = document.createElement('div');
  overlay.id = 'castro-bridge-overlay';
  overlay.innerHTML = `
    <div class="castro-overlay-header">
      <span class="castro-logo">🔗</span>
      <span class="castro-title">Castro Note Ready</span>
      <button class="castro-close-btn" title="Close">×</button>
    </div>
    <div class="castro-overlay-content">
      <div class="castro-info">
        <strong>${escapeHtml(pendingNote.client?.name || 'Unknown Client')}</strong>
        <span class="castro-dos">${pendingNote.dateOfService || 'No DOS'}</span>
      </div>
      <div class="castro-warning">
        ⚠️ Verify this is the correct note before filling
      </div>
      <div class="castro-actions">
        <button class="castro-btn castro-btn-primary" id="castro-fill-btn">
          Fill Fields
        </button>
        <button class="castro-btn castro-btn-secondary" id="castro-cancel-btn">
          Cancel
        </button>
      </div>
    </div>
    <div class="castro-overlay-footer">
      <span id="castro-status"></span>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add event listeners
  overlay.querySelector('.castro-close-btn').addEventListener('click', removeOverlay);
  overlay.querySelector('#castro-cancel-btn').addEventListener('click', handleCancel);
  overlay.querySelector('#castro-fill-btn').addEventListener('click', handleFill);
}

// Remove overlay
function removeOverlay() {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
    overlay = null;
  }
}

// Handle cancel
async function handleCancel() {
  await chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_NOTE' });
  pendingNote = null;
  removeOverlay();
}

// Handle fill
async function handleFill() {
  const statusEl = document.getElementById('castro-status');
  const fillBtn = document.getElementById('castro-fill-btn');

  try {
    fillBtn.disabled = true;
    statusEl.textContent = 'Loading field mappings...';

    // Get field mappings
    const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
    const mappings = response.mappings || [];

    // Find matching mapping for this note type
    const mapping = mappings.find(m =>
      m.noteTypeName === pendingNote.noteType ||
      (m.urlPattern && new RegExp(m.urlPattern).test(window.location.href))
    );

    if (!mapping) {
      statusEl.textContent = 'No field mapping found for this note type. Configure in extension.';
      fillBtn.disabled = false;
      return;
    }

    statusEl.textContent = 'Filling fields...';

    // Fill each mapped field
    let filledCount = 0;
    let errorCount = 0;

    for (const fieldMap of mapping.mappings) {
      const section = pendingNote.sections.find(s => s.name === fieldMap.castroSection);
      if (!section) continue;

      try {
        const filled = fillField(fieldMap.intakeqSelector, section.content, fieldMap.fieldType);
        if (filled) {
          filledCount++;
          // Show confidence badge
          showConfidenceBadge(fieldMap.intakeqSelector, section.confidence);
        }
      } catch (e) {
        console.error('Error filling field:', fieldMap, e);
        errorCount++;
      }
    }

    statusEl.textContent = `Filled ${filledCount} fields` + (errorCount > 0 ? ` (${errorCount} errors)` : '');

    // Clear pending note after successful fill
    if (filledCount > 0 && errorCount === 0) {
      setTimeout(async () => {
        await chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_NOTE' });
        pendingNote = null;
        removeOverlay();
      }, 2000);
    } else {
      fillBtn.disabled = false;
    }

  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
    fillBtn.disabled = false;
  }
}

// Fill a single field
function fillField(selector, content, fieldType) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn('Element not found:', selector);
    return false;
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      element.value = content;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;

    case 'richtext':
      // Handle rich text editors (Quill, etc.)
      if (element.classList.contains('ql-editor') || element.contentEditable === 'true') {
        element.innerHTML = content;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
      // Try as regular input
      element.value = content;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;

    case 'select':
      // Try to find matching option
      const option = Array.from(element.options).find(opt =>
        opt.text.toLowerCase().includes(content.toLowerCase()) ||
        opt.value.toLowerCase() === content.toLowerCase()
      );
      if (option) {
        element.value = option.value;
        element.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;

    case 'checkbox':
      const shouldCheck = content.toLowerCase() === 'true' || content === '1' || content.toLowerCase() === 'yes';
      element.checked = shouldCheck;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;

    default:
      element.value = content;
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
  }
}

// Show confidence badge next to field
function showConfidenceBadge(selector, confidence) {
  const element = document.querySelector(selector);
  if (!element) return;

  // Remove existing badge
  const existingBadge = element.parentNode.querySelector('.castro-confidence-badge');
  if (existingBadge) existingBadge.remove();

  // Create badge
  const badge = document.createElement('span');
  badge.className = 'castro-confidence-badge';

  if (confidence >= 80) {
    badge.classList.add('castro-confidence-high');
    badge.textContent = `✓ ${confidence}%`;
  } else if (confidence >= 60) {
    badge.classList.add('castro-confidence-medium');
    badge.textContent = `⚠ ${confidence}%`;
  } else {
    badge.classList.add('castro-confidence-low');
    badge.textContent = `⚠ ${confidence}%`;
  }

  // Insert after element
  element.parentNode.insertBefore(badge, element.nextSibling);
}

// Escape HTML for safe display
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
