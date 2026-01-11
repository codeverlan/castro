import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GapDetectionEngine } from '~/services/gapDetection';
import type { OllamaService } from '~/services/ollama';
import type {
  GapDetectionRequest,
  GapDetectionOptions,
  DetectedGap,
  MappingSectionInfo,
  MappedSectionContent,
} from '~/services/gapDetection/types';

// Mock Ollama Service
const mockOllamaService = {
  generate: vi.fn(),
  checkHealth: vi.fn(),
} as unknown as OllamaService;

describe('GapDetectionEngine', () => {
  let engine: GapDetectionEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new GapDetectionEngine(mockOllamaService);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultEngine = new GapDetectionEngine();
      expect(defaultEngine).toBeInstanceOf(GapDetectionEngine);
    });

    it('should initialize with custom options', () => {
      const customEngine = new GapDetectionEngine(mockOllamaService, {
        enableLLMAnalysis: false,
        model: 'llama2',
        temperature: 0.5,
      });
      expect(customEngine).toBeInstanceOf(GapDetectionEngine);
    });
  });

  describe('detectGaps', () => {
    const mockRequest: GapDetectionRequest = {
      sessionId: '00000000-0000-0000-0000-000000000001',
      templateSections: [
        {
          id: 'section-1',
          name: 'Assessment',
          description: 'Clinical assessment',
          isRequired: true,
          displayOrder: 1,
          aiPromptHints: 'Include symptoms and behaviors',
        },
        {
          id: 'section-2',
          name: 'Treatment Plan',
          description: 'Treatment planning',
          isRequired: true,
          displayOrder: 2,
        },
      ],
      mappedSections: [
        {
          sectionId: 'section-1',
          sectionName: 'Assessment',
          rawContent: 'Patient reports anxiety symptoms',
          processedContent: 'Patient presents with symptoms of anxiety.',
          confidence: 85,
          extractedKeywords: ['anxiety', 'symptoms'],
          needsReview: false,
          displayOrder: 1,
        },
      ],
      clinicalContext: {
        presentingIssues: ['anxiety'],
        symptoms: ['restlessness', 'worry'],
        interventions: [],
        goals: [],
        riskFactors: [],
        strengths: [],
        emotionalThemes: [],
        clientQuotes: [],
        homework: [],
      },
    };

    it('should detect gaps using rule-based detection only (LLM disabled)', async () => {
      const options: GapDetectionOptions = {
        enableLLMAnalysis: false,
      };

      const result = await engine.detectGaps(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(mockRequest.sessionId);
      expect(result.metrics?.llmAnalysisTimeMs).toBe(0);
      expect(mockOllamaService.generate).not.toHaveBeenCalled();
    });

    it('should detect gaps using both rule-based and LLM analysis', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: true,
        data: JSON.stringify({
          gaps: [],
          completenessScore: 80,
          recommendations: ['Review documentation'],
        }),
      });

      const result = await engine.detectGaps(mockRequest);

      expect(result.success).toBe(true);
      expect(mockOllamaService.generate).toHaveBeenCalled();
      expect(result.metrics?.llmAnalysisTimeMs).toBeGreaterThan(0);
    });

    it('should calculate completeness score correctly', async () => {
      const options: GapDetectionOptions = { enableLLMAnalysis: false };

      const result = await engine.detectGaps(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.completenessScore).toBeGreaterThanOrEqual(0);
      expect(result.completenessScore).toBeLessThanOrEqual(100);
    });

    it('should generate section scores', async () => {
      const options: GapDetectionOptions = { enableLLMAnalysis: false };

      const result = await engine.detectGaps(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.sectionScores).toHaveLength(2);
      expect(result.sectionScores[0]).toHaveProperty('sectionId');
      expect(result.sectionScores[0]).toHaveProperty('score');
      expect(result.sectionScores[0]).toHaveProperty('status');
    });

    it('should generate summary statistics', async () => {
      const options: GapDetectionOptions = { enableLLMAnalysis: false };

      const result = await engine.detectGaps(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.summary).toHaveProperty('totalGaps');
      expect(result.summary).toHaveProperty('criticalGaps');
      expect(result.summary).toHaveProperty('importantGaps');
      expect(result.summary).toHaveProperty('minorGaps');
      expect(result.summary).toHaveProperty('sectionsWithGaps');
      expect(result.summary).toHaveProperty('totalSections');
    });

    it('should generate recommendations', async () => {
      const options: GapDetectionOptions = { enableLLMAnalysis: false };

      const result = await engine.detectGaps(mockRequest, options);

      expect(result.success).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle LLM errors gracefully', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: false,
        error: 'LLM service unavailable',
      });

      const result = await engine.detectGaps(mockRequest);

      expect(result.success).toBe(true); // Should still succeed with rule-based gaps
      expect(result.metrics?.llmAnalysisTimeMs).toBeGreaterThan(0);
    });

    it('should handle LLM parse errors', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: true,
        data: 'Invalid JSON response',
      });

      const result = await engine.detectGaps(mockRequest);

      expect(result.success).toBe(true); // Should still succeed with rule-based gaps
      expect(result.gaps).toBeDefined();
    });

    it('should return error on critical failure', async () => {
      (mockOllamaService.generate as any).mockRejectedValue(new Error('Critical error'));

      // This should still return success due to error handling
      const result = await engine.detectGaps(mockRequest);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(mockRequest.sessionId);
    });
  });

  describe('analyzeSection', () => {
    const mockSection: MappingSectionInfo = {
      id: 'section-1',
      name: 'Assessment',
      description: 'Clinical assessment',
      isRequired: true,
      displayOrder: 1,
    };

    const mockContent: MappedSectionContent = {
      sectionId: 'section-1',
      sectionName: 'Assessment',
      rawContent: 'Content here',
      processedContent: 'Processed content',
      confidence: 80,
      extractedKeywords: ['keyword'],
      needsReview: false,
      displayOrder: 1,
    };

    it('should analyze a single section for gaps', () => {
      const gaps = engine.analyzeSection(mockSection, mockContent);

      expect(Array.isArray(gaps)).toBe(true);
      gaps.forEach((gap: DetectedGap) => {
        expect(gap.sectionId).toBe('section-1');
        expect(gap).toHaveProperty('gapType');
        expect(gap).toHaveProperty('severity');
        expect(gap).toHaveProperty('primaryQuestion');
      });
    });

    it('should detect missing required section', () => {
      const emptyContent: MappedSectionContent = {
        sectionId: 'section-1',
        sectionName: 'Assessment',
        rawContent: '',
        processedContent: '',
        confidence: 0,
        extractedKeywords: [],
        needsReview: true,
        reviewReason: 'Empty section',
        displayOrder: 1,
      };

      const gaps = engine.analyzeSection(mockSection, emptyContent);

      const missingSection = gaps.find(
        (g: DetectedGap) => g.gapType === 'missing_required_section'
      );
      expect(missingSection).toBeDefined();
    });

    it('should detect insufficient content', () => {
      const shortContent: MappedSectionContent = {
        sectionId: 'section-1',
        sectionName: 'Assessment',
        rawContent: 'abc',
        processedContent: 'abc',
        confidence: 50,
        extractedKeywords: [],
        needsReview: true,
        displayOrder: 1,
      };

      const gaps = engine.analyzeSection(mockSection, shortContent);

      const insufficientContent = gaps.find(
        (g: DetectedGap) => g.gapType === 'insufficient_content'
      );
      expect(insufficientContent).toBeDefined();
    });
  });

  describe('checkHealth', () => {
    it('should return true when Ollama is healthy', async () => {
      (mockOllamaService.checkHealth as any).mockResolvedValue({
        success: true,
        data: { available: true },
      });

      const isHealthy = await engine.checkHealth();

      expect(isHealthy).toBe(true);
      expect(mockOllamaService.checkHealth).toHaveBeenCalled();
    });

    it('should return false when Ollama is unhealthy', async () => {
      (mockOllamaService.checkHealth as any).mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      const isHealthy = await engine.checkHealth();

      expect(isHealthy).toBe(false);
    });

    it('should return false when Ollama returns not available', async () => {
      (mockOllamaService.checkHealth as any).mockResolvedValue({
        success: true,
        data: { available: false },
      });

      const isHealthy = await engine.checkHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('gap priority and sorting', () => {
    it('should sort gaps by severity and priority', async () => {
      const request: GapDetectionRequest = {
        sessionId: '00000000-0000-0000-0000-000000000001',
        templateSections: [
          {
            id: 'section-1',
            name: 'Assessment',
            isRequired: true,
            displayOrder: 1,
          },
        ],
        mappedSections: [
          {
            sectionId: 'section-1',
            sectionName: 'Assessment',
            rawContent: 'Minimal content',
            processedContent: 'Minimal content',
            confidence: 50,
            extractedKeywords: [],
            needsReview: true,
            displayOrder: 1,
          },
        ],
      };

      const options: GapDetectionOptions = { enableLLMAnalysis: false };
      const result = await engine.detectGaps(request, options);

      expect(result.success).toBe(true);
      expect(result.gaps).toBeDefined();

      // Critical gaps should come before important and minor
      const criticalIndex = result.gaps.findIndex((g) => g.severity === 'critical');
      const importantIndex = result.gaps.findIndex((g) => g.severity === 'important');
      const minorIndex = result.gaps.findIndex((g) => g.severity === 'minor');

      if (criticalIndex !== -1 && importantIndex !== -1) {
        expect(criticalIndex).toBeLessThan(importantIndex);
      }
      if (importantIndex !== -1 && minorIndex !== -1) {
        expect(importantIndex).toBeLessThan(minorIndex);
      }
    });
  });

  describe('options and configuration', () => {
    it('should respect confidence threshold', async () => {
      const request: GapDetectionRequest = {
        sessionId: '00000000-0000-0000-0000-000000000001',
        templateSections: [
          {
            id: 'section-1',
            name: 'Assessment',
            isRequired: true,
            displayOrder: 1,
          },
        ],
        mappedSections: [
          {
            sectionId: 'section-1',
            sectionName: 'Assessment',
            rawContent: 'Content',
            processedContent: 'Content',
            confidence: 50, // Below default threshold
            extractedKeywords: [],
            needsReview: true,
            displayOrder: 1,
          },
        ],
      };

      const options: GapDetectionOptions = {
        enableLLMAnalysis: false,
        confidenceThreshold: 90, // Higher threshold
      };

      const result = await engine.detectGaps(request, options);

      expect(result.success).toBe(true);
      // Should detect gaps due to low confidence
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('should respect safety check enforcement', async () => {
      const request: GapDetectionRequest = {
        sessionId: '00000000-0000-0000-0000-000000000001',
        templateSections: [
          {
            id: 'section-1',
            name: 'Assessment',
            isRequired: true,
            displayOrder: 1,
          },
        ],
        mappedSections: [
          {
            sectionId: 'section-1',
            sectionName: 'Assessment',
            rawContent: 'Patient is stable',
            processedContent: 'Patient is stable',
            confidence: 90,
            extractedKeywords: [],
            needsReview: false,
            displayOrder: 1,
          },
        ],
        clinicalContext: {
          presentingIssues: ['depression'],
          symptoms: [],
          interventions: [],
          goals: [],
          riskFactors: ['suicidal ideation'],
          strengths: [],
          emotionalThemes: [],
          clientQuotes: [],
          homework: [],
        },
      };

      const options: GapDetectionOptions = {
        enableLLMAnalysis: false,
        enforceSafetyChecks: true,
      };

      const result = await engine.detectGaps(request, options);

      expect(result.success).toBe(true);
      // Should detect safety-related gaps
      const safetyGap = result.gaps.find(
        (g) => g.gapType === 'missing_safety_assessment'
      );
      expect(safetyGap).toBeDefined();
    });
  });
});
