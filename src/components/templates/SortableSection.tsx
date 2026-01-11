import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Switch } from '~/components/ui/switch';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
} from '~/components/ui/card';
import { cn } from '~/lib/utils';

import { SortableField } from './SortableField';
import type { TemplateEditorFormData, EditorField } from './TemplateEditor';

// =============================================================================
// Props
// =============================================================================

export interface SortableSectionProps {
  id: string;
  index: number;
  onRemove: () => void;
}

// =============================================================================
// Utility functions
// =============================================================================

function generateId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDefaultField(displayOrder: number): EditorField {
  return {
    id: generateId(),
    label: '',
    fieldType: 'text',
    isRequired: false,
    displayOrder,
    defaultValue: null,
    options: null,
    helpText: null,
  };
}

// =============================================================================
// Component
// =============================================================================

export function SortableSection({ id, index, onRemove }: SortableSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

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

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: `sections.${index}.fields`,
  });

  // DnD sensors for fields
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle field drag end
  const handleFieldDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);

        // Update display orders
        const updatedFields = form.getValues(`sections.${index}.fields`);
        updatedFields.forEach((_, idx) => {
          form.setValue(`sections.${index}.fields.${idx}.displayOrder`, idx);
        });
      }
    }
  };

  // Add a new field
  const handleAddField = () => {
    const newField = createDefaultField(fields.length);
    append(newField);
  };

  // Remove a field
  const handleRemoveField = (fieldIndex: number) => {
    remove(fieldIndex);
    // Update display orders
    setTimeout(() => {
      const updatedFields = form.getValues(`sections.${index}.fields`);
      updatedFields.forEach((_, idx) => {
        form.setValue(`sections.${index}.fields.${idx}.displayOrder`, idx);
      });
    }, 0);
  };

  const sectionName = form.watch(`sections.${index}.name`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative',
        isDragging && 'opacity-50'
      )}
      data-testid={`section-${index}`}
    >
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <button
              type="button"
              className="cursor-grab p-1 hover:bg-accent rounded touch-none"
              {...attributes}
              {...listeners}
              data-testid={`section-drag-handle-${index}`}
              aria-label="Drag to reorder section"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>

            {/* Section Name Input */}
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`sections.${index}.name`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        placeholder="Section name"
                        className="font-semibold"
                        {...field}
                        data-testid={`section-name-input-${index}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Required Toggle */}
            <FormField
              control={form.control}
              name={`sections.${index}.isRequired`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormLabel className="text-sm text-muted-foreground">
                    Required
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid={`section-required-toggle-${index}`}
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
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`section-toggle-${index}`}
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Remove Section */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
              data-testid={`section-remove-button-${index}`}
              aria-label="Remove section"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-4 space-y-4">
            {/* Description */}
            <FormField
              control={form.control}
              name={`sections.${index}.description`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Section description (optional)"
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                      data-testid={`section-description-input-${index}`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel className="text-sm font-medium">Fields</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddField}
                  data-testid={`add-field-button-${index}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center"
                  data-testid={`no-fields-${index}`}
                >
                  <p className="text-sm text-muted-foreground">
                    No fields in this section.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={handleAddField}
                    data-testid={`add-first-field-button-${index}`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleFieldDragEnd}
                >
                  <SortableContext
                    items={fields.map((f) => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div
                      className="space-y-2"
                      data-testid={`fields-list-${index}`}
                    >
                      {fields.map((field, fieldIndex) => (
                        <SortableField
                          key={field.id}
                          id={field.id}
                          sectionIndex={index}
                          fieldIndex={fieldIndex}
                          onRemove={() => handleRemoveField(fieldIndex)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default SortableSection;
