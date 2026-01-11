import { createFileRoute } from '@tanstack/react-router';
import {
  noteGenerationService,
  noteGenerationRepository,
  isNoteGenerationError,
} from '~/services/noteGeneration';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { z } from 'zod';

// Validation schema for PATCH request
const refineNoteSchema = z.object({
  instructions: z.string().min(1, 'Instructions are required').max(2000),
  preserveSections: z.array(z.string()).optional(),
  targetTone: z.enum(['clinical', 'formal', 'compassionate']).optional(),
});

// Validation schema for format request
const formatNoteSchema = z.object({
  targetFormat: z.enum(['plain', 'markdown', 'html']),
  includeMetadata: z.boolean().optional(),
  includeTimestamp: z.boolean().optional(),
});

export const Route = createFileRoute('/api/notes/$noteId')({
  server: {
    handlers: {
      /**
       * GET /api/notes/:noteId
       * Get a specific note by ID
       */
      GET: async ({ params }) => {
        try {
          const { noteId } = params;

          const note = await noteGenerationRepository.getFinalNoteById(noteId);

          if (!note) {
            throw new NotFoundError(`Note '${noteId}' not found`);
          }

          return Response.json({
            data: {
              noteId: note.id,
              sessionId: note.sessionId,
              noteContent: note.noteContent,
              plainTextContent: note.plainTextContent,
              format: note.format,
              wordCount: note.wordCount,
              characterCount: note.characterCount,
              wasExported: note.wasExported,
              exportedAt: note.exportedAt,
              createdAt: note.createdAt,
              updatedAt: note.updatedAt,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * PATCH /api/notes/:noteId
       * Refine an existing note with new instructions
       *
       * Request body:
       * - instructions: string (required) - Instructions for refinement
       * - preserveSections: string[] (optional) - Sections to preserve
       * - targetTone: 'clinical' | 'formal' | 'compassionate' (optional)
       */
      PATCH: async ({ request, params }) => {
        try {
          const { noteId } = params;
          const body = await request.json();

          // Validate request body
          const validated = refineNoteSchema.parse(body);

          // Get the existing note to get sessionId
          const existingNote = await noteGenerationRepository.getFinalNoteById(noteId);
          if (!existingNote) {
            throw new NotFoundError(`Note '${noteId}' not found`);
          }

          // Refine the note
          const result = await noteGenerationService.refineNote({
            noteId,
            sessionId: existingNote.sessionId,
            instructions: validated.instructions,
            preserveSections: validated.preserveSections,
            targetTone: validated.targetTone,
          });

          if (!result.success) {
            throw new Error(result.error || 'Note refinement failed');
          }

          return Response.json({
            data: {
              noteId: result.noteId,
              refinedContent: result.refinedContent,
              plainTextContent: result.plainTextContent,
              changesApplied: result.changesApplied,
              wordCount: result.wordCount,
              characterCount: result.characterCount,
              processingTimeMs: result.processingTimeMs,
              modelUsed: result.modelUsed,
            },
          });
        } catch (error) {
          if (isNoteGenerationError(error)) {
            return Response.json(
              {
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: error.statusCode }
            );
          }
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/notes/:noteId/format
       * Format a note for export
       *
       * Request body:
       * - targetFormat: 'plain' | 'markdown' | 'html' (required)
       * - includeMetadata: boolean (optional)
       * - includeTimestamp: boolean (optional)
       */
      POST: async ({ request, params }) => {
        try {
          const { noteId } = params;
          const url = new URL(request.url);

          // Check if this is a format request
          if (url.pathname.endsWith('/format')) {
            const body = await request.json();
            const validated = formatNoteSchema.parse(body);

            const result = await noteGenerationService.formatNote({
              noteId,
              targetFormat: validated.targetFormat,
              includeMetadata: validated.includeMetadata,
              includeTimestamp: validated.includeTimestamp,
            });

            if (!result.success) {
              throw new Error(result.error || 'Note formatting failed');
            }

            return Response.json({
              data: {
                formattedContent: result.formattedContent,
                format: result.format,
              },
            });
          }

          // Default behavior for POST (regenerate)
          throw new ValidationError('Invalid operation');
        } catch (error) {
          if (isNoteGenerationError(error)) {
            return Response.json(
              {
                error: {
                  code: error.code,
                  message: error.message,
                },
              },
              { status: error.statusCode }
            );
          }
          return createErrorResponse(error);
        }
      },
    },
  },
});
