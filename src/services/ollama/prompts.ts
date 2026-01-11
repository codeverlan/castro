/**
 * Ollama Prompt Templates
 * Structured prompts for clinical documentation tasks
 */

import type { TemplateSectionInfo, GapInfo } from './types';

/**
 * Content Mapping Prompt Templates
 * Maps transcription content to template sections
 */
export const contentMappingPrompts = {
  /**
   * System prompt for content mapping
   */
  system: `You are a clinical documentation specialist AI assistant. Your task is to analyze therapy session transcriptions and extract relevant content for specific documentation sections.

Guidelines:
- Extract only content directly relevant to the requested section
- Maintain clinical accuracy and appropriate terminology
- Preserve the client's voice when quoting or paraphrasing
- Flag any content that may need clinician review
- Do not fabricate or infer information not present in the transcription
- Respect HIPAA and confidentiality standards in your output

Output Format:
Provide extracted content in a structured format suitable for clinical documentation.`,

  /**
   * Generate user prompt for content mapping
   */
  generateUserPrompt(
    transcription: string,
    section: TemplateSectionInfo,
    patientContext?: string
  ): string {
    let prompt = `## Task: Extract Content for "${section.name}" Section

### Section Description:
${section.description || 'No description provided'}

${section.aiPromptHints ? `### AI Guidance:\n${section.aiPromptHints}\n` : ''}
${section.requiredFields?.length ? `### Required Fields:\n${section.requiredFields.map(f => `- ${f}`).join('\n')}\n` : ''}
${patientContext ? `### Patient Context:\n${patientContext}\n` : ''}

### Session Transcription:
${transcription}

### Instructions:
1. Identify all content from the transcription relevant to the "${section.name}" section
2. Extract and organize this content appropriately
3. Rate your confidence (0-100) in the extraction accuracy
4. Note any content that may require clinician review
5. List key clinical terms or themes identified

### Response Format:
Provide your response in the following structure:

EXTRACTED_CONTENT:
[Your extracted content here]

CONFIDENCE: [0-100]

KEY_TERMS:
[Comma-separated clinical terms]

REVIEW_NOTES:
[Any notes for clinician review, or "None" if not applicable]`;

    return prompt;
  },

  /**
   * Generate batch mapping prompt for multiple sections
   */
  generateBatchPrompt(
    transcription: string,
    sections: TemplateSectionInfo[],
    patientContext?: string
  ): string {
    const sectionsInfo = sections.map(s =>
      `- **${s.name}** (ID: ${s.id}): ${s.description || 'No description'}${s.aiPromptHints ? ` [Hint: ${s.aiPromptHints}]` : ''}`
    ).join('\n');

    return `## Task: Map Transcription Content to Multiple Sections

### Target Sections:
${sectionsInfo}

${patientContext ? `### Patient Context:\n${patientContext}\n` : ''}

### Session Transcription:
${transcription}

### Instructions:
For each section, extract relevant content from the transcription. Provide output as a JSON object:

\`\`\`json
{
  "mappings": [
    {
      "sectionId": "section-id",
      "sectionName": "Section Name",
      "content": "Extracted content...",
      "confidence": 85,
      "keyTerms": ["term1", "term2"],
      "reviewNotes": "Any notes or null"
    }
  ],
  "unmappedContent": "Any significant content that didn't fit sections",
  "overallConfidence": 80
}
\`\`\``;
  },
};

/**
 * Professional Rewriting Prompt Templates
 * Transforms content into clinical documentation style
 */
export const professionalRewritePrompts = {
  /**
   * System prompt for professional rewriting
   */
  system: `You are an expert clinical documentation writer specializing in mental health and therapy notes. Your task is to transform raw content into professional clinical documentation.

Guidelines:
- Use appropriate clinical terminology
- Maintain objectivity and professional tone
- Preserve factual accuracy of the original content
- Follow standard clinical documentation conventions
- Ensure HIPAA compliance in language use
- Use person-first language when appropriate
- Avoid judgmental or stigmatizing language

Documentation Standards:
- Write in third person for observations
- Use present tense for current status
- Use past tense for reported history
- Include specific behavioral observations when available
- Quantify when possible (frequency, duration, intensity)`,

  /**
   * Generate rewrite prompt for specific section types
   */
  generateUserPrompt(
    content: string,
    sectionType: string,
    targetTone: 'clinical' | 'formal' | 'compassionate' = 'clinical',
    includeTerminology: boolean = true
  ): string {
    const toneGuide = {
      clinical: 'Use precise clinical language and maintain professional objectivity.',
      formal: 'Use formal professional language suitable for medical records.',
      compassionate: 'Use warm but professional language that acknowledges the client\'s experience.',
    };

    return `## Task: Professional Rewrite for ${sectionType}

### Original Content:
${content}

### Tone Requirement:
${toneGuide[targetTone]}

### Instructions:
1. Rewrite the content in professional clinical documentation style
2. ${includeTerminology ? 'Incorporate appropriate clinical terminology' : 'Use accessible language while maintaining professionalism'}
3. Maintain factual accuracy
4. Organize content logically for the ${sectionType} section
5. Ensure the rewrite is suitable for official clinical records

### Response Format:
REWRITTEN_CONTENT:
[Your professionally rewritten content]

CHANGES_APPLIED:
[List of significant changes made]

${includeTerminology ? 'CLINICAL_TERMS_USED:\n[List clinical terms incorporated]' : ''}`;
  },

  /**
   * Generate SOAP note rewrite prompt
   */
  generateSOAPPrompt(
    subjective: string,
    objective: string,
    assessment: string,
    plan: string
  ): string {
    return `## Task: Professional SOAP Note Rewrite

### Raw SOAP Components:

**Subjective:**
${subjective}

**Objective:**
${objective}

**Assessment:**
${assessment}

**Plan:**
${plan}

### Instructions:
Rewrite each SOAP component following these guidelines:
- Subjective: Client's reported symptoms, concerns, and experiences in professional language
- Objective: Observable behaviors, appearance, affect, and clinical observations
- Assessment: Clinical interpretation, progress notes, and diagnostic impressions
- Plan: Treatment plan, interventions, and next steps

### Response Format (JSON):
\`\`\`json
{
  "subjective": "Rewritten subjective section...",
  "objective": "Rewritten objective section...",
  "assessment": "Rewritten assessment section...",
  "plan": "Rewritten plan section...",
  "clinicalTerms": ["term1", "term2"],
  "suggestedDiagnosticCodes": ["optional ICD codes if relevant"]
}
\`\`\``;
  },
};

