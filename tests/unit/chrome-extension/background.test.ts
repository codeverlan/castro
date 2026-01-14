/**
 * Castro IntakeQ Bridge - Background Service Worker Unit Tests
 *
 * Tests for background.js message handling logic
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Chrome API types
interface MockMessage {
  type: string
  data?: unknown
  mapping?: Record<string, unknown>
}

interface MockSendResponse {
  (response: Record<string, unknown>): void
}

/**
 * Simulates the message handler logic from background.js
 * This is extracted for testing without the actual Chrome extension runtime
 */
function createMessageHandler() {
  let pendingNote: unknown = null
  const fieldMappings: Array<{ noteTypeName: string }> = []

  return {
    getPendingNote: () => pendingNote,
    getFieldMappings: () => fieldMappings,

    handleMessage: (
      message: MockMessage,
      sendResponse: MockSendResponse
    ): boolean | void => {
      switch (message.type) {
        case 'SET_PENDING_NOTE':
          pendingNote = message.data
          sendResponse({ success: true })
          break

        case 'GET_PENDING_NOTE':
          sendResponse({ note: pendingNote })
          break

        case 'CLEAR_PENDING_NOTE':
          pendingNote = null
          sendResponse({ success: true })
          break

        case 'GET_FIELD_MAPPINGS':
          sendResponse({ mappings: [...fieldMappings] })
          return true // Keep channel open

        case 'SAVE_FIELD_MAPPING':
          if (message.mapping && 'noteTypeName' in message.mapping) {
            const existingIndex = fieldMappings.findIndex(
              (m) => m.noteTypeName === message.mapping!.noteTypeName
            )
            if (existingIndex >= 0) {
              fieldMappings[existingIndex] = message.mapping as { noteTypeName: string }
            } else {
              fieldMappings.push(message.mapping as { noteTypeName: string })
            }
            sendResponse({ success: true })
          } else {
            sendResponse({ error: 'Invalid mapping' })
          }
          return true

        default:
          sendResponse({ error: 'Unknown message type' })
      }
    },
  }
}

