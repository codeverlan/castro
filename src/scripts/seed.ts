/**
 * Database Seed Script - Default Clinical Note Templates
 *
 * This script seeds the database with default clinical note templates:
 * - SOAP (Subjective, Objective, Assessment, Plan)
 * - DAP (Data, Assessment, Plan)
 * - BIRP (Behavior, Intervention, Response, Plan)
 *
 * These templates ensure users have working templates on first launch.
 *
 * Usage: npm run db:seed
 */

import 'dotenv/config';
import { db, closeConnection, noteTemplates, templateSections, templateFields } from '~/db';
import { eq } from 'drizzle-orm';

// Type definitions for template structure
interface FieldDefinition {
  label: string;
  fieldType: 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'date' | 'time' | 'number';
  isRequired: boolean;
  displayOrder: number;
  defaultValue?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
  validationRules?: Record<string, unknown>;
  helpText?: string;
}

interface SectionDefinition {
  name: string;
  description: string;
  displayOrder: number;
  isRequired: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  aiPromptHints?: string;
  fields: FieldDefinition[];
}

interface TemplateDefinition {
  name: string;
  description: string;
  templateType: string;
  sections: SectionDefinition[];
}

// SOAP Template Definition
const soapTemplate: TemplateDefinition = {
  name: 'SOAP Note',
  description:
    'Standard clinical documentation format: Subjective, Objective, Assessment, and Plan. Widely used across healthcare settings for structured patient encounters.',
  templateType: 'SOAP',
  sections: [
    {
      name: 'Subjective',
      description:
        "Document the client's self-reported symptoms, concerns, and history. Include chief complaint, history of present illness, and relevant personal/social history.",
      displayOrder: 0,
      isRequired: true,
      minLength: 50,
      maxLength: 5000,
      placeholder: "Describe the client's presenting concerns in their own words...",
      aiPromptHints:
        "Extract client's verbal statements, reported symptoms, mood descriptions, and any concerns they express during the session.",
      fields: [
        {
          label: 'Chief Complaint',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: "The primary reason for the client's visit in their own words.",
        },
        {
          label: 'History of Present Illness',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 1,
          helpText: 'Detailed description of current symptoms, onset, duration, and progression.',
        },
        {
          label: 'Mood/Affect Reported',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 2,
          options: [
            { value: 'euthymic', label: 'Euthymic' },
            { value: 'depressed', label: 'Depressed' },
            { value: 'anxious', label: 'Anxious' },
            { value: 'irritable', label: 'Irritable' },
            { value: 'elevated', label: 'Elevated' },
            { value: 'labile', label: 'Labile' },
          ],
          helpText: "Client's self-reported mood state.",
        },
        {
          label: 'Sleep/Appetite Changes',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Note any reported changes in sleep patterns or appetite.',
        },
      ],
    },
    {
      name: 'Objective',
      description:
        "Document observable, measurable findings. Include mental status examination, behavioral observations, and clinical measurements.",
      displayOrder: 1,
      isRequired: true,
      minLength: 30,
      maxLength: 3000,
      placeholder: 'Document your clinical observations...',
      aiPromptHints:
        "Extract clinician observations about client's appearance, behavior, speech patterns, and any measurable clinical data mentioned.",
      fields: [
        {
          label: 'Appearance',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe grooming, hygiene, dress, and physical presentation.',
        },
        {
          label: 'Behavior/Psychomotor Activity',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 1,
          helpText: 'Note eye contact, body language, activity level, and cooperation.',
        },
        {
          label: 'Speech',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 2,
          options: [
            { value: 'normal', label: 'Normal rate/rhythm/volume' },
            { value: 'pressured', label: 'Pressured' },
            { value: 'slow', label: 'Slow' },
            { value: 'soft', label: 'Soft' },
            { value: 'loud', label: 'Loud' },
          ],
          helpText: 'Characterize speech patterns observed.',
        },
        {
          label: 'Affect Observed',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 3,
          options: [
            { value: 'congruent', label: 'Congruent with mood' },
            { value: 'flat', label: 'Flat' },
            { value: 'blunted', label: 'Blunted' },
            { value: 'restricted', label: 'Restricted' },
            { value: 'labile', label: 'Labile' },
          ],
          helpText: "Observable emotional expression.",
        },
        {
          label: 'Thought Process',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 4,
          options: [
            { value: 'linear', label: 'Linear and goal-directed' },
            { value: 'tangential', label: 'Tangential' },
            { value: 'circumstantial', label: 'Circumstantial' },
            { value: 'disorganized', label: 'Disorganized' },
          ],
          helpText: 'Describe the organization of thinking.',
        },
      ],
    },
    {
      name: 'Assessment',
      description:
        "Provide clinical interpretation and diagnostic impressions. Synthesize subjective and objective data into clinical conclusions.",
      displayOrder: 2,
      isRequired: true,
      minLength: 50,
      maxLength: 3000,
      placeholder: 'Summarize your clinical assessment...',
      aiPromptHints:
        "Extract clinical interpretations, diagnostic impressions, progress observations, and any risk assessments mentioned.",
      fields: [
        {
          label: 'Clinical Impression',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Synthesize findings into a clinical formulation.',
        },
        {
          label: 'Diagnostic Impressions',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 1,
          helpText: 'List relevant DSM-5 diagnoses or rule-outs being considered.',
        },
        {
          label: 'Risk Assessment',
          fieldType: 'select',
          isRequired: true,
          displayOrder: 2,
          options: [
            { value: 'none', label: 'No identified risk' },
            { value: 'low', label: 'Low risk' },
            { value: 'moderate', label: 'Moderate risk' },
            { value: 'high', label: 'High risk - safety plan needed' },
          ],
          helpText: 'Current suicide/self-harm/violence risk level.',
        },
        {
          label: 'Progress Toward Goals',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Document progress toward established treatment goals.',
        },
      ],
    },
    {
      name: 'Plan',
      description:
        "Outline the treatment plan including interventions, follow-up, and next steps. Be specific about actions and timeframes.",
      displayOrder: 3,
      isRequired: true,
      minLength: 30,
      maxLength: 3000,
      placeholder: 'Document the treatment plan and next steps...',
      aiPromptHints:
        "Extract treatment interventions discussed, homework assignments, medication changes, referrals, and follow-up scheduling.",
      fields: [
        {
          label: 'Treatment Interventions',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe therapeutic interventions used and planned.',
        },
        {
          label: 'Homework/Between-Session Tasks',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 1,
          helpText: 'Document any assignments given to the client.',
        },
        {
          label: 'Medication Considerations',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 2,
          helpText: 'Note any medication discussions or changes.',
        },
        {
          label: 'Follow-up Appointment',
          fieldType: 'date',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Scheduled date for next session.',
        },
        {
          label: 'Referrals',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 4,
          helpText: 'Document any referrals made to other providers.',
        },
      ],
    },
  ],
};

