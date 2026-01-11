/**
 * Content Mapping Engine
 * AI-powered service that analyzes transcription text and intelligently
 * maps content to appropriate template sections using local LLM.
 */

import { OllamaService, ollamaService } from '../ollama';
import type { OllamaRequestOptions } from '../ollama';
import {
  clinicalContextPrompts,
  sectionMappingPrompts,
  rewritingPrompts,
  gapAnalysisPrompts,
} from './prompts';
import type {
  ContentMappingEngineRequest,
  ContentMappingEngineResult,
  ContentMappingEngineOptions,
  MappedSectionContent,
  ClinicalContext,
  DocumentationGap,
  MappingMetrics,
  MappingSectionInfo,
} from './types';

// Default clinical context for error cases
const EMPTY_CLINICAL_CONTEXT: ClinicalContext = {
  presentingIssues: [],
  symptoms: [],
  interventions: [],
  goals: [],
  riskFactors: [],
  strengths: [],
  emotionalThemes: [],
  clientQuotes: [],
  sessionDynamics: undefined,
  homework: [],
};

// Default engine options
const DEFAULT_OPTIONS: Required<ContentMappingEngineOptions> = {
  model: 'llama3',
  temperature: 0.3, // Lower temperature for more consistent clinical documentation
  enableRewriting: true,
  enableGapAnalysis: true,
  confidenceThreshold: 70,
  maxRetries: 2,
};

export class ContentMappingEngine {
  private ollamaService: OllamaService;
  private options: Required<ContentMappingEngineOptions>;

