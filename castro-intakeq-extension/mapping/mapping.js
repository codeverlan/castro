// Castro IntakeQ Bridge - Field Mapping Configuration

// DOM Elements
const mappingsList = document.getElementById('mappings-list');
const mappingForm = document.getElementById('mapping-form');
const noteTypeInput = document.getElementById('note-type');
const urlPatternInput = document.getElementById('url-pattern');
const fieldMappingsContainer = document.getElementById('field-mappings');
const addFieldBtn = document.getElementById('add-field-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

// Castro section names (typical clinical note sections)
const castroSections = [
  'Subjective',
  'Objective',
  'Assessment',
  'Plan',
  'Presenting Problem',
  'Interventions',
  'Client Response',
  'Goals Progress',
  'Safety Assessment',
  'Next Steps',
  'Session Summary'
];

// Field types
const fieldTypes = [
  { value: 'textarea', label: 'Text Area' },
  { value: 'text', label: 'Text Input' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' }
];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadMappings();
  addFieldMappingRow(); // Start with one row
});

// Load existing mappings
async function loadMappings() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
    const mappings = response.mappings || [];
    renderMappingsList(mappings);
  } catch (error) {
    console.error('Error loading mappings:', error);
  }
}

// Render mappings list
function renderMappingsList(mappings) {
  if (mappings.length === 0) {
    mappingsList.innerHTML = '<p class="empty-state">No mappings configured yet</p>';
    return;
  }

  mappingsList.innerHTML = mappings.map((mapping, index) => `
    <div class="mapping-card" data-index="${index}">
      <div class="mapping-card-header">
        <span class="mapping-card-title">${escapeHtml(mapping.noteTypeName)}</span>
        <div class="mapping-card-actions">
          <button class="edit" data-index="${index}">Edit</button>
          <button class="delete" data-index="${index}">Delete</button>
        </div>
      </div>
      <div class="mapping-fields">
        ${mapping.mappings.map(m => `
          <div class="mapping-field-row">
            <span class="section-name">${escapeHtml(m.castroSection)}</span>
            <span class="arrow">→</span>
            <span class="selector">${escapeHtml(m.intakeqSelector)}</span>
            <span class="field-type">${m.fieldType}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add event listeners
  mappingsList.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', () => editMapping(parseInt(btn.dataset.index)));
  });

  mappingsList.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => deleteMapping(parseInt(btn.dataset.index)));
  });
}

// Add field mapping row
function addFieldMappingRow(data = {}) {
  const row = document.createElement('div');
  row.className = 'field-mapping-row';
  row.innerHTML = `
    <select class="castro-section" required>
      <option value="">Select Section</option>
      ${castroSections.map(s => `
        <option value="${s}" ${data.castroSection === s ? 'selected' : ''}>${s}</option>
      `).join('')}
    </select>
    <input type="text" class="intakeq-selector" placeholder="#field-id or [name='field']"
           value="${escapeHtml(data.intakeqSelector || '')}" required>
    <select class="field-type" required>
      ${fieldTypes.map(t => `
        <option value="${t.value}" ${data.fieldType === t.value ? 'selected' : ''}>${t.label}</option>
      `).join('')}
    </select>
    <button type="button" class="remove-field-btn" title="Remove">×</button>
  `;

  row.querySelector('.remove-field-btn').addEventListener('click', () => {
    if (fieldMappingsContainer.children.length > 1) {
      row.remove();
    }
  });

  fieldMappingsContainer.appendChild(row);
}

addFieldBtn.addEventListener('click', () => addFieldMappingRow());

// Form submission
mappingForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const mapping = {
    id: Date.now().toString(),
    noteTypeName: noteTypeInput.value.trim(),
    urlPattern: urlPatternInput.value.trim() || null,
    mappings: []
  };

  // Collect field mappings
  const rows = fieldMappingsContainer.querySelectorAll('.field-mapping-row');
  for (const row of rows) {
    const castroSection = row.querySelector('.castro-section').value;
    const intakeqSelector = row.querySelector('.intakeq-selector').value.trim();
    const fieldType = row.querySelector('.field-type').value;

    if (castroSection && intakeqSelector) {
      mapping.mappings.push({ castroSection, intakeqSelector, fieldType });
    }
  }

  if (mapping.mappings.length === 0) {
    alert('Please add at least one field mapping');
    return;
  }

  // Save mapping
  try {
    await chrome.runtime.sendMessage({
      type: 'SAVE_FIELD_MAPPING',
      mapping
    });

    // Reset form
    mappingForm.reset();
    fieldMappingsContainer.innerHTML = '';
    addFieldMappingRow();

    // Reload list
    await loadMappings();

    alert('Mapping saved successfully!');
  } catch (error) {
    alert('Error saving mapping: ' + error.message);
  }
});

// Edit mapping
async function editMapping(index) {
  const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
  const mappings = response.mappings || [];
  const mapping = mappings[index];

  if (!mapping) return;

  // Populate form
  noteTypeInput.value = mapping.noteTypeName;
  urlPatternInput.value = mapping.urlPattern || '';

  // Clear and populate field mappings
  fieldMappingsContainer.innerHTML = '';
  for (const m of mapping.mappings) {
    addFieldMappingRow(m);
  }

  // Scroll to form
  mappingForm.scrollIntoView({ behavior: 'smooth' });
}

// Delete mapping
async function deleteMapping(index) {
  if (!confirm('Are you sure you want to delete this mapping?')) return;

  const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
  const mappings = response.mappings || [];
  mappings.splice(index, 1);

  await chrome.storage.local.set({ fieldMappings: mappings });
  await loadMappings();
}

// Export mappings
exportBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
  const mappings = response.mappings || [];

  const blob = new Blob([JSON.stringify(mappings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'castro-intakeq-mappings.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Import mappings
importBtn.addEventListener('click', (e) => {
  e.preventDefault();
  importFile.click();
});

importFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const imported = JSON.parse(text);

    if (!Array.isArray(imported)) {
      throw new Error('Invalid format');
    }

    // Merge with existing
    const response = await chrome.runtime.sendMessage({ type: 'GET_FIELD_MAPPINGS' });
    const existing = response.mappings || [];

    // Add imported mappings (replace if same noteTypeName)
    for (const mapping of imported) {
      const existingIndex = existing.findIndex(m => m.noteTypeName === mapping.noteTypeName);
      if (existingIndex >= 0) {
        existing[existingIndex] = mapping;
      } else {
        existing.push(mapping);
      }
    }

    await chrome.storage.local.set({ fieldMappings: existing });
    await loadMappings();

    alert(`Imported ${imported.length} mapping(s)`);
  } catch (error) {
    alert('Error importing mappings: ' + error.message);
  }

  importFile.value = '';
});

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
