/**
 * Castro IntakeQ Bridge - Field Mapping Configuration Unit Tests
 *
 * Tests for mapping.js field mapping logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Set up JSDOM for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const { document } = dom.window

// Castro section names (from mapping.js)
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
  'Session Summary',
]

// Field types (from mapping.js)
const fieldTypes = [
  { value: 'textarea', label: 'Text Area' },
  { value: 'text', label: 'Text Input' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
]

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Mapping data structure
 */
interface FieldMapping {
  castroSection: string
  intakeqSelector: string
  fieldType: string
}

interface NoteTypeMapping {
  id: string
  noteTypeName: string
  urlPattern?: string | null
  mappings: FieldMapping[]
}

/**
 * Validate mapping before save
 */
function validateMapping(mapping: NoteTypeMapping): {
  valid: boolean
  error?: string
} {
  if (!mapping.noteTypeName || mapping.noteTypeName.trim() === '') {
    return { valid: false, error: 'Note type name is required' }
  }

  if (!mapping.mappings || mapping.mappings.length === 0) {
    return { valid: false, error: 'At least one field mapping is required' }
  }

  for (const fieldMap of mapping.mappings) {
    if (!fieldMap.castroSection) {
      return { valid: false, error: 'Castro section is required for all mappings' }
    }
    if (!fieldMap.intakeqSelector || fieldMap.intakeqSelector.trim() === '') {
      return { valid: false, error: 'IntakeQ selector is required for all mappings' }
    }
  }

  return { valid: true }
}

/**
 * Build field mapping row HTML
 */
function buildFieldMappingRowHtml(data: Partial<FieldMapping> = {}): string {
  const sectionOptions = castroSections
    .map(
      (s) =>
        `<option value="${s}" ${data.castroSection === s ? 'selected' : ''}>${s}</option>`
    )
    .join('')

  const typeOptions = fieldTypes
    .map(
      (t) =>
        `<option value="${t.value}" ${data.fieldType === t.value ? 'selected' : ''}>${t.label}</option>`
    )
    .join('')

  return `
    <select class="castro-section" required>
      <option value="">Select Section</option>
      ${sectionOptions}
    </select>
    <input type="text" class="intakeq-selector" placeholder="#field-id or [name='field']"
           value="${escapeHtml(data.intakeqSelector || '')}" required>
    <select class="field-type" required>
      ${typeOptions}
    </select>
    <button type="button" class="remove-field-btn" title="Remove">×</button>
  `
}

/**
 * Build mapping card HTML
 */
function buildMappingCardHtml(mapping: NoteTypeMapping, index: number): string {
  const mappingFields = mapping.mappings
    .map(
      (m) => `
      <div class="mapping-field-row">
        <span class="section-name">${escapeHtml(m.castroSection)}</span>
        <span class="arrow">→</span>
        <span class="selector">${escapeHtml(m.intakeqSelector)}</span>
        <span class="field-type">${m.fieldType}</span>
      </div>
    `
    )
    .join('')

  return `
    <div class="mapping-card" data-index="${index}">
      <div class="mapping-card-header">
        <span class="mapping-card-title">${escapeHtml(mapping.noteTypeName)}</span>
        <div class="mapping-card-actions">
          <button class="edit" data-index="${index}">Edit</button>
          <button class="delete" data-index="${index}">Delete</button>
        </div>
      </div>
      <div class="mapping-fields">
        ${mappingFields}
      </div>
    </div>
  `
}

