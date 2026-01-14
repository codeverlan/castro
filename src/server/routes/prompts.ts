/**
 * Processing Prompts API Routes
 * Hono router for prompt management
 */

import { Hono } from 'hono';
import { db } from '~/db';
import { processingPrompts } from '~/db/schema';
import {
  createProcessingPromptSchema,
  promptQuerySchema,
  updateProcessingPromptSchema,
} from '~/lib/validations/processingPrompts';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';

export const promptsRouter = new Hono();

/**
 * GET /api/prompts
 * List all prompts with optional filtering
 */
promptsRouter.get('/', async (c) => {
  try {
    const queryParams = {
      promptType: c.req.query('promptType') || undefined,
      isActive: c.req.query('isActive')
        ? c.req.query('isActive') === 'true'
        : undefined,
      isDefault: c.req.query('isDefault')
        ? c.req.query('isDefault') === 'true'
        : undefined,
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!, 10) : 0,
    };

    // Validate query parameters
    const validatedQuery = promptQuerySchema.parse(queryParams);

    // Build where conditions
    const conditions = [];

    if (validatedQuery.promptType) {
      conditions.push(eq(processingPrompts.promptType, validatedQuery.promptType));
    }

    if (validatedQuery.isActive !== undefined) {
      conditions.push(eq(processingPrompts.isActive, validatedQuery.isActive));
    }

    if (validatedQuery.isDefault !== undefined) {
      conditions.push(eq(processingPrompts.isDefault, validatedQuery.isDefault));
    }

    // Query prompts
    const prompts = await db.query.processingPrompts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit: validatedQuery.limit,
      offset: validatedQuery.offset,
      orderBy: [desc(processingPrompts.updatedAt)],
    });

    // Get total count for pagination
    const allPrompts = await db.query.processingPrompts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
    });

    return c.json({
      data: prompts,
      pagination: {
        total: allPrompts.length,
        limit: validatedQuery.limit,
        offset: validatedQuery.offset,
        hasMore: validatedQuery.offset + prompts.length < allPrompts.length,
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
 * POST /api/prompts
 * Create a new prompt
 */
promptsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();

    // Validate request body
    const validatedData = createProcessingPromptSchema.parse(body);

    // If this prompt is being set as default, unset other defaults of same type
    if (validatedData.isDefault) {
      await db
        .update(processingPrompts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(processingPrompts.promptType, validatedData.promptType));
    }

    // Create the prompt
    const [newPrompt] = await db
      .insert(processingPrompts)
      .values({
        name: validatedData.name,
        description: validatedData.description,
        promptType: validatedData.promptType,
        systemPrompt: validatedData.systemPrompt,
        userPromptTemplate: validatedData.userPromptTemplate,
        outputFormat: validatedData.outputFormat,
        targetModel: validatedData.targetModel,
        isDefault: validatedData.isDefault,
        isActive: validatedData.isActive,
      })
      .returning();

    return c.json({ data: newPrompt }, 201);
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * GET /api/prompts/:id
 * Get a specific prompt by ID
 */
promptsRouter.get('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const prompt = await db.query.processingPrompts.findFirst({
      where: eq(processingPrompts.id, id),
    });

    if (!prompt) {
      throw new NotFoundError(`Prompt with ID ${id} not found`);
    }

    return c.json({ data: prompt });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * PUT /api/prompts/:id
 * Update a prompt
 */
promptsRouter.put('/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const existingPrompt = await db.query.processingPrompts.findFirst({
      where: eq(processingPrompts.id, id),
    });

    if (!existingPrompt) {
      throw new NotFoundError(`Prompt with ID ${id} not found`);
    }

    // Validate request body
    const validatedData = updateProcessingPromptSchema.parse(body);

    // If setting as default, unset other defaults of same type
    if (validatedData.isDefault && existingPrompt.promptType) {
      await db
        .update(processingPrompts)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(processingPrompts.promptType, existingPrompt.promptType),
            eq(processingPrompts.id, id) // Exclude current prompt
          )
        );
    }

    // Update the prompt
    const [updatedPrompt] = await db
      .update(processingPrompts)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(processingPrompts.id, id))
      .returning();

    return c.json({ data: updatedPrompt });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * DELETE /api/prompts/:id
 * Delete a prompt
 */
promptsRouter.delete('/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const existingPrompt = await db.query.processingPrompts.findFirst({
      where: eq(processingPrompts.id, id),
    });

    if (!existingPrompt) {
      throw new NotFoundError(`Prompt with ID ${id} not found`);
    }

    await db.delete(processingPrompts).where(eq(processingPrompts.id, id));

    return new Response(null, { status: 204 });
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});

/**
 * POST /api/prompts/:id/duplicate
 * Duplicate a prompt
 */
promptsRouter.post('/:id/duplicate', async (c) => {
  try {
    const { id } = c.req.param();

    const existingPrompt = await db.query.processingPrompts.findFirst({
      where: eq(processingPrompts.id, id),
    });

    if (!existingPrompt) {
      throw new NotFoundError(`Prompt with ID ${id} not found`);
    }

    // Create duplicate with modified name
    const [duplicatedPrompt] = await db
      .insert(processingPrompts)
      .values({
        name: `${existingPrompt.name} (Copy)`,
        description: existingPrompt.description,
        promptType: existingPrompt.promptType,
        systemPrompt: existingPrompt.systemPrompt,
        userPromptTemplate: existingPrompt.userPromptTemplate,
        outputFormat: existingPrompt.outputFormat,
        targetModel: existingPrompt.targetModel,
        isDefault: false, // Never duplicate as default
        isActive: existingPrompt.isActive,
      })
      .returning();

    return c.json({ data: duplicatedPrompt }, 201);
  } catch (error) {
    const response = createErrorResponse(error);
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  }
});