  constructor(
    service?: OllamaService,
    options?: ContentMappingEngineOptions
  ) {
    this.ollamaService = service || ollamaService;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Main entry point: Process transcription and map to template sections
   */
  async mapContent(
    request: ContentMappingEngineRequest,
    options?: ContentMappingEngineOptions
  ): Promise<ContentMappingEngineResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = Date.now();
    let llmCallCount = 0;
    const metrics: Partial<MappingMetrics> = {};

    try {
      // Step 1: Extract clinical context from transcription
      const extractionStart = Date.now();
      const clinicalContext = await this.extractClinicalContext(
        request.transcription,
        request.patientContext,
        mergedOptions
      );
      llmCallCount++;
      metrics.extractionTimeMs = Date.now() - extractionStart;

      // Step 2: Map content to each section
      const mappingStart = Date.now();
      let mappedSections = await this.mapToSections(
        request.transcription,
        request.sections,
        clinicalContext,
        request.patientContext,
        mergedOptions
      );
      llmCallCount++;
      const mappingTime = Date.now() - mappingStart;

      // Step 3: Professional rewriting (if enabled)
      let rewriteTimeMs = 0;
      if (mergedOptions.enableRewriting) {
        const rewriteStart = Date.now();
        mappedSections = await this.rewriteSections(mappedSections, mergedOptions);
        llmCallCount++;
        rewriteTimeMs = Date.now() - rewriteStart;
      }
      metrics.rewriteTimeMs = rewriteTimeMs;

      // Step 4: Gap analysis (if enabled)
      let gaps: DocumentationGap[] = [];
      let completenessScore = 100;
      let recommendations: string[] = [];
      let gapAnalysisTimeMs = 0;

      if (mergedOptions.enableGapAnalysis) {
        const gapStart = Date.now();
        const gapResult = await this.analyzeGaps(
          request.transcription,
          request.sections,
          mappedSections,
          mergedOptions
        );
        llmCallCount++;
        gaps = gapResult.gaps;
        completenessScore = gapResult.completenessScore;
        recommendations = gapResult.recommendations;
        gapAnalysisTimeMs = Date.now() - gapStart;
      }
      metrics.gapAnalysisTimeMs = gapAnalysisTimeMs;

      // Calculate final metrics
      const totalProcessingTimeMs = Date.now() - startTime;

      return {
        success: true,
        sessionId: request.sessionId,
        mappedSections,
        clinicalContext,
        gaps,
        completenessScore,
        recommendations,
        metrics: {
          totalProcessingTimeMs,
          extractionTimeMs: metrics.extractionTimeMs || 0,
          rewriteTimeMs: metrics.rewriteTimeMs || 0,
          gapAnalysisTimeMs: metrics.gapAnalysisTimeMs || 0,
          modelUsed: mergedOptions.model,
          llmCallCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        sessionId: request.sessionId,
        mappedSections: [],
        clinicalContext: EMPTY_CLINICAL_CONTEXT,
        gaps: [],
        completenessScore: 0,
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error during content mapping',
        metrics: {
          totalProcessingTimeMs: Date.now() - startTime,
          extractionTimeMs: metrics.extractionTimeMs || 0,
          rewriteTimeMs: metrics.rewriteTimeMs || 0,
          gapAnalysisTimeMs: metrics.gapAnalysisTimeMs || 0,
          modelUsed: mergedOptions.model,
          llmCallCount,
        },
      };
    }
  }

  /**
   * Extract clinical context from transcription
   */
  private async extractClinicalContext(
    transcription: string,
    patientContext: string | undefined,
    options: Required<ContentMappingEngineOptions>
  ): Promise<ClinicalContext> {
    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    const userPrompt = clinicalContextPrompts.generateUserPrompt(
      transcription,
      patientContext
    );

    const response = await this.ollamaService.generate(
      userPrompt,
      clinicalContextPrompts.system,
      llmOptions
    );

    if (!response.success || !response.data) {
      console.warn('Failed to extract clinical context, using empty context');
      return EMPTY_CLINICAL_CONTEXT;
    }

    try {
      const parsed = this.parseJSONResponse<ClinicalContext>(response.data);
      return {
        presentingIssues: parsed.presentingIssues || [],
        symptoms: parsed.symptoms || [],
        interventions: parsed.interventions || [],
        goals: parsed.goals || [],
        riskFactors: parsed.riskFactors || [],
        strengths: parsed.strengths || [],
        emotionalThemes: parsed.emotionalThemes || [],
        clientQuotes: parsed.clientQuotes || [],
        sessionDynamics: parsed.sessionDynamics || undefined,
        homework: parsed.homework || [],
      };
    } catch (error) {
      console.warn('Failed to parse clinical context response:', error);
      return EMPTY_CLINICAL_CONTEXT;
    }
  }

  /**
   * Map transcription content to template sections
   */
  private async mapToSections(
    transcription: string,
    sections: MappingSectionInfo[],
    clinicalContext: ClinicalContext,
    patientContext: string | undefined,
    options: Required<ContentMappingEngineOptions>
  ): Promise<MappedSectionContent[]> {
    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    // Use batch mapping for efficiency
    const userPrompt = sectionMappingPrompts.generateBatchSectionPrompt(
      transcription,
      sections,
      clinicalContext,
      patientContext
    );

    const response = await this.ollamaService.generate(
      userPrompt,
      sectionMappingPrompts.system,
      llmOptions
    );

    if (!response.success || !response.data) {
      // Return empty mappings for each section
      return sections.map((section, index) => ({
        sectionId: section.id,
        sectionName: section.name,
        rawContent: '',
        processedContent: '',
        confidence: 0,
        extractedKeywords: [],
        needsReview: true,
        reviewReason: 'Content mapping failed',
        displayOrder: section.displayOrder,
      }));
    }

    try {
      const parsed = this.parseJSONResponse<{
        mappings: Array<{
          sectionId: string;
          sectionName: string;
          rawContent: string;
          confidence: number;
          extractedKeywords?: string[];
          needsReview?: boolean;
          reviewReason?: string | null;
          suggestedEdits?: string[];
        }>;
        unmappedContent?: string;
      }>(response.data);

      // Map parsed results to our type, ensuring all sections have entries
      return sections.map((section) => {
        const mapped = parsed.mappings.find(m => m.sectionId === section.id);

        if (mapped) {
          const needsReview = mapped.needsReview ||
            mapped.confidence < options.confidenceThreshold ||
            (section.isRequired && !mapped.rawContent?.trim());

          return {
            sectionId: section.id,
            sectionName: section.name,
            rawContent: mapped.rawContent || '',
            processedContent: '', // Will be filled by rewriting step
            confidence: Math.min(100, Math.max(0, mapped.confidence || 0)),
            extractedKeywords: mapped.extractedKeywords || [],
            needsReview,
            reviewReason: mapped.needsReview
              ? mapped.reviewReason || undefined
              : needsReview && mapped.confidence < options.confidenceThreshold
                ? `Low confidence (${mapped.confidence}%)`
                : needsReview && section.isRequired && !mapped.rawContent?.trim()
                  ? 'Required section is empty'
                  : undefined,
            suggestedEdits: mapped.suggestedEdits,
            displayOrder: section.displayOrder,
          };
        }

        // Section not in mapping response
        return {
          sectionId: section.id,
          sectionName: section.name,
          rawContent: '',
          processedContent: '',
          confidence: 0,
          extractedKeywords: [],
          needsReview: section.isRequired,
          reviewReason: section.isRequired ? 'Required section has no mapped content' : undefined,
          displayOrder: section.displayOrder,
        };
      });
    } catch (error) {
      console.warn('Failed to parse section mapping response:', error);
      return sections.map((section) => ({
        sectionId: section.id,
        sectionName: section.name,
        rawContent: '',
        processedContent: '',
        confidence: 0,
        extractedKeywords: [],
        needsReview: true,
        reviewReason: 'Failed to parse mapping response',
        displayOrder: section.displayOrder,
      }));
    }
  }

  /**
   * Professionally rewrite mapped content
   */
  private async rewriteSections(
    mappedSections: MappedSectionContent[],
    options: Required<ContentMappingEngineOptions>
  ): Promise<MappedSectionContent[]> {
    // Filter sections that have content to rewrite
    const sectionsToRewrite = mappedSections.filter(s => s.rawContent?.trim());

    if (sectionsToRewrite.length === 0) {
      return mappedSections;
    }

    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    // Prepare batch rewrite request
    const rewriteInput = sectionsToRewrite.map(s => ({
      id: s.sectionId,
      name: s.sectionName,
      rawContent: s.rawContent,
      description: null as string | null, // We don't have this in MappedSectionContent
      aiHints: null as string | null,
    }));

    const userPrompt = rewritingPrompts.generateBatchRewritePrompt(rewriteInput);

    const response = await this.ollamaService.generate(
      userPrompt,
      rewritingPrompts.system,
      llmOptions
    );

    if (!response.success || !response.data) {
      // Fall back to raw content
      return mappedSections.map(s => ({
        ...s,
        processedContent: s.rawContent,
      }));
    }

    try {
      const parsed = this.parseJSONResponse<{
        rewrites: Array<{
          sectionId: string;
          processedContent: string;
          changesApplied?: string[];
          clinicalTermsUsed?: string[];
        }>;
      }>(response.data);

      // Merge rewritten content back into mapped sections
      return mappedSections.map(section => {
        const rewritten = parsed.rewrites.find(r => r.sectionId === section.sectionId);

        if (rewritten && rewritten.processedContent) {
          // Merge any new clinical terms into keywords
          const allKeywords = new Set([
            ...section.extractedKeywords,
            ...(rewritten.clinicalTermsUsed || []),
          ]);

          return {
            ...section,
            processedContent: rewritten.processedContent,
            extractedKeywords: Array.from(allKeywords),
          };
        }

        // No rewrite available, use raw content
        return {
          ...section,
          processedContent: section.rawContent,
        };
      });
    } catch (error) {
      console.warn('Failed to parse rewrite response:', error);
      return mappedSections.map(s => ({
        ...s,
        processedContent: s.rawContent,
      }));
    }
  }

  /**
   * Analyze documentation gaps
   */
  private async analyzeGaps(
    transcription: string,
    sections: MappingSectionInfo[],
    mappedContent: MappedSectionContent[],
    options: Required<ContentMappingEngineOptions>
  ): Promise<{
    gaps: DocumentationGap[];
    completenessScore: number;
    recommendations: string[];
  }> {
    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    // Prepare content summary for gap analysis
    const contentForAnalysis = mappedContent.map(m => ({
      sectionId: m.sectionId,
      sectionName: m.sectionName,
      rawContent: m.rawContent,
      confidence: m.confidence,
    }));

    const userPrompt = gapAnalysisPrompts.generateGapAnalysisPrompt(
      transcription,
      sections,
      contentForAnalysis
    );

    const response = await this.ollamaService.generate(
      userPrompt,
      gapAnalysisPrompts.system,
      llmOptions
    );

    if (!response.success || !response.data) {
      return {
        gaps: [],
        completenessScore: this.calculateBasicCompleteness(mappedContent, sections),
        recommendations: ['Unable to perform detailed gap analysis'],
      };
    }

    try {
      const parsed = this.parseJSONResponse<{
        gaps: Array<{
          sectionId: string;
          sectionName: string;
          description: string;
          missingElements: string[];
          severity: 'critical' | 'important' | 'minor';
          suggestedQuestions: string[];
          priority: number;
        }>;
        completenessScore: number;
        recommendations: string[];
      }>(response.data);

      return {
        gaps: parsed.gaps.map(g => ({
          sectionId: g.sectionId,
          sectionName: g.sectionName,
          description: g.description,
          missingElements: g.missingElements || [],
          severity: g.severity,
          suggestedQuestions: g.suggestedQuestions || [],
          priority: g.priority || 1,
        })),
        completenessScore: Math.min(100, Math.max(0, parsed.completenessScore || 0)),
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.warn('Failed to parse gap analysis response:', error);
      return {
        gaps: [],
        completenessScore: this.calculateBasicCompleteness(mappedContent, sections),
        recommendations: ['Failed to parse gap analysis results'],
      };
    }
  }

  /**
   * Calculate basic completeness score without LLM
   */
  private calculateBasicCompleteness(
    mappedContent: MappedSectionContent[],
    sections: MappingSectionInfo[]
  ): number {
    const requiredSections = sections.filter(s => s.isRequired);
    if (requiredSections.length === 0) return 100;

    const filledRequired = requiredSections.filter(section => {
      const mapped = mappedContent.find(m => m.sectionId === section.id);
      return mapped && mapped.rawContent?.trim();
    });

    return Math.round((filledRequired.length / requiredSections.length) * 100);
  }

  /**
   * Parse JSON response from LLM, handling markdown code blocks
   */
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
      throw new Error('Failed to parse JSON response from LLM');
    }
  }

  /**
   * Check if the engine's LLM service is available
   */
  async checkHealth(): Promise<boolean> {
    const health = await this.ollamaService.checkHealth();
    return health.success && health.data?.available === true;
  }
}

// Default singleton instance
export const contentMappingEngine = new ContentMappingEngine();
