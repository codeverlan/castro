import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContentMappingEngine } from '~/services/contentMapping';
import type { OllamaService } from '~/services/ollama';
import type {
  ContentMappingEngineRequest,
  ContentMappingEngineOptions,
  MappingSectionInfo,
} from '~/services/contentMapping/types';

// Mock Ollama Service
const mockOllamaService = {
  generate: vi.fn(),
  checkHealth: vi.fn(),
} as unknown as OllamaService;

describe('ContentMappingEngine', () => {
  let engine: ContentMappingEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ContentMappingEngine(mockOllamaService);
  });

  describe('constructor', () => {
    it('should initialize with default options', () => {
      const defaultEngine = new ContentMappingEngine();
      expect(defaultEngine).toBeInstanceOf(ContentMappingEngine);
    });

    it('should initialize with custom options', () => {
      const customEngine = new ContentMappingEngine(mockOllamaService, {
        model: 'llama2',
        temperature: 0.5,
        enableRewriting: false,
        enableGapAnalysis: false,
      });
      expect(customEngine).toBeInstanceOf(ContentMappingEngine);
    });
  });

  describe('mapContent', () => {
    const mockRequest: ContentMappingEngineRequest = {
      sessionId: '00000000-0000-0000-0000-000000000001',
      transcription: 'Patient presents with symptoms of anxiety and depression.',
      sections: [
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
          isRequired: false,
          displayOrder: 2,
        },
      ],
      patientContext: 'Patient is a 35-year-old male with history of anxiety.',
    };

    it('should successfully map content to sections with all features enabled', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: ['anxiety', 'depression'],
            symptoms: ['anxiety symptoms', 'depressive symptoms'],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Patient presents with symptoms of anxiety and depression.',
                confidence: 85,
                extractedKeywords: ['anxiety', 'depression'],
                needsReview: false,
              },
              {
                sectionId: 'section-2',
                sectionName: 'Treatment Plan',
                rawContent: '',
                confidence: 0,
                extractedKeywords: [],
                needsReview: true,
                reviewReason: 'No content available',
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            rewrites: [
              {
                sectionId: 'section-1',
                processedContent: 'The patient presents with clinical symptoms consistent with anxiety and depression.',
                clinicalTermsUsed: ['clinical symptoms', 'consistent with'],
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            gaps: [],
            completenessScore: 85,
            recommendations: ['Document treatment goals'],
          }),
        });

      const result = await engine.mapContent(mockRequest);

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(mockRequest.sessionId);
      expect(result.mappedSections).toHaveLength(2);
      expect(result.clinicalContext).toBeDefined();
      expect(result.gaps).toBeDefined();
      expect(result.completenessScore).toBe(85);
      expect(result.metrics).toBeDefined();
    });

    it('should work with rewriting disabled', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: ['anxiety'],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Patient has anxiety',
                confidence: 80,
                extractedKeywords: ['anxiety'],
                needsReview: false,
              },
            ],
          }),
        });

      const options: ContentMappingEngineOptions = {
        enableRewriting: false,
        enableGapAnalysis: false,
      };

      const result = await engine.mapContent(mockRequest, options);

      expect(result.success).toBe(true);
      expect(mockOllamaService.generate).toHaveBeenCalledTimes(2); // Only extraction and mapping
      // Processed content should be raw content when rewriting is disabled
      expect(result.mappedSections[0].processedContent).toBe(
        result.mappedSections[0].rawContent
      );
    });

    it('should work with gap analysis disabled', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: ['anxiety'],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Content',
                confidence: 80,
                extractedKeywords: [],
                needsReview: false,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            rewrites: [
              {
                sectionId: 'section-1',
                processedContent: 'Processed content',
              },
            ],
          }),
        });

      const options: ContentMappingEngineOptions = {
        enableGapAnalysis: false,
      };

      const result = await engine.mapContent(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.gaps).toEqual([]);
      expect(result.completenessScore).toBe(100); // Default when gap analysis is disabled
      expect(result.recommendations).toEqual([]);
    });

    it('should handle clinical context extraction failure gracefully', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: false,
        error: 'LLM service unavailable',
      });

      const result = await engine.mapContent(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockOllamaService.generate).toHaveBeenCalledTimes(1);
    });

    it('should handle section mapping failure gracefully', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: ['anxiety'],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Mapping failed',
        });

      const result = await engine.mapContent(mockRequest, {
        enableGapAnalysis: false,
        enableRewriting: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed JSON responses', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: true,
        data: 'Invalid JSON {{{',
      });

      const result = await engine.mapContent(mockRequest, {
        enableGapAnalysis: false,
        enableRewriting: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track processing metrics correctly', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: [],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Content',
                confidence: 80,
                extractedKeywords: [],
                needsReview: false,
              },
            ],
          }),
        });

      const options: ContentMappingEngineOptions = {
        enableGapAnalysis: false,
        enableRewriting: false,
      };

      const result = await engine.mapContent(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.totalProcessingTimeMs).toBeGreaterThan(0);
      expect(result.metrics!.extractionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics!.rewriteTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics!.gapAnalysisTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics!.llmCallCount).toBe(2);
      expect(result.metrics!.modelUsed).toBe('llama3');
    });

    it('should handle empty transcription', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: true,
        data: JSON.stringify({
          presentingIssues: [],
          symptoms: [],
          interventions: [],
          goals: [],
          riskFactors: [],
          strengths: [],
          emotionalThemes: [],
          clientQuotes: [],
          homework: [],
        }),
      });

      const emptyRequest: ContentMappingEngineRequest = {
        ...mockRequest,
        transcription: '',
      };

      const result = await engine.mapContent(emptyRequest, {
        enableGapAnalysis: false,
        enableRewriting: false,
      });

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(mockRequest.sessionId);
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

  describe('edge cases and error handling', () => {
    it('should handle sections without content correctly', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: [],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: '',
                confidence: 0,
                extractedKeywords: [],
                needsReview: true,
                reviewReason: 'No mapped content',
              },
            ],
          }),
        });

      const result = await engine.mapContent(mockRequest, {
        enableGapAnalysis: false,
        enableRewriting: false,
      });

      expect(result.success).toBe(true);
      expect(result.mappedSections[0].rawContent).toBe('');
      expect(result.mappedSections[0].confidence).toBe(0);
      expect(result.mappedSections[0].needsReview).toBe(true);
    });

    it('should handle missing patient context', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: [],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Content',
                confidence: 80,
                extractedKeywords: [],
                needsReview: false,
              },
            ],
          }),
        });

      const requestWithoutContext: ContentMappingEngineRequest = {
        ...mockRequest,
        patientContext: undefined,
      };

      const result = await engine.mapContent(requestWithoutContext, {
        enableGapAnalysis: false,
        enableRewriting: false,
      });

      expect(result.success).toBe(true);
    });

    it('should extract and merge clinical terms during rewriting', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: [],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Patient has anxiety',
                confidence: 80,
                extractedKeywords: ['anxiety'],
                needsReview: false,
              },
            ],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            rewrites: [
              {
                sectionId: 'section-1',
                processedContent: 'Patient presents with generalized anxiety disorder',
                clinicalTermsUsed: ['generalized anxiety disorder', 'presents with'],
              },
            ],
          }),
        });

      const result = await engine.mapContent(mockRequest, {
        enableGapAnalysis: false,
      });

      expect(result.success).toBe(true);
      expect(result.mappedSections[0].processedContent).toBeDefined();
      // Should merge original keywords with clinical terms from rewrite
      expect(result.mappedSections[0].extractedKeywords).toContain('anxiety');
      expect(result.mappedSections[0].extractedKeywords).toContain('generalized anxiety disorder');
    });
  });

  describe('options validation', () => {
    it('should use custom model when specified', async () => {
      (mockOllamaService.generate as any).mockResolvedValue({
        success: true,
        data: JSON.stringify({
          presentingIssues: [],
          symptoms: [],
          interventions: [],
          goals: [],
          riskFactors: [],
          strengths: [],
          emotionalThemes: [],
          clientQuotes: [],
          homework: [],
        }),
      });

      const options: ContentMappingEngineOptions = {
        model: 'custom-model',
        temperature: 0.7,
        enableGapAnalysis: false,
        enableRewriting: false,
      };

      await engine.mapContent(mockRequest, options);

      expect(mockOllamaService.generate).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          model: 'custom-model',
          temperature: 0.7,
        })
      );
    });

    it('should use confidence threshold for marking review', async () => {
      (mockOllamaService.generate as any)
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            presentingIssues: [],
            symptoms: [],
            interventions: [],
            goals: [],
            riskFactors: [],
            strengths: [],
            emotionalThemes: [],
            clientQuotes: [],
            homework: [],
          }),
        })
        .mockResolvedValueOnce({
          success: true,
          data: JSON.stringify({
            mappings: [
              {
                sectionId: 'section-1',
                sectionName: 'Assessment',
                rawContent: 'Content',
                confidence: 50, // Below threshold
                extractedKeywords: [],
                needsReview: false,
              },
            ],
          }),
        });

      const options: ContentMappingEngineOptions = {
        confidenceThreshold: 75,
        enableGapAnalysis: false,
        enableRewriting: false,
      };

      const result = await engine.mapContent(mockRequest, options);

      expect(result.success).toBe(true);
      expect(result.mappedSections[0].needsReview).toBe(true);
      expect(result.mappedSections[0].reviewReason).toContain('50');
    });
  });
});
