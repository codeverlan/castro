/**
 * Gap Detection Engine
 * Dedicated service for analyzing mapped content against template requirements
 * and generating contextual questions to prompt users for missing information.
 */

import { randomUUID } from 'crypto';
import { OllamaService, ollamaService } from '../ollama';
import type { OllamaRequestOptions } from '../ollama';
import { gapDetectionRules, getRulesByPriority } from './rules';
import {
  gapAnalysisSystemPrompt,
  questionGenerationSystemPrompt,
  generateDeepAnalysisPrompt,
  generateQuestionPrompt,
  generateDefaultQuestion,
  generateDefaultRationale,
} from './prompts';
import type {
  GapDetectionRequest,
  GapDetectionResult,
  GapDetectionOptions,
  DetectedGap,
  SectionScore,
  GapSummary,
  GapDetectionMetrics,
  RuleContext,
  QuestionGenerationContext,
  TemplateFieldInfo,
  DEFAULT_GAP_DETECTION_OPTIONS,
} from './types';
import type { MappedSectionContent, MappingSectionInfo, GapSeverity } from '../contentMapping/types';

// Import the defaults
const DEFAULTS: Required<GapDetectionOptions> = {
  enableLLMAnalysis: true,
  model: 'llama3',
  temperature: 0.3,
  confidenceThreshold: 70,
  enforceSafetyChecks: true,
  minimumContentLength: 20,
  maxQuestionsPerGap: 3,
};

/**
 * Gap Detection Engine
 * Analyzes mapped content against template requirements to identify gaps
 * and generates contextual questions for missing information.
 */
export class GapDetectionEngine {
  private ollamaService: OllamaService;
  private options: Required<GapDetectionOptions>;

  constructor(
    service?: OllamaService,
    options?: GapDetectionOptions
  ) {
    this.ollamaService = service || ollamaService;
    this.options = { ...DEFAULTS, ...options };
  }

