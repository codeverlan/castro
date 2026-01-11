/**
 * Ollama Service
 * High-level service for clinical documentation AI operations
 */

import { OllamaClient, ollamaClient } from './client';
import { ollamaConfig } from './config';
import {
  contentMappingPrompts,
  professionalRewritePrompts,
  gapAnalysisPrompts,
} from './prompts';
import type {
  OllamaModel,
  OllamaRequestOptions,
  ContentMappingRequest,
  ContentMappingResult,
  ProfessionalRewriteRequest,
  ProfessionalRewriteResult,
  GapAnalysisRequest,
  GapAnalysisResult,
  GapInfo,
  OllamaServiceResponse,
  TemplateSectionInfo,
} from './types';

export class OllamaService {
  private client: OllamaClient;
  private defaultModel: OllamaModel;

  constructor(client?: OllamaClient, defaultModel?: OllamaModel) {
    this.client = client || ollamaClient;
    this.defaultModel = defaultModel || ollamaConfig.defaultModel;
  }

  /**
   * Check service availability
   */
  async checkHealth(): Promise<OllamaServiceResponse<{ available: boolean; models: string[] }>> {
    const startTime = Date.now();

    try {
      const available = await this.client.isAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Ollama server is not available',
          processingTime: Date.now() - startTime,
        };
      }