// DAP Template Definition
const dapTemplate: TemplateDefinition = {
  name: 'DAP Note',
  description:
    'Concise documentation format: Data, Assessment, and Plan. Efficient for routine sessions while maintaining clinical rigor.',
  templateType: 'DAP',
  sections: [
    {
      name: 'Data',
      description:
        "Document both subjective information from the client and objective observations. Combine what the client reports with what you observe.",
      displayOrder: 0,
      isRequired: true,
      minLength: 50,
      maxLength: 5000,
      placeholder: 'Document session data including client reports and observations...',
      aiPromptHints:
        "Extract all factual information from the session including client statements, observations, and any concrete data discussed.",
      fields: [
        {
          label: 'Client Presentation',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: "Describe the client's presentation and primary focus of the session.",
        },
        {
          label: 'Session Content',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 1,
          helpText: 'Document key topics discussed and information shared.',
        },
        {
          label: 'Interventions Used',
          fieldType: 'multiselect',
          isRequired: false,
          displayOrder: 2,
          options: [
            { value: 'cbt', label: 'CBT Techniques' },
            { value: 'dbt', label: 'DBT Skills' },
            { value: 'mi', label: 'Motivational Interviewing' },
            { value: 'psychoeducation', label: 'Psychoeducation' },
            { value: 'supportive', label: 'Supportive Therapy' },
            { value: 'mindfulness', label: 'Mindfulness/Relaxation' },
          ],
          helpText: 'Select therapeutic approaches used in this session.',
        },
        {
          label: 'Client Response',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Note how the client responded to interventions.',
        },
      ],
    },
    {
      name: 'Assessment',
      description:
        "Provide your clinical interpretation of the data. Include impressions, progress evaluation, and any concerns.",
      displayOrder: 1,
      isRequired: true,
      minLength: 30,
      maxLength: 3000,
      placeholder: 'Provide your clinical assessment...',
      aiPromptHints:
        "Extract clinical judgments, interpretations of client progress, and any concerns or insights expressed by the clinician.",
      fields: [
        {
          label: 'Clinical Impression',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Your professional assessment of the session and client status.',
        },
        {
          label: 'Symptom Status',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 1,
          options: [
            { value: 'improved', label: 'Improved' },
            { value: 'stable', label: 'Stable' },
            { value: 'worsened', label: 'Worsened' },
            { value: 'mixed', label: 'Mixed presentation' },
          ],
          helpText: "Overall assessment of symptom trajectory.",
        },
        {
          label: 'Risk Level',
          fieldType: 'select',
          isRequired: true,
          displayOrder: 2,
          options: [
            { value: 'none', label: 'No identified risk' },
            { value: 'low', label: 'Low' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'high', label: 'High' },
          ],
          helpText: 'Current safety risk assessment.',
        },
      ],
    },
    {
      name: 'Plan',
      description:
        "Document the plan for continued treatment. Include next steps, goals, and any action items.",
      displayOrder: 2,
      isRequired: true,
      minLength: 30,
      maxLength: 2000,
      placeholder: 'Document the treatment plan...',
      aiPromptHints:
        "Extract treatment plans, next steps, scheduled follow-ups, and any action items for client or clinician.",
      fields: [
        {
          label: 'Continued Treatment Focus',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe the focus for ongoing treatment.',
        },
        {
          label: 'Client Goals',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 1,
          helpText: 'Document any goals the client will work toward.',
        },
        {
          label: 'Next Session',
          fieldType: 'date',
          isRequired: false,
          displayOrder: 2,
          helpText: 'Scheduled date for follow-up.',
        },
        {
          label: 'Additional Notes',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Any other relevant information for the plan.',
        },
      ],
    },
  ],
};

