/**
 * Environment Settings Page
 * Configure application environment preferences via GUI
 */

import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  Loader2,
  Save,
  RotateCcw,
  AlertTriangle,
  Server,
  Shield,
  Brain,
  Settings,
} from 'lucide-react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '~/components/ui/alert';
import { PageContainer, PageHeader } from '~/navigation';

interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  displayValue?: unknown;
  category: string;
  label: string;
  description: string | null;
  valueType: string;
  options: Array<{ value: string; label: string }> | null;
  isRequired: boolean;
  defaultValue: unknown;
  requiresRestart: boolean;
  sortOrder: string;
}

interface AppSettingsResponse {
  data: AppSetting[];
  grouped: Record<string, AppSetting[]>;
  categories: string[];
}

const categoryIcons: Record<string, React.ElementType> = {
  api: Server,
  server: Server,
  security: Shield,
  ai: Brain,
  general: Settings,
};

const categoryLabels: Record<string, string> = {
  api: 'API Configuration',
  server: 'Server Settings',
  security: 'Security & Authentication',
  ai: 'AI Services',
  general: 'General',
};

export const Route = createFileRoute('/settings/environment')({
  component: EnvironmentSettings,
});

function EnvironmentSettings() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<AppSetting[]>([]);
  const [grouped, setGrouped] = React.useState<Record<string, AppSetting[]>>({});
  const [categories, setCategories] = React.useState<string[]>([]);
  const [pendingChanges, setPendingChanges] = React.useState<Record<string, unknown>>({});
  const [showPasswords, setShowPasswords] = React.useState<Record<string, boolean>>({});
  const [requiresRestart, setRequiresRestart] = React.useState(false);

  // Fetch settings
  const fetchSettings = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/app-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data: AppSettingsResponse = await response.json();
      setSettings(data.data);
      setGrouped(data.grouped);
      setCategories(data.categories);
      setPendingChanges({});
      setRequiresRestart(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load environment settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle value change
  const handleChange = (key: string, value: unknown, settingRequiresRestart: boolean) => {
    setPendingChanges((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (settingRequiresRestart) {
      setRequiresRestart(true);
    }
  };

  // Get current value (pending or original)
  const getValue = (setting: AppSetting): unknown => {
    if (setting.key in pendingChanges) {
      return pendingChanges[setting.key];
    }
    return setting.value;
  };

  // Save all pending changes
  const handleSaveAll = async () => {
    if (Object.keys(pendingChanges).length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      const settingsToUpdate = Object.entries(pendingChanges).map(([key, value]) => ({
        key,
        value,
      }));

      const response = await fetch('/api/app-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToUpdate }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const result = await response.json();

      toast.success(`${result.updated} setting(s) saved successfully`);

      if (result.requiresRestart) {
        toast.warning('Server restart required for some changes to take effect', {
          duration: 5000,
        });
      }

      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset a single setting
  const handleReset = async (key: string) => {
    try {
      const response = await fetch(`/api/app-settings/reset/${key}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset setting');
      }

      toast.success('Setting reset to default');
      await fetchSettings();
    } catch (error) {
      console.error('Error resetting setting:', error);
      toast.error('Failed to reset setting');
    }
  };

  // Discard pending changes
  const handleDiscard = () => {
    setPendingChanges({});
    setRequiresRestart(false);
    toast.info('Changes discarded');
  };

  // Render input based on value type
  const renderInput = (setting: AppSetting) => {
    const currentValue = getValue(setting);
    const hasChange = setting.key in pendingChanges;

    switch (setting.valueType) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={setting.key}
              checked={Boolean(currentValue)}
              onCheckedChange={(checked) =>
                handleChange(setting.key, checked, setting.requiresRestart)
              }
            />
            <Label htmlFor={setting.key} className="text-sm text-muted-foreground">
              {currentValue ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        );

      case 'number':
        return (
          <Input
            id={setting.key}
            type="number"
            value={String(currentValue ?? '')}
            onChange={(e) =>
              handleChange(
                setting.key,
                e.target.value ? parseInt(e.target.value, 10) : '',
                setting.requiresRestart
              )
            }
            className={hasChange ? 'border-primary' : ''}
          />
        );

      case 'password':
        return (
          <div className="relative">
            <Input
              id={setting.key}
              type={showPasswords[setting.key] ? 'text' : 'password'}
              value={
                hasChange
                  ? String(currentValue ?? '')
                  : String(setting.displayValue ?? '')
              }
              onChange={(e) =>
                handleChange(setting.key, e.target.value, setting.requiresRestart)
              }
              placeholder="Enter new value"
              className={`pr-10 ${hasChange ? 'border-primary' : ''}`}
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords((prev) => ({
                  ...prev,
                  [setting.key]: !prev[setting.key],
                }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPasswords[setting.key] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        );

      case 'select':
        return (
          <Select
            value={String(currentValue ?? '')}
            onValueChange={(value) =>
              handleChange(setting.key, value, setting.requiresRestart)
            }
          >
            <SelectTrigger className={hasChange ? 'border-primary' : ''}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default: // string
        return (
          <Input
            id={setting.key}
            type="text"
            value={String(currentValue ?? '')}
            onChange={(e) =>
              handleChange(setting.key, e.target.value, setting.requiresRestart)
            }
            className={hasChange ? 'border-primary' : ''}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Environment Settings"
          description="Configure application environment preferences"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageContainer>
    );
  }

  const hasChanges = Object.keys(pendingChanges).length > 0;

  return (
    <PageContainer>
      <PageHeader
        title="Environment Settings"
        description="Configure API, security, AI services, and server preferences"
        actions={
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleDiscard}>
                Discard Changes
              </Button>
            )}
            <Button onClick={handleSaveAll} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes {hasChanges && `(${Object.keys(pendingChanges).length})`}
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Restart Warning */}
        {requiresRestart && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Server Restart Required</AlertTitle>
            <AlertDescription>
              Some changes you've made require a server restart to take effect.
            </AlertDescription>
          </Alert>
        )}

        {/* Settings by Category */}
        {categories.map((category) => {
          const Icon = categoryIcons[category] || Settings;
          const categorySettings = grouped[category] || [];

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {categoryLabels[category] || category}
                </CardTitle>
                <CardDescription>
                  {category === 'security' &&
                    'Configure authentication and rate limiting settings'}
                  {category === 'ai' && 'Configure AI service endpoints and models'}
                  {category === 'server' && 'Configure server behavior and limits'}
                  {category === 'api' && 'Configure API server settings'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={setting.key}
                        className="flex items-center gap-2"
                      >
                        {setting.label}
                        {setting.isRequired && (
                          <span className="text-destructive">*</span>
                        )}
                        {setting.requiresRestart && (
                          <span className="text-xs text-muted-foreground">
                            (restart required)
                          </span>
                        )}
                      </Label>
                      {setting.defaultValue !== null && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReset(setting.key)}
                          title="Reset to default"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {renderInput(setting)}
                    {setting.description && (
                      <p className="text-xs text-muted-foreground">
                        {setting.description}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Empty State */}
        {categories.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No settings configured. Click the button below to initialize
                default settings.
              </p>
              <Button
                className="mt-4"
                onClick={async () => {
                  try {
                    await fetch('/api/app-settings/seed', { method: 'POST' });
                    toast.success('Default settings initialized');
                    await fetchSettings();
                  } catch {
                    toast.error('Failed to initialize settings');
                  }
                }}
              >
                Initialize Settings
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
