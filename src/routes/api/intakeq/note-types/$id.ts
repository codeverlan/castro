/**
 * IntakeQ Note Type API Routes - Individual Note Type
 * GET /api/intakeq/note-types/:id - Get note type details
 * PUT /api/intakeq/note-types/:id - Update a note type
 * DELETE /api/intakeq/note-types/:id - Soft delete a note type (set isActive=false)
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { intakeqNoteTypes } from '~/db/schema';
import { updateIntakeqNoteTypeSchema } from '~/lib/validations/intakeqNoteTypes';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { eq, and, ne } from 'drizzle-orm';

export const Route = createFileRoute('/api/intakeq/note-types/$id')({
  server: {
    handlers: {
      /**
       * GET /api/intakeq/note-types/:id
       * Get note type details with all fields
       */
      GET: async ({ params }) => {
        try {
          const { id } = params;

          const noteType = await db.query.intakeqNoteTypes.findFirst({
            where: eq(intakeqNoteTypes.id, id),
          });

          if (!noteType) {
            throw new NotFoundError(`Note type with ID '${id}' not found`);
          }

          return Response.json({ data: noteType });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * PUT /api/intakeq/note-types/:id
       * Update a note type
       */
      PUT: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();

          // Validate request body
          const validatedData = updateIntakeqNoteTypeSchema.parse(body);

          // Check if note type exists
          const existingNoteType = await db.query.intakeqNoteTypes.findFirst({
            where: eq(intakeqNoteTypes.id, id),
          });

          if (!existingNoteType) {
            throw new NotFoundError(`Note type with ID '${id}' not found`);
          }

          // Check for duplicate name if name is being updated
          if (validatedData.name && validatedData.name !== existingNoteType.name) {
            const duplicateName = await db.query.intakeqNoteTypes.findFirst({
              where: and(
                eq(intakeqNoteTypes.name, validatedData.name),
                ne(intakeqNoteTypes.id, id)
              ),
            });

            if (duplicateName) {
              throw new ValidationError(`Note type with name '${validatedData.name}' already exists`);
            }
          }

          // Build update object
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (validatedData.name !== undefined) updateData.name = validatedData.name;
          if (validatedData.description !== undefined) updateData.description = validatedData.description;
          if (validatedData.intakeqFormId !== undefined) updateData.intakeqFormId = validatedData.intakeqFormId;
          if (validatedData.urlPattern !== undefined) updateData.urlPattern = validatedData.urlPattern;
          if (validatedData.fields !== undefined) updateData.fields = validatedData.fields;
          if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

          // Update the note type
          const [updatedNoteType] = await db
            .update(intakeqNoteTypes)
            .set(updateData)
            .where(eq(intakeqNoteTypes.id, id))
            .returning();

          return Response.json({ data: updatedNoteType });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/intakeq/note-types/:id
       * Soft delete a note type (set isActive=false)
       */
      DELETE: async ({ params }) => {
        try {
          const { id } = params;

          // Check if note type exists
          const existingNoteType = await db.query.intakeqNoteTypes.findFirst({
            where: eq(intakeqNoteTypes.id, id),
          });

          if (!existingNoteType) {
            throw new NotFoundError(`Note type with ID '${id}' not found`);
          }

          // Soft delete by setting isActive to false
          const [deletedNoteType] = await db
            .update(intakeqNoteTypes)
            .set({
              isActive: false,
              updatedAt: new Date(),
            })
            .where(eq(intakeqNoteTypes.id, id))
            .returning();

          return Response.json({
            data: deletedNoteType,
            message: 'Note type deactivated successfully',
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
