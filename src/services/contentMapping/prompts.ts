/**
 * Content Mapping Engine Prompts
 * Specialized prompts for clinical content mapping and context extraction
 */

import type { MappingSectionInfo, ClinicalContext } from './types';

/**
 * Clinical Context Extraction Prompts
 * Extracts structured clinical information from transcriptions
 */
export const clinicalContextPrompts = {
  system: `You are a clinical psychology documentation specialist with expertise in mental health terminology and therapy session analysis. Your task is to analyze therapy session transcriptions and extract structured clinical information.

Guidelines:
- Extract only information explicitly present in the transcription
- Use clinical terminology appropriately
- Maintain objectivity and avoid interpretations not supported by the text
- Preserve client's own words when capturing quotes
- Identify risk factors with appropriate clinical caution
- Do not fabricate or infer information not clearly present
- Follow HIPAA standards in all output

You must respond with valid JSON only.`,

  generateUserPrompt(transcription: string, patientContext?: string): string {
    return `## Task: Extract Clinical Context

${patientContext ? `### Client Context:\n${patientContext}\n` : ''}

### Session Transcription:
${transcription}

### Instructions:
Analyze this therapy session transcription and extract the following clinical elements. Be thorough but only include information explicitly present in the transcription.

### Required Output (JSON):
\`\`\`json
{
  "presentingIssues": ["List of main issues/concerns the client is presenting"],
  "symptoms": ["Observable or reported symptoms mentioned"],
  "interventions": ["Therapeutic interventions used or discussed by clinician"],
  "goals": ["Treatment goals or objectives mentioned"],
  "riskFactors": ["Any safety concerns or risk factors mentioned (be conservative)"],
  "strengths": ["Client strengths, coping skills, or resources identified"],
  "emotionalThemes": ["Primary emotional themes present in the session"],
  "clientQuotes": ["Significant verbatim quotes from the client (keep brief, max 3-5)"],
  "sessionDynamics": "Brief description of the therapeutic interaction quality",
  "homework": ["Between-session tasks or homework assigned, if any"]
}
\`\`\`

Important: If a category has no relevant content, use an empty array [] or null for sessionDynamics. Never fabricate information.`;
  },
};

/**
 * Section-Specific Mapping Prompts
 * Maps transcription content to specific template sections
 */
