/**
 * RecordingDialog Component
 * Main dialog workflow for recording/uploading audio
 */

import * as React from 'react';
import { Mic, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { FileUploadZone } from './FileUploadZone';
import { BrowserRecorder } from './BrowserRecorder';
import { RecordingProgress } from './RecordingProgress';
import { SessionSelector } from './SessionSelector';

interface SessionOption {
  id: string;
  label: string;
  date?: string;
  status?: string;
}

interface RecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSessionId?: string;
  initialMode?: 'select' | 'upload' | 'record';
  appointmentContext?: {
    clientName: string;
    date: string;
    time: string;
  };
  sessions?: SessionOption[];
  isLoadingSessions?: boolean;
  onComplete?: (recordingId: string, sessionId?: string) => void;
}

type InputMethod = 'select' | 'upload' | 'record';
type UploadStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export function RecordingDialog({
  open,
  onOpenChange,
  initialSessionId,
  initialMode = 'select',
  appointmentContext,
  sessions = [],
  isLoadingSessions = false,
  onComplete,
}: RecordingDialogProps) {
  const [inputMethod, setInputMethod] = React.useState<InputMethod>(initialMode);
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | undefined>(
    initialSessionId
  );
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>('idle');
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [recordingBlob, setRecordingBlob] = React.useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = React.useState(0);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setInputMethod(initialMode);
      setSelectedSessionId(initialSessionId);
      setUploadStatus('idle');
      setUploadProgress(0);
      setUploadError(null);
      setSelectedFile(null);
      setRecordingBlob(null);
      setRecordingDuration(0);
    }
  }, [open, initialSessionId, initialMode]);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleRecordingComplete = (blob: Blob, duration: number) => {
    setRecordingBlob(blob);
    setRecordingDuration(duration);
  };

  const handleRecordingError = (error: Error) => {
    setUploadError(error.message);
  };

  const uploadFile = async (file: File | Blob, isRecording: boolean) => {
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Step 1: Create recording and get presigned URL
      const contentType = file instanceof Blob && !(file instanceof File)
        ? 'audio/webm;codecs=opus'
        : file.type;

      const createResponse = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: isRecording ? 'browser_dictation' : 'file_upload',
          contentType,
          fileSize: file.size,
          sessionId: selectedSessionId,
          originalFilename: file instanceof File ? file.name : `recording-${Date.now()}.webm`,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error?.message || 'Failed to create recording');
      }

      const { data: createData } = await createResponse.json();
      setUploadProgress(10);

      // Step 2: Upload file to S3 using presigned URL
      const uploadResponse = await fetch(createData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      setUploadProgress(80);

      // Step 3: Mark upload as complete
      const completeResponse = await fetch(`/api/recordings/${createData.recordingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: isRecording ? recordingDuration : undefined,
          fileSize: file.size,
        }),
      });

      if (!completeResponse.ok) {
        const error = await completeResponse.json();
        throw new Error(error.error?.message || 'Failed to complete upload');
      }

      setUploadProgress(100);
      setUploadStatus('complete');

      // Notify parent
      if (onComplete) {
        onComplete(createData.recordingId, selectedSessionId);
      }

      // Close dialog after short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(message);
      setUploadStatus('error');
    }
  };

  const handleUpload = () => {
    if (inputMethod === 'upload' && selectedFile) {
      uploadFile(selectedFile, false);
    } else if (inputMethod === 'record' && recordingBlob) {
      uploadFile(recordingBlob, true);
    }
  };

  const canUpload =
    (inputMethod === 'upload' && selectedFile && uploadStatus === 'idle') ||
    (inputMethod === 'record' && recordingBlob && uploadStatus === 'idle');

  const showMethodSelection = inputMethod === 'select';
  const showUploadForm = inputMethod === 'upload';
  const showRecordForm = inputMethod === 'record';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showMethodSelection && 'Add Recording'}
            {showUploadForm && 'Upload Audio File'}
            {showRecordForm && 'Record Dictation'}
          </DialogTitle>
          <DialogDescription>
            {showMethodSelection && 'Choose how you want to add audio for transcription'}
            {showUploadForm && 'Upload an existing audio file from your device'}
            {showRecordForm && 'Record audio directly from your microphone'}
          </DialogDescription>
          {appointmentContext && (
            <div className="mt-2 text-sm text-muted-foreground border-l-2 border-primary pl-3">
              <p className="font-medium text-foreground">{appointmentContext.clientName}</p>
              <p>{appointmentContext.date} at {appointmentContext.time}</p>
            </div>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Method Selection */}
          {showMethodSelection && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setInputMethod('upload')}
                className={cn(
                  'flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-colors',
                  'hover:border-primary hover:bg-primary/5'
                )}
              >
                <Upload className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium">Upload File</p>
                  <p className="text-xs text-muted-foreground">
                    MP3, WAV, WebM, etc.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInputMethod('record')}
                className={cn(
                  'flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-colors',
                  'hover:border-primary hover:bg-primary/5'
                )}
              >
                <Mic className="h-10 w-10 text-primary" />
                <div className="text-center">
                  <p className="font-medium">Record</p>
                  <p className="text-xs text-muted-foreground">
                    Use your microphone
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* Back button */}
          {!showMethodSelection && uploadStatus === 'idle' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInputMethod('select');
                setSelectedFile(null);
                setRecordingBlob(null);
              }}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}

          {/* Session Selector - shown for record mode, optional for upload */}
          {(showRecordForm || (showUploadForm && uploadStatus === 'idle')) && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {showRecordForm ? 'Select Session (Required)' : 'Attach to Session (Optional)'}
              </label>
              <SessionSelector
                value={selectedSessionId}
                onValueChange={setSelectedSessionId}
                sessions={sessions}
                isLoading={isLoadingSessions}
                disabled={uploadStatus !== 'idle'}
                placeholder={showRecordForm ? 'Select a session to record for' : 'Select a session (optional)'}
              />
            </div>
          )}

          {/* Upload Form */}
          {showUploadForm && uploadStatus === 'idle' && (
            <FileUploadZone
              onFileSelected={handleFileSelected}
              disabled={uploadStatus !== 'idle'}
            />
          )}

          {/* Record Form */}
          {showRecordForm && uploadStatus === 'idle' && !recordingBlob && (
            <BrowserRecorder
              sessionId={selectedSessionId || ''}
              onRecordingComplete={handleRecordingComplete}
              onError={handleRecordingError}
              disabled={!selectedSessionId}
            />
          )}

          {/* Recording complete preview */}
          {showRecordForm && recordingBlob && uploadStatus === 'idle' && (
            <div className="rounded-lg border p-4 text-center">
              <p className="font-medium">Recording Ready</p>
              <p className="text-sm text-muted-foreground">
                Duration: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Size: {(recordingBlob.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {uploadStatus !== 'idle' && (
            <RecordingProgress
              status={uploadStatus}
              progress={uploadProgress}
              filename={selectedFile?.name || 'recording.webm'}
              fileSize={selectedFile?.size || recordingBlob?.size}
              error={uploadError || undefined}
            />
          )}

          {/* Action buttons */}
          {!showMethodSelection && uploadStatus === 'idle' && canUpload && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpload}
                disabled={!canUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          )}

          {/* Retry button on error */}
          {uploadStatus === 'error' && (
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setUploadStatus('idle');
                  setUploadError(null);
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
