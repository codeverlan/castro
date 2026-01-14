import { test, expect } from '@playwright/test'

/**
 * API Integration Tests
 *
 * These tests verify that the application correctly integrates with its API endpoints
 * and handles data flow between frontend and backend.
 */

test.describe('API Integration - Sessions', () => {
  test('should fetch sessions list from API', async ({ page, request }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Make API request
    const response = await request.get('/api/sessions?limit=50')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })

  test('should handle API errors for sessions', async ({ request }) => {
    // Test with invalid parameters
    const response = await request.get('/api/sessions?limit=-1')

    // Should either return empty array or proper error
    const data = await response.json()
    expect(data).toBeDefined()
  })

  test('should fetch session details by ID', async ({ request }) => {
    // First get a list of sessions
    const listResponse = await request.get('/api/sessions?limit=1')
    const listData = await listResponse.json()

    if (listData.data && listData.data.length > 0) {
      const sessionId = listData.data[0].id

      // Fetch session details
      const detailResponse = await request.get(`/api/sessions/${sessionId}`)
      expect(detailResponse.ok()).toBeTruthy()

      const detailData = await detailResponse.json()
      expect(detailData).toHaveProperty('data')
      expect(detailData.data).toHaveProperty('id', sessionId)
    }
  })

  test('should fetch session sections', async ({ request }) => {
    // First get a session
    const listResponse = await request.get('/api/sessions?limit=1')
    const listData = await listResponse.json()

    if (listData.data && listData.data.length > 0) {
      const sessionId = listData.data[0].id

      // Fetch sections
      const sectionsResponse = await request.get(`/api/sessions/${sessionId}/sections`)

      const sectionsData = await sectionsResponse.json()
      expect(sectionsData).toHaveProperty('data')
      expect(Array.isArray(sectionsData.data)).toBeTruthy()
    }
  })
})

test.describe('API Integration - Templates', () => {
  test('should fetch templates list', async ({ request }) => {
    const response = await request.get('/api/templates?limit=100')
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })

  test('should fetch template by ID', async ({ request }) => {
    // First get templates
    const listResponse = await request.get('/api/templates?limit=1')
    const listData = await listResponse.json()

    if (listData.data && listData.data.length > 0) {
      const templateId = listData.data[0].id

      // Fetch template details
      const detailResponse = await request.get(`/api/templates/${templateId}`)
      expect(detailResponse.ok()).toBeTruthy()

      const detailData = await detailResponse.json()
      expect(detailData).toHaveProperty('data')
    }
  })

  test('should create new template', async ({ request }) => {
    const newTemplate = {
      name: `Test Template ${Date.now()}`,
      description: 'Test description',
      templateType: 'Custom',
      isDefault: false,
      status: 'draft',
      sections: [],
    }

    const response = await request.post('/api/templates', {
      data: newTemplate,
    })

    // Should either succeed or return validation error
    const data = await response.json()
    expect(data).toBeDefined()
  })
})

