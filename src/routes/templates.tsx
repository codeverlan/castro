import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TemplateList, Template, TemplateEditor, TemplateEditorFormData } from '~/components/templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { PageContainer, PageHeader } from '~/navigation';
import type { ProcessingPrompt, IntakeQNoteType } from '~/db/schema';

export const Route = createFileRoute('/templates')({
  component: TemplatesPage,
});

// Mock data for demonstration - in a real app this would come from the API
const mockTemplates: Template[] = [
  {
    id: '1',
    name: 'SOAP Note',
    description: 'Standard SOAP (Subjective, Objective, Assessment, Plan) format for clinical documentation.',
    templateType: 'SOAP',
    isDefault: true,
    status: 'active',
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'DAP Note',
    description: 'Data, Assessment, Plan format commonly used in mental health settings.',
    templateType: 'DAP',
    isDefault: false,
    status: 'active',
    version: 2,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: '3',
    name: 'BIRP Note',
    description: 'Behavior, Intervention, Response, Plan format for behavioral health documentation.',
    templateType: 'BIRP',
    isDefault: false,
    status: 'draft',
    version: 1,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
  },
  {
    id: '4',
    name: 'Progress Note',
    description: 'General progress note template for ongoing client sessions.',
    templateType: 'Custom',
    isDefault: false,
    status: 'active',
    version: 3,
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2024-01-25'),
  },
  {
    id: '5',
    name: 'Initial Assessment',
    description: 'Comprehensive initial assessment template for new clients.',
    templateType: 'Custom',
    isDefault: false,
    status: 'archived',
    version: 1,
    createdAt: new Date('2023-11-01'),
    updatedAt: new Date('2023-12-15'),
  },
  {
    id: '6',
    name: 'Treatment Plan',
    description: 'Template for creating and documenting treatment plans.',
    templateType: 'Custom',
    isDefault: false,
    status: 'active',
    version: 2,
    createdAt: new Date('2023-12-15'),
    updatedAt: new Date('2024-01-18'),
  },
];

function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = React.useState<Template[]>(mockTemplates);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // AI Processing options for template editor
  const [prompts, setPrompts] = React.useState<ProcessingPrompt[]>([]);
  const [noteTypes, setNoteTypes] = React.useState<IntakeQNoteType[]>([]);

  // Fetch AI processing options
  React.useEffect(() => {
    const fetchAIOptions = async () => {
      try {
        // Fetch prompts and note types in parallel
        const [promptsRes, noteTypesRes] = await Promise.all([
          fetch('/api/prompts?isActive=true'),
          fetch('/api/intakeq/note-types?isActive=true'),
        ]);

        if (promptsRes.ok) {
          const promptsData = await promptsRes.json();
          setPrompts(promptsData.data || []);
        }

        if (noteTypesRes.ok) {
          const noteTypesData = await noteTypesRes.json();
          setNoteTypes(noteTypesData.data || []);
        }
      } catch (error) {
        console.error('Error fetching AI options:', error);
      }
    };

    fetchAIOptions();
  }, []);

  // Simulate loading state on mount
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleEdit = (template: Template) => {
    console.log('Edit template:', template.id);
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  const handleDelete = (template: Template) => {
    // In a real app, show confirmation dialog and call API
    if (window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      console.log('Delete template:', template.id);
    }
  };

  const handleDuplicate = (template: Template) => {
    // In a real app, call API to duplicate
    const duplicated: Template = {
      ...template,
      id: `${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      status: 'draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setTemplates((prev) => [...prev, duplicated]);
    console.log('Duplicate template:', template.id);
  };

  const handleCreate = () => {
    console.log('Create new template');
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEditorSubmit = (data: TemplateEditorFormData) => {
    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      if (editingTemplate) {
        // Update existing template
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? {
                  ...t,
                  name: data.name,
                  description: data.description || t.description,
                  templateType: data.templateType || t.templateType,
                  isDefault: data.isDefault,
                  status: data.status,
                  updatedAt: new Date(),
                }
              : t
          )
        );
        console.log('Updated template:', editingTemplate.id, data);
      } else {
        // Create new template
        const newTemplate: Template = {
          id: `${Date.now()}`,
          name: data.name,
          description: data.description || 'Custom template',
          templateType: data.templateType || 'Custom',
          isDefault: data.isDefault,
          status: data.status,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setTemplates((prev) => [...prev, newTemplate]);
        console.log('Created new template:', newTemplate);
      }

      setIsSubmitting(false);
      setIsEditorOpen(false);
      setEditingTemplate(null);
    }, 500);
  };

  const handleEditorCancel = () => {
    setIsEditorOpen(false);
    setEditingTemplate(null);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Note Templates"
        description="Manage your clinical documentation templates. Create, edit, and organize templates for different note types."
        className="mb-8"
      />

      <TemplateList
        templates={templates}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onCreate={handleCreate}
      />

      {/* Template Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? `Edit: ${editingTemplate.name}` : 'Create New Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Modify the template details and sections below.'
                : 'Fill in the template details and add sections to create your custom template.'}
            </DialogDescription>
          </DialogHeader>
          {/* Key forces remount when switching templates, preventing DnD state conflicts */}
          {isEditorOpen && (
            <TemplateEditor
              key={editingTemplate?.id ?? 'new'}
              initialData={
                editingTemplate
                  ? {
                      name: editingTemplate.name,
                      description: editingTemplate.description,
                      templateType: editingTemplate.templateType,
                      isDefault: editingTemplate.isDefault,
                      status: editingTemplate.status,
                      sections: [],
                    }
                  : undefined
              }
              onSubmit={handleEditorSubmit}
              onCancel={handleEditorCancel}
              isSubmitting={isSubmitting}
              prompts={prompts}
              noteTypes={noteTypes}
            />
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
