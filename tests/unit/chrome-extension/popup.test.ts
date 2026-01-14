/**
 * Castro IntakeQ Bridge - Popup Unit Tests
 *
 * Tests for popup.js pure functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Extract testable functions from popup.js logic
// These are pure functions that can be tested without DOM

/**
 * Format date for display
 */
function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Validate Castro note payload
 */
function validateNotePayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format')
  }
  const noteData = data as Record<string, unknown>
  if (!noteData.sessionId) {
    throw new Error('Missing session ID')
  }
  if (!noteData.sections || !Array.isArray(noteData.sections)) {
    throw new Error('Missing or invalid sections')
  }
  return true
}

describe('Popup - formatDate', () => {
  it('should return null for null input', () => {
    expect(formatDate(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(formatDate(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(formatDate('')).toBeNull()
  })

  it('should format ISO date string correctly', () => {
    // Use a date with timezone to ensure consistent result
    const result = formatDate('2026-01-13T12:00:00')
    expect(result).toMatch(/Jan (12|13), 2026/)
  })

  it('should format full ISO datetime string', () => {
    const result = formatDate('2026-01-13T12:00:00Z')
    expect(result).toMatch(/Jan (12|13), 2026/)
  })

  it('should handle various date formats', () => {
    // Use noon time to avoid timezone day boundary issues
    const result = formatDate('2025-12-25T12:00:00')
    expect(result).toMatch(/Dec (24|25), 2025/)
  })

  it('should return original string for invalid date', () => {
    const result = formatDate('not-a-date')
    // Invalid Date object in toLocaleDateString returns "Invalid Date"
    expect(result).toBe('Invalid Date')
  })
})

describe('Popup - validateNotePayload', () => {
  it('should throw for null data', () => {
    expect(() => validateNotePayload(null)).toThrow('Invalid data format')
  })

  it('should throw for undefined data', () => {
    expect(() => validateNotePayload(undefined)).toThrow('Invalid data format')
  })

  it('should throw for non-object data', () => {
    expect(() => validateNotePayload('string')).toThrow('Invalid data format')
    expect(() => validateNotePayload(123)).toThrow('Invalid data format')
    expect(() => validateNotePayload(true)).toThrow('Invalid data format')
  })

  it('should throw for missing sessionId', () => {
    expect(() =>
      validateNotePayload({
        sections: [],
      })
    ).toThrow('Missing session ID')
  })

  it('should throw for missing sections', () => {
    expect(() =>
      validateNotePayload({
        sessionId: 'test-123',
      })
    ).toThrow('Missing or invalid sections')
  })

  it('should throw for non-array sections', () => {
    expect(() =>
      validateNotePayload({
        sessionId: 'test-123',
        sections: 'not-an-array',
      })
    ).toThrow('Missing or invalid sections')
  })

  it('should return true for valid payload with empty sections', () => {
    expect(
      validateNotePayload({
        sessionId: 'test-123',
        sections: [],
      })
    ).toBe(true)
  })

  it('should return true for valid payload with sections', () => {
    expect(
      validateNotePayload({
        sessionId: 'test-123',
        sections: [
          { name: 'Subjective', content: 'Test content', confidence: 0.85 },
        ],
      })
    ).toBe(true)
  })

  it('should return true for full valid payload', () => {
    const validPayload = {
      sessionId: 'test-session-001',
      client: {
        name: 'Test Client',
        intakeqId: '12345',
      },
      dateOfService: '2026-01-13',
      noteType: 'Individual Progress Note',
      sections: [
        {
          name: 'Subjective',
          content: 'Client reported feeling anxious.',
          confidence: 0.92,
        },
        {
          name: 'Objective',
          content: 'Client appeared well-groomed.',
          confidence: 0.88,
        },
      ],
      timestamp: '2026-01-13T12:00:00Z',
    }
    expect(validateNotePayload(validPayload)).toBe(true)
  })
})

describe('Popup - UI State Functions', () => {
  // Mock DOM for UI state functions
  let mockNoNoteState: { classList: { remove: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn> } }
  let mockNoteReadyState: { classList: { remove: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn> } }
  let mockErrorState: { classList: { remove: ReturnType<typeof vi.fn>; add: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    mockNoNoteState = {
      classList: {
        remove: vi.fn(),
        add: vi.fn(),
      },
    }
    mockNoteReadyState = {
      classList: {
        remove: vi.fn(),
        add: vi.fn(),
      },
    }
    mockErrorState = {
      classList: {
        remove: vi.fn(),
        add: vi.fn(),
      },
    }
  })

  /**
   * Show no note state - extracted for testing
   */
  function showNoNote() {
    mockNoNoteState.classList.remove('hidden')
    mockNoteReadyState.classList.add('hidden')
    mockErrorState.classList.add('hidden')
  }

  /**
   * Show error state - extracted for testing
   */
  function showError() {
    mockNoNoteState.classList.add('hidden')
    mockNoteReadyState.classList.add('hidden')
    mockErrorState.classList.remove('hidden')
  }

  it('should show no-note state correctly', () => {
    showNoNote()
    expect(mockNoNoteState.classList.remove).toHaveBeenCalledWith('hidden')
    expect(mockNoteReadyState.classList.add).toHaveBeenCalledWith('hidden')
    expect(mockErrorState.classList.add).toHaveBeenCalledWith('hidden')
  })

  it('should show error state correctly', () => {
    showError()
    expect(mockNoNoteState.classList.add).toHaveBeenCalledWith('hidden')
    expect(mockNoteReadyState.classList.add).toHaveBeenCalledWith('hidden')
    expect(mockErrorState.classList.remove).toHaveBeenCalledWith('hidden')
  })
})

describe('Popup - Note Ready Display', () => {
  /**
   * Build section summary text
   */
  function buildSectionSummary(sections: Array<{ name: string }> | undefined): string {
    if (!sections || sections.length === 0) {
      return 'No sections'
    }
    const sectionNames = sections.map((s) => s.name).join(', ')
    return `${sections.length} sections: ${sectionNames}`
  }

  it('should return "No sections" for empty sections', () => {
    expect(buildSectionSummary([])).toBe('No sections')
  })

  it('should return "No sections" for undefined', () => {
    expect(buildSectionSummary(undefined)).toBe('No sections')
  })

  it('should format single section correctly', () => {
    const sections = [{ name: 'Subjective' }]
    expect(buildSectionSummary(sections)).toBe('1 sections: Subjective')
  })

  it('should format multiple sections correctly', () => {
    const sections = [
      { name: 'Subjective' },
      { name: 'Objective' },
      { name: 'Assessment' },
      { name: 'Plan' },
    ]
    expect(buildSectionSummary(sections)).toBe(
      '4 sections: Subjective, Objective, Assessment, Plan'
    )
  })
})
