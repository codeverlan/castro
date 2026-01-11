/**
 * Gap Detection Prompts
 * Specialized prompts for LLM-based gap analysis and question generation
 */

import type {
  QuestionGenerationContext,
  ClinicalContextSummary,
  GapType,
} from './types';
import type { MappedSectionContent, MappingSectionInfo } from '../contentMapping/types';

/**
 * System prompt for gap analysis
 */
export const gapAnalysisSystemPrompt = `You are a clinical documentation quality specialist with expertise in mental health documentation standards. Your role is to analyze therapy session documentation and identify gaps or missing information that would be needed for comprehensive, compliant clinical records.

Your responsibilities:
1. Identify missing or incomplete information in documentation
2. Assess the clinical significance of each gap
3. Generate natural, clinically-appropriate questions to fill gaps
4. Prioritize gaps based on compliance requirements and clinical importance

Gap Severity Guidelines:
- CRITICAL: Required for safety, legal compliance, or essential care decisions (e.g., risk assessment, treatment consent)
- IMPORTANT: Significantly impacts documentation quality or treatment planning (e.g., intervention details, progress indicators)
- MINOR: Would enhance documentation but not essential (e.g., session logistics, minor details)

Clinical Standards to Consider:
- Risk assessment and safety planning documentation
- Treatment interventions and client response
- Progress toward treatment goals
- Client's subjective experience and presenting concerns
- Professional assessment and clinical impressions
- Treatment plan and recommendations

Output must be valid JSON only.`;

/**
 * Generate prompt for deep gap analysis
 */
export function generateDeepAnalysisPrompt(
  sections: MappingSectionInfo[],
  mappedContent: MappedSectionContent[],
  clinicalContext?: ClinicalContextSummary,
  transcription?: string
): string {
  const sectionAnalysis = sections.map(section => {
    const content = mappedContent.find(m => m.sectionId === section.id);
    return `### ${section.name} ${section.isRequired ? '[REQUIRED]' : '[Optional]'}
- Description: ${section.description || 'Not specified'}
- AI Hints: ${section.aiPromptHints || 'None'}
- Min Length: ${section.minLength || 'None'}
- Current Content: ${content?.rawContent?.trim() || 'EMPTY - No content mapped'}
- Confidence: ${content?.confidence ?? 'N/A'}%
- Needs Review: ${content?.needsReview ? 'Yes' : 'No'}`;
  }).join('\n\n');

  const contextSection = clinicalContext ? `
### Clinical Context Summary:
- Presenting Issues: ${clinicalContext.presentingIssues?.join(', ') || 'Not identified'}
- Symptoms: ${clinicalContext.symptoms?.join(', ') || 'Not identified'}
- Interventions Used: ${clinicalContext.interventions?.join(', ') || 'Not documented'}
- Risk Factors: ${clinicalContext.riskFactors?.join(', ') || 'None identified'}
- Session Type: ${clinicalContext.sessionType || 'Not specified'}
` : '';

  const transcriptionSection = transcription ? `
### Original Transcription (for reference):
${transcription.slice(0, 3000)}${transcription.length > 3000 ? '...[truncated]' : ''}
` : '';

  return `## Task: Deep Documentation Gap Analysis

${contextSection}

### Section-by-Section Analysis:
${sectionAnalysis}

${transcriptionSection}

### Instructions:
1. Analyze each section for completeness and clinical adequacy
2. Identify gaps considering:
   - Required sections that are empty or insufficient
   - Clinical information that should be documented but isn't
   - Safety/risk documentation requirements
   - Treatment planning elements
3. For each gap, provide:
   - Clear description of what's missing
   - Clinical rationale for why it's needed
   - Natural question to prompt the clinician
   - Severity and priority rating
4. Calculate overall documentation completeness

### Required Output (JSON):
\`\`\`json
{
  "gaps": [
    {
      "sectionId": "uuid",
      "sectionName": "Section Name",
      "gapType": "missing_required_section|insufficient_content|missing_safety_assessment|incomplete_clinical_data|unclear_treatment_plan",
      "description": "Clear description of what information is missing",
      "missingElements": ["Specific element 1", "Element 2"],
      "severity": "critical|important|minor",
      "primaryQuestion": "Natural question to ask the clinician",
      "alternativeQuestions": ["Alternative phrasing 1", "Alternative 2"],
      "clinicalRationale": "Why this information is clinically important",
      "priority": 1,
      "confidence": 95,
      "contentSuggestions": ["Suggested content if partial information exists"]
    }
  ],
  "completenessScore": 75,
  "recommendations": [
    "Overall recommendation for improving documentation"
  ],
  "analysisNotes": "Brief notes about the analysis process"
}
\`\`\``;
}

