/**
 * Whisper Service Configuration
 * Environment-based configuration for Whisper.cpp transcription service
 */

import * as dotenv from 'dotenv';
import type { WhisperModel } from './types';

dotenv.config();

export interface WhisperConfig {
  // Path to whisper.cpp executable
  executablePath: string;
  // Path to models directory
  modelsPath: string;
  // Default model for transcription
  defaultModel: WhisperModel;
  // Fallback model if default is unavailable
  fallbackModel: WhisperModel;
  // Timeout for transcription in milliseconds
  timeout: number;
  // Maximum retry attempts for failed transcriptions
  maxRetries: number;
  // Delay between retries in milliseconds
  retryDelay: number;
  // Default number of threads
  defaultThreads: number;
  // Default number of processors
  defaultProcessors: number;
  // Default language (empty for auto-detect)
  defaultLanguage: string;
  // Enable word timestamps by default
  enableWordTimestamps: boolean;
  // Queue processing settings
  queuePollIntervalMs: number;
  queueLockDurationMs: number;
  queueMaxConcurrent: number;
  // Temporary directory for audio processing
  tempDirectory: string;
}

export const whisperConfig: WhisperConfig = {
  // Whisper.cpp executable path (default assumes it's in PATH)
  executablePath: process.env.WHISPER_EXECUTABLE_PATH || 'whisper',

  // Models directory path
  modelsPath: process.env.WHISPER_MODELS_PATH || '/usr/local/share/whisper/models',

  // Default model for general transcription
  defaultModel: (process.env.WHISPER_DEFAULT_MODEL as WhisperModel) || 'base',

  // Fallback model if default is unavailable
  fallbackModel: (process.env.WHISPER_FALLBACK_MODEL as WhisperModel) || 'tiny',

  // Transcription timeout in milliseconds (default: 10 minutes)
  timeout: parseInt(process.env.WHISPER_TIMEOUT || '600000', 10),

  // Maximum retry attempts for failed transcriptions
  maxRetries: parseInt(process.env.WHISPER_MAX_RETRIES || '3', 10),

  // Delay between retries in milliseconds
  retryDelay: parseInt(process.env.WHISPER_RETRY_DELAY || '2000', 10),

  // Default number of threads (0 = auto)
  defaultThreads: parseInt(process.env.WHISPER_DEFAULT_THREADS || '4', 10),

  // Default number of processors (0 = auto)
  defaultProcessors: parseInt(process.env.WHISPER_DEFAULT_PROCESSORS || '1', 10),

  // Default language (empty string for auto-detection)
  defaultLanguage: process.env.WHISPER_DEFAULT_LANGUAGE || '',

  // Enable word timestamps by default
  enableWordTimestamps: process.env.WHISPER_ENABLE_WORD_TIMESTAMPS === 'true',

  // Queue processing: poll interval
  queuePollIntervalMs: parseInt(process.env.WHISPER_QUEUE_POLL_INTERVAL || '5000', 10),

  // Queue processing: lock duration
  queueLockDurationMs: parseInt(process.env.WHISPER_QUEUE_LOCK_DURATION || '300000', 10),

  // Queue processing: max concurrent jobs
  queueMaxConcurrent: parseInt(process.env.WHISPER_QUEUE_MAX_CONCURRENT || '1', 10),

  // Temporary directory for audio processing
  tempDirectory: process.env.WHISPER_TEMP_DIRECTORY || '/tmp/whisper',
};

// Model-specific configurations (processing time multipliers and quality settings)
export const modelConfigs: Record<WhisperModel, {
  timeMultiplier: number;
  recommendedThreads: number;
  memoryRequirementMB: number;
}> = {
  'tiny': {
    timeMultiplier: 1,
    recommendedThreads: 2,
    memoryRequirementMB: 75,
  },
  'base': {
    timeMultiplier: 1.5,
    recommendedThreads: 4,
    memoryRequirementMB: 142,
  },
  'small': {
    timeMultiplier: 3,
    recommendedThreads: 4,
    memoryRequirementMB: 466,
  },
  'medium': {
    timeMultiplier: 6,
    recommendedThreads: 6,
    memoryRequirementMB: 1464,
  },
  'large': {
    timeMultiplier: 12,
    recommendedThreads: 8,
    memoryRequirementMB: 2952,
  },
  'large-v2': {
    timeMultiplier: 12,
    recommendedThreads: 8,
    memoryRequirementMB: 2952,
  },
  'large-v3': {
    timeMultiplier: 12,
    recommendedThreads: 8,
    memoryRequirementMB: 2952,
  },
};

// Get configuration for a specific model
export function getModelConfig(model: WhisperModel): typeof modelConfigs[WhisperModel] {
  return modelConfigs[model] || modelConfigs['base'];
}

