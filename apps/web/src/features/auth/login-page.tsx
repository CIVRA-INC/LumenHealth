import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type AnySessionView, type LoginInput } from '@lumen/contracts';
import { Alert, Button, FormField, TextField } from '@lumen/ui';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Wordmark } from '../../app/logo';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { useAnySession, useResetSession } from '../../lib/session';

export function LoginPage() {
  const { data: session } = useAnySession();
  const reset = useResetSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useMutation({
    mutationFn: (input: LoginInput) => api.post<AnySessionView>('/auth/login', input),
    onSuccess: (view) => {
      reset(view);
      if (view.scope === 'PLATFORM') {
        navigate(view.user.mustChangePassword ? '/platform/account' : '/platform', {
          replace: true,
        });
        return;
      }
      navigate(view.user.mustChangePassword ? '/account' : from, { replace: true });
    },
  });

  if (session) return <Navigate to={session.scope === 'PLATFORM' ? '/platform' : from} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-stone px-6 py-8 sm:px-10">
      <Wordmark />
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <h1 className="display text-2xl text-ink-950">Sign in to LumenHealth</h1>
          <p className="mt-1 text-sm text-ink-500">Use the work account from your invitation.</p>

          <form
            className="mt-6 space-y-4 rounded-lg border border-rule bg-surface p-5"
            noValidate
            onSubmit={form.handleSubmit((values) => login.mutate(values))}
          >
            {login.isError && <Alert tone="danger">{errorMessage(login.error)}</Alert>}
            <FormField label="Email" error={form.formState.errors.email?.message}>
              <TextField
                type="email"
                autoComplete="username"
                autoFocus
                {...form.register('email')}
              />
            </FormField>
            <FormField label="Password" error={form.formState.errors.password?.message}>
              <TextField
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
            </FormField>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={login.isPending}
            >
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-xs text-ink-500">
            Every sign-in and every access to patient records is recorded.
          </p>
        </div>
      </main>
    </div>
  );
}
