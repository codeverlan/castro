import * as React from 'react';
import { useForm, useFieldArray, FormProvider, type FieldValues } from 'react-hook-form';
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
import { Plus, Save } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import {
  FormControl,
  FormDescription,
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
import { Switch } from '~/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

import { SortableSection } from './SortableSection';

// =============================================================================
// Types for the template editor form
// =============================================================================

export type FieldType = 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'time' | 'number';
export type TemplateStatus = 'draft' | 'active' | 'archived';

export interface FieldOption {
  value: string;
  label: string;
}

export interface EditorField {
  id: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  displayOrder: number;
  defaultValue?: string | null;
  options?: FieldOption[] | null;
  helpText?: string | null;
}

export interface EditorSection {
  id: string;
  name: string;
  description?: string | null;
  displayOrder: number;
  isRequired: boolean;
  fields: EditorField[];
}

export interface TemplateEditorFormData {
  name: string;
  description?: string | null;
  templateType: string;
  isDefault: boolean;
  status: TemplateStatus;
  sections: EditorSection[];
}

// =============================================================================
// Props
// =============================================================================

export interface TemplateEditorProps {
  initialData?: Partial<TemplateEditorFormData>;
  onSubmit: (data: TemplateEditorFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
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

function createDefaultSection(displayOrder: number): EditorSection {
  return {
    id: generateId(),
    name: '',
    description: null,
    displayOrder,
    isRequired: true,
    fields: [],
  };
}

// =============================================================================
// Main Component
// =============================================================================

export function TemplateEditor({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TemplateEditorProps) {
  const form = useForm<TemplateEditorFormData>({
    defaultValues: {
      name: '',
      description: null,
      templateType: '',
      isDefault: false,
      status: 'draft',
      sections: [],
      ...initialData,
    },
  });

  const { fields: sections, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'sections',
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle section drag end
  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);

        // Update display orders
        const updatedSections = form.getValues('sections');
        updatedSections.forEach((section, index) => {
          form.setValue(`sections.${index}.displayOrder`, index);
        });
      }
    }
  };

  // Add a new section
  const handleAddSection = () => {
    const newSection = createDefaultSection(sections.length);
    append(newSection);
  };

  // Remove a section
  const handleRemoveSection = (index: number) => {
    remove(index);
    // Update display orders
    setTimeout(() => {
      const updatedSections = form.getValues('sections');
      updatedSections.forEach((_, idx) => {
        form.setValue(`sections.${idx}.displayOrder`, idx);
      });
    }, 0);
  };

  // Handle form submission
  const handleSubmit = form.handleSubmit((data: TemplateEditorFormData) => {
    // Ensure display orders are correct before submitting
    const processedData: TemplateEditorFormData = {
      ...data,
      sections: data.sections.map((section: EditorSection, sIndex: number) => ({
        ...section,
        displayOrder: sIndex,
        fields: section.fields.map((field: EditorField, fIndex: number) => ({
          ...field,
          displayOrder: fIndex,
        })),
      })),
    };
    onSubmit(processedData);
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className="space-y-8" data-testid="template-editor">
        {/* Template Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
            <CardDescription>
              Configure the basic details of your template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter template name"
                      {...field}
                      data-testid="template-name-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter template description (optional)"
                      {...field}
                      value={field.value ?? ''}
                      data-testid="template-description-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Template Type */}
              <FormField
                control={form.control}
                name="templateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Type</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Progress Note, Intake"
                        {...field}
                        data-testid="template-type-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="template-status-select">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Is Default Toggle */}
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Set as Default</FormLabel>
                    <FormDescription>
                      Use this template as the default for its type.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="template-default-toggle"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Sections */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sections</CardTitle>
                <CardDescription>
                  Drag and drop to reorder sections. Each section can contain multiple fields.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSection}
                data-testid="add-section-button"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Section
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sections.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
                data-testid="no-sections"
              >
                <p className="text-muted-foreground">No sections yet.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={handleAddSection}
                  data-testid="add-first-section-button"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Section
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSectionDragEnd}
              >
                <SortableContext
                  items={sections.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4" data-testid="sections-list">
                    {sections.map((section, index) => (
                      <SortableSection
                        key={section.id}
                        id={section.id}
                        index={index}
                        onRemove={() => handleRemoveSection(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4" data-testid="form-actions">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} data-testid="save-button">
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

export default TemplateEditor;
