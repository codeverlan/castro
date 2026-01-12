/**
 * S3 Credentials List Component
 * Displays a list of S3 credential profiles with actions
 */

import * as React from 'react';
import { Link } from '@tanstack/react-router';
import {
  Loader2,
  TestTube,
  Trash2,
  Edit2,
  Shield,
  Database,
  MoreVertical,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

export interface S3CredentialProfile {
  id: string;
  name: string;
  description: string | null;
  region: string;
  authMethod: 'access_key' | 'iam_role';
  defaultBucket: string | null;
  isDefault: boolean;
  lastTestedAt: Date | null;
  lastTestResult: 'success' | 'failed' | null;
  lastTestError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface S3CredentialsListProps {
  credentials: S3CredentialProfile[];
  isLoading?: boolean;
  onTest?: (id: string) => Promise<void>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onSetDefault?: (id: string) => Promise<void>;
}

export function S3CredentialsList({
  credentials,
  isLoading = false,
  onTest,
  onEdit,
  onDelete,
  onSetDefault,
}: S3CredentialsListProps) {
  const [testingId, setTestingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleTest = async (id: string) => {
    if (!onTest || testingId) return;

    setTestingId(id);
    try {
      await onTest(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete || deletingId) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this credential profile? This action cannot be undone.'
    );

    if (!confirmed) return;

    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  const getTestStatusIcon = (credential: S3CredentialProfile) => {
    if (!credential.lastTestedAt) {
      return null;
    }

    if (credential.lastTestResult === 'success') {
      return (
        <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Connected</span>
        </div>
      );
    }

    if (credential.lastTestResult === 'failed') {
      return (
        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          <span>Failed</span>
        </div>
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Database className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No S3 Credentials</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add your first S3 credential profile to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {credentials.map((credential) => (
        <Card key={credential.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  {credential.name}
                  {credential.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Shield className="h-3 w-3" />
                      Default
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {credential.description || 'No description'}
                </CardDescription>
              </div>
              {getTestStatusIcon(credential)}
            </div>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Region:</span>
              <span className="font-mono">{credential.region}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auth Method:</span>
              <span className="capitalize">{credential.authMethod.replace('_', ' ')}</span>
            </div>

            {credential.defaultBucket && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Default Bucket:</span>
                <span className="font-mono">{credential.defaultBucket}</span>
              </div>
            )}

            {credential.lastTestedAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Tested:</span>
                <span>{formatDistanceToNow(credential.lastTestedAt, { addSuffix: true })}</span>
              </div>
            )}

            {credential.lastTestResult === 'failed' && credential.lastTestError && (
              <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">
                {credential.lastTestError}
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between gap-2">
            <div className="flex gap-2">
              {onTest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(credential.id)}
                  disabled={testingId === credential.id}
                >
                  {testingId === credential.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test
                    </>
                  )}
                </Button>
              )}

              {onSetDefault && !credential.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetDefault(credential.id)}
                >
                  Set Default
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(credential.id)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}

              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(credential.id)}
                  disabled={deletingId === credential.id}
                >
                  {deletingId === credential.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
