/**
 * IntakeQ Settings Page
 * Configure IntakeQ API integration
 */

import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Eye, EyeOff, Check, X, Loader2, RefreshCw } from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { PageContainer, PageHeader } from '~/navigation';

interface IntakeQConfigResponse {
  configured: boolean;
  data: {
    id: string;
    defaultPractitionerId: string | null;
    lastTestedAt: string | null;
    lastTestResult: string | null;
    hasApiKey: boolean;
  } | null;
}

interface IntakeQTestResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    practitioners: number;
    services: number;
    locations: number;
  };
}

export const Route = createFileRoute('/settings/intakeq')({
  component: IntakeQSettings,
});

function IntakeQSettings() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const [configured, setConfigured] = React.useState(false);
  const [configData, setConfigData] = React.useState<IntakeQConfigResponse['data']>(null);

  const [apiKey, setApiKey] = React.useState('');
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [defaultPractitionerId, setDefaultPractitionerId] = React.useState('');

  const [testResult, setTestResult] = React.useState<IntakeQTestResult | null>(null);

  // Fetch current configuration
  const fetchConfig = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/intakeq/config');
      const data: IntakeQConfigResponse = await response.json();

      setConfigured(data.configured);
      setConfigData(data.data);

      if (data.data?.defaultPractitionerId) {
        setDefaultPractitionerId(data.data.defaultPractitionerId);
      }
    } catch (error) {
      console.error('Error fetching IntakeQ config:', error);
      toast.error('Failed to load IntakeQ configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey && !configured) {
      toast.error('API key is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/intakeq/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || undefined, // Only send if provided (for updates)
          defaultPractitionerId: defaultPractitionerId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save configuration');
      }

      toast.success('IntakeQ configuration saved');
      setApiKey(''); // Clear the input
      await fetchConfig();
    } catch (error) {
      console.error('Error saving IntakeQ config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/intakeq/test', {
        method: 'POST',
      });

      const result: IntakeQTestResult = await response.json();
      setTestResult(result);

      if (result.success) {
        toast.success('IntakeQ connection successful');
        await fetchConfig(); // Refresh to get updated test status
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    } catch (error) {
      console.error('Error testing IntakeQ connection:', error);
      toast.error('Failed to test connection');
    } finally {
      setIsTesting(false);
    }
  };

  // Remove configuration
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove the IntakeQ configuration?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/intakeq/config', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove configuration');
      }

      toast.success('IntakeQ configuration removed');
      setConfigured(false);
      setConfigData(null);
      setApiKey('');
      setDefaultPractitionerId('');
      setTestResult(null);
    } catch (error) {
      console.error('Error removing IntakeQ config:', error);
      toast.error('Failed to remove configuration');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="IntakeQ Integration"
          description="Configure IntakeQ API for appointment sync"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="IntakeQ Integration"
        description="Configure IntakeQ API for appointment sync and client management"
      />

      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Connection Status
              {configured ? (
                <span className="flex items-center gap-1 text-sm font-normal text-green-600">
                  <Check className="h-4 w-4" />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                  <X className="h-4 w-4" />
                  Not configured
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {configured
                ? 'IntakeQ is configured and ready to use'
                : 'Enter your IntakeQ API key to enable the integration'}
            </CardDescription>
          </CardHeader>

          {configured && configData && (
            <CardContent>
              <div className="grid gap-4 text-sm">
                {configData.lastTestedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last tested:</span>
                    <span>
                      {new Date(configData.lastTestedAt).toLocaleString()}
                      {configData.lastTestResult === 'success' ? (
                        <Check className="ml-2 inline h-4 w-4 text-green-600" />
                      ) : configData.lastTestResult === 'failed' ? (
                        <X className="ml-2 inline h-4 w-4 text-red-600" />
                      ) : null}
                    </span>
                  </div>
                )}
                {testResult?.data && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Practitioners:</span>
                      <span>{testResult.data.practitioners}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Services:</span>
                      <span>{testResult.data.services}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Locations:</span>
                      <span>{testResult.data.locations}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          )}

          {configured && (
            <CardFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Test Connection
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={isDeleting}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Remove Configuration
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Configuration Form */}
        <Card>
          <form onSubmit={handleSave}>
            <CardHeader>
              <CardTitle>
                {configured ? 'Update Configuration' : 'Configure IntakeQ'}
              </CardTitle>
              <CardDescription>
                {configured
                  ? 'Update your API key or practitioner settings'
                  : 'Enter your IntakeQ API key to get started'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key {!configured && '*'}</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={configured ? '••••••••••••••••' : 'Enter your IntakeQ API key'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find your API key in IntakeQ under Settings → Integrations → API
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="practitionerId">Default Practitioner ID (optional)</Label>
                <Input
                  id="practitionerId"
                  type="text"
                  value={defaultPractitionerId}
                  onChange={(e) => setDefaultPractitionerId(e.target.value)}
                  placeholder="e.g., 12345"
                />
                <p className="text-xs text-muted-foreground">
                  Filter appointments to a specific practitioner
                </p>
              </div>
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isSaving || (!apiKey && !configured)}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {configured ? 'Update Configuration' : 'Save Configuration'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Your API Key</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <ol className="list-decimal pl-4 space-y-2 text-sm text-muted-foreground">
              <li>Log into your IntakeQ account</li>
              <li>Go to <strong>Settings</strong> → <strong>Integrations</strong></li>
              <li>Click on <strong>API</strong> in the sidebar</li>
              <li>Copy your API Key</li>
              <li>Paste it in the field above</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
