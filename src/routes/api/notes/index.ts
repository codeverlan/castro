import { createFileRoute } from '@tanstack/react-router';
import {
  noteGenerationService,
  validateApiGenerateNoteRequest,
  isNoteGenerationError,
} from '~/services/noteGeneration';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';

export const Route = createFileRoute('/api/notes/')({
  server: {
    handlers: {
      /**
       * POST /api/notes
       * Generate a clinical note from session data
       *
       * Request body:
       * - sessionId: string (required) - The session to generate a note for
       * - templateId: string (optional) - Override template ID
       * - targetTone: 'clinical' | 'formal' | 'compassionate' (optional)
       * - format: 'plain' | 'markdown' | 'html' (optional)
       * - customInstructions: string (optional) - Additional instructions for note generation
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

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
              templateId: templateId || sessionId, // templateId is determined from session if not provided
              targetTone,
              format,
              customInstructions,
            },
            options
          );

          if (!result.success) {
            // Handle specific error types
            if (result.error?.includes('not found')) {
              throw new NotFoundError(result.error);
            }
            throw new Error(result.error || 'Note generation failed');
          }

          return Response.json(
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
            { status: 201 }
          );
        } catch (error) {
          // Handle note generation specific errors
          if (isNoteGenerationError(error)) {
            return Response.json(
              {
                error: {
                  code: error.code,
                  message: error.message,
                  context: error.context,
                },
              },
              { status: error.statusCode }
            );
          }
          return createErrorResponse(error);
        }
      },

      /**
       * GET /api/notes
       * Get note by session ID (query parameter)
       *
       * Query parameters:
       * - sessionId: string (required) - The session ID to get the note for
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const sessionId = url.searchParams.get('sessionId');

          if (!sessionId) {
            throw new ValidationError('sessionId query parameter is required');
          }

          const note = await noteGenerationService.getNoteBySessionId(sessionId);

          if (!note) {
            throw new NotFoundError(`Note for session '${sessionId}' not found`);
          }

          return Response.json({
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
          return createErrorResponse(error);
        }
      },
    },
  },
});
