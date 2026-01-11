import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { GapField } from './GapField';
import { cn } from '~/lib/utils';
import type {
  GapPrompt,
  GapFieldConfig,
  GapResponseValue,
  SubmitGapResponses,
} from '~/lib/validations/gapPrompt';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';

// =============================================================================
// GapPromptUI Component
// =============================================================================
// A conversational UI component that presents users with specific questions
// for missing information. Supports text input, dropdowns, and multi-select
// based on field types with validation.
// =============================================================================

export interface GapPromptUIProps {
  /** The session ID this gap prompt is for */
  sessionId: string;
  /** Array of gap prompts to display */
  gaps: GapPrompt[];
  /** Callback when all gaps are submitted */
  onSubmit: (data: SubmitGapResponses) => Promise<void>;
  /** Callback when user skips a gap */
  onSkip?: (gapId: string) => void;
  /** Callback when user navigates between gaps */
  onNavigate?: (currentIndex: number, direction: 'prev' | 'next') => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Custom class name for the container */
  className?: string;
  /** Whether to show navigation controls */
  showNavigation?: boolean;
  /** Whether to show progress indicator */
  showProgress?: boolean;
  /** Custom title for the prompt UI */
  title?: string;
  /** Custom description for the prompt UI */
  description?: string;
}

