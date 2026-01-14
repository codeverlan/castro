/**
 * IntakeQ Note Types Settings Page
 * Settings page for managing IntakeQ note type definitions
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
import { NoteTypeEditor, NoteTypeList } from '~/components/intakeq';
import { PageContainer, PageHeader } from '~/navigation';
import type { IntakeQNoteType } from '~/db/schema';
import type { z } from 'zod';
import type { createIntakeqNoteTypeSchema } from '~/lib/validations/intakeqNoteTypes';

interface NoteTypesApiResponse {
  data: IntakeQNoteType[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const Route = createFileRoute('/settings/intakeq-types')({
  component: IntakeQTypesSettings,
});

function IntakeQTypesSettings() {
  const [noteTypes, setNoteTypes] = React.useState<IntakeQNoteType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingNoteType, setEditingNoteType] = React.useState<IntakeQNoteType | null>(null);

  // Filter state
  const [filterActive, setFilterActive] = React.useState<string>('active');

  // Fetch note types
  const fetchNoteTypes = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterActive === 'active') {
        params.set('isActive', 'true');
      } else if (filterActive === 'inactive') {
        params.set('isActive', 'false');
      }

      const response = await fetch(`/api/intakeq/note-types?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch note types');
      }
      const data: NoteTypesApiResponse = await response.json();
      setNoteTypes(data.data || []);
    } catch (error) {
      console.error('Error fetching note types:', error);
      toast.error('Failed to load note types');
    } finally {
      setIsLoading(false);
    }
  }, [filterActive]);

  // Initial load
  React.useEffect(() => {
    fetchNoteTypes();
  }, [fetchNoteTypes]);

  // Handle creating note type
  const handleCreate = async (values: z.infer<typeof createIntakeqNoteTypeSchema>) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/intakeq/note-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create note type');
      }

      toast.success('Note type created successfully');
      setCreateDialogOpen(false);
      await fetchNoteTypes();
    } catch (error) {
      console.error('Error creating note type:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create note type');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating note type
  const handleUpdate = async (values: z.infer<typeof createIntakeqNoteTypeSchema>) => {
    if (!editingNoteType) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/intakeq/note-types/${editingNoteType.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update note type');
      }

      toast.success('Note type updated successfully');
      setEditDialogOpen(false);
      setEditingNoteType(null);
      await fetchNoteTypes();
    } catch (error) {
      console.error('Error updating note type:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update note type');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting note type (soft delete)
  const handleDelete = async (noteType: IntakeQNoteType) => {
    try {
      const response = await fetch(`/api/intakeq/note-types/${noteType.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete note type');
      }

      toast.success(noteType.isActive ? 'Note type deactivated' : 'Note type deleted');
      await fetchNoteTypes();
    } catch (error) {
      console.error('Error deleting note type:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete note type');
    }
  };

  // Handle edit
  const handleEdit = (noteType: IntakeQNoteType) => {
    setEditingNoteType(noteType);
    setEditDialogOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title="IntakeQ Note Types"
        description="Define field mappings for different IntakeQ note types"
      >
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Note Type
        </Button>
      </PageHeader>

      <NoteTypeList
        noteTypes={noteTypes}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        filterActive={filterActive}
        onFilterActiveChange={setFilterActive}
      />

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Note Type</DialogTitle>
            <DialogDescription>
              Define a new IntakeQ note type with its field mappings
            </DialogDescription>
          </DialogHeader>
          {/* Conditional render prevents portal conflicts during dialog close */}
          {createDialogOpen && (
            <NoteTypeEditor
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
            <DialogTitle>Edit Note Type</DialogTitle>
            <DialogDescription>
              Update the note type configuration and field mappings
            </DialogDescription>
          </DialogHeader>
          {/* Key forces remount when switching note types, preventing state conflicts */}
          {editDialogOpen && editingNoteType && (
            <NoteTypeEditor
              key={editingNoteType.id}
              defaultValues={editingNoteType}
              onSubmit={handleUpdate}
              onCancel={() => {
                setEditDialogOpen(false);
                setEditingNoteType(null);
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
