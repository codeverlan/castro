/**
 * Prompt Editor Component
 * Form for creating and editing AI processing prompts
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Copy, Eye, EyeOff } from 'lucide-react';

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
  createProcessingPromptSchema,
  updateProcessingPromptSchema,
} from '~/lib/validations/processingPrompts';

// Prompt type options
const PROMPT_TYPES = [
  { value: 'transform', label: 'Transform', description: 'Rewrite raw text (clinical language, format)' },
  { value: 'extract', label: 'Extract', description: 'Extract specific fields/sections' },
  { value: 'combined', label: 'Combined', description: 'Both transform and extract' },
] as const;

// Output format options
const OUTPUT_FORMATS = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'plain', label: 'Plain Text' },
  { value: 'html', label: 'HTML' },
] as const;

// Common model options
const MODEL_OPTIONS = [
  { value: '', label: 'Default (use system default)' },
  { value: 'llama3', label: 'Llama 3' },
  { value: 'llama3.1', label: 'Llama 3.1' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'mixtral', label: 'Mixtral' },
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
] as const;

type FormSchema = z.infer<typeof createProcessingPromptSchema>;

interface PromptEditorProps {
  defaultValues?: Partial<FormSchema> & { id?: string; version?: number };
  onSubmit: (values: FormSchema) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isEditing?: boolean;
}

export function PromptEditor({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isEditing = false,
}: PromptEditorProps) {
  const [showPreview, setShowPreview] = React.useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(isEditing ? updateProcessingPromptSchema : createProcessingPromptSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      promptType: defaultValues?.promptType || 'transform',
      systemPrompt: defaultValues?.systemPrompt || '',
      userPromptTemplate: defaultValues?.userPromptTemplate || '',
      outputFormat: defaultValues?.outputFormat || 'markdown',
      targetModel: defaultValues?.targetModel || '',
      isDefault: defaultValues?.isDefault ?? false,
      isActive: defaultValues?.isActive ?? true,
    },
  });

  const selectedType = form.watch('promptType');
  const systemPrompt = form.watch('systemPrompt');
  const userPromptTemplate = form.watch('userPromptTemplate');

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
                  <FormLabel>Prompt Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., SOAP Transform, Clinical Language Rewrite"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this prompt
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
                      placeholder="Describe what this prompt does and when to use it..."
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
                name="promptType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prompt Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROMPT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {PROMPT_TYPES.find(t => t.value === selectedType)?.description}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputFormat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output Format</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OUTPUT_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Model (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MODEL_OPTIONS.map((model) => (
                        <SelectItem key={model.value || 'default'} value={model.value}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Specify a model if this prompt is optimized for a specific LLM
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Prompt Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prompt Content</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a clinical documentation specialist..."
                      className="min-h-[150px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The system context that defines the AI's role and behavior
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userPromptTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User Prompt Template</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Transform the following transcription into clinical documentation:

{{transcription}}

Template sections:
{{sections}}"
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Template with {'{{variables}}'} for dynamic content. Available variables:
                    {'{{transcription}}'}, {'{{sections}}'}, {'{{template_name}}'}, {'{{date_of_service}}'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showPreview && (systemPrompt || userPromptTemplate) && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="text-sm font-medium mb-2">Preview</h4>
                {systemPrompt && (
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground mb-1">System:</p>
                    <pre className="text-xs whitespace-pre-wrap bg-background p-2 rounded">
                      {systemPrompt}
                    </pre>
                  </div>
                )}
                {userPromptTemplate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">User Template:</p>
                    <pre className="text-xs whitespace-pre-wrap bg-background p-2 rounded">
                      {userPromptTemplate}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Default Prompt</FormLabel>
                    <FormDescription>
                      Make this the default prompt for its type. Only one prompt can be default per type.
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Inactive prompts won't appear in selection lists
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

        {/* Version info for editing */}
        {isEditing && defaultValues?.version && (
          <p className="text-xs text-muted-foreground">
            Version {defaultValues.version} • Changes to prompt content will increment the version
          </p>
        )}

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
                {isEditing ? 'Update Prompt' : 'Create Prompt'}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
