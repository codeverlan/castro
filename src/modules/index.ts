/**
 * Castro Module Exports
 * Public API for embedding Castro in other applications
 */

export { CastroModule, type CastroModuleProps, type CastroView } from './CastroModule';
export { castroManifest, type ModuleManifest, type ModulePreference, type ModulePermission } from './manifest';
export { EmbeddingProvider, useEmbedding, useIsEmbedded, isEmbeddedMode, type EmbeddingConfig } from '~/lib/embedding-context';
export { api, apiClient, configureApiClient, initializeApiClient, getApiConfig } from '~/lib/api-client';
