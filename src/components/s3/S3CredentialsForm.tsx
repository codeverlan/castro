/**
 * S3 Credentials Form Component
 * Form for creating and editing S3 credential profiles
 */

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save } from 'lucide-react';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { createS3CredentialsSchema, updateS3CredentialsSchema } from '~/lib/validations/s3Credentials';

// AWS regions list
const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ca-central-1',
  'sa-east-1',
  'me-south-1',
  'af-south-1',
] as const;

interface S3CredentialsFormProps {
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
  submitLabel?: string;
}

export function S3CredentialsForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save Credentials',
}: S3CredentialsFormProps) {
  const form = useForm<z.infer<typeof createS3CredentialsSchema>>({
    resolver: zodResolver(createS3CredentialsSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      accessKeyId: defaultValues?.accessKeyId || '',
      secretAccessKey: defaultValues?.secretAccessKey || '',
      region: defaultValues?.region || 'us-east-1',
      defaultBucket: defaultValues?.defaultBucket || null,
      authMethod: defaultValues?.authMethod || 'access_key',
      sessionToken: defaultValues?.sessionToken || null,
      roleArn: defaultValues?.roleArn || null,
      roleExternalId: defaultValues?.roleExternalId || null,
      isDefault: defaultValues?.isDefault ?? false,
    },
  });

  const authMethod = form.watch('authMethod');
  const useSessionToken = form.watch('sessionToken');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Basic Information</h3>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., production, backup, archive"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  A descriptive name for this credential profile
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Brief description of this credential profile"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Set as Default Profile
                  </FormLabel>
                  <FormDescription>
                    This credential profile will be used by default for S3 operations
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* AWS Region */}
        <FormField
          control={form.control}
          name="region"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AWS Region</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AWS_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The AWS region where your S3 buckets are located
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Authentication Method */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Authentication Method</h3>

          <FormField
            control={form.control}
            name="authMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication method" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="access_key">
                      Access Key (AWS IAM User)
                    </SelectItem>
                    <SelectItem value="iam_role">
                      IAM Role (Cross-Account)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {authMethod === 'access_key'
                    ? 'Use AWS Access Key ID and Secret Access Key for direct authentication'
                    : 'Use IAM role-based authentication for cross-account or temporary access'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Access Key Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">AWS Credentials</h3>

          <FormField
            control={form.control}
            name="accessKeyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Key ID</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your AWS Access Key ID (encrypted at rest)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="secretAccessKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Secret Access Key</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Your AWS Secret Access Key (encrypted at rest)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sessionToken"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Session Token (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="FwoGZXIvYXdzEGMaDNu..."
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>
                  Optional session token for temporary credentials or assumed roles
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* IAM Role Configuration */}
        {authMethod === 'iam_role' && (
          <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
            <h3 className="text-sm font-medium">IAM Role Configuration</h3>

            <FormField
              control={form.control}
              name="roleArn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role ARN</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="arn:aws:iam::123456789012:role/MyS3Role"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription>
                    The ARN of the IAM role to assume for S3 access
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roleExternalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="unique-external-id"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormDescription>
                    External ID for additional security when assuming the role
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Default Bucket */}
        <FormField
          control={form.control}
          name="defaultBucket"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default Bucket Name (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="my-s3-bucket"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormDescription>
                The default S3 bucket to use with this credential profile
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {submitLabel}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