// BIRP Template Definition
const birpTemplate: TemplateDefinition = {
  name: 'BIRP Note',
  description:
    'Behavioral health focused format: Behavior, Intervention, Response, and Plan. Emphasizes observable behaviors and treatment response.',
  templateType: 'BIRP',
  sections: [
    {
      name: 'Behavior',
      description:
        "Document observable behaviors, statements, and presentations. Focus on concrete, measurable observations.",
      displayOrder: 0,
      isRequired: true,
      minLength: 50,
      maxLength: 4000,
      placeholder: 'Describe observed behaviors and client statements...',
      aiPromptHints:
        "Extract specific behaviors observed, client statements, and measurable presentations from the session.",
      fields: [
        {
          label: 'Presenting Behaviors',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe specific observable behaviors during the session.',
        },
        {
          label: 'Mood Presentation',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 1,
          options: [
            { value: 'euthymic', label: 'Euthymic' },
            { value: 'depressed', label: 'Depressed' },
            { value: 'anxious', label: 'Anxious' },
            { value: 'angry', label: 'Angry/Irritable' },
            { value: 'elevated', label: 'Elevated' },
            { value: 'flat', label: 'Flat/Blunted' },
          ],
          helpText: 'Observed mood presentation.',
        },
        {
          label: 'Verbal Content',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 2,
          helpText: "Key statements and topics discussed by the client.",
        },
        {
          label: 'Behavioral Observations',
          fieldType: 'multiselect',
          isRequired: false,
          displayOrder: 3,
          options: [
            { value: 'cooperative', label: 'Cooperative' },
            { value: 'engaged', label: 'Engaged' },
            { value: 'withdrawn', label: 'Withdrawn' },
            { value: 'agitated', label: 'Agitated' },
            { value: 'tearful', label: 'Tearful' },
            { value: 'guarded', label: 'Guarded' },
          ],
          helpText: 'Select observed behavioral characteristics.',
        },
      ],
    },
    {
      name: 'Intervention',
      description:
        "Document the therapeutic interventions and techniques used during the session. Be specific about modalities and approaches.",
      displayOrder: 1,
      isRequired: true,
      minLength: 30,
      maxLength: 3000,
      placeholder: 'Describe interventions used in this session...',
      aiPromptHints:
        "Extract specific therapeutic techniques, interventions, and approaches used by the clinician during the session.",
      fields: [
        {
          label: 'Primary Intervention',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe the main therapeutic intervention(s) used.',
        },
        {
          label: 'Therapeutic Modality',
          fieldType: 'multiselect',
          isRequired: false,
          displayOrder: 1,
          options: [
            { value: 'cbt', label: 'Cognitive Behavioral Therapy' },
            { value: 'dbt', label: 'Dialectical Behavior Therapy' },
            { value: 'mi', label: 'Motivational Interviewing' },
            { value: 'psychodynamic', label: 'Psychodynamic' },
            { value: 'solution_focused', label: 'Solution-Focused' },
            { value: 'trauma_focused', label: 'Trauma-Focused' },
          ],
          helpText: 'Select therapeutic modalities used.',
        },
        {
          label: 'Skills Taught',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 2,
          helpText: 'Document any coping skills or techniques taught.',
        },
        {
          label: 'Psychoeducation Provided',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Note any educational information provided to the client.',
        },
      ],
    },
    {
      name: 'Response',
      description:
        "Document the client's response to interventions. Include both immediate reactions and overall session progress.",
      displayOrder: 2,
      isRequired: true,
      minLength: 30,
      maxLength: 3000,
      placeholder: "Describe the client's response to interventions...",
      aiPromptHints:
        "Extract client reactions to interventions, engagement level, insight gained, and any changes observed during the session.",
      fields: [
        {
          label: 'Client Response',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: "Describe how the client responded to interventions.",
        },
        {
          label: 'Engagement Level',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 1,
          options: [
            { value: 'highly_engaged', label: 'Highly Engaged' },
            { value: 'engaged', label: 'Engaged' },
            { value: 'partially_engaged', label: 'Partially Engaged' },
            { value: 'minimally_engaged', label: 'Minimally Engaged' },
            { value: 'resistant', label: 'Resistant' },
          ],
          helpText: 'Rate the client\'s engagement with treatment.',
        },
        {
          label: 'Insight Demonstrated',
          fieldType: 'select',
          isRequired: false,
          displayOrder: 2,
          options: [
            { value: 'good', label: 'Good insight' },
            { value: 'fair', label: 'Fair insight' },
            { value: 'limited', label: 'Limited insight' },
            { value: 'poor', label: 'Poor insight' },
          ],
          helpText: 'Level of insight the client demonstrated.',
        },
        {
          label: 'Progress Notes',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Additional observations about session progress.',
        },
      ],
    },
    {
      name: 'Plan',
      description:
        "Outline the plan for continued treatment. Include immediate next steps and longer-term treatment goals.",
      displayOrder: 3,
      isRequired: true,
      minLength: 30,
      maxLength: 2000,
      placeholder: 'Document the treatment plan going forward...',
      aiPromptHints:
        "Extract treatment plans, homework assignments, goals for next session, and any referrals or follow-up actions.",
      fields: [
        {
          label: 'Treatment Plan',
          fieldType: 'textarea',
          isRequired: true,
          displayOrder: 0,
          helpText: 'Describe the plan for ongoing treatment.',
        },
        {
          label: 'Homework Assigned',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 1,
          helpText: 'Document any between-session assignments.',
        },
        {
          label: 'Goals for Next Session',
          fieldType: 'textarea',
          isRequired: false,
          displayOrder: 2,
          helpText: 'Specific objectives for the upcoming session.',
        },
        {
          label: 'Next Appointment',
          fieldType: 'date',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Scheduled follow-up date.',
        },
        {
          label: 'Safety Plan',
          fieldType: 'checkbox',
          isRequired: false,
          displayOrder: 4,
          helpText: 'Check if safety plan was reviewed or updated.',
        },
      ],
    },
  ],
};

