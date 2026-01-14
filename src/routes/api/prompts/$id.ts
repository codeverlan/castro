/**
 * Processing Prompt API Routes - Individual Prompt
 * GET /api/prompts/:id - Get prompt details
 * PUT /api/prompts/:id - Update a prompt
 * DELETE /api/prompts/:id - Soft delete a prompt (set isActive=false)
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { processingPrompts } from '~/db/schema';
import { updateProcessingPromptSchema } from '~/lib/validations/processingPrompts';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';

export const Route = createFileRoute('/api/prompts/$id')({
  server: {
    handlers: {
      /**
       * GET /api/prompts/:id
       * Get prompt details
       */
      GET: async ({ params }) => {
        try {
          const { id } = params;

          const prompt = await db.query.processingPrompts.findFirst({
            where: eq(processingPrompts.id, id),
          });

          if (!prompt) {
            throw new NotFoundError(`Prompt with ID '${id}' not found`);
          }

          return Response.json({ data: prompt });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * PUT /api/prompts/:id
       * Update a prompt
       */
      PUT: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();

          // Validate request body
          const validatedData = updateProcessingPromptSchema.parse(body);

          // Check if prompt exists
          const existingPrompt = await db.query.processingPrompts.findFirst({
            where: eq(processingPrompts.id, id),
          });

          if (!existingPrompt) {
            throw new NotFoundError(`Prompt with ID '${id}' not found`);
          }

          // If setting as default, unset other defaults of same type
          const promptType = validatedData.promptType || existingPrompt.promptType;
          if (validatedData.isDefault === true) {
            await db
              .update(processingPrompts)
              .set({ isDefault: false, updatedAt: new Date() })
              .where(eq(processingPrompts.promptType, promptType));
          }

          // Build update object
          const updateData: Record<string, unknown> = {
            updatedAt: new Date(),
          };

          if (validatedData.name !== undefined) updateData.name = validatedData.name;
          if (validatedData.description !== undefined) updateData.description = validatedData.description;
          if (validatedData.promptType !== undefined) updateData.promptType = validatedData.promptType;
          if (validatedData.systemPrompt !== undefined) updateData.systemPrompt = validatedData.systemPrompt;
          if (validatedData.userPromptTemplate !== undefined) updateData.userPromptTemplate = validatedData.userPromptTemplate;
          if (validatedData.outputFormat !== undefined) updateData.outputFormat = validatedData.outputFormat;
          if (validatedData.targetModel !== undefined) updateData.targetModel = validatedData.targetModel;
          if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;
          if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

          // Increment version for significant content changes
          if (validatedData.systemPrompt || validatedData.userPromptTemplate) {
            updateData.version = existingPrompt.version + 1;
          }

          // Update the prompt
          const [updatedPrompt] = await db
            .update(processingPrompts)
            .set(updateData)
            .where(eq(processingPrompts.id, id))
            .returning();

          return Response.json({ data: updatedPrompt });
        } catch (error) {
          return createErrorResponse(error);
        }
      },

      /**
       * DELETE /api/prompts/:id
       * Soft delete a prompt (set isActive=false)
       */
      DELETE: async ({ params }) => {
        try {
          const { id } = params;

          // Check if prompt exists
          const existingPrompt = await db.query.processingPrompts.findFirst({
            where: eq(processingPrompts.id, id),
          });

          if (!existingPrompt) {
            throw new NotFoundError(`Prompt with ID '${id}' not found`);
          }

          // Soft delete by setting isActive to false
          const [deletedPrompt] = await db
            .update(processingPrompts)
            .set({
              isActive: false,
              isDefault: false, // Also remove default status
              updatedAt: new Date(),
            })
            .where(eq(processingPrompts.id, id))
            .returning();

          return Response.json({
            data: deletedPrompt,
            message: 'Prompt deactivated successfully',
          });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
