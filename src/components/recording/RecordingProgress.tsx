/**
 * RecordingProgress Component
 * Displays upload progress for recording files
 */

import * as React from 'react';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '~/lib/utils';

interface RecordingProgressProps {
  status: 'uploading' | 'processing' | 'complete' | 'error';
  progress?: number; // 0-100
  filename?: string;
  fileSize?: number;
  error?: string;
  className?: string;
}

export function RecordingProgress({
  status,
  progress = 0,
  filename,
  fileSize,
  error,
  className,
}: RecordingProgressProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            status === 'uploading' && 'bg-primary/10',
            status === 'processing' && 'bg-amber-500/10',
            status === 'complete' && 'bg-green-500/10',
            status === 'error' && 'bg-destructive/10'
          )}
        >
          {status === 'uploading' && (
            <Upload className="h-5 w-5 text-primary animate-pulse" />
          )}
          {status === 'processing' && (
            <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
          )}
          {status === 'complete' && (
            <Check className="h-5 w-5 text-green-500" />
          )}
          {status === 'error' && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Filename */}
          {filename && (
            <p className="font-medium text-sm truncate">{filename}</p>
          )}

          {/* Status text */}
          <p
            className={cn(
              'text-sm',
              status === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {status === 'uploading' && 'Uploading...'}
            {status === 'processing' && 'Processing...'}
            {status === 'complete' && 'Upload complete'}
            {status === 'error' && (error || 'Upload failed')}
          </p>

          {/* File size */}
          {fileSize && status !== 'error' && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>

        {/* Progress percentage */}
        {status === 'uploading' && (
          <span className="text-sm font-medium text-primary">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
