'use client';

import * as React from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FileType,
  FileCode,
  FileJson,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';
import { NoteSection, type NoteSectionData } from './NoteSection';

/**
 * Escape HTML special characters for safe embedding
 */
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

/**
 * Note format options
 */
export type NoteFormat = 'plain' | 'markdown' | 'html';

/**
 * Template type for the note
 */
export type TemplateType = 'SOAP' | 'DAP' | 'BIRP' | 'custom';

/**
 * Note metadata interface
 */
export interface NoteMeta {
  noteId: string;
  sessionId: string;
  templateName: string;
  templateType: TemplateType;
  format: NoteFormat;
  wordCount?: number;
  characterCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Export options for clipboard
 */
export interface ClipboardExportOptions {
  format: NoteFormat;
  includeHeaders?: boolean;
  includeSeparators?: boolean;
  includeTimestamp?: boolean;
}

/**
 * Copy/Export status for visual feedback
 */
export type ExportStatus = 'idle' | 'copying' | 'success' | 'error';

/**
 * Props for the NotePreview component
 */
export interface NotePreviewProps {
  meta: NoteMeta;
  sections: NoteSectionData[];
  isLoading?: boolean;
  readOnly?: boolean;
  onSectionUpdate?: (sectionId: string, content: string) => Promise<void>;
  onExport?: (format: NoteFormat) => Promise<void>;
  onRefine?: () => void;
  onCopy?: () => Promise<void>;
  /** Callback for clipboard export with format options */
  onClipboardExport?: (options: ClipboardExportOptions) => Promise<string>;
}

/**
 * Format badge component
 */
function FormatBadge({ format }: { format: NoteFormat }) {
  const formatLabels: Record<NoteFormat, string> = {
    plain: 'Plain Text',
    markdown: 'Markdown',
    html: 'HTML',
  };

  return (
    <span
      className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
      data-testid="format-badge"
    >
      {formatLabels[format]}
    </span>
  );
}

/**
 * Template type badge component
 */
function TemplateTypeBadge({ type }: { type: TemplateType }) {
  return (
    <span
      className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
      data-testid="template-type-badge"
    >
      {type}
    </span>
  );
}

/**
 * Note statistics component
 */
function NoteStats({
  wordCount,
  characterCount,
  createdAt,
  updatedAt,
}: {
  wordCount?: number;
  characterCount?: number;
  createdAt: Date;
  updatedAt?: Date;
}) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div
      className="flex flex-wrap gap-4 text-sm text-muted-foreground"
      data-testid="note-stats"
    >
      {wordCount !== undefined && (
        <span data-testid="word-count">
          <strong>{wordCount.toLocaleString()}</strong> words
        </span>
      )}
      {characterCount !== undefined && (
        <span data-testid="char-count">
          <strong>{characterCount.toLocaleString()}</strong> characters
        </span>
      )}
      <span className="flex items-center gap-1" data-testid="created-date">
        <Clock className="h-3 w-3" />
        Created {formatDate(createdAt)}
      </span>
      {updatedAt && updatedAt > createdAt && (
        <span data-testid="updated-date">Updated {formatDate(updatedAt)}</span>
      )}
    </div>
  );
}

/**
 * Export feedback notification component
 */
function ExportFeedback({
  status,
  format,
  onDismiss,
}: {
  status: ExportStatus;
  format?: NoteFormat;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onDismiss]);

  if (status === 'idle') return null;

  const formatLabels: Record<NoteFormat, string> = {
    plain: 'Plain Text',
    markdown: 'Markdown',
    html: 'HTML',
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg transition-all duration-300',
        status === 'copying' && 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200',
        status === 'success' && 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200',
        status === 'error' && 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
      )}
      role="status"
      aria-live="polite"
      data-testid="export-feedback"
    >
      {status === 'copying' && (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Copying to clipboard...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle2 className="h-5 w-5" />
          <span>
            Copied as {format ? formatLabels[format] : 'text'}!
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <XCircle className="h-5 w-5" />
          <span>Failed to copy. Please try again.</span>
        </>
      )}
      <button
        onClick={onDismiss}
        className="ml-2 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10"
        aria-label="Dismiss"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Export format selector dropdown
 */