describe('Background - Message Handler', () => {
  let handler: ReturnType<typeof createMessageHandler>
  let sendResponse: MockSendResponse
  let lastResponse: Record<string, unknown>

  beforeEach(() => {
    handler = createMessageHandler()
    lastResponse = {}
    sendResponse = (response) => {
      lastResponse = response
    }
  })

  describe('SET_PENDING_NOTE', () => {
    it('should store pending note data', () => {
      const noteData = {
        sessionId: 'test-123',
        client: { name: 'Test Client' },
        sections: [],
      }

      handler.handleMessage(
        { type: 'SET_PENDING_NOTE', data: noteData },
        sendResponse
      )

      expect(lastResponse.success).toBe(true)
      expect(handler.getPendingNote()).toEqual(noteData)
    })

    it('should overwrite existing pending note', () => {
      const firstNote = { sessionId: 'first', sections: [] }
      const secondNote = { sessionId: 'second', sections: [] }

      handler.handleMessage(
        { type: 'SET_PENDING_NOTE', data: firstNote },
        sendResponse
      )
      handler.handleMessage(
        { type: 'SET_PENDING_NOTE', data: secondNote },
        sendResponse
      )

      expect(handler.getPendingNote()).toEqual(secondNote)
    })
  })

  describe('GET_PENDING_NOTE', () => {
    it('should return null when no note is pending', () => {
      handler.handleMessage({ type: 'GET_PENDING_NOTE' }, sendResponse)
      expect(lastResponse.note).toBeNull()
    })

    it('should return pending note when set', () => {
      const noteData = { sessionId: 'test-123', sections: [] }
      handler.handleMessage(
        { type: 'SET_PENDING_NOTE', data: noteData },
        sendResponse
      )
      handler.handleMessage({ type: 'GET_PENDING_NOTE' }, sendResponse)
      expect(lastResponse.note).toEqual(noteData)
    })
  })

  describe('CLEAR_PENDING_NOTE', () => {
    it('should clear pending note', () => {
      const noteData = { sessionId: 'test-123', sections: [] }
      handler.handleMessage(
        { type: 'SET_PENDING_NOTE', data: noteData },
        sendResponse
      )

      handler.handleMessage({ type: 'CLEAR_PENDING_NOTE' }, sendResponse)

      expect(lastResponse.success).toBe(true)
      expect(handler.getPendingNote()).toBeNull()
    })

    it('should succeed even when no note is pending', () => {
      handler.handleMessage({ type: 'CLEAR_PENDING_NOTE' }, sendResponse)
      expect(lastResponse.success).toBe(true)
    })
  })

  describe('GET_FIELD_MAPPINGS', () => {
    it('should return empty array when no mappings exist', () => {
      handler.handleMessage({ type: 'GET_FIELD_MAPPINGS' }, sendResponse)
      expect(lastResponse.mappings).toEqual([])
    })

    it('should return true to keep channel open', () => {
      const result = handler.handleMessage(
        { type: 'GET_FIELD_MAPPINGS' },
        sendResponse
      )
      expect(result).toBe(true)
    })
  })

  describe('SAVE_FIELD_MAPPING', () => {
    it('should save new mapping', () => {
      const mapping = {
        noteTypeName: 'Progress Note',
        mappings: [
          { castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' },
        ],
      }

      handler.handleMessage(
        { type: 'SAVE_FIELD_MAPPING', mapping },
        sendResponse
      )

      expect(lastResponse.success).toBe(true)
      expect(handler.getFieldMappings()).toHaveLength(1)
      expect(handler.getFieldMappings()[0].noteTypeName).toBe('Progress Note')
    })

    it('should update existing mapping with same noteTypeName', () => {
      const mapping1 = {
        noteTypeName: 'Progress Note',
        mappings: [{ castroSection: 'Subjective', intakeqSelector: '#subj', fieldType: 'textarea' }],
      }
      const mapping2 = {
        noteTypeName: 'Progress Note',
        mappings: [{ castroSection: 'Objective', intakeqSelector: '#obj', fieldType: 'text' }],
      }

      handler.handleMessage(
        { type: 'SAVE_FIELD_MAPPING', mapping: mapping1 },
        sendResponse
      )
      handler.handleMessage(
        { type: 'SAVE_FIELD_MAPPING', mapping: mapping2 },
        sendResponse
      )

      expect(handler.getFieldMappings()).toHaveLength(1)
    })

    it('should add new mapping with different noteTypeName', () => {
      const mapping1 = { noteTypeName: 'Progress Note', mappings: [] }
      const mapping2 = { noteTypeName: 'SOAP Note', mappings: [] }

      handler.handleMessage(
        { type: 'SAVE_FIELD_MAPPING', mapping: mapping1 },
        sendResponse
      )
      handler.handleMessage(
        { type: 'SAVE_FIELD_MAPPING', mapping: mapping2 },
        sendResponse
      )

      expect(handler.getFieldMappings()).toHaveLength(2)
    })

    it('should return true to keep channel open', () => {
      const result = handler.handleMessage(
        {
          type: 'SAVE_FIELD_MAPPING',
          mapping: { noteTypeName: 'Test', mappings: [] },
        },
        sendResponse
      )
      expect(result).toBe(true)
    })
  })

  describe('Unknown message type', () => {
    it('should return error for unknown message type', () => {
      handler.handleMessage({ type: 'UNKNOWN_TYPE' }, sendResponse)
      expect(lastResponse.error).toBe('Unknown message type')
    })
  })
})

describe('Background - Note Workflow Integration', () => {
  it('should support full note lifecycle', () => {
    const handler = createMessageHandler()
    const responses: Record<string, unknown>[] = []
    const sendResponse = (response: Record<string, unknown>) =>
      responses.push(response)

    const noteData = {
      sessionId: 'workflow-test',
      client: { name: 'Integration Client' },
      dateOfService: '2026-01-13',
      noteType: 'SOAP Note',
      sections: [
        { name: 'Subjective', content: 'Content', confidence: 0.9 },
      ],
    }

    // 1. Initially no note
    handler.handleMessage({ type: 'GET_PENDING_NOTE' }, sendResponse)
    expect(responses[0].note).toBeNull()

    // 2. Set note
    handler.handleMessage(
      { type: 'SET_PENDING_NOTE', data: noteData },
      sendResponse
    )
    expect(responses[1].success).toBe(true)

    // 3. Retrieve note
    handler.handleMessage({ type: 'GET_PENDING_NOTE' }, sendResponse)
    expect(responses[2].note).toEqual(noteData)

    // 4. Clear note
    handler.handleMessage({ type: 'CLEAR_PENDING_NOTE' }, sendResponse)
    expect(responses[3].success).toBe(true)

    // 5. Verify cleared
    handler.handleMessage({ type: 'GET_PENDING_NOTE' }, sendResponse)
    expect(responses[4].note).toBeNull()
  })
})