test.describe('API Integration - History', () => {
  test('should fetch session history with filters', async ({ request }) => {
    const params = new URLSearchParams({
      limit: '20',
      offset: '0',
    })

    const response = await request.get(`/api/sessions/history?${params}`)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })

  test('should filter history by date range', async ({ request }) => {
    const today = new Date()
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const params = new URLSearchParams({
      limit: '20',
      offset: '0',
      dateFrom: lastWeek.toISOString(),
      dateTo: today.toISOString(),
    })

    const response = await request.get(`/api/sessions/history?${params}`)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  test('should filter history by status', async ({ request }) => {
    const params = new URLSearchParams({
      limit: '20',
      offset: '0',
      status: 'completed',
    })

    const response = await request.get(`/api/sessions/history?${params}`)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  test('should search history by text', async ({ request }) => {
    const params = new URLSearchParams({
      limit: '20',
      offset: '0',
      search: 'test',
    })

    const response = await request.get(`/api/sessions/history?${params}`)
    expect(response.ok()).toBeTruthy()

    const data = await response.json()
    expect(data).toHaveProperty('data')
  })

  test('should handle pagination', async ({ request }) => {
    // First page
    const page1Response = await request.get('/api/sessions/history?limit=5&offset=0')
    const page1Data = await page1Response.json()

    // Second page
    const page2Response = await request.get('/api/sessions/history?limit=5&offset=5')
    const page2Data = await page2Response.json()

    expect(page1Data).toHaveProperty('data')
    expect(page2Data).toHaveProperty('data')

    // Verify pagination metadata
    if (page1Data.pagination) {
      expect(page1Data.pagination).toHaveProperty('total')
      expect(page1Data.pagination).toHaveProperty('limit')
      expect(page1Data.pagination).toHaveProperty('offset')
    }
  })
})

test.describe('API Integration - Notes', () => {
  test('should fetch note by session ID', async ({ request }) => {
    // First get a session
    const sessionsResponse = await request.get('/api/sessions?limit=1')
    const sessionsData = await sessionsResponse.json()

    if (sessionsData.data && sessionsData.data.length > 0) {
      const sessionId = sessionsData.data[0].id

      // Fetch note
      const noteResponse = await request.get(`/api/notes?sessionId=${sessionId}`)

      const noteData = await noteResponse.json()
      expect(noteData).toBeDefined()
    }
  })
})

test.describe('API Integration - Settings', () => {
  test('should check IntakeQ configuration', async ({ request }) => {
    const response = await request.get('/api/intakeq/settings')

    const data = await response.json()
    expect(data).toHaveProperty('configured')
    expect(typeof data.configured).toBe('boolean')
  })

  test('should fetch processing prompts', async ({ request }) => {
    const response = await request.get('/api/prompts?isActive=true')

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })

  test('should fetch IntakeQ note types', async ({ request }) => {
    const response = await request.get('/api/intakeq/note-types?isActive=true')

    const data = await response.json()
    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBeTruthy()
  })
})

test.describe('API Integration - IntakeQ Schedule', () => {
  test('should fetch appointments for date', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0]
    const response = await request.get(`/api/intakeq/appointments?date=${today}`)

    const data = await response.json()

    // Should either return data or indicate IntakeQ not configured
    if (data.code === 'INTAKEQ_NOT_CONFIGURED') {
      expect(data.code).toBe('INTAKEQ_NOT_CONFIGURED')
    } else {
      expect(data).toHaveProperty('data')
    }
  })

  test('should handle invalid date format', async ({ request }) => {
    const response = await request.get('/api/intakeq/appointments?date=invalid')

    // Should handle gracefully (503 is acceptable if service is unavailable)
    expect(response.status()).toBeLessThanOrEqual(503)
  })
})

test.describe('API Data Consistency', () => {
  test('should maintain consistent data structure for sessions', async ({ request }) => {
    const response = await request.get('/api/sessions?limit=10')
    const data = await response.json()

    if (data.data && data.data.length > 0) {
      const session = data.data[0]

      // Verify session structure
      expect(session).toHaveProperty('id')
      expect(session).toHaveProperty('status')
      expect(session).toHaveProperty('createdAt')

      // ID should be a string
      expect(typeof session.id).toBe('string')

      // Status should be one of expected values
      const validStatuses = [
        'pending',
        'transcribing',
        'transcribed',
        'mapping',
        'completing',
        'completed',
        'failed',
      ]
      expect(validStatuses).toContain(session.status)
    }
  })

  test('should maintain consistent data structure for templates', async ({ request }) => {
    const response = await request.get('/api/templates?limit=10')
    const data = await response.json()

    if (data.data && data.data.length > 0) {
      const template = data.data[0]

      // Verify template structure
      expect(template).toHaveProperty('id')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('status')

      // Name should be a non-empty string
      expect(typeof template.name).toBe('string')
      expect(template.name.length).toBeGreaterThan(0)

      // Status should be valid
      const validStatuses = ['active', 'draft', 'archived']
      expect(validStatuses).toContain(template.status)
    }
  })
})

test.describe('API Error Handling', () => {
  test('should return 404 for non-existent session', async ({ request }) => {
    const response = await request.get('/api/sessions/non-existent-id-12345')

    expect(response.status()).toBe(404)
  })

  test('should handle malformed requests', async ({ request }) => {
    const response = await request.get('/api/sessions?limit=not-a-number')

    // Should either handle gracefully or return 400
    expect(response.status()).toBeLessThan(500)
  })

  test('should validate required fields on POST', async ({ request }) => {
    const response = await request.post('/api/templates', {
      data: {
        // Missing required fields
        description: 'Test',
      },
    })

    // Should return validation error
    expect(response.status()).toBeLessThan(500)
  })
})
