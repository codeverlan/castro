/**
 * S3 Credentials Settings Page
 * Settings page for managing S3 credential profiles
 */

import * as React from 'react';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '~/components/ui/button';
import { S3CredentialsList, type S3CredentialProfile } from '~/components/s3';
import {
  CreateS3CredentialDialog,
  EditS3CredentialDialog,
} from '~/components/s3/S3CredentialsDialog';
import { PageContainer, PageHeader } from '~/navigation';
import type { z } from 'zod';
import type { createS3CredentialsSchema } from '~/lib/validations/s3Credentials';

interface S3CredentialsApiResponse {
  data: S3CredentialProfile[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const Route = createFileRoute('/settings/s3')({
  component: S3CredentialsSettings,
});

function S3CredentialsSettings() {
  const navigate = useNavigate();
  const router = useRouter();
  const [credentials, setCredentials] = React.useState<S3CredentialProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingCredential, setEditingCredential] = React.useState<S3CredentialProfile | null>(null);

  // Fetch credentials
  const fetchCredentials = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/s3-credentials');
      if (!response.ok) {
        throw new Error('Failed to fetch S3 credentials');
      }
      const data: S3CredentialsApiResponse = await response.json();
      setCredentials(data.data || []);
    } catch (error) {
      console.error('Error fetching S3 credentials:', error);
      toast.error('Failed to load S3 credentials');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Handle creating credentials
  const handleCreate = async (
    values: z.infer<typeof createS3CredentialsSchema>
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/s3-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to create S3 credentials');
      }

      toast.success('S3 credentials created successfully');
      await fetchCredentials();
    } catch (error) {
      console.error('Error creating S3 credentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create S3 credentials');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating credentials
  const handleUpdate = async (
    id: string,
    values: z.infer<typeof createS3CredentialsSchema>
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/s3-credentials/update/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update S3 credentials');
      }

      toast.success('S3 credentials updated successfully');
      setEditDialogOpen(false);
      setEditingCredential(null);
      await fetchCredentials();
    } catch (error) {
      console.error('Error updating S3 credentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update S3 credentials');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle testing connection
  const handleTest = async (id: string) => {
    try {
      const response = await fetch(`/api/s3-credentials/test/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listBuckets: true,
          testBucketName: credentials.find((c) => c.id === id)?.defaultBucket || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to test S3 connection');
      }

      const data = await response.json();

      if (data.data?.success) {
        toast.success(
          `S3 connection successful! Found ${data.data.buckets?.length || 0} bucket(s).`
        );
      } else {
        toast.error(data.data?.error || 'S3 connection test failed');
      }

      await fetchCredentials();
    } catch (error) {
      console.error('Error testing S3 connection:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to test S3 connection');
    }
  };

  // Handle deleting credentials
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/s3-credentials/delete/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete S3 credentials');
      }

      toast.success('S3 credentials deleted successfully');
      await fetchCredentials();
    } catch (error) {
      console.error('Error deleting S3 credentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete S3 credentials');
    }
  };

  // Handle setting as default
  const handleSetDefault = async (id: string) => {
    try {
      const credential = credentials.find((c) => c.id === id);
      if (!credential) return;

      const response = await fetch(`/api/s3-credentials/update/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isDefault: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to set default credentials');
      }

      toast.success(`"${credential.name}" is now the default S3 credential profile`);
      await fetchCredentials();
    } catch (error) {
      console.error('Error setting default credentials:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to set default credentials');
    }
  };

  // Handle opening edit dialog
  const handleEdit = (id: string) => {
    const credential = credentials.find((c) => c.id === id);
    if (!credential) return;

    setEditingCredential(credential);
    setEditDialogOpen(true);
  };

  // Handle submit from edit dialog
  const handleEditSubmit = async (values: z.infer<typeof createS3CredentialsSchema>) => {
    if (!editingCredential) return;
    await handleUpdate(editingCredential.id, values);
  };

  return (
    <PageContainer>
      <PageHeader
        title="S3 Credentials"
        description="Manage AWS S3 credential profiles for secure storage access"
        actions={
          <CreateS3CredentialDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Credentials
              </Button>
            }
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
          />
        }
      />

      <S3CredentialsList
        credentials={credentials}
        isLoading={isLoading}
        onTest={handleTest}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
      />

      {editingCredential && (
        <EditS3CredentialDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          defaultValues={{
            name: editingCredential.name,
            description: editingCredential.description || undefined,
            region: editingCredential.region,
            defaultBucket: editingCredential.defaultBucket || undefined,
            authMethod: editingCredential.authMethod,
            roleArn: editingCredential.roleArn || undefined,
            isDefault: editingCredential.isDefault,
          }}
          onSubmit={handleEditSubmit}
          isSubmitting={isSubmitting}
        />
      )}
    </PageContainer>
  );
}
