/**
 * Templates API Routes
 * Hono router for template management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { noteTemplates, templateSections, templateFields } from '~/db/schema';
import {
  createNoteTemplateSchema,
  templateQuerySchema,
  updateNoteTemplateSchema,
} from '~/lib/validations/noteTemplates';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, ne, asc, desc } from 'drizzle-orm';
import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const templatesRouter = new Hono();

/**
 * GET /api/templates
 * List all templates with optional filtering
 */
templatesRouter.get('/', async (c) => {
  try {
    const queryParams = {
      status: c.req.query('status') || undefined,
      templateType: c.req.query('templateType') || undefined,
      isDefault: c.req.query('isDefault')
        ? c.req.query('isDefault') === 'true'
        : undefined,
      includeArchived: c.req.query('includeArchived') === 'true',
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0,
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

    return c.json({
      data: templates,
      pagination: {
        total: allTemplates.length,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + templates.length < allTemplates.length,
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
 * POST /api/templates
 * Create a new template
 */
templatesRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

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

    return c.json({ data: newTemplate }, 201);
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/templates/:id
 * Get a single template by ID with all sections and fields
 */
templatesRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

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

    return c.json({ data: template });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * PUT /api/templates/:id
 * Update an existing template
 */
templatesRouter.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    // Validate ID format
    const validatedId = uuidSchema.parse(id);

    // Check if template exists
    const existingTemplate = await db.query.noteTemplates.findFirst({
      where: eq(noteTemplates.id, validatedId),
    });

    if (!existingTemplate) {
      throw new NotFoundError(`Template with ID ${id} not found`);
    }

    const body = await c.req.json();

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
    await db
      .update(noteTemplates)
      .set(updateData)
      .where(eq(noteTemplates.id, validatedId));

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

    return c.json({ data: templateWithRelations });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete a template (soft delete by setting status to 'archived')
 */
templatesRouter.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();

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
    const hardDelete = c.req.query('hard') === 'true';

    if (hardDelete) {
      // Hard delete - cascade will handle sections and fields
      await db.delete(noteTemplates).where(eq(noteTemplates.id, validatedId));

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

      return c.json({ data: archivedTemplate });
    }
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
