import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormContext } from 'react-hook-form';
import { GripVertical, Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Switch } from '~/components/ui/switch';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';

import type { TemplateEditorFormData, EditorField } from './TemplateEditor';

// =============================================================================
// Constants
// =============================================================================

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-Select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'number', label: 'Number' },
] as const;

// Field types that require options
const FIELD_TYPES_WITH_OPTIONS = ['select', 'multiselect'];

// =============================================================================
// Props
// =============================================================================

export interface SortableFieldProps {
  id: string;
  sectionIndex: number;
  fieldIndex: number;
  onRemove: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function SortableField({
  id,
  sectionIndex,
  fieldIndex,
  onRemove,
}: SortableFieldProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const form = useFormContext<TemplateEditorFormData>();

  const fieldPath = `sections.${sectionIndex}.fields.${fieldIndex}` as const;
  const fieldType = form.watch(`${fieldPath}.fieldType`);
  const fieldLabel = form.watch(`${fieldPath}.label`);
  const options = form.watch(`${fieldPath}.options`) || [];

  const showOptionsEditor = FIELD_TYPES_WITH_OPTIONS.includes(fieldType);

  // Add a new option
  const handleAddOption = () => {
    const currentOptions = form.getValues(`${fieldPath}.options`) || [];
    form.setValue(`${fieldPath}.options`, [
      ...currentOptions,
      { value: '', label: '' },
    ]);
  };

  // Remove an option
  const handleRemoveOption = (optionIndex: number) => {
    const currentOptions = form.getValues(`${fieldPath}.options`) || [];
    const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
    form.setValue(`${fieldPath}.options`, newOptions.length > 0 ? newOptions : null);
  };

  // Update an option
  const handleUpdateOption = (
    optionIndex: number,
    key: 'value' | 'label',
    value: string
  ) => {
    const currentOptions = form.getValues(`${fieldPath}.options`) || [];
    const newOptions = [...currentOptions];
    if (newOptions[optionIndex]) {
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        [key]: value,
      };
      form.setValue(`${fieldPath}.options`, newOptions);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-card p-3',
        isDragging && 'opacity-50'
      )}
      data-testid={`field-${sectionIndex}-${fieldIndex}`}
    >
      {/* Collapsed View */}
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab p-1 hover:bg-accent rounded touch-none"
          {...attributes}
          {...listeners}
          data-testid={`field-drag-handle-${sectionIndex}-${fieldIndex}`}
          aria-label="Drag to reorder field"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Field Label */}
        <div className="flex-1">
          <FormField
            control={form.control}
            name={`${fieldPath}.label`}
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    placeholder="Field label"
                    className="h-8"
                    {...field}
                    data-testid={`field-label-input-${sectionIndex}-${fieldIndex}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Field Type Selector */}
        <FormField
          control={form.control}
          name={`${fieldPath}.fieldType`}
          render={({ field }) => (
            <FormItem className="w-32 space-y-0">
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger
                    className="h-8"
                    data-testid={`field-type-select-${sectionIndex}-${fieldIndex}`}
                  >
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Required Toggle */}
        <FormField
          control={form.control}
          name={`${fieldPath}.isRequired`}
          render={({ field }) => (
            <FormItem className="flex items-center gap-1 space-y-0">
              <FormLabel className="text-xs text-muted-foreground">Req</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="scale-75"
                  data-testid={`field-required-toggle-${sectionIndex}-${fieldIndex}`}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Expand/Collapse */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid={`field-toggle-${sectionIndex}-${fieldIndex}`}
          aria-label={isExpanded ? 'Collapse field' : 'Expand field'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {/* Remove Field */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onRemove}
          data-testid={`field-remove-button-${sectionIndex}-${fieldIndex}`}
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="mt-4 space-y-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Default Value */}
            <FormField
              control={form.control}
              name={`${fieldPath}.defaultValue`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Value</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter default value"
                      {...field}
                      value={field.value ?? ''}
                      data-testid={`field-default-value-${sectionIndex}-${fieldIndex}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Help Text */}
            <FormField
              control={form.control}
              name={`${fieldPath}.helpText`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Help Text</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter help text"
                      {...field}
                      value={field.value ?? ''}
                      data-testid={`field-help-text-${sectionIndex}-${fieldIndex}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Options Editor (for select/multiselect) */}
          {showOptionsEditor && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Options</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddOption}
                  data-testid={`add-option-button-${sectionIndex}-${fieldIndex}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Option
                </Button>
              </div>

              {options.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground"
                  data-testid={`no-options-${sectionIndex}-${fieldIndex}`}
                >
                  No options defined. Add options for users to select from.
                </div>
              ) : (
                <div
                  className="space-y-2"
                  data-testid={`options-list-${sectionIndex}-${fieldIndex}`}
                >
                  {options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex items-center gap-2"
                      data-testid={`option-${sectionIndex}-${fieldIndex}-${optionIndex}`}
                    >
                      <Input
                        placeholder="Value"
                        className="h-8 flex-1"
                        value={option.value || ''}
                        onChange={(e) =>
                          handleUpdateOption(optionIndex, 'value', e.target.value)
                        }
                        data-testid={`option-value-${sectionIndex}-${fieldIndex}-${optionIndex}`}
                      />
                      <Input
                        placeholder="Label"
                        className="h-8 flex-1"
                        value={option.label || ''}
                        onChange={(e) =>
                          handleUpdateOption(optionIndex, 'label', e.target.value)
                        }
                        data-testid={`option-label-${sectionIndex}-${fieldIndex}-${optionIndex}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveOption(optionIndex)}
                        data-testid={`remove-option-button-${sectionIndex}-${fieldIndex}-${optionIndex}`}
                        aria-label="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SortableField;
