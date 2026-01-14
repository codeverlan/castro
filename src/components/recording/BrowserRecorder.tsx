/**
 * BrowserRecorder Component
 * MediaRecorder-based audio recording with visual feedback
 * Requires a session to be selected before recording
 */

import * as React from 'react';
import { Mic, MicOff, Square, Pause, Play, AlertCircle, Clock, Save, Trash2 } from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { MAX_RECORDING_DURATION } from '~/lib/validations/recordings';

interface BrowserRecorderProps {
  sessionId: string; // Required - recording only works with session selected
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onError: (error: Error) => void;
  disabled?: boolean;
  className?: string;
  maxDuration?: number; // seconds, default 60 minutes
}

type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

export function BrowserRecorder({
  sessionId,
  onRecordingComplete,
  onError,
  disabled = false,
  className,
  maxDuration = MAX_RECORDING_DURATION,
}: BrowserRecorderProps) {
  const [state, setState] = React.useState<RecordingState>('idle');
  const [duration, setDuration] = React.useState(0);
  const [audioLevel, setAudioLevel] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const startTimeRef = React.useRef<number>(0);
  const pausedDurationRef = React.useRef<number>(0);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopRecording();
      cleanup();
    };
  }, []);

  // Auto-stop at max duration
  React.useEffect(() => {
    if (state === 'recording' && duration >= maxDuration) {
      stopRecording();
    }
  }, [duration, maxDuration, state]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || state !== 'recording') return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average level
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255); // Normalize to 0-1

    animationRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startTimer = () => {
    startTimeRef.current = Date.now() - pausedDurationRef.current * 1000;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(elapsed);
    }, 100);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    pausedDurationRef.current = duration;
  };

  const startRecording = async () => {
    if (!sessionId) {
      setError('Please select a session before recording');
      return;
    }

    setError(null);
    setState('requesting');
    chunksRef.current = [];
    setDuration(0);
    pausedDurationRef.current = 0;

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Set up audio analysis for level meter
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob, duration);
        cleanup();
        setState('stopped');
      };

      mediaRecorder.onerror = (event) => {
        const error = new Error('Recording error');
        setError(error.message);
        onError(error);
        cleanup();
        setState('idle');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setState('recording');
      startTimer();
      updateAudioLevel();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error.message);
      onError(error);
      setState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      pauseTimer();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      startTimer();
      updateAudioLevel();
      setState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (state === 'recording' || state === 'paused')) {
      mediaRecorderRef.current.stop();
      pauseTimer();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  };

  const cancelRecording = () => {
    cleanup();
    chunksRef.current = [];
    setDuration(0);
    setAudioLevel(0);
    setState('idle');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = maxDuration - duration;
  const isNearLimit = remainingTime <= 60 && remainingTime > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Recording area */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 p-6 transition-colors',
          state === 'idle' && !disabled && 'border-muted-foreground/25',
          state === 'recording' && 'border-primary bg-primary/5',
          state === 'paused' && 'border-amber-500 bg-amber-500/5',
          disabled && 'opacity-50 bg-muted/30'
        )}
      >
        {/* Compact Timer with Status */}
        <div className="flex items-center gap-3 mb-4">
          {/* Recording indicator dot */}
          {state === 'recording' && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          {state === 'paused' && (
            <span className="flex h-3 w-3 rounded-full bg-amber-500"></span>
          )}

          {/* Timer */}
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-mono font-semibold tabular-nums',
              state === 'recording' && 'text-primary',
              state === 'paused' && 'text-amber-500',
              isNearLimit && state === 'recording' && 'text-amber-500'
            )}>
              {formatTime(duration)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {formatTime(maxDuration)}
            </span>
          </div>

          {/* Status label */}
          {state === 'recording' && (
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              Recording
            </span>
          )}
          {state === 'paused' && (
            <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">
              Paused
            </span>
          )}
        </div>

        {/* Audio level indicator - more compact */}
        {(state === 'recording' || state === 'paused') && (
          <div className="w-full max-w-xs h-1.5 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className={cn(
                'h-full transition-all duration-75 rounded-full',
                state === 'recording' ? 'bg-primary' : 'bg-amber-500'
              )}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}

        {/* Near limit warning */}
        {isNearLimit && state === 'recording' && (
          <p className="text-xs text-amber-500 mb-3">
            ⚠ {remainingTime}s remaining
          </p>
        )}

        {/* Controls - Redesigned */}
        <div className="flex items-center gap-2">
          {/* Idle state - Start button */}
          {state === 'idle' && (
            <Button
              type="button"
              size="lg"
              onClick={startRecording}
              disabled={disabled || !sessionId}
              className="gap-2"
            >
              <Mic className="h-5 w-5" />
              Start Recording
            </Button>
          )}

          {/* Requesting microphone */}
          {state === 'requesting' && (
            <Button type="button" size="lg" disabled className="gap-2">
              <Mic className="h-5 w-5 animate-pulse" />
              Requesting microphone...
            </Button>
          )}

          {/* Recording state controls */}
          {state === 'recording' && (
            <>
              {/* Pause */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={pauseRecording}
                title="Pause"
                className="h-10 w-10"
              >
                <Pause className="h-4 w-4" />
              </Button>

              {/* Save & Stop */}
              <Button
                type="button"
                variant="default"
                onClick={stopRecording}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>

              {/* Delete/Discard */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                title="Discard recording"
                className="h-10 w-10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Paused state controls */}
          {state === 'paused' && (
            <>
              {/* Resume */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={resumeRecording}
                title="Resume"
                className="h-10 w-10"
              >
                <Play className="h-4 w-4" />
              </Button>

              {/* Save & Stop */}
              <Button
                type="button"
                variant="default"
                onClick={stopRecording}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>

              {/* Delete/Discard */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                title="Discard recording"
                className="h-10 w-10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}

          {/* Stopped/Processing state */}
          {state === 'stopped' && (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                Recording saved. Processing...
              </p>
            </div>
          )}
        </div>

        {/* Control hints */}
        {(state === 'recording' || state === 'paused') && (
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Pause className="h-3 w-3" /> Pause
            </span>
            <span className="flex items-center gap-1">
              <Save className="h-3 w-3" /> Save
            </span>
            <span className="flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Discard
            </span>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Session requirement notice */}
      {!sessionId && state === 'idle' && (
        <p className="text-sm text-muted-foreground text-center">
          Please select a session before recording
        </p>
      )}
    </div>
  );
}
