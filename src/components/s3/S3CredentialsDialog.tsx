/**
 * S3 Credentials Dialog Component
 * Dialog for creating and editing S3 credential profiles
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '~/components/ui/dialog';
import { S3CredentialsForm } from './S3CredentialsForm';
import type { z } from 'zod';
import type { createS3CredentialsSchema } from '~/lib/validations/s3Credentials';

interface S3CredentialsDialogProps {
  trigger?: React.ReactNode;
  defaultValues?: {
    name?: string;
    description?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    defaultBucket?: string;
    authMethod?: 'access_key' | 'iam_role';
    sessionToken?: string;
    roleArn?: string;
    roleExternalId?: string;
    isDefault?: boolean;
  };
  onSubmit: (values: z.infer<typeof createS3CredentialsSchema>) => Promise<void>;
  isSubmitting?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function S3CredentialsDialog({
  trigger,
  defaultValues,
  onSubmit,
  isSubmitting = false,
  title = 'S3 Credentials',
  description = 'Configure AWS S3 credentials for secure storage access.',
  submitLabel = 'Save Credentials',
  open,
  onOpenChange,
}: S3CredentialsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  const handleFormSubmit = async (values: z.infer<typeof createS3CredentialsSchema>) => {
    await onSubmit(values);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <S3CredentialsForm
          defaultValues={defaultValues}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
        />

        <DialogFooter className="hidden">
          {/* Hidden footer - form has its own submit button */}
          <DialogClose />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Create Credential Dialog - convenience wrapper for creating new credentials
 */
export function CreateS3CredentialDialog({
  trigger,
  onSubmit,
  isSubmitting,
}: {
  trigger?: React.ReactNode;
  onSubmit: (values: z.infer<typeof createS3CredentialsSchema>) => Promise<void>;
  isSubmitting?: boolean;
}) {
  return (
    <S3CredentialsDialog
      trigger={trigger}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      title="Add S3 Credentials"
      description="Add a new AWS S3 credential profile for secure storage access."
      submitLabel="Add Credentials"
    />
  );
}

/**
 * Edit Credential Dialog - convenience wrapper for editing credentials
 */
export function EditS3CredentialDialog({
  trigger,
  defaultValues,
  onSubmit,
  isSubmitting,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  defaultValues: {
    name?: string;
    description?: string;
    region?: string;
    defaultBucket?: string;
    authMethod?: 'access_key' | 'iam_role';
    roleArn?: string;
    isDefault?: boolean;
  };
  onSubmit: (values: z.infer<typeof createS3CredentialsSchema>) => Promise<void>;
  isSubmitting?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <S3CredentialsDialog
      trigger={trigger}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      title="Edit S3 Credentials"
      description="Update your AWS S3 credential profile."
      submitLabel="Update Credentials"
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
