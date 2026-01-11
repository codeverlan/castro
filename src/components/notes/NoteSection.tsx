'use client';

import * as React from 'react';
import { Pencil, Check, X, AlertCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { cn } from '~/lib/utils';

/**
 * Section content interface for note sections
 */
export interface NoteSectionData {
  sectionId: string;
  sectionName: string;
  content: string;
  displayOrder: number;
  confidenceScore?: number | null;
  needsReview?: boolean;
}

/**
 * Props for the NoteSection component
 */
export interface NoteSectionProps {
  section: NoteSectionData;
  isEditing?: boolean;
  onEdit?: (sectionId: string) => void;
  onSave?: (sectionId: string, content: string) => void;
  onCancel?: (sectionId: string) => void;
  readOnly?: boolean;
}

/**
 * Confidence indicator component
 */
function ConfidenceIndicator({ score }: { score: number }) {
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium',
        getConfidenceColor(score)
      )}
      data-testid="confidence-indicator"
      aria-label={`Confidence: ${getConfidenceLabel(score)} (${score}%)`}
    >
      {getConfidenceLabel(score)} confidence ({score}%)
    </span>
  );
}

/**
 * NoteSection component for displaying and editing individual sections
 * of a clinical note with proper formatting and inline editing capability
 */
export function NoteSection({
  section,
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  readOnly = false,
}: NoteSectionProps) {
  const [editContent, setEditContent] = React.useState(section.content);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  // Reset edit content when section changes
  React.useEffect(() => {
    setEditContent(section.content);
  }, [section.content]);

  const handleSave = () => {
    onSave?.(section.sectionId, editContent);
  };

  const handleCancel = () => {
    setEditContent(section.content);
    onCancel?.(section.sectionId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Ctrl/Cmd + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-all',
        isEditing && 'ring-2 ring-ring',
        section.needsReview && !isEditing && 'border-yellow-300 dark:border-yellow-700'
      )}
      data-testid={`note-section-${section.sectionId}`}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3
            className="text-lg font-semibold text-foreground"
            data-testid={`section-title-${section.sectionId}`}
          >
            {section.sectionName}
          </h3>
          {section.needsReview && !isEditing && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              data-testid="needs-review-badge"
            >
              <AlertCircle className="h-3 w-3" />
              Needs Review
            </span>
          )}
        </div>

        {/* Edit/Save/Cancel buttons */}
        {!readOnly && (
          <div className="flex items-center gap-1">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  data-testid={`save-button-${section.sectionId}`}
                  aria-label="Save changes"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                >
                  <Check className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:ml-1">Save</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  data-testid={`cancel-button-${section.sectionId}`}
                  aria-label="Cancel editing"
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only md:ml-1">Cancel</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit?.(section.sectionId)}
                data-testid={`edit-button-${section.sectionId}`}
                aria-label={`Edit ${section.sectionName}`}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only md:not-sr-only md:ml-1">Edit</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Section Content */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-y font-mono text-sm"
            data-testid={`section-textarea-${section.sectionId}`}
            aria-label={`Edit ${section.sectionName} content`}
          />
          <p className="text-xs text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Ctrl+Enter</kbd> to save,{' '}
            <kbd className="rounded bg-muted px-1 py-0.5 font-mono text-xs">Esc</kbd> to cancel
          </p>
        </div>
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          data-testid={`section-content-${section.sectionId}`}
        >
          {/* Render content with proper paragraph formatting */}
          {section.content.split('\n\n').map((paragraph, index) => (
            <p key={index} className="text-sm text-foreground leading-relaxed mb-2 last:mb-0">
              {paragraph.split('\n').map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {line}
                  {lineIndex < paragraph.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      )}

      {/* Confidence Score (shown when not editing) */}
      {!isEditing && section.confidenceScore !== undefined && section.confidenceScore !== null && (
        <div className="mt-3 pt-3 border-t border-border">
          <ConfidenceIndicator score={section.confidenceScore} />
        </div>
      )}
    </div>
  );
}

export default NoteSection;
