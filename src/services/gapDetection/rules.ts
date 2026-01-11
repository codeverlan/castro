/**
 * Gap Detection Rules
 * Rule-based gap detection for common documentation requirements
 */

import type { GapDetectionRule, RuleContext } from './types';

/**
 * Built-in gap detection rules
 * These rules check for common documentation requirements without needing LLM
 */
export const gapDetectionRules: GapDetectionRule[] = [
  // =============================================================================
  // Required Section Rules
  // =============================================================================
  {
    id: 'required-section-empty',
    name: 'Required Section Empty',
    description: 'Checks if a required section has no content',
    gapType: 'missing_required_section',
    severity: 'critical',
    priority: 1,
    condition: (ctx: RuleContext) => {
      return (
        ctx.section.isRequired &&
        (!ctx.mappedContent.rawContent?.trim() ||
         ctx.mappedContent.rawContent.trim().length < ctx.options.minimumContentLength)
      );
    },
    generateDescription: (ctx: RuleContext) =>
      `The "${ctx.section.name}" section is required but has no content.`,
    generateQuestion: (ctx: RuleContext) =>
      `What information should be documented in the ${ctx.section.name} section for this session?`,
  },

  {
    id: 'insufficient-content-length',
    name: 'Insufficient Content Length',
    description: 'Checks if section content meets minimum length requirement',
    gapType: 'insufficient_content',
    severity: 'important',
    priority: 2,
    condition: (ctx: RuleContext) => {
      const content = ctx.mappedContent.rawContent?.trim() || '';
      const minLength = ctx.section.minLength || ctx.options.minimumContentLength;
      return (
        ctx.section.isRequired &&
        content.length > 0 &&
        content.length < minLength
      );
    },
    generateDescription: (ctx: RuleContext) => {
      const minLength = ctx.section.minLength || ctx.options.minimumContentLength;
      return `The "${ctx.section.name}" section has insufficient content (minimum ${minLength} characters expected).`;
    },
    generateQuestion: (ctx: RuleContext) =>
      `Can you provide more detail about the ${ctx.section.name}? The current documentation is brief.`,
  },

  // =============================================================================
  // Confidence-Based Rules
  // =============================================================================
  {
    id: 'low-confidence-content',
    name: 'Low Confidence Content',
    description: 'Flags sections where AI has low confidence in the mapping',
    gapType: 'low_confidence_content',
    severity: 'important',
    priority: 3,
    condition: (ctx: RuleContext) => {
      return (
        ctx.mappedContent.rawContent?.trim() &&
        ctx.mappedContent.confidence < ctx.options.confidenceThreshold
      );
    },
    generateDescription: (ctx: RuleContext) =>
      `The content in "${ctx.section.name}" may need review (confidence: ${ctx.mappedContent.confidence}%).`,
    generateQuestion: (ctx: RuleContext) =>
      `Please review the ${ctx.section.name} section. Is the documented content accurate and complete?`,
  },

  // =============================================================================
  // Safety and Clinical Rules
  // =============================================================================
  {
    id: 'missing-risk-assessment',
    name: 'Missing Risk Assessment',
    description: 'Checks for risk/safety assessment documentation',
    gapType: 'missing_safety_assessment',
    severity: 'critical',
    priority: 1,
    condition: (ctx: RuleContext) => {
      if (!ctx.options.enforceSafetyChecks) return false;

      const sectionNameLower = ctx.section.name.toLowerCase();
      const isRiskSection =
        sectionNameLower.includes('risk') ||
        sectionNameLower.includes('safety') ||
        sectionNameLower.includes('assessment');

      if (!isRiskSection) return false;

      const content = ctx.mappedContent.rawContent?.toLowerCase() || '';
      const hasRiskContent =
        content.includes('risk') ||
        content.includes('safety') ||
        content.includes('suicid') ||
        content.includes('harm') ||
        content.includes('danger') ||
        content.includes('denied') ||
        content.includes('no indication');

      return !hasRiskContent && ctx.section.isRequired;
    },
    generateDescription: () =>
      'Risk/safety assessment documentation is missing or incomplete.',
    generateQuestion: () =>
      'Did you assess for any safety concerns or risk factors during this session? Please describe the client\'s current risk status.',
  },

  {
    id: 'missing-intervention',
    name: 'Missing Intervention Documentation',
    description: 'Checks for therapeutic intervention documentation',
    gapType: 'incomplete_clinical_data',
    severity: 'important',
    priority: 2,
    condition: (ctx: RuleContext) => {
      const sectionNameLower = ctx.section.name.toLowerCase();
      const isInterventionSection =
        sectionNameLower.includes('intervention') ||
        sectionNameLower.includes('objective') ||
        sectionNameLower.includes('treatment') ||
        sectionNameLower.includes('response');

      if (!isInterventionSection) return false;

      const content = ctx.mappedContent.rawContent?.toLowerCase() || '';
      const hasInterventionContent =
        content.length > ctx.options.minimumContentLength &&
        (content.includes('used') ||
         content.includes('applied') ||
         content.includes('discussed') ||
         content.includes('explored') ||
         content.includes('processed') ||
         content.includes('technique') ||
         content.includes('intervention'));

      return !hasInterventionContent && ctx.section.isRequired;
    },
    generateDescription: (ctx: RuleContext) =>
      `Therapeutic interventions used in the "${ctx.section.name}" section are not clearly documented.`,
    generateQuestion: () =>
      'What therapeutic techniques or interventions did you use during this session?',
  },

  {
    id: 'missing-treatment-plan',
    name: 'Missing Treatment Plan',
    description: 'Checks for treatment plan/next steps documentation',
    gapType: 'unclear_treatment_plan',
    severity: 'important',
    priority: 2,
    condition: (ctx: RuleContext) => {
      const sectionNameLower = ctx.section.name.toLowerCase();
      const isPlanSection =
        sectionNameLower.includes('plan') ||
        sectionNameLower.includes('recommendation') ||
        sectionNameLower.includes('next') ||
        sectionNameLower.includes('follow');

      if (!isPlanSection) return false;

      const content = ctx.mappedContent.rawContent?.trim() || '';
      return content.length < ctx.options.minimumContentLength && ctx.section.isRequired;
    },
    generateDescription: () =>
      'Treatment plan or next steps are not clearly documented.',
    generateQuestion: () =>
      'What is the treatment plan moving forward? Are there any specific goals or homework for the client?',
  },

  // =============================================================================
  // Session Context Rules
  // =============================================================================
  {
    id: 'missing-session-focus',
    name: 'Missing Session Focus',
    description: 'Checks for primary session focus/presenting issue',
    gapType: 'missing_session_context',
    severity: 'important',
    priority: 2,
    condition: (ctx: RuleContext) => {
      const sectionNameLower = ctx.section.name.toLowerCase();
      const isSubjectiveSection =
        sectionNameLower.includes('subjective') ||
        sectionNameLower.includes('presenting') ||
        sectionNameLower.includes('chief') ||
        sectionNameLower.includes('focus');

      if (!isSubjectiveSection) return false;

      const content = ctx.mappedContent.rawContent?.trim() || '';
      return content.length < ctx.options.minimumContentLength && ctx.section.isRequired;
    },
    generateDescription: () =>
      'The primary focus or presenting issue of this session is not documented.',
    generateQuestion: () =>
      'What was the primary focus or main issue discussed in this session?',
  },

  // =============================================================================
  // Required Field Rules
  // =============================================================================
  {
    id: 'missing-required-field',
    name: 'Missing Required Field',
    description: 'Checks if required fields within a section are addressed',
    gapType: 'missing_required_field',
    severity: 'important',
    priority: 2,
    condition: (ctx: RuleContext) => {
      if (!ctx.fields?.length) return false;

      const requiredFields = ctx.fields.filter(f => f.isRequired);
      if (requiredFields.length === 0) return false;

      const content = ctx.mappedContent.rawContent?.toLowerCase() || '';

      // Check if any required field labels are mentioned in content
      const missingFields = requiredFields.filter(field => {
        const labelLower = field.label.toLowerCase();
        return !content.includes(labelLower);
      });

      return missingFields.length > 0;
    },
    generateDescription: (ctx: RuleContext) => {
      const requiredFields = ctx.fields?.filter(f => f.isRequired) || [];
      const content = ctx.mappedContent.rawContent?.toLowerCase() || '';
      const missingFields = requiredFields.filter(field =>
        !content.includes(field.label.toLowerCase())
      );
      const fieldNames = missingFields.map(f => f.label).join(', ');
      return `Required fields not addressed in "${ctx.section.name}": ${fieldNames}`;
    },
    generateQuestion: (ctx: RuleContext) => {
      const requiredFields = ctx.fields?.filter(f => f.isRequired) || [];
      const content = ctx.mappedContent.rawContent?.toLowerCase() || '';
      const missingFields = requiredFields.filter(field =>
        !content.includes(field.label.toLowerCase())
      );
      if (missingFields.length === 1) {
        return `Please provide information about: ${missingFields[0].label}`;
      }
      const fieldNames = missingFields.map(f => f.label).join(', ');
      return `Please provide information about the following: ${fieldNames}`;
    },
  },
];

/**
 * Get rules by severity
 */
export function getRulesBySeverity(severity: 'critical' | 'important' | 'minor'): GapDetectionRule[] {
  return gapDetectionRules.filter(rule => rule.severity === severity);
}

/**
 * Get rules sorted by priority
 */
export function getRulesByPriority(): GapDetectionRule[] {
  return [...gapDetectionRules].sort((a, b) => a.priority - b.priority);
}

/**
 * Get rule by ID
 */
export function getRuleById(id: string): GapDetectionRule | undefined {
  return gapDetectionRules.find(rule => rule.id === id);
}