// All default templates
const defaultTemplates: TemplateDefinition[] = [soapTemplate, dapTemplate, birpTemplate];

/**
 * Seed a single template with its sections and fields
 */
async function seedTemplate(template: TemplateDefinition): Promise<string> {
  console.log(`  Seeding template: ${template.name}...`);

  // Insert the template
  const [insertedTemplate] = await db
    .insert(noteTemplates)
    .values({
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      isDefault: true,
      status: 'active',
      version: 1,
    })
    .returning();

  // Insert sections and their fields
  for (const section of template.sections) {
    const [insertedSection] = await db
      .insert(templateSections)
      .values({
        templateId: insertedTemplate.id,
        name: section.name,
        description: section.description,
        displayOrder: section.displayOrder,
        isRequired: section.isRequired,
        minLength: section.minLength,
        maxLength: section.maxLength,
        placeholder: section.placeholder,
        aiPromptHints: section.aiPromptHints,
      })
      .returning();

    // Insert fields for this section
    for (const field of section.fields) {
      await db.insert(templateFields).values({
        sectionId: insertedSection.id,
        label: field.label,
        fieldType: field.fieldType,
        isRequired: field.isRequired,
        displayOrder: field.displayOrder,
        defaultValue: field.defaultValue,
        options: field.options,
        validationRules: field.validationRules,
        helpText: field.helpText,
      });
    }

    console.log(`    - Section "${section.name}" with ${section.fields.length} fields`);
  }

  return insertedTemplate.id;
}