  /**
   * Main entry point: Analyze mapped content for gaps
   */
  async detectGaps(
    request: GapDetectionRequest,
    options?: GapDetectionOptions
  ): Promise<GapDetectionResult> {
    const mergedOptions = { ...this.options, ...options };
    const startTime = Date.now();
    const metrics: Partial<GapDetectionMetrics> = {};

    try {
      // Step 1: Run rule-based detection
      const ruleBasedStart = Date.now();
      const ruleBasedGaps = this.runRuleBasedDetection(
        request.templateSections,
        request.mappedSections,
        request.templateFields,
        request.clinicalContext,
        mergedOptions
      );
      metrics.ruleBasedTimeMs = Date.now() - ruleBasedStart;

      // Step 2: Run LLM-based deep analysis (if enabled)
      let llmGaps: DetectedGap[] = [];
      metrics.llmAnalysisTimeMs = 0;

      if (mergedOptions.enableLLMAnalysis) {
        const llmStart = Date.now();
        llmGaps = await this.runLLMAnalysis(
          request.templateSections,
          request.mappedSections,
          request.clinicalContext,
          request.transcription,
          mergedOptions
        );
        metrics.llmAnalysisTimeMs = Date.now() - llmStart;
      }

      // Step 3: Merge and deduplicate gaps
      const mergedGaps = this.mergeGaps(ruleBasedGaps, llmGaps);

      // Step 4: Enhance questions with LLM (if gaps need better questions)
      const questionStart = Date.now();
      const enhancedGaps = await this.enhanceQuestions(
        mergedGaps,
        request.clinicalContext,
        mergedOptions
      );
      metrics.questionGenerationTimeMs = Date.now() - questionStart;

      // Step 5: Calculate scores and summary
      const sectionScores = this.calculateSectionScores(
        request.templateSections,
        request.mappedSections,
        enhancedGaps
      );

      const completenessScore = this.calculateCompletenessScore(
        request.templateSections,
        request.mappedSections,
        enhancedGaps
      );

      const summary = this.generateSummary(
        request.templateSections,
        enhancedGaps
      );

      const recommendations = this.generateRecommendations(
        enhancedGaps,
        sectionScores
      );

      // Sort gaps by priority
      const sortedGaps = this.sortGapsByPriority(enhancedGaps);

      return {
        success: true,
        sessionId: request.sessionId,
        gaps: sortedGaps,
        completenessScore,
        sectionScores,
        summary,
        recommendations,
        metrics: {
          totalTimeMs: Date.now() - startTime,
          ruleBasedTimeMs: metrics.ruleBasedTimeMs || 0,
          llmAnalysisTimeMs: metrics.llmAnalysisTimeMs || 0,
          questionGenerationTimeMs: metrics.questionGenerationTimeMs || 0,
          gapsDetected: sortedGaps.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        sessionId: request.sessionId,
        gaps: [],
        completenessScore: 0,
        sectionScores: [],
        summary: {
          totalGaps: 0,
          criticalGaps: 0,
          importantGaps: 0,
          minorGaps: 0,
          sectionsWithGaps: 0,
          totalSections: request.templateSections.length,
          requiredSectionsFilled: 0,
          totalRequiredSections: request.templateSections.filter(s => s.isRequired).length,
        },
        recommendations: [],
        error: error instanceof Error ? error.message : 'Unknown error during gap detection',
        metrics: {
          totalTimeMs: Date.now() - startTime,
          ruleBasedTimeMs: metrics.ruleBasedTimeMs || 0,
          llmAnalysisTimeMs: metrics.llmAnalysisTimeMs || 0,
          questionGenerationTimeMs: metrics.questionGenerationTimeMs || 0,
          gapsDetected: 0,
        },
      };
    }
  }

  /**
   * Run rule-based gap detection
   */
  private runRuleBasedDetection(
    sections: MappingSectionInfo[],
    mappedContent: MappedSectionContent[],
    fields: TemplateFieldInfo[] | undefined,
    clinicalContext: GapDetectionRequest['clinicalContext'],
    options: Required<GapDetectionOptions>
  ): DetectedGap[] {
    const gaps: DetectedGap[] = [];
    const rules = getRulesByPriority();

    for (const section of sections) {
      const content = mappedContent.find(m => m.sectionId === section.id);
      if (!content) continue;

      const sectionFields = fields?.filter(f => f.sectionId === section.id);

      const context: RuleContext = {
        section,
        mappedContent: content,
        fields: sectionFields,
        clinicalContext,
        options,
      };

      for (const rule of rules) {
        if (rule.condition(context)) {
          gaps.push({
            id: randomUUID(),
            sectionId: section.id,
            sectionName: section.name,
            gapType: rule.gapType,
            description: rule.generateDescription(context),
            missingElements: this.extractMissingElements(rule, context),
            severity: rule.severity,
            primaryQuestion: rule.generateQuestion(context),
            alternativeQuestions: [],
            clinicalRationale: generateDefaultRationale(rule.gapType),
            priority: rule.priority,
            confidence: 100, // Rule-based detection is deterministic
          });
        }
      }
    }

    return gaps;
  }

  /**
   * Extract missing elements based on rule type
   */
  private extractMissingElements(rule: typeof gapDetectionRules[0], context: RuleContext): string[] {
    switch (rule.gapType) {
      case 'missing_required_field':
        const requiredFields = context.fields?.filter(f => f.isRequired) || [];
        const content = context.mappedContent.rawContent?.toLowerCase() || '';
        return requiredFields
          .filter(field => !content.includes(field.label.toLowerCase()))
          .map(f => f.label);

      case 'missing_required_section':
        return [`${context.section.name} content`];

      case 'insufficient_content':
        return ['Additional detail needed'];

      case 'missing_safety_assessment':
        return ['Risk assessment', 'Safety status', 'Harm evaluation'];

      case 'missing_session_context':
        return ['Presenting issue', 'Session focus'];

      case 'unclear_treatment_plan':
        return ['Treatment goals', 'Next steps', 'Recommendations'];

      default:
        return [];
    }
  }

  /**
   * Run LLM-based deep analysis
   */
  private async runLLMAnalysis(
    sections: MappingSectionInfo[],
    mappedContent: MappedSectionContent[],
    clinicalContext: GapDetectionRequest['clinicalContext'],
    transcription: string | undefined,
    options: Required<GapDetectionOptions>
  ): Promise<DetectedGap[]> {
    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    const prompt = generateDeepAnalysisPrompt(
      sections,
      mappedContent,
      clinicalContext,
      transcription
    );

    const response = await this.ollamaService.generate(
      prompt,
      gapAnalysisSystemPrompt,
      llmOptions
    );

    if (!response.success || !response.data) {
      console.warn('LLM gap analysis failed:', response.error);
      return [];
    }

    try {
      const parsed = this.parseJSONResponse<{
        gaps: Array<{
          sectionId: string;
          sectionName: string;
          gapType: string;
          description: string;
          missingElements: string[];
          severity: GapSeverity;
          primaryQuestion: string;
          alternativeQuestions?: string[];
          clinicalRationale: string;
          priority: number;
          confidence: number;
          contentSuggestions?: string[];
        }>;
        completenessScore: number;
        recommendations: string[];
      }>(response.data);

      return parsed.gaps.map(gap => ({
        id: randomUUID(),
        sectionId: gap.sectionId,
        sectionName: gap.sectionName,
        gapType: this.normalizeGapType(gap.gapType),
        description: gap.description,
        missingElements: gap.missingElements || [],
        severity: gap.severity,
        primaryQuestion: gap.primaryQuestion,
        alternativeQuestions: gap.alternativeQuestions || [],
        clinicalRationale: gap.clinicalRationale || generateDefaultRationale(this.normalizeGapType(gap.gapType)),
        priority: gap.priority || 5,
        confidence: gap.confidence || 80,
        contentSuggestions: gap.contentSuggestions,
      }));
    } catch (error) {
      console.warn('Failed to parse LLM gap analysis response:', error);
      return [];
    }
  }

  /**
   * Normalize gap type from LLM response
   */
  private normalizeGapType(type: string): DetectedGap['gapType'] {
    const validTypes = [
      'missing_required_section',
      'insufficient_content',
      'missing_required_field',
      'low_confidence_content',
      'incomplete_clinical_data',
      'missing_safety_assessment',
      'unclear_treatment_plan',
      'missing_session_context',
    ];

    const normalizedType = type.toLowerCase().replace(/-/g, '_');
    if (validTypes.includes(normalizedType)) {
      return normalizedType as DetectedGap['gapType'];
    }

    // Map common variations
    if (normalizedType.includes('safety') || normalizedType.includes('risk')) {
      return 'missing_safety_assessment';
    }
    if (normalizedType.includes('plan') || normalizedType.includes('treatment')) {
      return 'unclear_treatment_plan';
    }
    if (normalizedType.includes('clinical') || normalizedType.includes('intervention')) {
      return 'incomplete_clinical_data';
    }

    return 'incomplete_clinical_data';
  }

  /**
   * Merge rule-based and LLM gaps, removing duplicates
   */
  private mergeGaps(ruleBasedGaps: DetectedGap[], llmGaps: DetectedGap[]): DetectedGap[] {
    const merged: DetectedGap[] = [...ruleBasedGaps];

    for (const llmGap of llmGaps) {
      // Check if this gap is already covered by a rule-based gap
      const isDuplicate = ruleBasedGaps.some(rbGap =>
        rbGap.sectionId === llmGap.sectionId &&
        rbGap.gapType === llmGap.gapType
      );

      if (!isDuplicate) {
        merged.push(llmGap);
      } else {
        // Enhance existing gap with LLM-generated content
        const existing = merged.find(g =>
          g.sectionId === llmGap.sectionId &&
          g.gapType === llmGap.gapType
        );
        if (existing) {
          // Prefer LLM's more contextual questions
          if (llmGap.alternativeQuestions.length > 0) {
            existing.alternativeQuestions = llmGap.alternativeQuestions;
          }
          if (llmGap.contentSuggestions?.length) {
            existing.contentSuggestions = llmGap.contentSuggestions;
          }
          if (llmGap.clinicalRationale && llmGap.clinicalRationale.length > existing.clinicalRationale.length) {
            existing.clinicalRationale = llmGap.clinicalRationale;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Enhance questions using LLM
   */
  private async enhanceQuestions(
    gaps: DetectedGap[],
    clinicalContext: GapDetectionRequest['clinicalContext'],
    options: Required<GapDetectionOptions>
  ): Promise<DetectedGap[]> {
    // Only enhance gaps that have minimal questions
    const gapsNeedingQuestions = gaps.filter(g => g.alternativeQuestions.length < 2);

    if (gapsNeedingQuestions.length === 0 || !options.enableLLMAnalysis) {
      return gaps;
    }

    const contexts: QuestionGenerationContext[] = gapsNeedingQuestions.map(gap => ({
      sectionName: gap.sectionName,
      gapType: gap.gapType,
      missingElements: gap.missingElements,
      clinicalContext,
    }));

    const llmOptions: OllamaRequestOptions = {
      model: options.model,
      temperature: options.temperature,
    };

    const prompt = generateQuestionPrompt(contexts);

    try {
      const response = await this.ollamaService.generate(
        prompt,
        questionGenerationSystemPrompt,
        llmOptions
      );

      if (!response.success || !response.data) {
        return gaps;
      }

      const parsed = this.parseJSONResponse<{
        questions: Array<{
          gapIndex: number;
          primaryQuestion?: string;
          alternativeQuestions: string[];
          expectedResponseType?: string;
          followUpIfYes?: string;
          followUpIfNo?: string;
        }>;
      }>(response.data);

      // Apply enhanced questions back to gaps
      for (const q of parsed.questions) {
        if (q.gapIndex < gapsNeedingQuestions.length) {
          const gap = gapsNeedingQuestions[q.gapIndex];
          if (q.alternativeQuestions?.length) {
            gap.alternativeQuestions = q.alternativeQuestions.slice(0, options.maxQuestionsPerGap - 1);
          }
        }
      }

      return gaps;
    } catch (error) {
      console.warn('Failed to enhance questions:', error);
      return gaps;
    }
  }

  /**
   * Calculate section-by-section scores
   */
  private calculateSectionScores(
    sections: MappingSectionInfo[],
    mappedContent: MappedSectionContent[],
    gaps: DetectedGap[]
  ): SectionScore[] {
    return sections.map(section => {
      const content = mappedContent.find(m => m.sectionId === section.id);
      const sectionGaps = gaps.filter(g => g.sectionId === section.id);
      const hasContent = content?.rawContent?.trim().length ?? 0;

      let status: 'complete' | 'partial' | 'missing';
      let score: number;

      if (sectionGaps.some(g => g.gapType === 'missing_required_section')) {
        status = 'missing';
        score = 0;
      } else if (sectionGaps.length > 0) {
        status = 'partial';
        // Reduce score based on gap severity
        const severityPenalty = sectionGaps.reduce((total, gap) => {
          switch (gap.severity) {
            case 'critical': return total + 40;
            case 'important': return total + 20;
            case 'minor': return total + 10;
            default: return total;
          }
        }, 0);
        score = Math.max(0, 100 - severityPenalty);
      } else if (hasContent > 0) {
        status = 'complete';
        score = content?.confidence ?? 100;
      } else {
        status = section.isRequired ? 'missing' : 'complete';
        score = section.isRequired ? 0 : 100;
      }

      return {
        sectionId: section.id,
        sectionName: section.name,
        score,
        isRequired: section.isRequired,
        gapCount: sectionGaps.length,
        status,
      };
    });
  }

  /**
   * Calculate overall completeness score
   */
  private calculateCompletenessScore(
    sections: MappingSectionInfo[],
    mappedContent: MappedSectionContent[],
    gaps: DetectedGap[]
  ): number {
    const requiredSections = sections.filter(s => s.isRequired);
    if (requiredSections.length === 0) return 100;

    let totalScore = 0;
    let totalWeight = 0;

    for (const section of sections) {
      const weight = section.isRequired ? 2 : 1;
      const content = mappedContent.find(m => m.sectionId === section.id);
      const sectionGaps = gaps.filter(g => g.sectionId === section.id);

      let sectionScore: number;
      if (!content?.rawContent?.trim()) {
        sectionScore = section.isRequired ? 0 : 100;
      } else if (sectionGaps.length === 0) {
        sectionScore = content.confidence;
      } else {
        const penalty = sectionGaps.reduce((total, gap) => {
          switch (gap.severity) {
            case 'critical': return total + 30;
            case 'important': return total + 15;
            case 'minor': return total + 5;
            default: return total;
          }
        }, 0);
        sectionScore = Math.max(0, content.confidence - penalty);
      }

      totalScore += sectionScore * weight;
      totalWeight += weight;
    }

    return Math.round(totalScore / totalWeight);
  }

  /**
   * Generate gap summary statistics
   */
  private generateSummary(
    sections: MappingSectionInfo[],
    gaps: DetectedGap[]
  ): GapSummary {
    const requiredSections = sections.filter(s => s.isRequired);
    const sectionsWithGaps = new Set(gaps.map(g => g.sectionId));

    return {
      totalGaps: gaps.length,
      criticalGaps: gaps.filter(g => g.severity === 'critical').length,
      importantGaps: gaps.filter(g => g.severity === 'important').length,
      minorGaps: gaps.filter(g => g.severity === 'minor').length,
      sectionsWithGaps: sectionsWithGaps.size,
      totalSections: sections.length,
      requiredSectionsFilled: requiredSections.filter(s =>
        !gaps.some(g => g.sectionId === s.id && g.gapType === 'missing_required_section')
      ).length,
      totalRequiredSections: requiredSections.length,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    gaps: DetectedGap[],
    sectionScores: SectionScore[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical gaps warning
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    if (criticalGaps.length > 0) {
      recommendations.push(
        `Address ${criticalGaps.length} critical gap(s) before finalizing documentation.`
      );
    }

    // Safety assessment recommendation
    if (gaps.some(g => g.gapType === 'missing_safety_assessment')) {
      recommendations.push(
        'Ensure risk/safety assessment is documented for compliance.'
      );
    }

    // Low-scoring sections
    const lowSections = sectionScores.filter(s => s.score < 50 && s.isRequired);
    if (lowSections.length > 0) {
      const names = lowSections.map(s => s.sectionName).join(', ');
      recommendations.push(
        `Review and expand content in: ${names}`
      );
    }

    // Treatment plan recommendation
    if (gaps.some(g => g.gapType === 'unclear_treatment_plan')) {
      recommendations.push(
        'Document clear treatment goals and next steps.'
      );
    }

    // General completion recommendation
    if (gaps.length === 0) {
      recommendations.push(
        'Documentation appears complete. Review for accuracy before finalizing.'
      );
    }

    return recommendations;
  }

  /**
   * Sort gaps by priority (critical first, then by priority number)
   */
  private sortGapsByPriority(gaps: DetectedGap[]): DetectedGap[] {
    const severityOrder: Record<GapSeverity, number> = {
      critical: 0,
      important: 1,
      minor: 2,
    };

    return [...gaps].sort((a, b) => {
      // First sort by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then by priority number
      return a.priority - b.priority;
    });
  }

  /**
   * Parse JSON response from LLM
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

  /**
   * Analyze a single section for gaps (utility method)
   */
  analyzeSection(
    section: MappingSectionInfo,
    content: MappedSectionContent,
    fields?: TemplateFieldInfo[],
    options?: GapDetectionOptions
  ): DetectedGap[] {
    const mergedOptions = { ...this.options, ...options };
    return this.runRuleBasedDetection(
      [section],
      [content],
      fields,
      undefined,
      mergedOptions
    );
  }
}

// Default singleton instance
export const gapDetectionEngine = new GapDetectionEngine();