export const sectionMappingPrompts = {
  system: `You are a clinical documentation specialist who maps therapy session content to standardized documentation sections. You understand clinical note formats including SOAP, DAP, BIRP, and custom templates.

Guidelines:
- Extract only content relevant to the specific section requested
- Organize content logically within the section's purpose
- Use professional clinical language while preserving client meaning
- Provide confidence ratings based on how well the content matches the section
- Flag content that may need clinician review
- Never fabricate content - only use what's in the transcription

Output must be valid JSON only.`,

  generateSingleSectionPrompt(
    transcription: string,
    section: MappingSectionInfo,
    clinicalContext: ClinicalContext,
    patientContext?: string
  ): string {
    const contextSummary = formatContextSummary(clinicalContext);

    return `## Task: Map Content to "${section.name}" Section

### Section Details:
- **Name**: ${section.name}
- **Description**: ${section.description || 'No description provided'}
- **Required**: ${section.isRequired ? 'Yes' : 'No'}
${section.aiPromptHints ? `- **AI Guidance**: ${section.aiPromptHints}` : ''}
${section.minLength ? `- **Minimum Length**: ${section.minLength} characters` : ''}
${section.maxLength ? `- **Maximum Length**: ${section.maxLength} characters` : ''}

### Extracted Clinical Context:
${contextSummary}

${patientContext ? `### Client Context:\n${patientContext}\n` : ''}

### Session Transcription:
${transcription}

### Instructions:
1. Identify all content from the transcription that belongs in the "${section.name}" section
2. Extract and organize this content appropriately for the section's purpose
3. Rate your confidence (0-100) based on:
   - How clearly the content matches the section purpose (higher = clearer match)
   - How complete the extracted content is for this section type
   - Whether any critical information might be missing
4. Flag if the section needs clinician review and explain why

### Required Output (JSON):
\`\`\`json
{
  "sectionId": "${section.id}",
  "sectionName": "${section.name}",
  "rawContent": "The extracted content organized for this section...",
  "confidence": 85,
  "extractedKeywords": ["clinical", "terms", "identified"],
  "needsReview": false,
  "reviewReason": null,
  "suggestedEdits": []
}
\`\`\``;
  },

  generateBatchSectionPrompt(
    transcription: string,
    sections: MappingSectionInfo[],
    clinicalContext: ClinicalContext,
    patientContext?: string
  ): string {
    const contextSummary = formatContextSummary(clinicalContext);
    const sectionsInfo = sections.map(s =>
      `- **${s.name}** (ID: ${s.id})${s.isRequired ? ' [Required]' : ''}: ${s.description || 'No description'}${s.aiPromptHints ? ` | Hint: ${s.aiPromptHints}` : ''}`
    ).join('\n');

    return `## Task: Map Content to Multiple Documentation Sections

### Target Sections:
${sectionsInfo}

### Extracted Clinical Context:
${contextSummary}

${patientContext ? `### Client Context:\n${patientContext}\n` : ''}

### Session Transcription:
${transcription}

### Instructions:
For each section, extract relevant content from the transcription. Consider:
- The section's purpose based on its name and description
- Any AI hints provided for the section
- Whether the section is required (prioritize required sections)
- The clinical context already extracted

### Required Output (JSON):
\`\`\`json
{
  "mappings": [
    {
      "sectionId": "uuid-here",
      "sectionName": "Section Name",
      "rawContent": "Extracted content for this section...",
      "confidence": 85,
      "extractedKeywords": ["term1", "term2"],
      "needsReview": false,
      "reviewReason": null,
      "suggestedEdits": []
    }
  ],
  "unmappedContent": "Any significant content that didn't fit into any section, or null",
  "mappingNotes": "Brief notes about the mapping process"
}
\`\`\``;
  },
};

/**
 * Professional Rewriting Prompts
 * Transforms raw content into professional clinical documentation
 */
export const rewritingPrompts = {
  system: `You are an expert clinical documentation writer specializing in mental health notes. You transform raw extracted content into professional clinical documentation.

Documentation Standards:
- Use third person for observations ("Client reported..." not "I heard...")
- Use present tense for current status, past tense for history
- Include specific behavioral observations when available
- Quantify when possible (frequency, duration, intensity)
- Use person-first, non-stigmatizing language
- Maintain HIPAA compliance
- Be concise but complete

Output must be valid JSON only.`,

  generateRewritePrompt(
    rawContent: string,
    sectionName: string,
    sectionDescription: string | null,
    aiHints: string | null
  ): string {
    return `## Task: Professional Rewrite for ${sectionName} Section

### Section Purpose:
${sectionDescription || 'Standard clinical documentation section'}
${aiHints ? `\n### Writing Guidance:\n${aiHints}` : ''}

### Raw Content to Rewrite:
${rawContent}

### Instructions:
Transform the raw content into professional clinical documentation suitable for the ${sectionName} section. Maintain all factual information while improving:
- Clinical terminology usage
- Professional tone and structure
- Clarity and conciseness
- Appropriate formatting

### Required Output (JSON):
\`\`\`json
{
  "processedContent": "The professionally rewritten content...",
  "changesApplied": ["List of significant changes made"],
  "clinicalTermsUsed": ["Clinical terms incorporated"]
}
\`\`\``;
  },

  generateBatchRewritePrompt(
    sections: Array<{ id: string; name: string; rawContent: string; description: string | null; aiHints: string | null }>
  ): string {
    const sectionsContent = sections.map(s =>
      `### ${s.name} (ID: ${s.id})
Description: ${s.description || 'No description'}
${s.aiHints ? `Hints: ${s.aiHints}` : ''}
Raw Content:
${s.rawContent}
---`
    ).join('\n\n');

    return `## Task: Professional Rewrite for Multiple Sections

${sectionsContent}

### Instructions:
Rewrite each section's raw content into professional clinical documentation. Maintain consistency across sections.

### Required Output (JSON):
\`\`\`json
{
  "rewrites": [
    {
      "sectionId": "uuid-here",
      "processedContent": "Professionally rewritten content...",
      "changesApplied": ["Changes made"],
      "clinicalTermsUsed": ["Terms used"]
    }
  ]
}
\`\`\``;
  },
};

