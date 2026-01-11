import * as React from 'react';
import { Search, Plus, Pencil, Trash2, Copy, FileText, Filter } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';

// Template status type matching the database schema
type TemplateStatus = 'draft' | 'active' | 'archived';

// Template interface matching the database schema
export interface Template {
  id: string;
  name: string;
  description: string | null;
  templateType: string;
  isDefault: boolean;
  status: TemplateStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// Props for the TemplateList component
export interface TemplateListProps {
  templates: Template[];
  isLoading?: boolean;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
  onCreate?: () => void;
}

// Status badge component
function StatusBadge({ status }: { status: TemplateStatus }) {
  const statusStyles = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
        statusStyles[status]
      )}
      data-testid={`status-badge-${status}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Template card component
function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: Template;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
  onDuplicate?: (template: Template) => void;
}) {
  return (
    <Card className="flex flex-col" data-testid={`template-card-${template.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{template.name}</CardTitle>
          </div>
          <StatusBadge status={template.status} />
        </div>
        <CardDescription className="mt-2">
          {template.description || 'No description available'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1">
            {template.templateType}
          </span>
          {template.isDefault && (
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-primary">
              Default
            </span>
          )}
          <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1">
            v{template.version}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit?.(template)}
          data-testid={`edit-button-${template.id}`}
          aria-label={`Edit ${template.name}`}
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:ml-2">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDuplicate?.(template)}
          data-testid={`duplicate-button-${template.id}`}
          aria-label={`Duplicate ${template.name}`}
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:ml-2">Duplicate</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete?.(template)}
          data-testid={`delete-button-${template.id}`}
          aria-label={`Delete ${template.name}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only md:not-sr-only md:ml-2">Delete</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

// Loading skeleton for template cards
function TemplateCardSkeleton() {
  return (
    <Card className="flex flex-col animate-pulse" data-testid="template-card-skeleton">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
        <div className="mt-2 h-4 w-full rounded bg-muted" />
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded bg-muted" />
          <div className="h-6 w-12 rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-4">
        <div className="h-8 w-16 rounded bg-muted" />
        <div className="h-8 w-20 rounded bg-muted" />
        <div className="h-8 w-16 rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

// Empty state component
function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
      data-testid="empty-state"
    >
      <FileText className="h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Get started by creating your first template.
      </p>
      {onCreate && (
        <Button className="mt-4" onClick={onCreate} data-testid="create-first-template-button">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      )}
    </div>
  );
}

// Main TemplateList component
export function TemplateList({
  templates,
  isLoading = false,
  onEdit,
  onDelete,
  onDuplicate,
  onCreate,
}: TemplateListProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<TemplateStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');

  // Get unique template types for the filter dropdown
  const templateTypes = React.useMemo(() => {
    const types = new Set(templates.map((t) => t.templateType));
    return Array.from(types).sort();
  }, [templates]);

  // Filter templates based on search query and filters
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.templateType.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter;

      // Type filter
      const matchesType = typeFilter === 'all' || template.templateType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [templates, searchQuery, statusFilter, typeFilter]);

  // Show loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="template-list-loading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-64 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="template-list">
      {/* Header with search and create button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-4">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="search-input"
              aria-label="Search templates"
            />
          </div>

          {/* Status filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as TemplateStatus | 'all')}
          >
            <SelectTrigger
              className="w-[140px]"
              data-testid="status-filter"
              aria-label="Filter by status"
            >
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Type filter */}
          {templateTypes.length > 0 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                className="w-[140px]"
                data-testid="type-filter"
                aria-label="Filter by type"
              >
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {templateTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Create button */}
        {onCreate && (
          <Button onClick={onCreate} data-testid="create-template-button">
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        )}
      </div>

      {/* Results count */}
      {templates.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="results-count">
          Showing {filteredTemplates.length} of {templates.length} templates
        </p>
      )}

      {/* Template grid or empty state */}
      {filteredTemplates.length === 0 ? (
        templates.length === 0 ? (
          <EmptyState onCreate={onCreate} />
        ) : (
          <div
            className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center"
            data-testid="no-results"
          >
            <Search className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No matching templates</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search or filter criteria.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              data-testid="clear-filters-button"
            >
              Clear filters
            </Button>
          </div>
        )
      ) : (
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="template-grid"
        >
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TemplateList;