      const { models } = await this.client.listModels();
      return {
        success: true,
        data: {
          available: true,
          models: models.map(m => m.name),
        },
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Map transcription content to template sections
   */
  async mapContent(
    request: ContentMappingRequest,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<ContentMappingResult[]>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      // Use batch mapping for multiple sections
      if (request.templateSections.length > 1) {
        return await this.mapContentBatch(request, options);
      }

      // Single section mapping
      const section = request.templateSections[0];
      const userPrompt = contentMappingPrompts.generateUserPrompt(
        request.transcription,
        section,
        request.patientContext
      );

      const response = await this.client.generateWithSystem(
        contentMappingPrompts.system,
        userPrompt,
        { ...options, model }
      );

      const result = this.parseContentMappingResponse(response, section);

      return {
        success: true,
        data: [result],
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Content mapping failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Map content to multiple sections in batch
   */
  private async mapContentBatch(
    request: ContentMappingRequest,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<ContentMappingResult[]>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const userPrompt = contentMappingPrompts.generateBatchPrompt(
        request.transcription,
        request.templateSections,
        request.patientContext
      );

      const response = await this.client.generateWithSystem(
        contentMappingPrompts.system,
        userPrompt,
        { ...options, model }
      );

      const results = this.parseBatchMappingResponse(response, request.templateSections);

      return {
        success: true,
        data: results,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch mapping failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Rewrite content professionally
   */
  async rewriteProfessionally(
    request: ProfessionalRewriteRequest,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<ProfessionalRewriteResult>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const userPrompt = professionalRewritePrompts.generateUserPrompt(
        request.content,
        request.sectionType,
        request.targetTone || 'clinical',
        request.includeTerminology ?? true
      );

      const response = await this.client.generateWithSystem(
        professionalRewritePrompts.system,
        userPrompt,
        { ...options, model }
      );

      const result = this.parseRewriteResponse(response);

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Professional rewrite failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Rewrite SOAP note sections
   */
  async rewriteSOAP(
    subjective: string,
    objective: string,
    assessment: string,
    plan: string,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    clinicalTerms?: string[];
  }>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const userPrompt = professionalRewritePrompts.generateSOAPPrompt(
        subjective,
        objective,
        assessment,
        plan
      );

      const response = await this.client.generateWithSystem(
        professionalRewritePrompts.system,
        userPrompt,
        { ...options, model }
      );

      const result = this.parseJSONResponse<{
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
        clinicalTerms?: string[];
      }>(response);

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SOAP rewrite failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Analyze documentation gaps
   */
  async analyzeGaps(
    request: GapAnalysisRequest,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<GapAnalysisResult>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const userPrompt = gapAnalysisPrompts.generateUserPrompt(
        request.transcription,
        request.templateSections,
        request.existingMappedContent
      );

      const response = await this.client.generateWithSystem(
        gapAnalysisPrompts.system,
        userPrompt,
        { ...options, model }
      );

      const result = this.parseGapAnalysisResponse(response);

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gap analysis failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Generate follow-up questions for gaps
   */
  async generateFollowUpQuestions(
    gaps: GapInfo[],
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<{
    followUpQuestions: Array<{
      sectionId: string;
      severity: string;
      questions: string[];
      rationale: string;
    }>;
    sessionFlowSuggestion: string;
  }>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const userPrompt = gapAnalysisPrompts.generateFollowUpPrompt(gaps);

      const response = await this.client.generateWithSystem(
        gapAnalysisPrompts.system,
        userPrompt,
        { ...options, model }
      );

      const result = this.parseJSONResponse<{
        followUpQuestions: Array<{
          sectionId: string;
          severity: string;
          questions: string[];
          rationale: string;
        }>;
        sessionFlowSuggestion: string;
      }>(response);

      return {
        success: true,
        data: result,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Follow-up questions generation failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  /**
   * Simple text generation with custom prompt
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options?: OllamaRequestOptions
  ): Promise<OllamaServiceResponse<string>> {
    const startTime = Date.now();
    const model = options?.model || this.defaultModel;

    try {
      const response = systemPrompt
        ? await this.client.generateWithSystem(systemPrompt, prompt, { ...options, model })
        : await this.client.generate(prompt, { ...options, model }).then(r => r.response);

      return {
        success: true,
        data: response,
        processingTime: Date.now() - startTime,
        model,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  // Response parsing helpers

  private parseContentMappingResponse(
    response: string,
    section: TemplateSectionInfo
  ): ContentMappingResult {
    // Parse structured response
    const contentMatch = response.match(/EXTRACTED_CONTENT:\s*([\s\S]*?)(?=CONFIDENCE:|$)/i);
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);
    const keyTermsMatch = response.match(/KEY_TERMS:\s*([\s\S]*?)(?=REVIEW_NOTES:|$)/i);

    const mappedContent = contentMatch?.[1]?.trim() || response.trim();
    const confidence = confidenceMatch ? parseInt(confidenceMatch[1], 10) : 70;
    const keyTerms = keyTermsMatch?.[1]
      ?.split(',')
      .map(t => t.trim())
      .filter(Boolean) || [];

    return {
      sectionId: section.id,
      mappedContent,
      confidence: Math.min(100, Math.max(0, confidence)),
      extractedKeywords: keyTerms,
    };
  }

  private parseBatchMappingResponse(
    response: string,
    sections: TemplateSectionInfo[]
  ): ContentMappingResult[] {
    try {
      const parsed = this.parseJSONResponse<{
        mappings: Array<{
          sectionId: string;
          content: string;
          confidence: number;
          keyTerms?: string[];
        }>;
      }>(response);

      return parsed.mappings.map(m => ({
        sectionId: m.sectionId,
        mappedContent: m.content,
        confidence: m.confidence,
        extractedKeywords: m.keyTerms,
      }));
    } catch {
      // Fallback: return empty mappings with sections
      return sections.map(s => ({
        sectionId: s.id,
        mappedContent: '',
        confidence: 0,
      }));
    }
  }

  private parseRewriteResponse(response: string): ProfessionalRewriteResult {
    const contentMatch = response.match(/REWRITTEN_CONTENT:\s*([\s\S]*?)(?=CHANGES_APPLIED:|$)/i);
    const changesMatch = response.match(/CHANGES_APPLIED:\s*([\s\S]*?)(?=CLINICAL_TERMS_USED:|$)/i);
    const termsMatch = response.match(/CLINICAL_TERMS_USED:\s*([\s\S]*?)$/i);

    const rewrittenContent = contentMatch?.[1]?.trim() || response.trim();
    const changesApplied = changesMatch?.[1]
      ?.split('\n')
      .map(c => c.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean) || [];
    const terminologyUsed = termsMatch?.[1]
      ?.split(/[,\n]/)
      .map(t => t.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean) || [];

    return {
      rewrittenContent,
      changesApplied,
      terminologyUsed: terminologyUsed.length > 0 ? terminologyUsed : undefined,
    };
  }

  private parseGapAnalysisResponse(response: string): GapAnalysisResult {
    try {
      const parsed = this.parseJSONResponse<{
        gaps: Array<{
          sectionId: string;
          sectionName: string;
          missingElements: string[];
          severity: 'critical' | 'important' | 'minor';
          suggestedQuestions?: string[];
        }>;
        completenessScore: number;
        recommendations: string[];
      }>(response);

      return {
        gaps: parsed.gaps.map(g => ({
          sectionId: g.sectionId,
          sectionName: g.sectionName,
          missingElements: g.missingElements,
          severity: g.severity,
          suggestedQuestions: g.suggestedQuestions,
        })),
        completenessScore: parsed.completenessScore,
        recommendations: parsed.recommendations,
      };
    } catch {
      // Fallback for non-JSON responses
      return {
        gaps: [],
        completenessScore: 0,
        recommendations: ['Unable to parse gap analysis response'],
      };
    }
  }

  private parseJSONResponse<T>(response: string): T {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch?.[1]?.trim() || response.trim();

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      // Try to find JSON object in the response
      const objectMatch = response.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]) as T;
      }
      throw new Error('Failed to parse JSON response');
    }
  }
}

// Default singleton instance
export const ollamaService = new OllamaService();
