/**
 * Ollama API Client
 * Low-level client for communicating with local Ollama instance
 */

import { ollamaConfig, getModelConfig } from './config';
import {
  OllamaConnectionError,
  OllamaTimeoutError,
  createOllamaError,
  isRetryableError,
} from './errors';
import type {
  OllamaModel,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaChatMessage,
  OllamaTagsResponse,
  OllamaRequestOptions,
} from './types';

export class OllamaClient {
  private baseUrl: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config?: Partial<typeof ollamaConfig>) {
    const mergedConfig = { ...ollamaConfig, ...config };
    this.baseUrl = mergedConfig.baseUrl;
    this.timeout = mergedConfig.timeout;
    this.maxRetries = mergedConfig.maxRetries;
    this.retryDelay = mergedConfig.retryDelay;
  }

  /**
   * Check if Ollama server is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaTagsResponse> {
    const response = await this.request<OllamaTagsResponse>('/api/tags', {
      method: 'GET',
    });
    return response;
  }

  /**
   * Check if a specific model is available
   */
  async hasModel(model: OllamaModel): Promise<boolean> {
    try {
      const { models } = await this.listModels();
      return models.some(m => m.name === model || m.name.startsWith(`${model}:`));
    } catch {
      return false;
    }
  }

  /**
   * Generate text completion (non-streaming)
   */
  async generate(
    prompt: string,
    options?: OllamaRequestOptions & { system?: string }
  ): Promise<OllamaGenerateResponse> {
    const model = options?.model || ollamaConfig.defaultModel;
    const modelConfig = getModelConfig(model);

    const request: OllamaGenerateRequest = {
      model,
      prompt,
      system: options?.system,
      stream: false,
      keep_alive: ollamaConfig.keepAlive,
      options: {
        temperature: options?.temperature ?? modelConfig.defaultTemperature,
        top_p: options?.top_p,
        top_k: options?.top_k,
        num_predict: options?.num_predict ?? modelConfig.defaultMaxTokens,
        stop: options?.stop,
      },
    };

    return this.requestWithRetry<OllamaGenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    }, model);
  }

  /**
   * Chat completion (non-streaming)
   */
  async chat(
    messages: OllamaChatMessage[],
    options?: OllamaRequestOptions
  ): Promise<OllamaChatResponse> {
    const model = options?.model || ollamaConfig.defaultModel;
    const modelConfig = getModelConfig(model);

    const request: OllamaChatRequest = {
      model,
      messages,
      stream: false,
      keep_alive: ollamaConfig.keepAlive,
      options: {
        temperature: options?.temperature ?? modelConfig.defaultTemperature,
        top_p: options?.top_p,
        top_k: options?.top_k,
        num_predict: options?.num_predict ?? modelConfig.defaultMaxTokens,
        stop: options?.stop,
      },
    };

    return this.requestWithRetry<OllamaChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    }, model);
  }

  /**
   * Generate with system prompt helper
   */
  async generateWithSystem(
    systemPrompt: string,
    userPrompt: string,
    options?: OllamaRequestOptions
  ): Promise<string> {
    const response = await this.generate(userPrompt, {
      ...options,
      system: systemPrompt,
    });
    return response.response;
  }

  /**
   * Chat with a single user message
   */
  async ask(
    question: string,
    systemPrompt?: string,
    options?: OllamaRequestOptions
  ): Promise<string> {
    const messages: OllamaChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: question });

    const response = await this.chat(messages, options);
    return response.message.content;
  }

  /**
   * Internal fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return response;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new OllamaTimeoutError();
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
          throw new OllamaConnectionError();
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Internal request handler
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit,
    model?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await this.fetchWithTimeout(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw createOllamaError(response.status, errorText, model);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Request with automatic retry for transient errors
   */
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit,
    model?: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.request<T>(endpoint, options, model);
      } catch (error) {
        lastError = error as Error;

        if (!isRetryableError(error) || attempt === this.maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default singleton instance
export const ollamaClient = new OllamaClient();
