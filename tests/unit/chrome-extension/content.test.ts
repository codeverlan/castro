/**
 * Castro IntakeQ Bridge - Content Script Unit Tests
 *
 * Tests for content.js field filling and utility functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'

// Set up JSDOM for testing DOM manipulation
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const { document } = dom.window

/**
 * Escape HTML for safe display
 * Extracted from content.js for testing
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Determine confidence badge class and text
 */
function getConfidenceBadgeInfo(confidence: number): {
  class: string
  text: string
} {
  if (confidence >= 80) {
    return {
      class: 'castro-confidence-high',
      text: `✓ ${confidence}%`,
    }
  } else if (confidence >= 60) {
    return {
      class: 'castro-confidence-medium',
      text: `⚠ ${confidence}%`,
    }
  } else {
    return {
      class: 'castro-confidence-low',
      text: `⚠ ${confidence}%`,
    }
  }
}

/**
 * Mock element for fillField testing
 */
interface MockElement {
  value: string
  innerHTML?: string
  checked?: boolean
  classList?: {
    contains: (className: string) => boolean
  }
  contentEditable?: string
  options?: Array<{ text: string; value: string }>
  dispatchEvent: (event: Event) => void
}

/**
 * Fill a single field - extracted logic for testing
 */
function fillField(
  element: MockElement | null,
  content: string,
  fieldType: string
): boolean {
  if (!element) {
    return false
  }

  switch (fieldType) {
    case 'text':
    case 'textarea':
      element.value = content
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true

    case 'richtext':
      if (
        element.classList?.contains('ql-editor') ||
        element.contentEditable === 'true'
      ) {
        element.innerHTML = content
        element.dispatchEvent(new Event('input', { bubbles: true }))
        return true
      }
      element.value = content
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true

    case 'select':
      if (element.options) {
        const option = element.options.find(
          (opt) =>
            opt.text.toLowerCase().includes(content.toLowerCase()) ||
            opt.value.toLowerCase() === content.toLowerCase()
        )
        if (option) {
          element.value = option.value
          element.dispatchEvent(new Event('change', { bubbles: true }))
          return true
        }
      }
      return false

    case 'checkbox':
      const shouldCheck =
        content.toLowerCase() === 'true' ||
        content === '1' ||
        content.toLowerCase() === 'yes'
      element.checked = shouldCheck
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true

    default:
      element.value = content
      element.dispatchEvent(new Event('change', { bubbles: true }))
      return true
  }
}

describe('Content - escapeHtml', () => {
  it('should escape < and > characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    )
  })

  it('should escape & character', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('should escape quote characters', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said "hello"')
  })

  it('should handle empty string', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle plain text without special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('should handle multiple special characters', () => {
    expect(escapeHtml('<div class="test">A & B</div>')).toBe(
      '&lt;div class="test"&gt;A &amp; B&lt;/div&gt;'
    )
  })
})

describe('Content - getConfidenceBadgeInfo', () => {
  it('should return high confidence for 80 and above', () => {
    expect(getConfidenceBadgeInfo(80)).toEqual({
      class: 'castro-confidence-high',
      text: '✓ 80%',
    })
    expect(getConfidenceBadgeInfo(90)).toEqual({
      class: 'castro-confidence-high',
      text: '✓ 90%',
    })
    expect(getConfidenceBadgeInfo(100)).toEqual({
      class: 'castro-confidence-high',
      text: '✓ 100%',
    })
  })

  it('should return medium confidence for 60-79', () => {
    expect(getConfidenceBadgeInfo(60)).toEqual({
      class: 'castro-confidence-medium',
      text: '⚠ 60%',
    })
    expect(getConfidenceBadgeInfo(70)).toEqual({
      class: 'castro-confidence-medium',
      text: '⚠ 70%',
    })
    expect(getConfidenceBadgeInfo(79)).toEqual({
      class: 'castro-confidence-medium',
      text: '⚠ 79%',
    })
  })

  it('should return low confidence for below 60', () => {
    expect(getConfidenceBadgeInfo(59)).toEqual({
      class: 'castro-confidence-low',
      text: '⚠ 59%',
    })
    expect(getConfidenceBadgeInfo(30)).toEqual({
      class: 'castro-confidence-low',
      text: '⚠ 30%',
    })
    expect(getConfidenceBadgeInfo(0)).toEqual({
      class: 'castro-confidence-low',
      text: '⚠ 0%',
    })
  })
})

