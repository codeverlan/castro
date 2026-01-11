/**
 * Ollama Service Configuration
 * Environment-based configuration for Ollama API communication
 */

import * as dotenv from 'dotenv';
import type { OllamaModel } from './types';

dotenv.config();

export interface OllamaConfig {
  baseUrl: string;
  defaultModel: OllamaModel;
  fallbackModel: OllamaModel;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  defaultTemperature: number;
  defaultMaxTokens: number;
  keepAlive: string;
}

export const ollamaConfig: OllamaConfig = {
  // Ollama server URL (default: local instance)
  baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // Default model for general operations
  defaultModel: (process.env.OLLAMA_DEFAULT_MODEL as OllamaModel) || 'llama3',

  // Fallback model if default is unavailable
  fallbackModel: (process.env.OLLAMA_FALLBACK_MODEL as OllamaModel) || 'mistral',

  // Request timeout in milliseconds
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || '120000', 10),

  // Maximum retry attempts for failed requests
  maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10),

  // Delay between retries in milliseconds
  retryDelay: parseInt(process.env.OLLAMA_RETRY_DELAY || '1000', 10),

  // Default temperature for generation (0-1, lower = more deterministic)
  defaultTemperature: parseFloat(process.env.OLLAMA_DEFAULT_TEMPERATURE || '0.7'),

  // Default max tokens for generation
  defaultMaxTokens: parseInt(process.env.OLLAMA_DEFAULT_MAX_TOKENS || '2048', 10),

  // Keep model loaded in memory (e.g., "5m", "1h", "-1" for indefinite)
  keepAlive: process.env.OLLAMA_KEEP_ALIVE || '5m',
};

// Model-specific configurations
export const modelConfigs: Record<string, Partial<OllamaConfig>> = {
  'llama3': {
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'llama3.1': {
    defaultTemperature: 0.7,
    defaultMaxTokens: 8192,
  },
  'llama3.2': {
    defaultTemperature: 0.7,
    defaultMaxTokens: 8192,
  },
  'mistral': {
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096,
  },
  'mistral-nemo': {
    defaultTemperature: 0.7,
    defaultMaxTokens: 8192,
  },
  'codellama': {
    defaultTemperature: 0.2,
    defaultMaxTokens: 4096,
  },
};

// Get configuration for a specific model
export function getModelConfig(model: OllamaModel): OllamaConfig {
  const modelSpecific = modelConfigs[model] || {};
  return {
    ...ollamaConfig,
    ...modelSpecific,
    defaultModel: model,
  };
}

// Validate configuration
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!ollamaConfig.baseUrl) {
    errors.push('OLLAMA_BASE_URL is not configured');
  }

  if (!ollamaConfig.defaultModel) {
    errors.push('OLLAMA_DEFAULT_MODEL is not configured');
  }

  if (ollamaConfig.timeout < 1000) {
    errors.push('OLLAMA_TIMEOUT should be at least 1000ms');
  }

  if (ollamaConfig.defaultTemperature < 0 || ollamaConfig.defaultTemperature > 2) {
    errors.push('OLLAMA_DEFAULT_TEMPERATURE should be between 0 and 2');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
