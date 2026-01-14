/**
 * AI Processing Prompts Settings Page
 * Settings page for managing AI processing prompts
 */

import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { PromptEditor, PromptList } from '~/components/prompts';
import { PageContainer, PageHeader } from '~/navigation';
import type { ProcessingPrompt } from '~/db/schema';
import type { z } from 'zod';
import type { createProcessingPromptSchema } from '~/lib/validations/processingPrompts';

interface PromptsApiResponse {
  data: ProcessingPrompt[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const Route = createFileRoute('/settings/prompts')({
  component: PromptsSettings,
});

function PromptsSettings() {
  const [prompts, setPrompts] = React.useState<ProcessingPrompt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingPrompt, setEditingPrompt] = React.useState<ProcessingPrompt | null>(null);

  // Filter state
  const [filterType, setFilterType] = React.useState<string>('all');
  const [filterActive, setFilterActive] = React.useState<string>('active');

  // Fetch prompts
  const fetchPrompts = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterType && filterType !== 'all') {
        params.set('promptType', filterType);
      }
      if (filterActive === 'active') {
        params.set('isActive', 'true');
      } else if (filterActive === 'inactive') {
        params.set('isActive', 'false');
      }

      const response = await fetch(`/api/prompts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      const data: PromptsApiResponse = await response.json();
      setPrompts(data.data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast.error('Failed to load prompts');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, filterActive]);

  // Initial load
  React.useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Handle creating prompt
  const handleCreate = async (values: z.infer<typeof createProcessingPromptSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create prompt');
      }

      toast.success('Prompt created successfully');
      setCreateDialogOpen(false);
      await fetchPrompts();
    } catch (error) {
      console.error('Error creating prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create prompt');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating prompt
  const handleUpdate = async (values: z.infer<typeof createProcessingPromptSchema>) => {
    if (!editingPrompt) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/prompts/${editingPrompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update prompt');
      }

      toast.success('Prompt updated successfully');
      setEditDialogOpen(false);
      setEditingPrompt(null);
      await fetchPrompts();
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update prompt');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle duplicating prompt
  const handleDuplicate = async (prompt: ProcessingPrompt) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to duplicate prompt');
      }

      toast.success('Prompt duplicated successfully');
      await fetchPrompts();
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate prompt');
    }
  };

  // Handle deleting prompt (soft delete)
  const handleDelete = async (prompt: ProcessingPrompt) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete prompt');
      }

      toast.success('Prompt deactivated successfully');
      await fetchPrompts();
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete prompt');
    }
  };

  // Handle toggling default status
  const handleToggleDefault = async (prompt: ProcessingPrompt) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: !prompt.isDefault }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update prompt');
      }

      toast.success(prompt.isDefault ? 'Default status removed' : 'Set as default');
      await fetchPrompts();
    } catch (error) {
      console.error('Error toggling default:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update prompt');
    }
  };

  // Handle edit
  const handleEdit = (prompt: ProcessingPrompt) => {
    setEditingPrompt(prompt);
    setEditDialogOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="AI Processing Prompts"
        description="Manage prompts used for transcription processing"
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Prompt
        </Button>
      </PageHeader>

      <PromptList
        prompts={prompts}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onToggleDefault={handleToggleDefault}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        filterActive={filterActive}
        onFilterActiveChange={setFilterActive}
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Prompt</DialogTitle>
            <DialogDescription>
              Create a new AI processing prompt for transcription processing
            </DialogDescription>
          </DialogHeader>
          {/* Conditional render prevents portal conflicts during dialog close */}
          {createDialogOpen && (
            <PromptEditor
              key="create"
              onSubmit={handleCreate}
              onCancel={() => setCreateDialogOpen(false)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Prompt</DialogTitle>
            <DialogDescription>
              Update the prompt configuration
            </DialogDescription>
          </DialogHeader>
          {/* Key forces remount when switching prompts, preventing state conflicts */}
          {editDialogOpen && editingPrompt && (
            <PromptEditor
              key={editingPrompt.id}
              defaultValues={editingPrompt}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingPrompt(null);
              }}
              isSubmitting={isSubmitting}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
