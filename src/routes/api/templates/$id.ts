import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { noteTemplates, templateSections, templateFields } from '~/db/schema';
import { updateNoteTemplateSchema } from '~/lib/validations/noteTemplates';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, asc } from 'drizzle-orm';
import { z } from 'zod';

// Validate UUID format
const uuidSchema = z.string().uuid();

export const Route = createFileRoute('/api/templates/$id')({
  server: {
    handlers: {
      /**
       * GET /api/templates/:id
       * Get a single template by ID with all sections and fields
       */
      GET: async ({ params }) => {
        try {
          const { id } = params;

          // Validate ID format
          const validatedId = uuidSchema.parse(id);

          // Query template with relations
          const template = await db.query.noteTemplates.findFirst({
            where: eq(noteTemplates.id, validatedId),
            with: {
              sections: {
                orderBy: [asc(templateSections.displayOrder)],
                with: {
                  fields: {
                    orderBy: [asc(templateFields.displayOrder)],
                  },
                },
              },
            },
          });

          if (!template) {
            throw new NotFoundError(`Template with ID ${id} not found`);
          }

          return Response.json({ data: template });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * PUT /api/templates/:id
       * Update an existing template
       */
      PUT: async ({ request, params }) => {
        try {
          const { id } = params;

          // Validate ID format
          const validatedId = uuidSchema.parse(id);

          // Check if template exists
          const existingTemplate = await db.query.noteTemplates.findFirst({
            where: eq(noteTemplates.id, validatedId),
          });

          if (!existingTemplate) {
            throw new NotFoundError(`Template with ID ${id} not found`);
          }

          const body = await request.json();

          // Add the ID to the body for validation
          const dataWithId = { ...body, id: validatedId };

          // Validate request body
          const validatedData = updateNoteTemplateSchema.parse(dataWithId);

          // Build update object (only include fields that are provided)
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (validatedData.name !== undefined) {
            updateData.name = validatedData.name;
          }
          if (validatedData.description !== undefined) {
            updateData.description = validatedData.description;
          }
          if (validatedData.templateType !== undefined) {
            updateData.templateType = validatedData.templateType;
          }
          if (validatedData.isDefault !== undefined) {
            updateData.isDefault = validatedData.isDefault;
          }
          if (validatedData.status !== undefined) {
            updateData.status = validatedData.status;
          }
          if (validatedData.version !== undefined) {
            updateData.version = validatedData.version;
          }
          if (validatedData.parentTemplateId !== undefined) {
            updateData.parentTemplateId = validatedData.parentTemplateId;
          }

          // Update the template
          const [updatedTemplate] = await db
            .update(noteTemplates)
            .set(updateData)
            .where(eq(noteTemplates.id, validatedId))
            .returning();

          // Fetch the updated template with relations
          const templateWithRelations = await db.query.noteTemplates.findFirst({
            where: eq(noteTemplates.id, validatedId),
            with: {
              sections: {
                orderBy: [asc(templateSections.displayOrder)],
                with: {
                  fields: {
                    orderBy: [asc(templateFields.displayOrder)],
                  },
                },
              },
            },
          });

          return Response.json({ data: templateWithRelations });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/templates/:id
       * Delete a template (soft delete by setting status to 'archived')
       */
      DELETE: async ({ request, params }) => {
        try {
          const { id } = params;

          // Validate ID format
          const validatedId = uuidSchema.parse(id);

          // Check if template exists
          const existingTemplate = await db.query.noteTemplates.findFirst({
            where: eq(noteTemplates.id, validatedId),
          });

          if (!existingTemplate) {
            throw new NotFoundError(`Template with ID ${id} not found`);
          }

          // Check query param for hard delete option
          const url = new URL(request.url);
          const hardDelete = url.searchParams.get('hard') === 'true';

          if (hardDelete) {
            // Hard delete - cascade will handle sections and fields
            await db
              .delete(noteTemplates)
              .where(eq(noteTemplates.id, validatedId));

            return new Response(null, { status: 204 });
          } else {
            // Soft delete - archive the template
            const [archivedTemplate] = await db
              .update(noteTemplates)
              .set({
                status: 'archived',
                updatedAt: new Date(),
              })
              .where(eq(noteTemplates.id, validatedId))
              .returning();

            return Response.json({ data: archivedTemplate });
          }
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