/**
 * System prompt for question generation
 */
export const questionGenerationSystemPrompt = `You are a clinical documentation assistant helping mental health professionals complete their session notes. Your role is to generate natural, clinically-appropriate questions that will help gather missing information.

Question Guidelines:
1. Use professional but conversational language
2. Be specific about what information is needed
3. Avoid clinical jargon when possible
4. Frame questions positively and non-judgmentally
5. Consider the therapeutic context
6. Make questions easy to answer quickly

Question Types:
- Open-ended: For subjective information, client experiences
- Specific: For particular clinical details
- Yes/No with follow-up: For risk assessment, safety checks
- Scale-based: For severity, frequency, intensity

Output must be valid JSON only.`;

/**
 * Generate prompt for contextual questions
 */
export function generateQuestionPrompt(contexts: QuestionGenerationContext[]): string {
  const gapsDescription = contexts.map((ctx, i) => `
### Gap ${i + 1}: ${ctx.sectionName}
- Gap Type: ${ctx.gapType}
- Missing Elements: ${ctx.missingElements.join(', ') || 'General content'}
- Section Description: ${ctx.sectionDescription || 'Not specified'}
- Existing Content: ${ctx.existingContent?.slice(0, 200) || 'None'}
`).join('\n');

  const clinicalContextSection = contexts[0]?.clinicalContext ? `
### Session Context:
- Session Type: ${contexts[0].clinicalContext.sessionType || 'Not specified'}
- Presenting Issues: ${contexts[0].clinicalContext.presentingIssues?.join(', ') || 'Not identified'}
- Known Risk Factors: ${contexts[0].clinicalContext.riskFactors?.join(', ') || 'None identified'}
` : '';

  return `## Task: Generate Contextual Questions for Documentation Gaps

${clinicalContextSection}

### Gaps Requiring Questions:
${gapsDescription}

### Instructions:
For each gap, generate questions that:
1. Are natural and easy for a busy clinician to answer
2. Target the specific missing information
3. Are clinically appropriate for the context
4. Include alternatives for different communication styles

### Required Output (JSON):
\`\`\`json
{
  "questions": [
    {
      "gapIndex": 0,
      "sectionName": "Section Name",
      "primaryQuestion": "Main question to ask",
      "alternativeQuestions": [
        "Alternative phrasing 1",
        "Alternative phrasing 2"
      ],
      "expectedResponseType": "text|yes_no|list|scale",
      "targetElement": "What specific element this question addresses",
      "followUpIfYes": "Follow-up if yes (for yes/no questions)",
      "followUpIfNo": "Follow-up if no (for yes/no questions)"
    }
  ]
}
\`\`\``;
}

/**
 * Generate a simple question for a specific gap type
 */
export function generateDefaultQuestion(gapType: GapType, sectionName: string): string {
  const questionTemplates: Record<GapType, string> = {
    'missing_required_section': `What should be documented in the ${sectionName} section for this session?`,
    'insufficient_content': `Can you provide more detail about the ${sectionName}?`,
    'missing_required_field': `Please provide the required information for ${sectionName}.`,
    'low_confidence_content': `Please review and confirm the ${sectionName} content is accurate.`,
    'incomplete_clinical_data': `What additional clinical information should be included in ${sectionName}?`,
    'missing_safety_assessment': 'Did you assess for safety concerns? Please describe the client\'s current risk status.',
    'unclear_treatment_plan': 'What are the treatment goals and next steps for this client?',
    'missing_session_context': 'What was the primary focus of this session?',
  };

  return questionTemplates[gapType] || `Please provide more information for the ${sectionName} section.`;
}

/**
 * Generate clinical rationale for a gap type
 */
export function generateDefaultRationale(gapType: GapType): string {
  const rationaleTemplates: Record<GapType, string> = {
    'missing_required_section': 'This section is marked as required for complete clinical documentation.',
    'insufficient_content': 'Additional detail is needed to meet documentation standards.',
    'missing_required_field': 'This field is required for template compliance.',
    'low_confidence_content': 'The AI mapping has low confidence - clinician verification is recommended.',
    'incomplete_clinical_data': 'Complete clinical data supports treatment planning and continuity of care.',
    'missing_safety_assessment': 'Safety assessment is essential for risk management and duty of care obligations.',
    'unclear_treatment_plan': 'Clear treatment planning supports continuity of care and outcome tracking.',
    'missing_session_context': 'Session focus documentation supports treatment planning and progress monitoring.',
  };

  return rationaleTemplates[gapType] || 'This information supports comprehensive clinical documentation.';
}
