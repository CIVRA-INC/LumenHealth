import type { InvitationInspection } from '@lumen/contracts';
import { MIN_PASSWORD_LENGTH, ROLE_LABELS } from '@lumen/contracts';
import { Alert, Button, FormField, Skeleton, TextField } from '@lumen/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';
import { Wordmark } from '../../app/logo';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';

/**
 * The invitation token is read once from the URL fragment (which is never sent to any server or written to
 * access logs) and then removed from the address bar and the history entry.
 */
let cachedToken: string | undefined;
function readToken(): string {
  // React StrictMode runs initialisers twice in development; the fragment is gone after the first read.
  if (cachedToken !== undefined) return cachedToken;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('token') ?? '';
  if (token) window.history.replaceState(null, '', window.location.pathname);
  cachedToken = token;
  return token;
}

const UNAVAILABLE_COPY: Record<string, { title: string; body: string }> = {
  EXPIRED: {
    title: 'This invitation has expired',
    body: 'Invitation links work for a limited time. Ask your administrator to resend it.',
  },
  REVOKED: {
    title: 'This invitation was withdrawn',
    body: 'Your administrator cancelled it. Contact them if you think this is a mistake.',
  },
  ACCEPTED: {
    title: 'This invitation has already been used',
    body: 'Sign in with the account you set up. If that was not you, tell your administrator.',
  },
  UNAVAILABLE: {
    title: 'This invitation link is not valid',
    body: 'It may have been replaced by a newer email, or copied incompletely. Use the most recent invitation email, or ask your administrator to resend it.',
  },
};

export function AcceptInvitationPage() {
  const [token] = useState(readToken);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldError, setFieldError] = useState<string>();

  const inspect = useQuery({
    queryKey: ['invitation', 'inspect'],
    queryFn: () => api.post<InvitationInspection>('/invitations/inspect', { token }),
    enabled: token.length > 0,
    staleTime: Infinity,
    retry: false,
  });
  const info = token ? inspect.data : ({ state: 'UNAVAILABLE' } as InvitationInspection);

  const accept = useMutation({
    mutationFn: () => api.post<void>('/invitations/accept', { token, password }),
    onSuccess: () => setDone(true),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400)
        setFieldError(error.fieldErrors.password ?? error.message);
      else if (error instanceof ApiError && error.status === 410) void inspect.refetch();
    },
  });

  const pending = info?.state === 'PENDING' ? info : null;
  const existing = pending?.existingAccount ?? false;
  const mismatch = !existing && confirm.length > 0 && confirm !== password;
  const canSubmit =
    !!pending && password.length > 0 && (existing || (!mismatch && confirm.length > 0));

  return (
    <div className="flex min-h-screen flex-col bg-stone px-6 py-8 sm:px-10">
      <Wordmark />
      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          {done ? (
            <>
              <h1 className="display text-2xl text-ink-950">You’re all set</h1>
              <p className="mt-2 text-sm text-ink-600">
                {existing
                  ? `You now also have access to ${pending?.organizationName}. Sign in as usual and switch hospital from the menu.`
                  : 'Your account is ready. Sign in with the email from your invitation and the password you just chose.'}
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button variant="primary" size="lg">
                  Go to sign in
                </Button>
              </Link>
            </>
          ) : !info || (token && inspect.isLoading) ? (
            <Skeleton className="h-40 w-full" />
          ) : inspect.isError ? (
            <Alert tone="danger" title="We couldn’t check this invitation">
              {errorMessage(inspect.error)} Reload the page to try again.
            </Alert>
          ) : pending ? (
            <>
              <h1 className="display text-2xl text-ink-950">Join {pending.organizationName}</h1>
              <p className="mt-1 text-sm text-ink-500">
                {pending.fullName} · {ROLE_LABELS[pending.role]} · {pending.email}
              </p>
              <form
                className="mt-6 space-y-4 rounded-lg border border-rule bg-surface p-5"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  setFieldError(undefined);
                  accept.mutate();
                }}
              >
                {accept.isError &&
                  !(
                    accept.error instanceof ApiError && [400, 410].includes(accept.error.status)
                  ) && <Alert tone="danger">{errorMessage(accept.error)}</Alert>}
                {existing ? (
                  <>
                    <Alert tone="info">
                      You already have a LumenHealth account for {pending.email}. Enter your current
                      password to add this hospital. Your password does not change.
                    </Alert>
                    <FormField label="Your current password" error={fieldError}>
                      <TextField
                        type="password"
                        autoComplete="current-password"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </FormField>
                  </>
                ) : (
                  <>
                    <FormField
                      label="Choose a password"
                      description={`At least ${MIN_PASSWORD_LENGTH} characters. A short sentence works well.`}
                      error={fieldError}
                    >
                      <TextField
                        type="password"
                        autoComplete="new-password"
                        autoFocus
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </FormField>
                    <FormField
                      label="Confirm password"
                      error={mismatch ? 'Passwords do not match' : undefined}
                    >
                      <TextField
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                      />
                    </FormField>
                  </>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={accept.isPending}
                  disabled={!canSubmit}
                >
                  {existing ? 'Join hospital' : 'Create my account'}
                </Button>
              </form>
              <p className="mt-4 text-xs text-ink-500">
                This link works once and expires {formatDateTime(pending.expiresAt, 'UTC')} UTC.
              </p>
            </>
          ) : (
            <>
              <h1 className="display text-2xl text-ink-950">
                {UNAVAILABLE_COPY[info.state]?.title}
              </h1>
              {info.organizationName && info.state !== 'UNAVAILABLE' && (
                <p className="mt-1 text-sm text-ink-500">{info.organizationName}</p>
              )}
              <p className="mt-2 text-sm text-ink-600">{UNAVAILABLE_COPY[info.state]?.body}</p>
              <Link to="/login" className="mt-6 inline-block">
                <Button size="lg">Go to sign in</Button>
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
