/**
 * Note Generation Prompt Templates
 * Structured prompts for transforming raw content into clinical documentation
 */

import type {
  ClinicalTone,
  ProcessedSection,
  ResolvedGap,
  TemplateType,
  ClinicalContext
} from './types';

/**
 * Clinical Note Generation Prompt Templates
 * Transforms raw dictation and mapped content into professional clinical notes
 */
export const noteGenerationPrompts = {
  /**
   * System prompt for clinical note generation
   */
  system: `You are an expert clinical documentation writer specializing in mental health and therapy notes. Your task is to transform raw session content, mapped sections, and resolved gaps into polished, professional clinical documentation.

Core Responsibilities:
- Transform conversational or raw content into professional clinical language
- Maintain clinical accuracy and appropriate terminology
- Preserve the factual accuracy and clinical intent of the original content
- Apply consistent formatting and documentation standards
- Ensure HIPAA compliance in all output

Clinical Writing Standards:
- Use person-first language (e.g., "client experiencing depression" not "depressed client")
- Write observations objectively without judgment
- Use third person for clinical observations, first person for client reports when appropriate
- Include specific behavioral observations with frequency, duration, intensity when available
- Maintain appropriate professional boundaries in language
- Use present tense for current status, past tense for history
- Avoid stigmatizing or pejorative language
- Include relevant clinical terminology while remaining readable

Documentation Quality:
- Organize content logically within each section
- Ensure smooth transitions between ideas
- Balance thoroughness with conciseness
- Include clinically relevant details, omit unnecessary information
- Flag any content requiring additional review with [REVIEW NEEDED:]

Output should be production-ready clinical documentation suitable for official records.`,

  /**
   * Generate complete clinical note from session data
   */
  generateCompleteNotePrompt(
    sections: ProcessedSection[],
    resolvedGaps: ResolvedGap[],
    templateType: TemplateType,
    targetTone: ClinicalTone,
    clinicalContext?: ClinicalContext,
    customInstructions?: string
  ): string {
    const toneGuide = getToneGuide(targetTone);
    const templateGuide = getTemplateGuide(templateType);

    const sectionsContent = sections.map(s =>
      `### ${s.name} (Confidence: ${s.confidence}%)
${s.hasUserInput ? '[Contains user-provided content]' : ''}
${s.content || '[No content available]'}
`
    ).join('\n');

    const gapsContent = resolvedGaps.length > 0
      ? `### Resolved Information Gaps:
${resolvedGaps.map(g => `- **${g.sectionName}** - ${g.gapDescription}
  Clinician Response: ${g.userResponse}`).join('\n')}`
      : '';

    const contextContent = clinicalContext
      ? formatClinicalContext(clinicalContext)
      : '';

    return `## Task: Generate Complete Clinical Note

### Template Type: ${templateType}
${templateGuide}

### Target Tone:
${toneGuide}

### Session Content by Section:
${sectionsContent}

${gapsContent}

${contextContent}

${customInstructions ? `### Custom Instructions:\n${customInstructions}\n` : ''}

### Instructions:
1. Transform all section content into polished clinical documentation
2. Integrate resolved gaps naturally into the appropriate sections
3. Apply the ${templateType} format and structure
4. Use ${targetTone} tone throughout
5. Ensure logical flow and professional language
6. Include all clinically relevant information
7. Flag any areas needing review with [REVIEW NEEDED:]

### Response Format (JSON):
\`\`\`json
{
  "note": {
    "sections": [
      {
        "name": "Section Name",
        "content": "Professionally written section content...",
        "displayOrder": 1
      }
    ],
    "fullContent": "Complete note with all sections formatted together..."
  },
  "metadata": {
    "wordCount": 350,
    "sectionsIncluded": ["Subjective", "Objective", "Assessment", "Plan"],
    "gapsIntegrated": 2,
    "reviewFlagsCount": 0,
    "clinicalTermsUsed": ["affect", "presenting problem", "intervention"]
  }
}
\`\`\``;
  },

  /**
   * Generate refined note with specific instructions
   */
  generateRefinePrompt(
    currentContent: string,
    instructions: string,
    preserveSections: string[],
    targetTone: ClinicalTone
  ): string {
    const toneGuide = getToneGuide(targetTone);

    return `## Task: Refine Clinical Note

### Current Note Content:
${currentContent}

### Refinement Instructions:
${instructions}

### Sections to Preserve (minimize changes):
${preserveSections.length > 0 ? preserveSections.join(', ') : 'None specified'}

### Target Tone:
${toneGuide}

### Instructions:
1. Apply the requested refinements while maintaining clinical accuracy
2. Preserve the overall structure unless instructed otherwise
3. Minimize changes to preserved sections
4. Maintain professional clinical documentation standards
5. Keep the ${targetTone} tone consistent

### Response Format (JSON):
\`\`\`json
{
  "refinedNote": {
    "fullContent": "Complete refined note...",
    "sections": [
      {
        "name": "Section Name",
        "content": "Section content...",
        "wasModified": true
      }
    ]
  },
  "changes": {
    "changesApplied": ["Description of change 1", "Description of change 2"],
    "sectionsModified": ["Section1", "Section2"],
    "wordCount": 380
  }
}
\`\`\``;
  },

  /**
   * Generate section-specific rewrite
   */
  generateSectionRewritePrompt(
    sectionName: string,
    rawContent: string,
    targetTone: ClinicalTone,
    templateType: TemplateType,
    aiPromptHints?: string
  ): string {
    const toneGuide = getToneGuide(targetTone);

    return `## Task: Rewrite Section for Clinical Documentation

### Section: ${sectionName}
### Template Type: ${templateType}

### Raw Content:
${rawContent}

### Target Tone:
${toneGuide}

${aiPromptHints ? `### Section-Specific Guidance:\n${aiPromptHints}\n` : ''}

### Instructions:
1. Transform the raw content into professional clinical language
2. Apply appropriate structure for the ${sectionName} section
3. Use ${targetTone} tone throughout
4. Include relevant clinical terminology
5. Ensure content is ready for official documentation

### Response Format (JSON):
\`\`\`json
{
  "rewrittenContent": "Professionally rewritten section content...",
  "clinicalTermsUsed": ["term1", "term2"],
  "wordCount": 85,
  "confidenceScore": 90
}
\`\`\``;
  },
};