describe('Mapping - escapeHtml', () => {
  it('should return empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('should return empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('should return empty string for empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should escape HTML special characters', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('should handle CSS selectors safely', () => {
    expect(escapeHtml('#field-id')).toBe('#field-id')
    expect(escapeHtml('[name="field"]')).toBe('[name="field"]')
  })
})

describe('Mapping - Castro Sections', () => {
  it('should include all SOAP sections', () => {
    expect(castroSections).toContain('Subjective')
    expect(castroSections).toContain('Objective')
    expect(castroSections).toContain('Assessment')
    expect(castroSections).toContain('Plan')
  })

  it('should include other clinical sections', () => {
    expect(castroSections).toContain('Presenting Problem')
    expect(castroSections).toContain('Interventions')
    expect(castroSections).toContain('Client Response')
    expect(castroSections).toContain('Goals Progress')
    expect(castroSections).toContain('Safety Assessment')
    expect(castroSections).toContain('Next Steps')
    expect(castroSections).toContain('Session Summary')
  })

  it('should have 11 sections total', () => {
    expect(castroSections).toHaveLength(11)
  })
})

describe('Mapping - Field Types', () => {
  it('should include all expected field types', () => {
    const values = fieldTypes.map((t) => t.value)
    expect(values).toContain('textarea')
    expect(values).toContain('text')
    expect(values).toContain('richtext')
    expect(values).toContain('select')
    expect(values).toContain('checkbox')
  })

  it('should have labels for all types', () => {
    for (const type of fieldTypes) {
      expect(type.label).toBeDefined()
      expect(type.label.length).toBeGreaterThan(0)
    }
  })

  it('should have 5 field types', () => {
    expect(fieldTypes).toHaveLength(5)
  })
})

describe('Mapping - validateMapping', () => {
  it('should fail for empty note type name', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: '',
      mappings: [{ castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Note type name is required')
  })

  it('should fail for whitespace-only note type name', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: '   ',
      mappings: [{ castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Note type name is required')
  })

  it('should fail for empty mappings array', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: 'Progress Note',
      mappings: [],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('At least one field mapping is required')
  })

  it('should fail for missing castro section', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: 'Progress Note',
      mappings: [{ castroSection: '', intakeqSelector: '#subj', fieldType: 'textarea' }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Castro section is required for all mappings')
  })

  it('should fail for missing intakeq selector', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: 'Progress Note',
      mappings: [{ castroSection: 'Subjective', intakeqSelector: '', fieldType: 'textarea' }],
    })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('IntakeQ selector is required for all mappings')
  })

  it('should pass for valid mapping', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: 'Progress Note',
      mappings: [
        { castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' },
        { castroSection: 'Objective', intakeqSelector: '#obj', fieldType: 'text' },
      ],
    })
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should pass with optional urlPattern', () => {
    const result = validateMapping({
      id: '1',
      noteTypeName: 'Progress Note',
      urlPattern: '/notes/progress/',
      mappings: [{ castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' }],
    })
    expect(result.valid).toBe(true)
  })
})

describe('Mapping - buildFieldMappingRowHtml', () => {
  it('should build HTML with empty data', () => {
    const html = buildFieldMappingRowHtml()
    expect(html).toContain('castro-section')
    expect(html).toContain('intakeq-selector')
    expect(html).toContain('field-type')
    expect(html).toContain('Select Section')
  })

  it('should include all castro sections as options', () => {
    const html = buildFieldMappingRowHtml()
    for (const section of castroSections) {
      expect(html).toContain(`<option value="${section}"`)
    }
  })

  it('should include all field types as options', () => {
    const html = buildFieldMappingRowHtml()
    for (const type of fieldTypes) {
      expect(html).toContain(`<option value="${type.value}"`)
      expect(html).toContain(type.label)
    }
  })

  it('should pre-select castro section when provided', () => {
    const html = buildFieldMappingRowHtml({ castroSection: 'Objective' })
    expect(html).toContain('<option value="Objective" selected>')
  })

  it('should pre-select field type when provided', () => {
    const html = buildFieldMappingRowHtml({ fieldType: 'richtext' })
    expect(html).toContain('<option value="richtext" selected>')
  })

  it('should populate selector value when provided', () => {
    const html = buildFieldMappingRowHtml({ intakeqSelector: '#my-field' })
    expect(html).toContain('value="#my-field"')
  })

  it('should include remove button', () => {
    const html = buildFieldMappingRowHtml()
    expect(html).toContain('remove-field-btn')
    expect(html).toContain('×')
  })
})

