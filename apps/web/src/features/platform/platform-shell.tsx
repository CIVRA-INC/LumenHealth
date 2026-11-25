import { Avatar, Button, cn } from '@lumen/ui';
import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Wordmark } from '../../app/logo';
import { api } from '../../lib/api';
import { useResetSession, usePlatformSession } from '../../lib/session';

const NAV = [
  { to: '/platform', label: 'Hospitals', end: true },
  { to: '/platform/invitations', label: 'Invitations' },
  { to: '/platform/account', label: 'Account' },
];

/** The platform operator's workspace. It has no patient, schedule or hospital navigation. */
export function PlatformShell() {
  const { data: session } = usePlatformSession();
  const reset = useResetSession();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => {
      reset(null);
      navigate('/login');
    },
  });
  const locked = session?.user.mustChangePassword;

  return (
    <div className="min-h-screen bg-stone">
      <header className="on-dark bg-green-900">
        <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Link to="/platform" aria-label="LumenHealth platform home" className="rounded-md">
            <Wordmark inverse />
          </Link>
          <span className="hidden rounded-xs bg-lime-400 px-1.5 py-0.5 text-2xs font-medium tracking-[0.08em] text-green-950 uppercase sm:inline">
            Platform
          </span>
          <nav aria-label="Platform" className="flex flex-1 items-center gap-1 overflow-x-auto">
            {!locked &&
              NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center rounded-md px-3 text-base whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-green-800 font-medium text-white'
                        : 'text-green-100 hover:bg-green-800/60 hover:text-white',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
          </nav>
          {session && (
            <div className="flex items-center gap-3">
              <Avatar name={session.user.fullName} />
              <span className="hidden max-w-40 truncate text-sm text-green-100 md:inline">
                {session.user.fullName}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => logout.mutate()}
                loading={logout.isPending}
              >
                <LogOut aria-hidden /> Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
