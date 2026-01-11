import * as React from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TemplateList, Template } from '~/components/templates';

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

  // Simulate loading state on mount
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleEdit = (template: Template) => {
    // In a real app, navigate to edit page or open edit modal
    console.log('Edit template:', template.id);
    // navigate({ to: '/templates/$id/edit', params: { id: template.id } });
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
    // In a real app, navigate to create page or open create modal
    console.log('Create new template');
    // navigate({ to: '/templates/new' });
  };

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold" data-testid="templates-title">
          Note Templates
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage your clinical documentation templates. Create, edit, and organize templates for different note types.
        </p>
      </div>

      <TemplateList
        templates={templates}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onCreate={handleCreate}
      />
    </div>
  );
}
