import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { noteTemplates, templateSections, templateFields } from '~/db/schema';
import {
  createNoteTemplateSchema,
  templateQuerySchema,
} from '~/lib/validations/noteTemplates';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, or, ne, asc, desc } from 'drizzle-orm';

export const Route = createFileRoute('/api/templates/')({
  server: {
    handlers: {
      /**
       * GET /api/templates
       * List all templates with optional filtering
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            status: url.searchParams.get('status') || undefined,
            templateType: url.searchParams.get('templateType') || undefined,
            isDefault: url.searchParams.get('isDefault')
              ? url.searchParams.get('isDefault') === 'true'
              : undefined,
            includeArchived: url.searchParams.get('includeArchived') === 'true',
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
          };

          // Validate query parameters
          const validatedQuery = templateQuerySchema.parse(queryParams);

          // Build where conditions
          const conditions = [];

          if (validatedQuery.status) {
            conditions.push(eq(noteTemplates.status, validatedQuery.status));
          }

          if (validatedQuery.templateType) {
            conditions.push(eq(noteTemplates.templateType, validatedQuery.templateType));
          }

          if (validatedQuery.isDefault !== undefined) {
            conditions.push(eq(noteTemplates.isDefault, validatedQuery.isDefault));
          }

          // Exclude archived unless explicitly requested
          if (!validatedQuery.includeArchived) {
            conditions.push(ne(noteTemplates.status, 'archived'));
          }

          // Query templates
          const templates = await db.query.noteTemplates.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            limit: validatedQuery.limit,
            offset: validatedQuery.offset,
            orderBy: [desc(noteTemplates.updatedAt)],
            with: {
              sections: {
                orderBy: [asc(templateSections.displayOrder)],
              },
            },
          });

          // Get total count for pagination
          const allTemplates = await db.query.noteTemplates.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
          });

          return Response.json({
            data: templates,
            pagination: {
              total: allTemplates.length,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + templates.length < allTemplates.length,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/templates
       * Create a new template
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validatedData = createNoteTemplateSchema.parse(body);

          // Insert the template
          const [newTemplate] = await db
            .insert(noteTemplates)
            .values({
              name: validatedData.name,
              description: validatedData.description ?? null,
              templateType: validatedData.templateType,
              isDefault: validatedData.isDefault,
              status: validatedData.status,
              version: validatedData.version,
              parentTemplateId: validatedData.parentTemplateId ?? null,
            })
            .returning();

          return Response.json(
            { data: newTemplate },
            { status: 201 }
          );
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
