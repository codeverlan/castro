/**
 * IntakeQ Note Type Editor Component
 * Form for creating and editing IntakeQ note type definitions with field builder
 */

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import {
  createIntakeqNoteTypeSchema,
  intakeqFieldDefinitionSchema,
} from '~/lib/validations/intakeqNoteTypes';

// Field type options
const FIELD_TYPES = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'textarea', label: 'Textarea', description: 'Multi-line text input' },
  { value: 'select', label: 'Select', description: 'Dropdown selection' },
  { value: 'checkbox', label: 'Checkbox', description: 'True/false toggle' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'radio', label: 'Radio', description: 'Single choice from options' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
] as const;

type FormSchema = z.infer<typeof createIntakeqNoteTypeSchema>;
type FieldDefinition = z.infer<typeof intakeqFieldDefinitionSchema>;

interface NoteTypeEditorProps {
  defaultValues?: Partial<FormSchema> & { id?: string };
  onSubmit: (values: FormSchema) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

// Field Editor Card Component
function FieldEditorCard({
  field,
  index,
  onRemove,
  isExpanded,
  onToggleExpand,
  form,
}: {
  field: FieldDefinition;
  index: number;
  onRemove: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  form: ReturnType<typeof useForm<FormSchema>>;
}) {
  const fieldType = form.watch(`fields.${index}.fieldType`);
  const showOptions = fieldType === 'select' || fieldType === 'radio';

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`fields.${index}.fieldName`}
                render={({ field: inputField }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input
                        placeholder="Field Name"
                        className="font-medium"
                        {...inputField}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name={`fields.${index}.fieldType`}
              render={({ field: selectField }) => (
                <Select onValueChange={selectField.onChange} defaultValue={selectField.value}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`fields.${index}.fieldId`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel>Field ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., presenting_problem"
                      {...inputField}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique identifier for mapping
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`fields.${index}.mappedSection`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel>Mapped Section (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Subjective"
                      {...inputField}
                      value={inputField.value || ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Template section this maps to
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`fields.${index}.isRequired`}
              render={({ field: checkField }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Required</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={checkField.value}
                      onCheckedChange={checkField.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {(fieldType === 'text' || fieldType === 'textarea') && (
              <FormField
                control={form.control}
                name={`fields.${index}.maxLength`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <FormLabel>Max Length</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="No limit"
                        {...inputField}
                        value={inputField.value || ''}
                        onChange={(e) => inputField.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>

          {showOptions && (
            <FormField
              control={form.control}
              name={`fields.${index}.options`}
              render={({ field: inputField }) => (
                <FormItem>
                  <FormLabel>Options (one per line)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Option 1&#10;Option 2&#10;Option 3"
                      className="min-h-[80px]"
                      value={(inputField.value || []).join('\n')}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter(l => l.trim());
                        inputField.onChange(lines.length > 0 ? lines : undefined);
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name={`fields.${index}.description`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel>Help Text (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Instructions for this field"
                    {...inputField}
                    value={inputField.value || ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`fields.${index}.defaultValue`}
            render={({ field: inputField }) => (
              <FormItem>
                <FormLabel>Default Value (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Pre-filled value"
                    {...inputField}
                    value={inputField.value || ''}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      )}
    </Card>
  );
}

export function NoteTypeEditor({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}: NoteTypeEditorProps) {
  const [expandedFields, setExpandedFields] = React.useState<Set<number>>(new Set([0]));

  const form = useForm<FormSchema>({
    resolver: zodResolver(createIntakeqNoteTypeSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      intakeqFormId: defaultValues?.intakeqFormId || '',
      urlPattern: defaultValues?.urlPattern || '',
      fields: defaultValues?.fields || [
        {
          fieldId: '',
          fieldName: '',
          fieldType: 'text',
          isRequired: false,
        },
      ],
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const toggleFieldExpanded = (index: number) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addField = () => {
    const newIndex = fields.length;
    append({
      fieldId: '',
      fieldName: '',
      fieldType: 'text',
      isRequired: false,
    });
    setExpandedFields((prev) => new Set([...prev, newIndex]));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note Type Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Individual Progress Note"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A unique name for this IntakeQ note type
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe when to use this note type..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="intakeqFormId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IntakeQ Form ID (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="From IntakeQ API"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      If synced from IntakeQ API
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urlPattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Pattern (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Regex for browser extension"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      For automatic detection
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Field Definitions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Field Definitions</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No fields defined yet.</p>
                <p className="text-sm">Click "Add Field" to define the first field.</p>
              </div>
            ) : (
              fields.map((field, index) => (
                <FieldEditorCard
                  key={field.id}
                  field={field as FieldDefinition}
                  index={index}
                  onRemove={() => remove(index)}
                  isExpanded={expandedFields.has(index)}
                  onToggleExpand={() => toggleFieldExpanded(index)}
                  form={form}
                />
              ))
            )}
            {form.formState.errors.fields && (
              <p className="text-sm text-destructive">
                {form.formState.errors.fields.message || 'At least one field is required'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive note types won't appear in selection lists
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Note Type' : 'Create Note Type'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
