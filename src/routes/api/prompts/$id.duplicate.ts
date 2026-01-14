/**
 * Duplicate Processing Prompt API Route
 * POST /api/prompts/:id/duplicate - Create a copy of an existing prompt
 */

import { createFileRoute } from '@tanstack/react-router';
import { db } from '~/db';
import { processingPrompts } from '~/db/schema';
import { createErrorResponse, NotFoundError } from '~/lib/api-errors';
import { eq } from 'drizzle-orm';

export const Route = createFileRoute('/api/prompts/$id/duplicate')({
  server: {
    handlers: {
      /**
       * POST /api/prompts/:id/duplicate
       * Create a copy of an existing prompt for editing
       */
      POST: async ({ request, params }) => {
        try {
          const { id } = params;

          // Get the prompt to duplicate
          const sourcePrompt = await db.query.processingPrompts.findFirst({
            where: eq(processingPrompts.id, id),
          });

          if (!sourcePrompt) {
            throw new NotFoundError(`Prompt with ID '${id}' not found`);
          }

          // Get optional new name from request body
          let newName = `${sourcePrompt.name} (Copy)`;
          try {
            const body = await request.json();
            if (body.name) {
              newName = body.name;
            }
          } catch {
            // No body provided, use default name
          }

          // Create the duplicate
          const [duplicatedPrompt] = await db
            .insert(processingPrompts)
            .values({
              name: newName,
              description: sourcePrompt.description,
              promptType: sourcePrompt.promptType,
              systemPrompt: sourcePrompt.systemPrompt,
              userPromptTemplate: sourcePrompt.userPromptTemplate,
              outputFormat: sourcePrompt.outputFormat,
              targetModel: sourcePrompt.targetModel,
              isDefault: false, // Never copy default status
              isActive: true,
              version: 1, // Reset version for new prompt
            })
            .returning();

          return Response.json(
            {
              data: duplicatedPrompt,
              message: 'Prompt duplicated successfully',
            },
            { status: 201 }
          );
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
