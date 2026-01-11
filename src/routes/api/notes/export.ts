import { createFileRoute } from '@tanstack/react-router';
import { noteGenerationRepository } from '~/services/noteGeneration';
import { createErrorResponse, NotFoundError, ValidationError } from '~/lib/api-errors';
import { z } from 'zod';

// Validation schema for export request
const exportNoteSchema = z.object({
  noteId: z.string().uuid('Invalid note ID format'),
  format: z.enum(['plain', 'markdown', 'html']).optional().default('plain'),
  includeHeaders: z.boolean().optional().default(true),
  includeSeparators: z.boolean().optional().default(true),
  includeTimestamp: z.boolean().optional().default(false),
});

export type ExportFormat = 'plain' | 'markdown' | 'html';

export interface ExportNoteResponse {
  content: string;
  format: ExportFormat;
  noteId: string;
  wordCount: number;
  characterCount: number;
  exportedAt: string;
}

/**
 * Format note content based on the requested format
 */
function formatNoteContent(
  noteContent: string,
  plainTextContent: string,
  currentFormat: string,
  targetFormat: ExportFormat,
  options: {
    includeHeaders: boolean;
    includeSeparators: boolean;
    includeTimestamp: boolean;
  }
): string {
  let content: string;

  // Use plain text content for plain format, otherwise use formatted content
  if (targetFormat === 'plain') {
    content = plainTextContent;
  } else if (targetFormat === 'markdown') {
    // Convert to markdown format
    content = convertToMarkdown(noteContent, currentFormat, options);
  } else if (targetFormat === 'html') {
    // Convert to HTML format
    content = convertToHtml(noteContent, currentFormat, options);
  } else {
    content = plainTextContent;
  }

  // Add timestamp if requested
  if (options.includeTimestamp) {
    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
    if (targetFormat === 'html') {
      content += `\n<p class="timestamp"><em>Exported: ${timestamp}</em></p>`;
    } else if (targetFormat === 'markdown') {
      content += `\n\n---\n\n*Exported: ${timestamp}*`;
    } else {
      content += `\n\n---\nExported: ${timestamp}`;
    }
  }

  return content;
}

/**
 * Convert content to Markdown format
 */
function convertToMarkdown(
  content: string,
  currentFormat: string,
  options: { includeHeaders: boolean; includeSeparators: boolean }
): string {
  let markdown = content;

  // If already markdown or plain, process as-is
  if (currentFormat === 'html') {
    // Basic HTML to Markdown conversion
    markdown = markdown
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<[^>]+>/g, ''); // Remove remaining HTML tags
  }

  // Add section separators if requested
  if (options.includeSeparators) {
    markdown = markdown.replace(/\n{3,}/g, '\n\n---\n\n');
  }

  return markdown.trim();
}

/**
 * Convert content to HTML format
 */
function convertToHtml(
  content: string,
  currentFormat: string,
  options: { includeHeaders: boolean; includeSeparators: boolean }
): string {
  let html = content;

  if (currentFormat === 'plain' || currentFormat === 'markdown') {
    // Convert markdown/plain to HTML
    html = html
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    // Wrap in paragraph tags
    html = `<p>${html}</p>`;

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    // Add separators if requested
    if (options.includeSeparators) {
      html = html.replace(/<p>---<\/p>/g, '<hr/>');
    }
  }

  // Wrap in a document structure for standalone HTML
  const wrappedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clinical Note Export</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1, h2, h3 { color: #2563eb; margin-top: 1.5em; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 2em 0; }
    .timestamp { color: #6b7280; font-size: 0.875em; margin-top: 2em; }
  </style>
</head>
<body>
${html}
</body>
</html>`;

  return wrappedHtml;
}

export const Route = createFileRoute('/api/notes/export')({
  server: {
    handlers: {
      /**
       * POST /api/notes/export
       * Export a note in the specified format and mark it as exported
       *
       * Request body:
       * - noteId: string (required) - The note ID to export
       * - format: 'plain' | 'markdown' | 'html' (optional, default: 'plain')
       * - includeHeaders: boolean (optional, default: true)
       * - includeSeparators: boolean (optional, default: true)
       * - includeTimestamp: boolean (optional, default: false)
       */
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          // Validate request body
          const validation = exportNoteSchema.safeParse(body);
          if (!validation.success) {
            throw new ValidationError(
              'Invalid request body',
              validation.error.issues.map((e) => ({
                path: String(e.path.join('.')),
                message: e.message,
              }))
            );
          }

          const { noteId, format, includeHeaders, includeSeparators, includeTimestamp } =
            validation.data;

          // Get the note
          const note = await noteGenerationRepository.getFinalNoteById(noteId);

          if (!note) {
            throw new NotFoundError(`Note '${noteId}' not found`);
          }

          // Format the content based on requested format
          const formattedContent = formatNoteContent(
            note.noteContent,
            note.plainTextContent,
            note.format,
            format,
            { includeHeaders, includeSeparators, includeTimestamp }
          );

          // Mark the note as exported
          await noteGenerationRepository.markNoteExported(noteId);

          const response: ExportNoteResponse = {
            content: formattedContent,
            format,
            noteId,
            wordCount: note.wordCount || 0,
            characterCount: note.characterCount || 0,
            exportedAt: new Date().toISOString(),
          };

          return Response.json({ data: response });
        } catch (error) {
          return createErrorResponse(error);
        }
      },
    },
  },
});
