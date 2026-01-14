/**
 * Notes API Routes
 * Hono router for clinical note generation and management
 */

import { Hono } from 'hono';
import {
  noteGenerationService,
  validateApiGenerateNoteRequest,
  isNoteGenerationError,
} from '~/services/noteGeneration';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';

export const notesRouter = new Hono();

/**
 * POST /api/notes
 * Generate a clinical note from session data
 */
notesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validation = validateApiGenerateNoteRequest(body);
    if (!validation.success) {
      throw new ValidationError(
        'Invalid request body',
        validation.errors.issues.map((e) => ({
          path: String(e.path.join('.')),
          message: e.message,
        }))
      );
    }

    const { sessionId, templateId, targetTone, format, customInstructions, options } =
      validation.data;

    // Generate the note
    const result = await noteGenerationService.generateNote(
      {
        sessionId,
        templateId: templateId || sessionId,
        targetTone,
        format,
        customInstructions,
      },
      options
    );

    if (!result.success) {
      if (result.error?.includes('not found')) {
        throw new NotFoundError(result.error);
      }
      throw new Error(result.error || 'Note generation failed');
    }

    return c.json(
      {
        data: {
          noteId: result.noteId,
          sessionId: result.sessionId,
          noteContent: result.noteContent,
          plainTextContent: result.plainTextContent,
          format: result.format,
          wordCount: result.wordCount,
          characterCount: result.characterCount,
          sectionsIncluded: result.sectionsIncluded,
          processingTimeMs: result.processingTimeMs,
          modelUsed: result.modelUsed,
        },
      },
      201
    );
  } catch (error) {
    // Handle note generation specific errors
    if (isNoteGenerationError(error)) {
      return c.json(
        {
          error: {
            code: error.code,
            message: error.message,
            context: error.context,
          },
        },
        error.statusCode
      );
    }
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/notes
 * Get note by session ID (query parameter)
 */
notesRouter.get('/', async (c) => {
  try {
    const sessionId = c.req.query('sessionId');

    if (!sessionId) {
      throw new ValidationError('sessionId query parameter is required');
    }

    const note = await noteGenerationService.getNoteBySessionId(sessionId);

    if (!note) {
      throw new NotFoundError(`Note for session '${sessionId}' not found`);
    }

    return c.json({
      data: {
        noteId: note.noteId,
        sessionId: note.sessionId,
        noteContent: note.noteContent,
        plainTextContent: note.plainTextContent,
        format: note.format,
        wordCount: note.wordCount,
        characterCount: note.characterCount,
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/notes/:noteId
 * Get a specific note by ID
 */
notesRouter.get('/:noteId', async (c) => {
  try {
    const { noteId } = c.req.param();

    const note = await noteGenerationService.getNoteById(noteId);

    if (!note) {
      throw new NotFoundError(`Note with ID '${noteId}' not found`);
    }

    return c.json({ data: note });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/notes/export
 * Export a note to various formats
 */
notesRouter.post('/export', async (c) => {
  try {
    const body = await c.req.json();

    const { noteId, format } = body;

    if (!noteId) {
      throw new ValidationError('noteId is required');
    }

    const note = await noteGenerationService.getNoteById(noteId);

    if (!note) {
      throw new NotFoundError(`Note with ID '${noteId}' not found`);
    }

    // Mark as exported
    await noteGenerationService.markAsExported(noteId);

    // Return content in requested format
    let content: string;
    let contentType: string;

    switch (format) {
      case 'html':
        content = note.noteContent || '';
        contentType = 'text/html';
        break;
      case 'plain':
      case 'text':
        content = note.plainTextContent || '';
        contentType = 'text/plain';
        break;
      case 'markdown':
      default:
        content = note.noteContent || '';
        contentType = 'text/markdown';
        break;
    }

    return c.json({
      data: {
        noteId,
        format,
        content,
        contentType,
        exportedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