// Get full model path
export function getModelPath(model: WhisperModel): string {
  return `${whisperConfig.modelsPath}/ggml-${model}.bin`;
}

// Validate configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!whisperConfig.executablePath) {
    errors.push('WHISPER_EXECUTABLE_PATH is not configured');
  }

  if (!whisperConfig.modelsPath) {
    errors.push('WHISPER_MODELS_PATH is not configured');
  }

  if (!whisperConfig.defaultModel) {
    errors.push('WHISPER_DEFAULT_MODEL is not configured');
  }

  if (whisperConfig.timeout < 10000) {
    errors.push('WHISPER_TIMEOUT should be at least 10000ms (10 seconds)');
  }

  if (whisperConfig.maxRetries < 0 || whisperConfig.maxRetries > 10) {
    errors.push('WHISPER_MAX_RETRIES should be between 0 and 10');
  }

  if (whisperConfig.defaultThreads < 0) {
    errors.push('WHISPER_DEFAULT_THREADS should be non-negative');
  }

  if (whisperConfig.queuePollIntervalMs < 1000) {
    errors.push('WHISPER_QUEUE_POLL_INTERVAL should be at least 1000ms');
  }

  if (whisperConfig.queueLockDurationMs < 60000) {
    errors.push('WHISPER_QUEUE_LOCK_DURATION should be at least 60000ms (1 minute)');
  }

  if (whisperConfig.queueMaxConcurrent < 1) {
    errors.push('WHISPER_QUEUE_MAX_CONCURRENT should be at least 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Supported languages for transcription
export const supportedLanguages: Record<string, string> = {
  'en': 'English',
  'zh': 'Chinese',
  'de': 'German',
  'es': 'Spanish',
  'ru': 'Russian',
  'ko': 'Korean',
  'fr': 'French',
  'ja': 'Japanese',
  'pt': 'Portuguese',
  'tr': 'Turkish',
  'pl': 'Polish',
  'ca': 'Catalan',
  'nl': 'Dutch',
  'ar': 'Arabic',
  'sv': 'Swedish',
  'it': 'Italian',
  'id': 'Indonesian',
  'hi': 'Hindi',
  'fi': 'Finnish',
  'vi': 'Vietnamese',
  'he': 'Hebrew',
  'uk': 'Ukrainian',
  'el': 'Greek',
  'ms': 'Malay',
  'cs': 'Czech',
  'ro': 'Romanian',
  'da': 'Danish',
  'hu': 'Hungarian',
  'ta': 'Tamil',
  'no': 'Norwegian',
  'th': 'Thai',
  'ur': 'Urdu',
  'hr': 'Croatian',
  'bg': 'Bulgarian',
  'lt': 'Lithuanian',
  'la': 'Latin',
  'mi': 'Maori',
  'ml': 'Malayalam',
  'cy': 'Welsh',
  'sk': 'Slovak',
  'te': 'Telugu',
  'fa': 'Persian',
  'lv': 'Latvian',
  'bn': 'Bengali',
  'sr': 'Serbian',
  'az': 'Azerbaijani',
  'sl': 'Slovenian',
  'kn': 'Kannada',
  'et': 'Estonian',
  'mk': 'Macedonian',
  'br': 'Breton',
  'eu': 'Basque',
  'is': 'Icelandic',
  'hy': 'Armenian',
  'ne': 'Nepali',
  'mn': 'Mongolian',
  'bs': 'Bosnian',
  'kk': 'Kazakh',
  'sq': 'Albanian',
  'sw': 'Swahili',
  'gl': 'Galician',
  'mr': 'Marathi',
  'pa': 'Punjabi',
  'si': 'Sinhala',
  'km': 'Khmer',
  'sn': 'Shona',
  'yo': 'Yoruba',
  'so': 'Somali',
  'af': 'Afrikaans',
  'oc': 'Occitan',
  'ka': 'Georgian',
  'be': 'Belarusian',
  'tg': 'Tajik',
  'sd': 'Sindhi',
  'gu': 'Gujarati',
  'am': 'Amharic',
  'yi': 'Yiddish',
  'lo': 'Lao',
  'uz': 'Uzbek',
  'fo': 'Faroese',
  'ht': 'Haitian Creole',
  'ps': 'Pashto',
  'tk': 'Turkmen',
  'nn': 'Nynorsk',
  'mt': 'Maltese',
  'sa': 'Sanskrit',
  'lb': 'Luxembourgish',
  'my': 'Myanmar',
  'bo': 'Tibetan',
  'tl': 'Tagalog',
  'mg': 'Malagasy',
  'as': 'Assamese',
  'tt': 'Tatar',
  'haw': 'Hawaiian',
  'ln': 'Lingala',
  'ha': 'Hausa',
  'ba': 'Bashkir',
  'jw': 'Javanese',
  'su': 'Sundanese',
};
