/**
 * Processing Prompts API Routes
 * GET /api/prompts - List all prompts with optional filtering
 * POST /api/prompts - Create a new prompt
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { processingPrompts } from '~/db/schema';
import {
  createProcessingPromptSchema,
  promptQuerySchema,
} from '~/lib/validations/processingPrompts';
import { createErrorResponse } from '~/lib/api-errors';
import { eq, and, desc } from 'drizzle-orm';

export const Route = createFileRoute('/api/prompts/')({
  server: {
    handlers: {
      /**
       * GET /api/prompts
       * List all prompts with optional filtering
       */
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const queryParams = {
            promptType: url.searchParams.get('promptType') || undefined,
            isActive: url.searchParams.get('isActive')
              ? url.searchParams.get('isActive') === 'true'
              : undefined,
            isDefault: url.searchParams.get('isDefault')
              ? url.searchParams.get('isDefault') === 'true'
              : undefined,
            limit: url.searchParams.get('limit')
              ? parseInt(url.searchParams.get('limit')!, 10)
              : 50,
            offset: url.searchParams.get('offset')
              ? parseInt(url.searchParams.get('offset')!, 10)
              : 0,
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

          return Response.json({
            data: prompts,
            pagination: {
              total: allPrompts.length,
              limit: validatedQuery.limit,
              offset: validatedQuery.offset,
              hasMore: validatedQuery.offset + prompts.length < allPrompts.length,
            },
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * POST /api/prompts
       * Create a new prompt
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

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

          return Response.json({ data: newPrompt }, { status: 201 });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