describe('Content - fillField', () => {
  let mockElement: MockElement
  let dispatchEventSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    dispatchEventSpy = vi.fn()
    mockElement = {
      value: '',
      dispatchEvent: dispatchEventSpy,
    }
  })

  it('should return false for null element', () => {
    expect(fillField(null, 'content', 'text')).toBe(false)
  })

  describe('text and textarea fields', () => {
    it('should fill text field with content', () => {
      const result = fillField(mockElement, 'Test content', 'text')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('Test content')
    })

    it('should fill textarea field with content', () => {
      const result = fillField(mockElement, 'Multiline\ncontent', 'textarea')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('Multiline\ncontent')
    })

    it('should dispatch input and change events for text/textarea', () => {
      fillField(mockElement, 'content', 'text')
      expect(dispatchEventSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('richtext fields', () => {
    it('should fill contentEditable richtext field', () => {
      mockElement.contentEditable = 'true'
      mockElement.classList = { contains: () => false }
      mockElement.innerHTML = ''

      const result = fillField(mockElement, '<p>Rich content</p>', 'richtext')
      expect(result).toBe(true)
      expect(mockElement.innerHTML).toBe('<p>Rich content</p>')
    })

    it('should fill Quill editor richtext field', () => {
      mockElement.classList = { contains: (cls) => cls === 'ql-editor' }
      mockElement.innerHTML = ''

      const result = fillField(mockElement, '<p>Quill content</p>', 'richtext')
      expect(result).toBe(true)
      expect(mockElement.innerHTML).toBe('<p>Quill content</p>')
    })

    it('should fall back to value for non-contentEditable richtext', () => {
      mockElement.classList = { contains: () => false }
      mockElement.contentEditable = 'false'

      const result = fillField(mockElement, 'Plain content', 'richtext')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('Plain content')
    })
  })

  describe('select fields', () => {
    it('should select option by matching text', () => {
      mockElement.options = [
        { text: 'Option 1', value: 'opt1' },
        { text: 'Option 2', value: 'opt2' },
        { text: 'Progress Note', value: 'progress' },
      ]

      const result = fillField(mockElement, 'Progress', 'select')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('progress')
    })

    it('should select option by matching value', () => {
      mockElement.options = [
        { text: 'Option 1', value: 'opt1' },
        { text: 'Option 2', value: 'progress' },
      ]

      const result = fillField(mockElement, 'progress', 'select')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('progress')
    })

    it('should return false when no matching option found', () => {
      mockElement.options = [
        { text: 'Option 1', value: 'opt1' },
        { text: 'Option 2', value: 'opt2' },
      ]

      const result = fillField(mockElement, 'nonexistent', 'select')
      expect(result).toBe(false)
    })

    it('should return false when no options exist', () => {
      const result = fillField(mockElement, 'content', 'select')
      expect(result).toBe(false)
    })
  })

  describe('checkbox fields', () => {
    it('should check checkbox for "true"', () => {
      const result = fillField(mockElement, 'true', 'checkbox')
      expect(result).toBe(true)
      expect(mockElement.checked).toBe(true)
    })

    it('should check checkbox for "1"', () => {
      const result = fillField(mockElement, '1', 'checkbox')
      expect(result).toBe(true)
      expect(mockElement.checked).toBe(true)
    })

    it('should check checkbox for "yes"', () => {
      const result = fillField(mockElement, 'yes', 'checkbox')
      expect(result).toBe(true)
      expect(mockElement.checked).toBe(true)
    })

    it('should uncheck checkbox for "false"', () => {
      mockElement.checked = true
      const result = fillField(mockElement, 'false', 'checkbox')
      expect(result).toBe(true)
      expect(mockElement.checked).toBe(false)
    })

    it('should uncheck checkbox for "no"', () => {
      mockElement.checked = true
      const result = fillField(mockElement, 'no', 'checkbox')
      expect(result).toBe(true)
      expect(mockElement.checked).toBe(false)
    })
  })

  describe('default field type', () => {
    it('should fill unknown field type as value', () => {
      const result = fillField(mockElement, 'content', 'unknown')
      expect(result).toBe(true)
      expect(mockElement.value).toBe('content')
    })
  })
})

describe('Content - Section Matching', () => {
  interface Section {
    name: string
    content: string
    confidence: number
  }

  /**
   * Find section by name - extracted logic for testing
   */
  function findSection(
    sections: Section[],
    sectionName: string
  ): Section | undefined {
    return sections.find((s) => s.name === sectionName)
  }

  const mockSections: Section[] = [
    { name: 'Subjective', content: 'Patient reports...', confidence: 0.92 },
    { name: 'Objective', content: 'Vitals normal...', confidence: 0.88 },
    { name: 'Assessment', content: 'Diagnosis...', confidence: 0.75 },
    { name: 'Plan', content: 'Follow up in 2 weeks...', confidence: 0.95 },
  ]

  it('should find section by exact name match', () => {
    const section = findSection(mockSections, 'Subjective')
    expect(section).toBeDefined()
    expect(section!.content).toBe('Patient reports...')
  })

  it('should return undefined for non-existent section', () => {
    const section = findSection(mockSections, 'NonExistent')
    expect(section).toBeUndefined()
  })

  it('should find all SOAP sections', () => {
    expect(findSection(mockSections, 'Subjective')).toBeDefined()
    expect(findSection(mockSections, 'Objective')).toBeDefined()
    expect(findSection(mockSections, 'Assessment')).toBeDefined()
    expect(findSection(mockSections, 'Plan')).toBeDefined()
  })
})

describe('Content - Overlay HTML Building', () => {
  /**
   * Build overlay warning HTML
   */
  function buildWarningHtml(): string {
    return '⚠️ Verify this is the correct note before filling'
  }

  /**
   * Build client info HTML
   */
  function buildClientInfoHtml(
    clientName: string | undefined,
    dateOfService: string | undefined
  ): string {
    const name = escapeHtml(clientName || 'Unknown Client')
    const dos = dateOfService || 'No DOS'
    return `<strong>${name}</strong><span class="castro-dos">${dos}</span>`
  }

  it('should build warning message correctly', () => {
    expect(buildWarningHtml()).toBe(
      '⚠️ Verify this is the correct note before filling'
    )
  })

  it('should build client info with name and date', () => {
    const html = buildClientInfoHtml('John Doe', '2026-01-13')
    expect(html).toContain('<strong>John Doe</strong>')
    expect(html).toContain('2026-01-13')
  })

  it('should handle missing client name', () => {
    const html = buildClientInfoHtml(undefined, '2026-01-13')
    expect(html).toContain('<strong>Unknown Client</strong>')
  })

  it('should handle missing date of service', () => {
    const html = buildClientInfoHtml('John Doe', undefined)
    expect(html).toContain('No DOS')
  })

  it('should escape HTML in client name', () => {
    const html = buildClientInfoHtml('<script>xss</script>', '2026-01-13')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})