describe('Mapping - buildMappingCardHtml', () => {
  const sampleMapping: NoteTypeMapping = {
    id: '1',
    noteTypeName: 'SOAP Progress Note',
    mappings: [
      { castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' },
      { castroSection: 'Objective', intakeqSelector: '#obj', fieldType: 'textarea' },
    ],
  }

  it('should include note type name in title', () => {
    const html = buildMappingCardHtml(sampleMapping, 0)
    expect(html).toContain('SOAP Progress Note')
    expect(html).toContain('mapping-card-title')
  })

  it('should include edit and delete buttons', () => {
    const html = buildMappingCardHtml(sampleMapping, 0)
    expect(html).toContain('class="edit"')
    expect(html).toContain('class="delete"')
    expect(html).toContain('data-index="0"')
  })

  it('should display all field mappings', () => {
    const html = buildMappingCardHtml(sampleMapping, 0)
    expect(html).toContain('Subjective')
    expect(html).toContain('#subj')
    expect(html).toContain('Objective')
    expect(html).toContain('#obj')
  })

  it('should include arrow between section and selector', () => {
    const html = buildMappingCardHtml(sampleMapping, 0)
    expect(html).toContain('→')
  })

  it('should display field types', () => {
    const html = buildMappingCardHtml(sampleMapping, 0)
    expect(html).toContain('textarea')
  })

  it('should set correct data-index attribute', () => {
    const html = buildMappingCardHtml(sampleMapping, 5)
    expect(html).toContain('data-index="5"')
  })

  it('should escape HTML in note type name', () => {
    const mappingWithXss: NoteTypeMapping = {
      ...sampleMapping,
      noteTypeName: '<script>xss</script>',
    }
    const html = buildMappingCardHtml(mappingWithXss, 0)
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>xss</script>')
  })
})

describe('Mapping - Import/Export Logic', () => {
  /**
   * Validate imported mappings
   */
  function validateImportedMappings(data: unknown): {
    valid: boolean
    error?: string
  } {
    if (!Array.isArray(data)) {
      return { valid: false, error: 'Invalid format: expected array' }
    }

    for (let i = 0; i < data.length; i++) {
      const mapping = data[i]
      if (!mapping.noteTypeName) {
        return { valid: false, error: `Mapping ${i}: missing noteTypeName` }
      }
      if (!Array.isArray(mapping.mappings)) {
        return { valid: false, error: `Mapping ${i}: invalid mappings array` }
      }
    }

    return { valid: true }
  }

  /**
   * Merge imported mappings with existing
   */
  function mergeImportedMappings(
    existing: NoteTypeMapping[],
    imported: NoteTypeMapping[]
  ): NoteTypeMapping[] {
    const result = [...existing]

    for (const mapping of imported) {
      const existingIndex = result.findIndex(
        (m) => m.noteTypeName === mapping.noteTypeName
      )
      if (existingIndex >= 0) {
        result[existingIndex] = mapping
      } else {
        result.push(mapping)
      }
    }

    return result
  }

  it('should validate array of mappings', () => {
    const result = validateImportedMappings([
      { noteTypeName: 'Test', mappings: [] },
    ])
    expect(result.valid).toBe(true)
  })

  it('should fail for non-array import', () => {
    const result = validateImportedMappings({ noteTypeName: 'Test' })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('expected array')
  })

  it('should fail for mapping without noteTypeName', () => {
    const result = validateImportedMappings([{ mappings: [] }])
    expect(result.valid).toBe(false)
    expect(result.error).toContain('missing noteTypeName')
  })

  it('should merge imported mappings with existing', () => {
    const existing: NoteTypeMapping[] = [
      { id: '1', noteTypeName: 'Type A', mappings: [] },
      { id: '2', noteTypeName: 'Type B', mappings: [] },
    ]
    const imported: NoteTypeMapping[] = [
      {
        id: '3',
        noteTypeName: 'Type B',
        mappings: [{ castroSection: 'Subjective', intakeqSelector: '#new', fieldType: 'text' }],
      },
      { id: '4', noteTypeName: 'Type C', mappings: [] },
    ]

    const result = mergeImportedMappings(existing, imported)

    expect(result).toHaveLength(3)
    expect(result.find((m) => m.noteTypeName === 'Type A')).toBeDefined()
    expect(result.find((m) => m.noteTypeName === 'Type B')!.mappings).toHaveLength(1)
    expect(result.find((m) => m.noteTypeName === 'Type C')).toBeDefined()
  })

  it('should replace existing mapping with same noteTypeName', () => {
    const existing: NoteTypeMapping[] = [
      {
        id: '1',
        noteTypeName: 'Test',
        mappings: [{ castroSection: 'Old', intakeqSelector: '#old', fieldType: 'text' }],
      },
    ]
    const imported: NoteTypeMapping[] = [
      {
        id: '2',
        noteTypeName: 'Test',
        mappings: [{ castroSection: 'New', intakeqSelector: '#new', fieldType: 'textarea' }],
      },
    ]

    const result = mergeImportedMappings(existing, imported)

    expect(result).toHaveLength(1)
    expect(result[0].mappings[0].castroSection).toBe('New')
    expect(result[0].mappings[0].intakeqSelector).toBe('#new')
  })
})

describe('Mapping - URL Pattern Matching', () => {
  /**
   * Check if URL matches pattern
   */
  function matchUrlPattern(url: string, pattern: string | null | undefined): boolean {
    if (!pattern) return false
    try {
      return new RegExp(pattern).test(url)
    } catch {
      return false
    }
  }

  it('should match URL with regex pattern', () => {
    expect(matchUrlPattern('https://intakeq.com/notes/123', '/notes/')).toBe(true)
  })

  it('should not match non-matching URL', () => {
    expect(matchUrlPattern('https://intakeq.com/forms/123', '/notes/')).toBe(false)
  })

  it('should return false for null pattern', () => {
    expect(matchUrlPattern('https://intakeq.com/notes/123', null)).toBe(false)
  })

  it('should return false for undefined pattern', () => {
    expect(matchUrlPattern('https://intakeq.com/notes/123', undefined)).toBe(false)
  })

  it('should return false for invalid regex pattern', () => {
    expect(matchUrlPattern('https://intakeq.com/', '[invalid')).toBe(false)
  })

  it('should match complex regex patterns', () => {
    expect(
      matchUrlPattern(
        'https://intakeq.com/practice/notes/edit/12345',
        '/practice/notes/edit/\\d+'
      )
    ).toBe(true)
  })
})
