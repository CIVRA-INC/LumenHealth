import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';

function stubInspect(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

/** The page caches the fragment at module level, so each test loads a fresh copy of it. */
async function renderPage(hash = `#token=${TOKEN}`) {
  window.history.replaceState(null, '', `/accept-invitation${hash}`);
  vi.resetModules();
  const { AcceptInvitationPage } = await import('./accept-invitation-page');
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <AcceptInvitationPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pending = {
  state: 'PENDING',
  organizationName: 'Riverside Hospital',
  email: 'ngozi@riverside.test',
  fullName: 'Ngozi Adebayo',
  role: 'ORG_ADMIN',
  expiresAt: '2026-12-02T14:29:00.000Z',
};

describe('invitation acceptance page', () => {
  it('removes the token from the address bar as soon as it has been read', async () => {
    stubInspect({ ...pending, existingAccount: false });
    await renderPage();
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain(TOKEN);
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({ token: TOKEN });
  });

  it('asks a new person to choose and confirm a password', async () => {
    stubInspect({ ...pending, existingAccount: false });
    await renderPage();
    expect(await screen.findByText('Join Riverside Hospital')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose a password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create my account' })).toBeDisabled();
  });

  it('asks an existing user for their current password and promises not to change it', async () => {
    stubInspect({ ...pending, existingAccount: true });
    await renderPage();
    expect(await screen.findByLabelText('Your current password')).toBeInTheDocument();
    expect(screen.getByText(/Your password does not change/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument();
  });

  it.each([
    ['EXPIRED', 'This invitation has expired'],
    ['REVOKED', 'This invitation was withdrawn'],
    ['ACCEPTED', 'This invitation has already been used'],
    ['UNAVAILABLE', 'This invitation link is not valid'],
  ])('shows a clear %s state', async (state, title) => {
    stubInspect({ state });
    await renderPage();
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.queryByLabelText('Choose a password')).not.toBeInTheDocument();
  });

  it('treats a link with no token as invalid without calling the server', async () => {
    stubInspect({ state: 'UNAVAILABLE' });
    await renderPage('');
    expect(await screen.findByText('This invitation link is not valid')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