/**
 * Gap Analysis Prompt Templates
 * Identifies missing information in clinical documentation
 */
export const gapAnalysisPrompts = {
  /**
   * System prompt for gap analysis
   */
  system: `You are a clinical documentation quality assurance specialist. Your task is to analyze documentation for completeness and identify missing or incomplete information.

Guidelines:
- Identify gaps based on clinical documentation standards
- Prioritize gaps by clinical importance
- Suggest specific questions to fill gaps
- Consider regulatory and compliance requirements
- Be thorough but practical in gap identification
- Focus on clinically significant missing information

Gap Severity Levels:
- CRITICAL: Information required for safety, legal compliance, or essential care decisions
- IMPORTANT: Information that significantly impacts documentation quality or care planning
- MINOR: Information that would enhance documentation but isn't essential`,

  /**
   * Generate gap analysis prompt
   */
  generateUserPrompt(
    transcription: string,
    sections: TemplateSectionInfo[],
    existingContent?: Record<string, string>
  ): string {
    const sectionsWithContent = sections.map(s => {
      const content = existingContent?.[s.id];
      return `### ${s.name} (ID: ${s.id})
Description: ${s.description || 'No description'}
Required Fields: ${s.requiredFields?.join(', ') || 'None specified'}
Current Content: ${content || 'NOT YET MAPPED'}
`;
    }).join('\n');

    return `## Task: Documentation Gap Analysis

### Session Transcription:
${transcription}

### Documentation Sections:
${sectionsWithContent}

### Instructions:
1. Analyze the transcription and existing content for completeness
2. Identify what information is missing for each section
3. Rate the severity of each gap (critical, important, minor)
4. Suggest specific questions that could fill each gap
5. Calculate an overall completeness score (0-100)

### Response Format (JSON):
\`\`\`json
{
  "gaps": [
    {
      "sectionId": "section-id",
      "sectionName": "Section Name",
      "missingElements": ["Element 1", "Element 2"],
      "severity": "critical|important|minor",
      "suggestedQuestions": [
        "Question to ask client to fill this gap?"
      ]
    }
  ],
  "completenessScore": 75,
  "recommendations": [
    "Overall recommendation 1",
    "Overall recommendation 2"
  ],
  "criticalGapsCount": 2,
  "importantGapsCount": 3,
  "minorGapsCount": 1
}
\`\`\``;
  },

  /**
   * Generate follow-up questions prompt based on identified gaps
   */
  generateFollowUpPrompt(gaps: GapInfo[]): string {
    const gapsList = gaps.map(g =>
      `- **${g.sectionName}** (${g.severity}): Missing ${g.missingElements.join(', ')}`
    ).join('\n');

    return `## Task: Generate Follow-Up Questions for Documentation Gaps

### Identified Gaps:
${gapsList}

### Instructions:
Generate therapeutic, non-leading questions that a clinician could ask to naturally gather the missing information during a session. Questions should:
- Be open-ended when appropriate
- Feel natural in a therapeutic context
- Prioritize critical gaps first
- Be sensitive to the client's experience

### Response Format:
For each gap, provide 2-3 suggested questions:

\`\`\`json
{
  "followUpQuestions": [
    {
      "sectionId": "section-id",
      "severity": "critical",
      "questions": [
        "Natural therapeutic question 1?",
        "Natural therapeutic question 2?"
      ],
      "rationale": "Why these questions address the gap"
    }
  ],
  "sessionFlowSuggestion": "How to naturally incorporate these questions into session flow"
}
\`\`\``;
  },
};

/**
 * Utility function to build complete prompt with system + user
 */
export function buildPrompt(
  systemPrompt: string,
  userPrompt: string
): { system: string; user: string } {
  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