/**
 * Gap Analysis Prompts
 * Identifies missing information in documentation
 */
export const gapAnalysisPrompts = {
  system: `You are a clinical documentation quality specialist. You analyze therapy session documentation to identify missing or incomplete information that may be needed for comprehensive clinical records.

Gap Severity Levels:
- CRITICAL: Information essential for safety, legal compliance, or care decisions
- IMPORTANT: Information that significantly impacts documentation quality or treatment planning
- MINOR: Information that would enhance documentation but isn't essential

Guidelines:
- Focus on clinically significant gaps
- Consider regulatory and compliance requirements
- Be practical - not every possible detail needs documentation
- Suggest specific questions to fill gaps naturally in session context

Output must be valid JSON only.`,

  generateGapAnalysisPrompt(
    transcription: string,
    sections: MappingSectionInfo[],
    mappedContent: Array<{ sectionId: string; sectionName: string; rawContent: string; confidence: number }>
  ): string {
    const sectionsWithContent = sections.map(section => {
      const mapped = mappedContent.find(m => m.sectionId === section.id);
      return `### ${section.name} (ID: ${section.id})
- Required: ${section.isRequired ? 'Yes' : 'No'}
- Description: ${section.description || 'No description'}
- Current Content: ${mapped?.rawContent || 'EMPTY - No content mapped'}
- Confidence: ${mapped?.confidence ?? 'N/A'}`;
    }).join('\n\n');

    return `## Task: Documentation Gap Analysis

### Current Section Content:
${sectionsWithContent}

### Original Transcription (for reference):
${transcription}

### Instructions:
1. Analyze each section for missing or incomplete information
2. Identify gaps based on clinical documentation standards
3. Rate severity based on clinical importance
4. Suggest natural questions a clinician could ask to fill gaps
5. Calculate overall documentation completeness

### Required Output (JSON):
\`\`\`json
{
  "gaps": [
    {
      "sectionId": "uuid-here",
      "sectionName": "Section Name",
      "description": "What information is missing",
      "missingElements": ["Specific missing element 1", "Element 2"],
      "severity": "critical|important|minor",
      "suggestedQuestions": [
        "Natural question to ask client to fill this gap?"
      ],
      "priority": 1
    }
  ],
  "completenessScore": 75,
  "recommendations": [
    "Overall recommendation for improving documentation"
  ]
}
\`\`\``;
  },
};

/**
 * Helper function to format clinical context summary
 */
function formatContextSummary(context: ClinicalContext): string {
  const parts: string[] = [];

  if (context.presentingIssues.length > 0) {
    parts.push(`**Presenting Issues**: ${context.presentingIssues.join(', ')}`);
  }
  if (context.symptoms.length > 0) {
    parts.push(`**Symptoms**: ${context.symptoms.join(', ')}`);
  }
  if (context.interventions.length > 0) {
    parts.push(`**Interventions**: ${context.interventions.join(', ')}`);
  }
  if (context.goals.length > 0) {
    parts.push(`**Goals**: ${context.goals.join(', ')}`);
  }
  if (context.riskFactors.length > 0) {
    parts.push(`**Risk Factors**: ${context.riskFactors.join(', ')}`);
  }
  if (context.emotionalThemes.length > 0) {
    parts.push(`**Emotional Themes**: ${context.emotionalThemes.join(', ')}`);
  }
  if (context.sessionDynamics) {
    parts.push(`**Session Dynamics**: ${context.sessionDynamics}`);
  }

  return parts.length > 0 ? parts.join('\n') : 'No context extracted yet.';
}
