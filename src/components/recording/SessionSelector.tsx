/**
 * SessionSelector Component
 * Dropdown to select a session for recording attachment
 */

import * as React from 'react';
import { CalendarDays, FileAudio, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { cn } from '~/lib/utils';

interface SessionOption {
  id: string;
  label: string;
  date?: string;
  status?: string;
}

interface SessionSelectorProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  sessions: SessionOption[];
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function SessionSelector({
  value,
  onValueChange,
  sessions,
  isLoading = false,
  disabled = false,
  placeholder = 'Select a session',
  className,
}: SessionSelectorProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Select
        value={value}
        onValueChange={(val) => onValueChange(val || undefined)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading sessions...</span>
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {sessions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No sessions available
            </div>
          ) : (
            sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                <div className="flex items-center gap-2">
                  <FileAudio className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{session.label}</span>
                    {session.date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(session.date)}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
