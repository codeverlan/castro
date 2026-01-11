/**
 * Gap Detection Engine Types
 * Type definitions for the dedicated gap detection and question generation service
 */

import type { GapSeverity, MappedSectionContent, MappingSectionInfo } from '../contentMapping/types';
import type { TemplateField } from '../../db/schema';

// =============================================================================
// Gap Detection Request/Response Types
// =============================================================================

/**
 * Input for gap detection analysis
 */
export interface GapDetectionRequest {
  /** Session ID for tracking */
  sessionId: string;
  /** Mapped content for each section */
  mappedSections: MappedSectionContent[];
  /** Template section definitions with requirements */
  templateSections: MappingSectionInfo[];
  /** Optional template fields for field-level gap detection */
  templateFields?: TemplateFieldInfo[];
  /** Original transcription for context analysis */
  transcription?: string;
  /** Clinical context if available */
  clinicalContext?: ClinicalContextSummary;
}

/**
 * Field information for detailed gap detection
 */
export interface TemplateFieldInfo {
  id: string;
  sectionId: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  helpText?: string | null;
  validationRules?: Record<string, unknown> | null;
}

/**
 * Summary of clinical context for question generation
 */
export interface ClinicalContextSummary {
  presentingIssues?: string[];
  symptoms?: string[];
  interventions?: string[];
  riskFactors?: string[];
  sessionType?: string;
}

/**
 * Detected gap with rich context and questions
 */
export interface DetectedGap {
  /** Unique identifier for this gap */
  id: string;
  /** Section where gap was detected */
  sectionId: string;
  sectionName: string;
  /** Type of gap detected */
  gapType: GapType;
  /** Description of what's missing */
  description: string;
  /** Specific elements that are missing */
  missingElements: string[];
  /** Severity of this gap */
  severity: GapSeverity;
  /** Primary question to prompt user */
  primaryQuestion: string;
  /** Alternative ways to phrase the question */
  alternativeQuestions: string[];
  /** Context for why this information is needed */
  clinicalRationale: string;
  /** Priority order (1 = highest) */
  priority: number;
  /** Confidence that this is a real gap (0-100) */
  confidence: number;
  /** Related field if this is a field-level gap */
  relatedFieldId?: string;
  /** Suggestions for content if partially filled */
  contentSuggestions?: string[];
}

/**
 * Types of gaps that can be detected
 */
export type GapType =
  | 'missing_required_section'      // Required section has no content
  | 'insufficient_content'          // Content exists but below minimum
  | 'missing_required_field'        // Required field not addressed
  | 'low_confidence_content'        // AI has low confidence in mapping
  | 'incomplete_clinical_data'      // Clinical elements missing (risk, interventions, etc.)
  | 'missing_safety_assessment'     // Safety/risk assessment not documented
  | 'unclear_treatment_plan'        // Treatment goals/plan not clear
  | 'missing_session_context';      // Session context not captured

/**
 * Complete result from gap detection
 */
export interface GapDetectionResult {
  /** Whether detection was successful */
  success: boolean;
  /** Session ID */
  sessionId: string;
  /** All detected gaps */
  gaps: DetectedGap[];
  /** Overall documentation completeness score (0-100) */
  completenessScore: number;
  /** Breakdown by section */
  sectionScores: SectionScore[];
  /** Summary statistics */
  summary: GapSummary;
  /** Recommendations for improving documentation */
  recommendations: string[];
  /** Processing metrics */
  metrics: GapDetectionMetrics;
  /** Error if failed */
  error?: string;
}

/**
 * Score for individual section
 */
export interface SectionScore {
  sectionId: string;
  sectionName: string;
  score: number;
  isRequired: boolean;
  gapCount: number;
  status: 'complete' | 'partial' | 'missing';
}

/**
 * Summary of gap detection results
 */
export interface GapSummary {
  totalGaps: number;
  criticalGaps: number;
  importantGaps: number;
  minorGaps: number;
  sectionsWithGaps: number;
  totalSections: number;
  requiredSectionsFilled: number;
  totalRequiredSections: number;
}

/**
 * Performance metrics for gap detection
 */
export interface GapDetectionMetrics {
  totalTimeMs: number;
  ruleBasedTimeMs: number;
  llmAnalysisTimeMs: number;
  questionGenerationTimeMs: number;
  gapsDetected: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Configuration options for gap detection
 */
export interface GapDetectionOptions {
  /** Enable LLM-based deep analysis */
  enableLLMAnalysis?: boolean;
  /** LLM model to use */
  model?: string;
  /** Temperature for LLM */
  temperature?: number;
  /** Minimum confidence threshold to flag as gap */
  confidenceThreshold?: number;
  /** Include safety-related gap checks */
  enforceSafetyChecks?: boolean;
  /** Minimum content length to consider section "filled" */
  minimumContentLength?: number;
  /** Maximum number of questions per gap */
  maxQuestionsPerGap?: number;
}

/**
 * Default gap detection options
 */
export const DEFAULT_GAP_DETECTION_OPTIONS: Required<GapDetectionOptions> = {
  enableLLMAnalysis: true,
  model: 'llama3',
  temperature: 0.3,
  confidenceThreshold: 70,
  enforceSafetyChecks: true,
  minimumContentLength: 20,
  maxQuestionsPerGap: 3,
};

// =============================================================================
// Question Generation Types
// =============================================================================

/**
 * Context for generating questions
 */
export interface QuestionGenerationContext {
  sectionName: string;
  sectionDescription?: string;
  gapType: GapType;
  missingElements: string[];
  existingContent?: string;
  clinicalContext?: ClinicalContextSummary;
}

/**
 * Generated question with metadata
 */
export interface GeneratedQuestion {
  question: string;
  isPrimary: boolean;
  targetElement: string;
  expectedResponseType: 'text' | 'yes_no' | 'list' | 'scale';
  followUpIfYes?: string;
  followUpIfNo?: string;
}

// =============================================================================
// Rule-based Detection Types
// =============================================================================

/**
 * Rule for detecting specific types of gaps
 */
export interface GapDetectionRule {
  id: string;
  name: string;
  description: string;
  gapType: GapType;
  severity: GapSeverity;
  condition: (context: RuleContext) => boolean;
  generateDescription: (context: RuleContext) => string;
  generateQuestion: (context: RuleContext) => string;
  priority: number;
}

/**
 * Context provided to gap detection rules
 */
export interface RuleContext {
  section: MappingSectionInfo;
  mappedContent: MappedSectionContent;
  fields?: TemplateFieldInfo[];
  clinicalContext?: ClinicalContextSummary;
  options: Required<GapDetectionOptions>;
}
