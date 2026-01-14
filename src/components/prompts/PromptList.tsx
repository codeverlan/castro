/**
 * Prompt List Component
 * Displays a list of AI processing prompts with filtering and actions
 */

import * as React from 'react';
import {
  Edit,
  Copy,
  Trash2,
  MoreHorizontal,
  Star,
  StarOff,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import type { ProcessingPrompt } from '~/db/schema';

// Badge component for prompt type
function PromptTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    transform: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    extract: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    combined: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {type}
    </span>
  );
}

interface PromptListProps {
  prompts: ProcessingPrompt[];
  isLoading?: boolean;
  onEdit?: (prompt: ProcessingPrompt) => void;
  onDuplicate?: (prompt: ProcessingPrompt) => void;
  onDelete?: (prompt: ProcessingPrompt) => void;
  onToggleDefault?: (prompt: ProcessingPrompt) => void;
  filterType?: string;
  onFilterTypeChange?: (type: string) => void;
  filterActive?: string;
  onFilterActiveChange?: (active: string) => void;
}

export function PromptList({
  prompts,
  isLoading = false,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDefault,
  filterType,
  onFilterTypeChange,
  filterActive,
  onFilterActiveChange,
}: PromptListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-2/3 mt-2" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>

        <Select value={filterType || 'all'} onValueChange={onFilterTypeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="transform">Transform</SelectItem>
            <SelectItem value="extract">Extract</SelectItem>
            <SelectItem value="combined">Combined</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterActive || 'all'} onValueChange={onFilterActiveChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt List */}
      {prompts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No prompts found</p>
            <p className="text-sm text-muted-foreground">
              Create a new prompt to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        prompts.map((prompt) => (
          <Card key={prompt.id} className={!prompt.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">{prompt.name}</CardTitle>
                    {prompt.isDefault && (
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    )}
                    {!prompt.isActive && (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <PromptTypeBadge type={prompt.promptType} />
                    <span className="text-xs text-muted-foreground">
                      v{prompt.version}
                    </span>
                    {prompt.targetModel && (
                      <span className="text-xs text-muted-foreground">
                        • {prompt.targetModel}
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit?.(prompt)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate?.(prompt)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleDefault?.(prompt)}>
                      {prompt.isDefault ? (
                        <>
                          <StarOff className="h-4 w-4 mr-2" />
                          Remove Default
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(prompt)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {prompt.isActive ? 'Deactivate' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {prompt.description && (
                <CardDescription className="mt-2">
                  {prompt.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">
                <span>Output: {prompt.outputFormat}</span>
                <span className="mx-2">•</span>
                <span>
                  Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
