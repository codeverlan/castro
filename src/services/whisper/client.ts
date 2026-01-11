/**
 * Whisper Client
 * Low-level client for executing Whisper.cpp CLI commands
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { whisperConfig, getModelPath, getModelConfig } from './config';
import {
  WhisperNotFoundError,
  WhisperModelNotFoundError,
  WhisperTimeoutError,
  WhisperAudioError,
  WhisperProcessError,
  WhisperOutputParseError,
  createWhisperError,
  isRetryableError,
} from './errors';
import type {
  WhisperModel,
  WhisperTranscriptionOptions,
  WhisperTranscriptionResult,
  WhisperSegment,
  ProgressCallback,
  TranscriptionProgress,
} from './types';

export class WhisperClient {
  private executablePath: string;
  private modelsPath: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: Partial<typeof whisperConfig>) {
    const mergedConfig = { ...whisperConfig, ...config };
    this.executablePath = mergedConfig.executablePath;
    this.modelsPath = mergedConfig.modelsPath;
    this.timeout = mergedConfig.timeout;
    this.maxRetries = mergedConfig.maxRetries;
    this.retryDelay = mergedConfig.retryDelay;
  }

  /**
   * Check if Whisper executable is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      execSync(`${this.executablePath} --help`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get Whisper version
   */
  async getVersion(): Promise<string | null> {
    try {
      const output = execSync(`${this.executablePath} --help`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      const versionMatch = output.match(/whisper\.cpp\s*(v?\d+\.\d+\.\d+)?/i);
      return versionMatch?.[1] || 'unknown';
    } catch {
      return null;
    }
  }

  /**
   * List available models in the models directory
   */
  async listModels(): Promise<WhisperModel[]> {
    try {
      if (!fs.existsSync(this.modelsPath)) {
        return [];
      }

      const files = fs.readdirSync(this.modelsPath);
      const models: WhisperModel[] = [];

      for (const file of files) {
        const match = file.match(/^ggml-(.+)\.bin$/);
        if (match) {
          const modelName = match[1] as WhisperModel;
          // Validate it's a known model type
          if (['tiny', 'base', 'small', 'medium', 'large', 'large-v2', 'large-v3'].includes(modelName)) {
            models.push(modelName);
          }
        }
      }

      return models;
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(model: WhisperModel): Promise<boolean> {
    const modelPath = getModelPath(model);
    return fs.existsSync(modelPath);
  }

  /**
   * Validate audio file before transcription
   */
  async validateAudioFile(audioFilePath: string): Promise<{
    valid: boolean;
    error?: string;
    format?: string;
    sizeBytes?: number;
  }> {
    if (!fs.existsSync(audioFilePath)) {
      return { valid: false, error: 'File does not exist' };
    }

    const stats = fs.statSync(audioFilePath);
    if (stats.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    const ext = path.extname(audioFilePath).toLowerCase().slice(1);
    const supportedFormats = ['mp3', 'wav', 'm4a', 'ogg', 'webm', 'flac', 'aac'];

    if (!supportedFormats.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported audio format: ${ext}`,
        format: ext,
        sizeBytes: stats.size
      };
    }

    return {
      valid: true,
      format: ext,
      sizeBytes: stats.size
    };
  }

  /**
   * Transcribe an audio file
   */
  async transcribe(
    audioFilePath: string,
    options?: WhisperTranscriptionOptions,
    onProgress?: ProgressCallback,
    sessionId?: string
  ): Promise<WhisperTranscriptionResult> {
    return this.transcribeWithRetry(audioFilePath, options, onProgress, sessionId);
  }

  /**
   * Transcribe with automatic retry for transient errors
   */
  private async transcribeWithRetry(
    audioFilePath: string,
    options?: WhisperTranscriptionOptions,
    onProgress?: ProgressCallback,
    sessionId?: string
  ): Promise<WhisperTranscriptionResult> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.transcribeInternal(audioFilePath, options, onProgress, sessionId);
      } catch (error) {
        lastError = error as Error;

        if (!isRetryableError(error) || attempt === this.maxRetries) {
          throw error;
        }

        // Report retry attempt
        if (onProgress && sessionId) {
          onProgress({
            sessionId,
            status: 'retrying',
            progress: 0,
            message: `Retry attempt ${attempt + 1}/${this.maxRetries}: ${lastError.message}`,
          });
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Internal transcription implementation
   */
  private async transcribeInternal(
    audioFilePath: string,
    options?: WhisperTranscriptionOptions,
    onProgress?: ProgressCallback,
    sessionId?: string
  ): Promise<WhisperTranscriptionResult> {
    const startTime = Date.now();

    // Validate prerequisites
    if (!await this.isAvailable()) {
      throw new WhisperNotFoundError(this.executablePath);
    }

    const validation = await this.validateAudioFile(audioFilePath);
    if (!validation.valid) {
      throw new WhisperAudioError(audioFilePath, validation.error!, validation.format);
    }

    const model = options?.model || whisperConfig.defaultModel;
    const modelPath = getModelPath(model);

    if (!await this.hasModel(model)) {
      throw new WhisperModelNotFoundError(model, modelPath);
    }

    // Build command arguments
    const args = this.buildArgs(audioFilePath, modelPath, options);

    // Execute whisper
    const result = await this.executeWhisper(args, audioFilePath, onProgress, sessionId);

    // Parse output
    const transcription = this.parseOutput(result.stdout, result.stderr);

    return {
      ...transcription,
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Build command line arguments for whisper
   */
  private buildArgs(
    audioFilePath: string,
    modelPath: string,
    options?: WhisperTranscriptionOptions
  ): string[] {
    const args: string[] = [
      '-m', modelPath,
      '-f', audioFilePath,
      '-oj', // Output JSON
    ];

    // Language
    if (options?.language) {
      args.push('-l', options.language);
    } else if (whisperConfig.defaultLanguage) {
      args.push('-l', whisperConfig.defaultLanguage);
    }

    // Translate to English
    if (options?.translate) {
      args.push('--translate');
    }

    // Temperature
    if (options?.temperature !== undefined) {
      args.push('-t', options.temperature.toString());
    }

    // Best of
    if (options?.bestOf !== undefined) {
      args.push('--best-of', options.bestOf.toString());
    }

    // Beam size
    if (options?.beamSize !== undefined) {
      args.push('--beam-size', options.beamSize.toString());
    }

    // Word timestamps
    if (options?.wordTimestamps ?? whisperConfig.enableWordTimestamps) {
      args.push('--word-thold', '0.01');
    }

    // Threads
    const threads = options?.threads || whisperConfig.defaultThreads;
    if (threads > 0) {
      args.push('-t', threads.toString());
    }

    // Processors
    const processors = options?.processors || whisperConfig.defaultProcessors;
    if (processors > 0) {
      args.push('-p', processors.toString());
    }

    // Max segment length
    if (options?.maxSegmentLength !== undefined) {
      args.push('--max-len', options.maxSegmentLength.toString());
    }

    // Split on word
    if (options?.splitOnWord) {
      args.push('--split-on-word');
    }

    // No speech threshold
    if (options?.noSpeechThreshold !== undefined) {
      args.push('--no-speech-thold', options.noSpeechThreshold.toString());
    }

    return args;
  }

  /**
   * Execute whisper command
   */
  private async executeWhisper(
    args: string[],
    audioFilePath: string,
    onProgress?: ProgressCallback,
    sessionId?: string
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      const proc = spawn(this.executablePath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Timeout handler
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill('SIGKILL');
          }
        }, 5000);
        reject(new WhisperTimeoutError(this.timeout, audioFilePath));
      }, this.timeout);

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();

        // Parse progress from output
        if (onProgress && sessionId) {
          const progressMatch = stdout.match(/progress\s*=\s*(\d+)%/i);
          if (progressMatch) {
            onProgress({
              sessionId,
              status: 'processing',
              progress: parseInt(progressMatch[1], 10),
            });
          }
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();

        // Whisper.cpp outputs progress to stderr
        if (onProgress && sessionId) {
          const progressMatch = stderr.match(/(\d+)%/);
          if (progressMatch) {
            onProgress({
              sessionId,
              status: 'processing',
              progress: parseInt(progressMatch[1], 10),
            });
          }
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutId);

        if (killed) {
          return; // Already rejected by timeout
        }

        if (code !== 0) {
          reject(createWhisperError(code || 1, stderr, audioFilePath));
          return;
        }

        resolve({ stdout, stderr });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);

        if (error.message.includes('ENOENT')) {
          reject(new WhisperNotFoundError(this.executablePath));
        } else {
          reject(new WhisperProcessError(error.message, -1, error.message));
        }
      });
    });
  }

  /**
   * Parse whisper JSON output
   */
  private parseOutput(stdout: string, stderr: string): Omit<WhisperTranscriptionResult, 'processingTimeMs'> {
    try {
      // Try to find JSON in the output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new WhisperOutputParseError('No JSON found in output', stdout);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Extract language from output
      let language = 'en';
      const langMatch = stderr.match(/language:\s*(\w+)/i) || stdout.match(/"language":\s*"(\w+)"/);
      if (langMatch) {
        language = langMatch[1];
      }

      // Extract segments
      const segments: WhisperSegment[] = (parsed.segments || parsed.transcription || []).map(
        (seg: Record<string, unknown>, idx: number) => {
          // Handle different offset formats from whisper output
          const offsets = seg.offsets as { from?: number; to?: number } | undefined;
          const startTime = (seg.start as number) ?? (offsets?.from ? offsets.from / 1000 : 0);
          const endTime = (seg.end as number) ?? (offsets?.to ? offsets.to / 1000 : 0);

          return {
            id: idx,
            seek: (seg.seek as number) || 0,
            start: startTime,
            end: endTime,
            text: ((seg.text as string) || '').trim(),
            tokens: (seg.tokens as number[]) || [],
            temperature: (seg.temperature as number) || 0,
            avgLogprob: (seg.avg_logprob as number) || (seg.avgLogprob as number) || 0,
            compressionRatio: (seg.compression_ratio as number) || (seg.compressionRatio as number) || 0,
            noSpeechProb: (seg.no_speech_prob as number) || (seg.noSpeechProb as number) || 0,
            words: seg.words as WhisperSegment['words'],
          };
        }
      );

      // Calculate full text
      const fullText = segments.map(s => s.text).join(' ').trim();

      // Calculate duration from last segment
      const duration = segments.length > 0
        ? segments[segments.length - 1].end
        : 0;

      return {
        text: parsed.text || fullText,
        segments,
        language,
        duration,
      };
    } catch (error) {
      if (error instanceof WhisperOutputParseError) {
        throw error;
      }
      throw new WhisperOutputParseError(
        error instanceof Error ? error.message : 'Unknown parse error',
        stdout
      );
    }
  }

  /**
   * Estimate transcription time based on audio duration and model
   */
  estimateTranscriptionTime(audioDurationSeconds: number, model: WhisperModel): number {
    const modelConfig = getModelConfig(model);
    // Base estimation: roughly real-time for base model
    const baseTime = audioDurationSeconds * 1000; // Convert to ms
    return Math.ceil(baseTime * modelConfig.timeMultiplier);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default singleton instance
export const whisperClient = new WhisperClient();