/**
 * Helper: Get tone guide text
 */
function getToneGuide(tone: ClinicalTone): string {
  const guides: Record<ClinicalTone, string> = {
    clinical: `Use precise clinical language with professional objectivity. Include appropriate clinical terminology. Maintain a neutral, evidence-based tone throughout.`,
    formal: `Use formal professional language suitable for medical records and official documentation. Emphasize clarity and precision over clinical jargon.`,
    compassionate: `Use warm but professional language that acknowledges the client's experience while maintaining documentation standards. Balance empathy with clinical accuracy.`,
  };
  return guides[tone];
}

/**
 * Helper: Get template type guide
 */
function getTemplateGuide(templateType: TemplateType): string {
  const guides: Record<TemplateType, string> = {
    SOAP: `SOAP Note Format:
- Subjective: Client's reported symptoms, concerns, statements, and perspective
- Objective: Observable data including appearance, behavior, affect, and clinical observations
- Assessment: Clinical interpretation, progress evaluation, diagnostic impressions
- Plan: Treatment interventions, recommendations, homework, and next steps`,

    DAP: `DAP Note Format:
- Data: Factual information including client statements and therapist observations
- Assessment: Clinical interpretation of the data, progress evaluation
- Plan: Treatment recommendations, goals, and follow-up actions`,

    BIRP: `BIRP Note Format:
- Behavior: Observable behaviors and client presentation
- Intervention: Therapeutic techniques and interventions used
- Response: Client's response to interventions
- Plan: Next steps, homework, and treatment planning`,

    custom: `Custom Template Format:
Follow the section structure provided. Apply clinical documentation standards to each section as appropriate for mental health documentation.`,
  };
  return guides[templateType];
}

/**
 * Helper: Format clinical context
 */
function formatClinicalContext(context: ClinicalContext): string {
  const parts: string[] = ['### Clinical Context:'];

  if (context.presentingIssues?.length) {
    parts.push(`**Presenting Issues:** ${context.presentingIssues.join(', ')}`);
  }
  if (context.symptoms?.length) {
    parts.push(`**Symptoms Noted:** ${context.symptoms.join(', ')}`);
  }
  if (context.interventions?.length) {
    parts.push(`**Interventions Used:** ${context.interventions.join(', ')}`);
  }
  if (context.goals?.length) {
    parts.push(`**Treatment Goals:** ${context.goals.join(', ')}`);
  }
  if (context.riskFactors?.length) {
    parts.push(`**Risk Factors:** ${context.riskFactors.join(', ')}`);
  }
  if (context.strengths?.length) {
    parts.push(`**Client Strengths:** ${context.strengths.join(', ')}`);
  }
  if (context.emotionalThemes?.length) {
    parts.push(`**Emotional Themes:** ${context.emotionalThemes.join(', ')}`);
  }
  if (context.clientQuotes?.length) {
    parts.push(`**Key Client Statements:** "${context.clientQuotes.join('", "')}"`);
  }
  if (context.sessionDynamics) {
    parts.push(`**Session Dynamics:** ${context.sessionDynamics}`);
  }
  if (context.homework?.length) {
    parts.push(`**Homework/Tasks:** ${context.homework.join(', ')}`);
  }

  return parts.length > 1 ? parts.join('\n') : '';
}

/**
 * Utility function to build complete prompt
 */
export function buildNotePrompt(
  userPrompt: string
): { system: string; user: string } {
  return {
    system: noteGenerationPrompts.system,
    user: userPrompt,
  };
}