/**
 * Check if default templates already exist
 */
async function checkExistingDefaults(): Promise<boolean> {
  const existing = await db
    .select({ id: noteTemplates.id })
    .from(noteTemplates)
    .where(eq(noteTemplates.isDefault, true))
    .limit(1);

  return existing.length > 0;
}

/**
 * Main seed function
 */
async function seed(): Promise<void> {
  console.log('Starting database seed...\n');

  try {
    // Check if defaults already exist
    const hasDefaults = await checkExistingDefaults();

    if (hasDefaults) {
      console.log('Default templates already exist. Skipping seed.');
      console.log('To re-seed, first delete existing default templates.\n');
      return;
    }

    console.log('Seeding default clinical note templates...\n');

    const seededIds: string[] = [];

    for (const template of defaultTemplates) {
      const id = await seedTemplate(template);
      seededIds.push(id);
      console.log(`  Created template: ${template.name} (${id})\n`);
    }

    console.log('Seed completed successfully!');
    console.log(`Created ${seededIds.length} default templates:`);
    defaultTemplates.forEach((t, i) => {
      console.log(`  - ${t.name} (${t.templateType}): ${seededIds[i]}`);
    });
    console.log('');
  } catch (error) {
    console.error('Seed failed:', error);
    throw error;
  }
}

// Run the seed
seed()
  .then(() => {
    console.log('Closing database connection...');
    return closeConnection();
  })
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
