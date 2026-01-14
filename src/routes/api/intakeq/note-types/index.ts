/**
 * IntakeQ Note Types API Routes
 * GET /api/intakeq/note-types - List all note types with optional filtering
 * POST /api/intakeq/note-types - Create a new note type
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { intakeqNoteTypes } from '~/db/schema';
import {
  createIntakeqNoteTypeSchema,
  noteTypeQuerySchema,
} from '~/lib/validations/intakeqNoteTypes';
import { createErrorResponse, ValidationError } from '~/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';

export const Route = createFileRoute('/api/intakeq/note-types/')({
  server: {
    handlers: {
      /**
       * GET /api/intakeq/note-types
       * List all note types with optional filtering
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            isActive: url.searchParams.get('isActive')
              ? url.searchParams.get('isActive') === 'true'
              : undefined,
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
          };

          // Validate query parameters
          const validatedQuery = noteTypeQuerySchema.parse(queryParams);

          // Build where conditions
          const conditions = [];

          if (validatedQuery.isActive !== undefined) {
            conditions.push(eq(intakeqNoteTypes.isActive, validatedQuery.isActive));
          }

          // Query note types
          const noteTypes = await db.query.intakeqNoteTypes.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: validatedQuery.limit,
            offset: validatedQuery.offset,
            orderBy: [desc(intakeqNoteTypes.updatedAt)],
          });

          // Get total count for pagination
          const allNoteTypes = await db.query.intakeqNoteTypes.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
          });

          return Response.json({
            data: noteTypes,
            pagination: {
              total: allNoteTypes.length,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + noteTypes.length < allNoteTypes.length,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/intakeq/note-types
       * Create a new note type
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validatedData = createIntakeqNoteTypeSchema.parse(body);

          // Check for duplicate name
          const existingNoteType = await db.query.intakeqNoteTypes.findFirst({
            where: eq(intakeqNoteTypes.name, validatedData.name),
          });

          if (existingNoteType) {
            throw new ValidationError(`Note type with name '${validatedData.name}' already exists`);
          }

          // Create the note type
          const [newNoteType] = await db
            .insert(intakeqNoteTypes)
            .values({
              name: validatedData.name,
              description: validatedData.description,
              intakeqFormId: validatedData.intakeqFormId,
              urlPattern: validatedData.urlPattern,
              fields: validatedData.fields,
              isActive: validatedData.isActive,
            })
            .returning();

          return Response.json({ data: newNoteType }, { status: 201 });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
