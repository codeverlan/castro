/**
 * Castro Module Manifest
 * Defines the module configuration for LMHG-Workspace integration
 */

export interface ModuleManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  sourceType: 'external' | 'internal';
  connectionMethod: 'rest_api' | 'graphql' | 'direct';
  preferences: ModulePreference[];
  permissions: ModulePermission[];
  supportsAi: boolean;
  icon?: string;
  color?: string;
}

export interface ModulePreference {
  key: string;
  label: string;
  description: string;
  type: 'url' | 'text' | 'secret' | 'boolean' | 'select';
  required: boolean;
  defaultValue?: string | boolean;
  options?: { label: string; value: string }[];
}

export interface ModulePermission {
  key: string;
  label: string;
  description: string;
  isDefault: boolean;
}

export const castroManifest: ModuleManifest = {
  id: 'castro',
  name: 'Castro Clinical Documentation',
  description:
    'AI-powered clinical documentation assistant for mental health professionals. Transform audio recordings into structured clinical notes.',
  version: '0.0.1',
  sourceType: 'external',
  connectionMethod: 'rest_api',
  icon: 'FileText',
  color: '#6366f1', // Indigo

  preferences: [
    {
      key: 'castro_api_url',
      label: 'Castro API URL',
      description: 'The URL of the Castro API server',
      type: 'url',
      required: true,
      defaultValue: 'http://localhost:3001',
    },
    {
      key: 'intakeq_api_key',
      label: 'IntakeQ API Key',
      description: 'API key for IntakeQ integration (optional)',
      type: 'secret',
      required: false,
    },
    {
      key: 'auto_transcribe',
      label: 'Auto-transcribe uploads',
      description: 'Automatically start transcription when audio is uploaded',
      type: 'boolean',
      required: false,
      defaultValue: true,
    },
  ],

  permissions: [
    {
      key: 'view',
      label: 'View Sessions',
      description: 'View clinical documentation sessions and notes',
      isDefault: true,
    },
    {
      key: 'create',
      label: 'Create Sessions',
      description: 'Create new documentation sessions and upload recordings',
      isDefault: true,
    },
    {
      key: 'edit',
      label: 'Edit Templates',
      description: 'Create and modify note templates',
      isDefault: false,
    },
    {
      key: 'admin',
      label: 'Manage Settings',
      description: 'Configure S3 credentials, IntakeQ settings, and other configurations',
      isDefault: false,
    },
  ],

  supportsAi: true,
};

export default castroManifest;
