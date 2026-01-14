/**
 * IntakeQ Note Type List Component
 * Displays a list of IntakeQ note type definitions
 */

import * as React from 'react';
import {
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Filter,
  List,
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
import type { IntakeQNoteType } from '~/db/schema';

interface NoteTypeListProps {
  noteTypes: IntakeQNoteType[];
  isLoading?: boolean;
  onEdit?: (noteType: IntakeQNoteType) => void;
  onDelete?: (noteType: IntakeQNoteType) => void;
  filterActive?: string;
  onFilterActiveChange?: (active: string) => void;
}

export function NoteTypeList({
  noteTypes,
  isLoading = false,
  onEdit,
  onDelete,
  filterActive,
  onFilterActiveChange,
}: NoteTypeListProps) {
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

      {/* Note Type List */}
      {noteTypes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No note types found</p>
            <p className="text-sm text-muted-foreground">
              Create a new note type to define IntakeQ field mappings
            </p>
          </CardContent>
        </Card>
      ) : (
        noteTypes.map((noteType) => (
          <Card key={noteType.id} className={!noteType.isActive ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base">{noteType.name}</CardTitle>
                    {!noteType.isActive && (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <List className="h-3 w-3" />
                    <span>{noteType.fields?.length || 0} fields</span>
                    {noteType.intakeqFormId && (
                      <>
                        <span className="mx-1">•</span>
                        <span>Form: {noteType.intakeqFormId}</span>
                      </>
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
                    <DropdownMenuItem onClick={() => onEdit?.(noteType)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(noteType)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {noteType.isActive ? 'Deactivate' : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {noteType.description && (
                <CardDescription className="mt-2">
                  {noteType.description}
                </CardDescription>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              <div className="text-xs text-muted-foreground">
                {noteType.fields && noteType.fields.length > 0 && (
                  <span>
                    Fields: {noteType.fields.slice(0, 3).map(f => f.fieldName).join(', ')}
                    {noteType.fields.length > 3 && ` +${noteType.fields.length - 3} more`}
                  </span>
                )}
                <span className="mx-2">•</span>
                <span>
                  Updated {new Date(noteType.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