function ExportFormatSelector({
  onExport,
  disabled,
}: {
  onExport: (format: NoteFormat) => void;
  disabled?: boolean;
}) {
  const formats: Array<{ value: NoteFormat; label: string; icon: React.ReactNode; description: string }> = [
    {
      value: 'plain',
      label: 'Plain Text',
      icon: <FileType className="h-4 w-4" />,
      description: 'Simple text without formatting',
    },
    {
      value: 'markdown',
      label: 'Markdown',
      icon: <FileCode className="h-4 w-4" />,
      description: 'Formatted with Markdown syntax',
    },
    {
      value: 'html',
      label: 'HTML',
      icon: <FileJson className="h-4 w-4" />,
      description: 'Full HTML document format',
    },
  ];

  return (
    <Select
      onValueChange={(value) => onExport(value as NoteFormat)}
      disabled={disabled}
    >
      <SelectTrigger
        className="w-[140px] h-9"
        data-testid="export-format-selector"
        aria-label="Select export format"
      >
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <SelectValue placeholder="Export as..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {formats.map((format) => (
          <SelectItem
            key={format.value}
            value={format.value}
            data-testid={`export-format-${format.value}`}
          >
            <div className="flex items-center gap-2">
              {format.icon}
              <div className="flex flex-col">
                <span className="font-medium">{format.label}</span>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Loading skeleton for the note preview
 */
function NotePreviewSkeleton() {
  return (
    <Card className="animate-pulse" data-testid="note-preview-skeleton">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 w-48 rounded bg-muted" />
            <div className="h-4 w-64 rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded bg-muted" />
            <div className="h-9 w-24 rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="h-5 w-24 rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted" />
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-4 w-5/6 rounded bg-muted" />
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <div className="h-4 w-48 rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

/**
 * NotePreview component for displaying completed clinical notes
 * with proper formatting, section headers, and professional styling.
 * Includes inline editing capability for minor corrections before finalizing.
 */
export function NotePreview({
  meta,
  sections,
  isLoading = false,
  readOnly = false,
  onSectionUpdate,
  onExport,
  onRefine,
  onCopy,
  onClipboardExport,
}: NotePreviewProps) {
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState<ExportStatus>('idle');
  const [lastExportFormat, setLastExportFormat] = React.useState<NoteFormat | undefined>();

  // Sort sections by display order
  const sortedSections = React.useMemo(
    () => [...sections].sort((a, b) => a.displayOrder - b.displayOrder),
    [sections]
  );

  const handleEdit = (sectionId: string) => {
    setEditingSectionId(sectionId);
  };

  const handleSave = async (sectionId: string, content: string) => {
    if (onSectionUpdate) {
      setIsSaving(true);
      try {
        await onSectionUpdate(sectionId, content);
        setEditingSectionId(null);
      } finally {
        setIsSaving(false);
      }
    } else {
      setEditingSectionId(null);
    }
  };

  const handleCancel = () => {
    setEditingSectionId(null);
  };

  /**
   * Handle one-click copy to clipboard with format preservation
   */
  const handleCopy = async () => {
    setExportStatus('copying');
    setLastExportFormat('plain');

    try {
      if (onCopy) {
        await onCopy();
      } else {
        // Default copy behavior - combine all section content with format preservation
        const fullContent = sortedSections
          .map((section) => `${section.sectionName}\n\n${section.content}`)
          .join('\n\n---\n\n');

        await navigator.clipboard.writeText(fullContent);
      }

      setExportStatus('success');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setExportStatus('error');
    }
  };

  /**
   * Handle clipboard export with specific format
   */
  const handleClipboardExport = async (format: NoteFormat) => {
    setExportStatus('copying');
    setLastExportFormat(format);

    try {
      let content: string;

      if (onClipboardExport) {
        // Use the provided export handler
        content = await onClipboardExport({
          format,
          includeHeaders: true,
          includeSeparators: true,
        });
      } else {
        // Default format-aware export behavior
        content = formatNoteForClipboard(sortedSections, format);
      }

      await navigator.clipboard.writeText(content);
      setExportStatus('success');
    } catch (error) {
      console.error('Failed to export to clipboard:', error);
      setExportStatus('error');
    }
  };

  /**
   * Format note content for clipboard based on target format
   */
  const formatNoteForClipboard = (
    sections: NoteSectionData[],
    format: NoteFormat
  ): string => {
    switch (format) {
      case 'markdown':
        return sections
          .map((section) => `## ${section.sectionName}\n\n${section.content}`)
          .join('\n\n---\n\n');

      case 'html':
        const htmlSections = sections
          .map(
            (section) =>
              `<section>\n  <h2>${escapeHtml(section.sectionName)}</h2>\n  <p>${escapeHtml(section.content).replace(/\n/g, '<br/>')}</p>\n</section>`
          )
          .join('\n<hr/>\n');
        return `<!DOCTYPE html>\n<html>\n<head><title>${escapeHtml(meta.templateName)}</title></head>\n<body>\n${htmlSections}\n</body>\n</html>`;

      case 'plain':
      default:
        return sections
          .map((section) => `${section.sectionName}\n\n${section.content}`)
          .join('\n\n---\n\n');
    }
  };

  const handleDismissExportFeedback = React.useCallback(() => {
    setExportStatus('idle');
  }, []);

  if (isLoading) {
    return <NotePreviewSkeleton />;
  }

  return (
    <Card data-testid="note-preview" className="shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Title and metadata */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl" data-testid="note-title">
                {meta.templateName}
              </CardTitle>
            </div>
            <CardDescription className="flex flex-wrap gap-2" data-testid="note-description">
              <TemplateTypeBadge type={meta.templateType} />
              <FormatBadge format={meta.format} />
              {sections.some((s) => s.needsReview) && (
                <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Review Required
                </span>
              )}
            </CardDescription>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {/* One-click copy button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={isSaving || exportStatus === 'copying'}
              data-testid="copy-button"
              aria-label={isCopied ? 'Copied to clipboard' : 'Copy to clipboard'}
            >
              {exportStatus === 'copying' && lastExportFormat === 'plain' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1">Copying...</span>
                </>
              ) : isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="ml-1">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span className="ml-1">Copy</span>
                </>
              )}
            </Button>

            {/* Export format selector dropdown */}
            <ExportFormatSelector
              onExport={handleClipboardExport}
              disabled={isSaving || exportStatus === 'copying'}
            />

            {/* Legacy export button if onExport is provided */}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport(meta.format)}
                disabled={isSaving}
                data-testid="export-button"
                aria-label="Export note"
              >
                <Download className="h-4 w-4" />
                <span className="ml-1">Export</span>
              </Button>
            )}

            {onRefine && !readOnly && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRefine}
                disabled={isSaving || editingSectionId !== null}
                data-testid="refine-button"
                aria-label="Refine note with AI"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="ml-1">Refine</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-testid="collapse-button"
              aria-label={isCollapsed ? 'Expand sections' : 'Collapse sections'}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-4 w-4" />
                  <span className="ml-1">Expand</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4" />
                  <span className="ml-1">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4" data-testid="note-sections-container">
          {sortedSections.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
              data-testid="empty-sections"
            >
              <FileText className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No sections available</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                This note doesn't have any sections to display.
              </p>
            </div>
          ) : (
            sortedSections.map((section) => (
              <NoteSection
                key={section.sectionId}
                section={section}
                isEditing={editingSectionId === section.sectionId}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                readOnly={readOnly || (editingSectionId !== null && editingSectionId !== section.sectionId)}
              />
            ))
          )}
        </CardContent>
      )}

      <CardFooter
        className={cn(
          'flex flex-col gap-4 pt-6 border-t',
          isCollapsed && 'border-t-0 pt-0'
        )}
      >
        <NoteStats
          wordCount={meta.wordCount}
          characterCount={meta.characterCount}
          createdAt={meta.createdAt}
          updatedAt={meta.updatedAt}
        />

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="saving-indicator">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Saving changes...
          </div>
        )}
      </CardFooter>

      {/* Export feedback notification */}
      <ExportFeedback
        status={exportStatus}
        format={lastExportFormat}
        onDismiss={handleDismissExportFeedback}
      />
    </Card>
  );
}

export default NotePreview;