export function GapPromptUI({
  sessionId,
  gaps,
  onSubmit,
  onSkip,
  onNavigate,
  isLoading = false,
  className,
  showNavigation = true,
  showProgress = true,
  title = 'Additional Information Needed',
  description = 'Please provide the following information to complete your documentation.',
}: GapPromptUIProps) {
  // State management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, GapResponseValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Current gap and field
  const currentGap = gaps[currentIndex];
  const totalGaps = gaps.length;
  const isFirstGap = currentIndex === 0;
  const isLastGap = currentIndex === totalGaps - 1;

  // Calculate progress
  const answeredCount = useMemo(() => {
    return gaps.filter((gap) => {
      const response = responses[gap.id];
      return response !== undefined && response !== null && response !== '' &&
        !(Array.isArray(response) && response.length === 0);
    }).length;
  }, [gaps, responses]);

  const progressPercentage = useMemo(() => {
    return totalGaps > 0 ? Math.round((answeredCount / totalGaps) * 100) : 0;
  }, [answeredCount, totalGaps]);

  // Validation function
  const validateField = useCallback((gap: GapPrompt, value: GapResponseValue): string | null => {
    const { field } = gap;
    const { isRequired, validationRules, fieldType } = field;

    // Check required
    if (isRequired) {
      if (value === undefined || value === null || value === '') {
        return 'This field is required';
      }
      if (Array.isArray(value) && value.length === 0) {
        return 'Please select at least one option';
      }
    }

    // Skip validation for empty optional fields
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return null;
    }

    // String-based validations
    if (typeof value === 'string' && validationRules) {
      // Min length
      if (validationRules.minLength !== undefined && value.length < validationRules.minLength) {
        return `Must be at least ${validationRules.minLength} characters`;
      }

      // Max length
      if (validationRules.maxLength !== undefined && value.length > validationRules.maxLength) {
        return `Must be no more than ${validationRules.maxLength} characters`;
      }

      // Pattern
      if (validationRules.pattern) {
        const regex = new RegExp(validationRules.pattern);
        if (!regex.test(value)) {
          return validationRules.patternMessage || 'Invalid format';
        }
      }

      // Number validations
      if (fieldType === 'number') {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          return 'Please enter a valid number';
        }
        if (validationRules.min !== undefined && numValue < validationRules.min) {
          return `Must be at least ${validationRules.min}`;
        }
        if (validationRules.max !== undefined && numValue > validationRules.max) {
          return `Must be no more than ${validationRules.max}`;
        }
      }
    }

    return null;
  }, []);

  // Handle value change
  const handleValueChange = useCallback((gapId: string, value: GapResponseValue) => {
    setResponses((prev) => ({
      ...prev,
      [gapId]: value,
    }));

    // Clear error when user starts typing
    if (errors[gapId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[gapId];
        return newErrors;
      });
    }
  }, [errors]);

  // Handle field blur (for validation)
  const handleFieldBlur = useCallback((gap: GapPrompt) => {
    setTouchedFields((prev) => new Set(prev).add(gap.id));

    const value = responses[gap.id];
    const error = validateField(gap, value);

    if (error) {
      setErrors((prev) => ({
        ...prev,
        [gap.id]: error,
      }));
    }
  }, [responses, validateField]);

  // Validate current gap
  const validateCurrentGap = useCallback((): boolean => {
    if (!currentGap) return true;

    const value = responses[currentGap.id];
    const error = validateField(currentGap, value);

    if (error) {
      setErrors((prev) => ({
        ...prev,
        [currentGap.id]: error,
      }));
      setTouchedFields((prev) => new Set(prev).add(currentGap.id));
      return false;
    }

    return true;
  }, [currentGap, responses, validateField]);

  // Validate all gaps
  const validateAllGaps = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    for (const gap of gaps) {
      const value = responses[gap.id];
      const error = validateField(gap, value);

      if (error) {
        newErrors[gap.id] = error;
        hasErrors = true;
      }
    }

    setErrors(newErrors);
    setTouchedFields(new Set(gaps.map((g) => g.id)));

    return !hasErrors;
  }, [gaps, responses, validateField]);

  // Navigate to previous gap
  const handlePrevious = useCallback(() => {
    if (isFirstGap) return;

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    onNavigate?.(newIndex, 'prev');
  }, [currentIndex, isFirstGap, onNavigate]);

  // Navigate to next gap
  const handleNext = useCallback(() => {
    if (isLastGap) return;

    // Validate current gap before moving forward
    if (!validateCurrentGap()) return;

    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    onNavigate?.(newIndex, 'next');
  }, [currentIndex, isLastGap, onNavigate, validateCurrentGap]);

  // Handle skip
  const handleSkip = useCallback(() => {
    if (!currentGap) return;

    // Clear any required field error for this gap
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[currentGap.id];
      return newErrors;
    });

    onSkip?.(currentGap.id);

    // Move to next gap if not the last one
    if (!isLastGap) {
      handleNext();
    }
  }, [currentGap, handleNext, isLastGap, onSkip]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Validate all gaps
    if (!validateAllGaps()) {
      // Find first gap with error and navigate to it
      const firstErrorIndex = gaps.findIndex((gap) => errors[gap.id]);
      if (firstErrorIndex !== -1 && firstErrorIndex !== currentIndex) {
        setCurrentIndex(firstErrorIndex);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: SubmitGapResponses = {
        sessionId,
        responses: gaps.map((gap) => ({
          gapId: gap.id,
          value: responses[gap.id] ?? null,
        })),
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting gap responses:', error);
      // Error handling could be extended here
    } finally {
      setIsSubmitting(false);
    }
  }, [gaps, errors, currentIndex, sessionId, responses, onSubmit, validateAllGaps]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.ctrlKey) {
      if (isLastGap) {
        handleSubmit();
      } else {
        handleNext();
      }
    }
  }, [handleNext, handleSubmit, isLastGap]);

  // Empty state
  if (gaps.length === 0) {
    return (
      <Card className={cn('w-full max-w-2xl mx-auto', className)} data-testid="gap-prompt-ui">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Check className="h-12 w-12 text-primary mb-4" />
          <p className="text-lg font-medium text-center">All information has been provided!</p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            There are no additional questions to answer.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn('w-full max-w-2xl mx-auto', className)} data-testid="gap-prompt-ui">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn('w-full max-w-2xl mx-auto', className)}
      data-testid="gap-prompt-ui"
      onKeyDown={handleKeyDown}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1.5">{description}</CardDescription>
          </div>
          {showProgress && (
            <div className="text-right">
              <span className="text-sm font-medium text-muted-foreground">
                {answeredCount} of {totalGaps} answered
              </span>
              <div className="w-32 h-2 bg-secondary rounded-full mt-1">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={answeredCount}
                  aria-valuemin={0}
                  aria-valuemax={totalGaps}
                  data-testid="progress-bar"
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current gap info */}
        <div className="bg-muted/50 rounded-lg p-4" data-testid="gap-context">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Section: {currentGap.sectionName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {currentGap.userPrompt}
              </p>
            </div>
          </div>
        </div>

        {/* Gap field */}
        <div
          onBlur={() => handleFieldBlur(currentGap)}
          data-testid="gap-field-container"
        >
          <GapField
            config={currentGap.field}
            value={responses[currentGap.id] ?? currentGap.field.defaultValue ?? (
              currentGap.field.fieldType === 'multiselect' ? [] :
              currentGap.field.fieldType === 'checkbox' ? false : ''
            )}
            onChange={(value) => handleValueChange(currentGap.id, value)}
            error={touchedFields.has(currentGap.id) ? errors[currentGap.id] : undefined}
            disabled={isSubmitting}
          />
        </div>

        {/* Navigation indicator */}
        {showNavigation && totalGaps > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            {gaps.map((gap, index) => (
              <button
                key={gap.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-4 h-4 rounded-full transition-all cursor-pointer',
                  index === currentIndex
                    ? 'bg-primary'
                    : responses[gap.id] !== undefined &&
                      responses[gap.id] !== null &&
                      responses[gap.id] !== '' &&
                      !(Array.isArray(responses[gap.id]) && (responses[gap.id] as string[]).length === 0)
                    ? 'bg-primary/50'
                    : 'bg-secondary',
                  'hover:scale-110'
                )}
                aria-label={`Go to question ${index + 1}`}
                data-testid={`nav-dot-${index}`}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between gap-4">
        <div className="flex gap-2">
          {showNavigation && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstGap || isSubmitting}
              data-testid="prev-button"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
          )}
          {onSkip && !currentGap.field.isRequired && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isSubmitting}
              data-testid="skip-button"
            >
              Skip
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {showNavigation && !isLastGap && (
            <Button
              variant="outline"
              onClick={handleNext}
              disabled={isSubmitting}
              data-testid="next-button"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {isLastGap && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              data-testid="submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Submit All
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default GapPromptUI;
