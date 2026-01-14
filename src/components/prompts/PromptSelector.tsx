/**
 * Prompt Selector Component
 * Dropdown to select a processing prompt
 */

import * as React from 'react';
import { Star } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import type { ProcessingPrompt } from '~/db/schema';

interface PromptSelectorProps {
  prompts: ProcessingPrompt[];
  value?: string | null;
  onChange: (value: string | null) => void;
  promptType?: 'transform' | 'extract' | 'combined';
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

export function PromptSelector({
  prompts,
  value,
  onChange,
  promptType,
  placeholder = 'Select prompt...',
  disabled = false,
  allowClear = true,
}: PromptSelectorProps) {
  // Filter prompts by type if specified
  const filteredPrompts = React.useMemo(() => {
    let filtered = prompts.filter((p) => p.isActive);
    if (promptType) {
      filtered = filtered.filter(
        (p) => p.promptType === promptType || p.promptType === 'combined'
      );
    }
    // Sort: defaults first, then by name
    return filtered.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [prompts, promptType]);

  const handleValueChange = (newValue: string) => {
    if (newValue === '__none__') {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  return (
    <Select
      value={value || '__none__'}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder}>
          {value ? (
            (() => {
              const selected = prompts.find((p) => p.id === value);
              if (!selected) return placeholder;
              return (
                <span className="flex items-center gap-2">
                  {selected.isDefault && (
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  )}
                  {selected.name}
                </span>
              );
            })()
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {allowClear && (
          <SelectItem value="__none__">
            <span className="text-muted-foreground">None (use default)</span>
          </SelectItem>
        )}
        {filteredPrompts.map((prompt) => (
          <SelectItem key={prompt.id} value={prompt.id}>
            <span className="flex items-center gap-2">
              {prompt.isDefault && (
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              )}
              <span>{prompt.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {prompt.promptType}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
