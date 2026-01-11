/**
 * Ollama Service Types
 * Type definitions for Ollama API communication
 */

// Supported model types
export type OllamaModel = 'llama3' | 'llama3.1' | 'llama3.2' | 'mistral' | 'mistral-nemo' | 'codellama' | string;

// Ollama API request options
export interface OllamaRequestOptions {
  model?: OllamaModel;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  num_predict?: number;
  stop?: string[];
  stream?: boolean;
}

// Ollama generate request
export interface OllamaGenerateRequest {
  model: OllamaModel;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  options?: Omit<OllamaRequestOptions, 'model' | 'stream'>;
  stream?: boolean;
  raw?: boolean;
  keep_alive?: string;
}

// Ollama generate response
export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Ollama chat message
export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

// Ollama chat request
export interface OllamaChatRequest {
  model: OllamaModel;
  messages: OllamaChatMessage[];
  options?: Omit<OllamaRequestOptions, 'model' | 'stream'>;
  stream?: boolean;
  keep_alive?: string;
}

// Ollama chat response
export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

// Ollama model info
export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// Ollama tags response (list models)
export interface OllamaTagsResponse {
  models: OllamaModelInfo[];
}

// Service-specific types for clinical documentation

// Content mapping request
export interface ContentMappingRequest {
  transcription: string;
  templateSections: TemplateSectionInfo[];
  patientContext?: string;
}

// Template section info for content mapping
export interface TemplateSectionInfo {
  id: string;
  name: string;
  description?: string;
  aiPromptHints?: string;
  requiredFields?: string[];
}

// Content mapping result
export interface ContentMappingResult {
  sectionId: string;
  mappedContent: string;
  confidence: number;
  extractedKeywords?: string[];
  suggestedEdits?: string[];
}

// Professional rewriting request
export interface ProfessionalRewriteRequest {
  content: string;
  sectionType: string;
  targetTone?: 'clinical' | 'formal' | 'compassionate';
  includeTerminology?: boolean;
}

// Professional rewriting result
export interface ProfessionalRewriteResult {
  rewrittenContent: string;
  changesApplied: string[];
  terminologyUsed?: string[];
}

// Gap analysis request
export interface GapAnalysisRequest {
  transcription: string;
  templateSections: TemplateSectionInfo[];
  existingMappedContent?: Record<string, string>;
}

// Gap analysis result
export interface GapAnalysisResult {
  gaps: GapInfo[];
  completenessScore: number;
  recommendations: string[];
}

// Individual gap info
export interface GapInfo {
  sectionId: string;
  sectionName: string;
  missingElements: string[];
  severity: 'critical' | 'important' | 'minor';
  suggestedQuestions?: string[];
}

// Service response wrapper
export interface OllamaServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime?: number;
  model?: string;
}
