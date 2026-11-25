import { zodResolver } from '@hookform/resolvers/zod';
import { MIN_PASSWORD_LENGTH, passwordSchema } from '@lumen/contracts';
import { Alert, Button, FormField, TextField, toast } from '@lumen/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';
import { Page, PageHeader } from '../../components/page';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { SESSION_KEY, usePlatformSession } from '../../lib/session';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
type Values = z.infer<typeof schema>;

export function PlatformAccountPage() {
  const { data: session } = usePlatformSession();
  const client = useQueryClient();
  const navigate = useNavigate();
  const forced = !!session?.user.mustChangePassword;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const change = useMutation({
    mutationFn: (v: Values) =>
      api.post<void>('/auth/change-password', {
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      }),
    onSuccess: async () => {
      toast.success('Password changed', {
        description: 'Your other devices have been signed out.',
      });
      form.reset();
      await client.invalidateQueries({ queryKey: SESSION_KEY });
      if (forced) navigate('/platform', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError)
        for (const [path, message] of Object.entries(error.fieldErrors))
          if (path === 'currentPassword' || path === 'newPassword')
            form.setError(path, { message });
    },
  });
  const errors = form.formState.errors;

  return (
    <Page width="form">
      <PageHeader title="Account" description={session?.user.email} />
      {forced && (
        <Alert tone="warning" title="Choose your own password to continue" className="mb-6">
          The password you were provisioned with must be replaced before you can manage hospitals.
        </Alert>
      )}
      <form
        className="max-w-sm space-y-4 border-t border-rule py-7"
        noValidate
        onSubmit={form.handleSubmit((v) => change.mutate(v))}
      >
        {change.isError && !(change.error instanceof ApiError && change.error.status === 400) && (
          <Alert tone="danger">{errorMessage(change.error)}</Alert>
        )}
        <FormField label="Current password" error={errors.currentPassword?.message}>
          <TextField
            type="password"
            autoComplete="current-password"
            {...form.register('currentPassword')}
          />
        </FormField>
        <FormField
          label="New password"
          description={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`}
          error={errors.newPassword?.message}
        >
          <TextField
            type="password"
            autoComplete="new-password"
            {...form.register('newPassword')}
          />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirm?.message}>
          <TextField type="password" autoComplete="new-password" {...form.register('confirm')} />
        </FormField>
        <Button type="submit" variant="primary" loading={change.isPending}>
          Change password
        </Button>
      </form>
    </Page>
  );
}
