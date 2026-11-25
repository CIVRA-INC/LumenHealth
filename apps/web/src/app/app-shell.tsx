import { ROLE_LABELS, type Permission, type QueueView } from '@lumen/contracts';
import {
  Avatar,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Kbd,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@lumen/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Check, ChevronsUpDown, KeyRound, LogOut, Menu, Palette, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { api } from '../lib/api';
import { minutesSince } from '../lib/format';
import { useCan, useRequiredSession, useResetSession } from '../lib/session';
import { CommandSearch } from './command-search';
import { LogoMark, Wordmark } from './logo';
import { TopbarProvider, TopbarSlot } from './topbar';

interface NavItem {
  to: string;
  label: string;
  permission: Permission;
  end?: boolean;
  /** Show the live count of waiting patients beside the label. */
  waiting?: boolean;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: 'Workspace',
    items: [
      { to: '/', label: 'Today', permission: 'dashboard.read', end: true },
      { to: '/schedule', label: 'Schedule', permission: 'appointments.read', waiting: true },
      { to: '/patients', label: 'Patients', permission: 'patients.read' },
      { to: '/consultations', label: 'Consultations', permission: 'encounters.read' },
    ],
  },
  {
    group: 'Administration',
    items: [
      { to: '/admin/users', label: 'Staff', permission: 'users.read' },
      { to: '/admin/invitations', label: 'Invitations', permission: 'users.read' },
      { to: '/admin/audit', label: 'Audit log', permission: 'audit.read' },
    ],
  },
];

function useQueue() {
  const session = useRequiredSession();
  const allowed = useCan('appointments.read');
  return useQuery({
    queryKey: ['queue', session.branch.id],
    queryFn: () => api.get<QueueView>('/queue'),
    enabled: allowed,
    refetchInterval: 30_000,
  });
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const session = useRequiredSession();
  const queue = useQueue();
  const waiting = queue.data?.waiting.length ?? 0;
  return (
    <nav aria-label="Primary" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {NAV.map((section) => {
        const items = section.items.filter((i) => session.permissions.includes(i.permission));
        if (!items.length) return null;
        return (
          <div key={section.group}>
            <p className="px-3 pb-1.5 text-2xs font-medium tracking-[0.08em] text-green-300 uppercase">
              {section.group}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-9 items-center justify-between rounded-md px-3 text-base transition-colors pointer-coarse:h-11',
                        isActive
                          ? 'bg-green-800 font-medium text-white'
                          : 'text-green-100 hover:bg-green-800/60 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-sm bg-lime-400"
                          />
                        )}
                        {item.label}
                        {item.waiting && waiting > 0 && (
                          <span
                            className="data rounded-xs bg-lime-400 px-1.5 text-xs font-medium text-green-950"
                            title={`${waiting} waiting`}
                          >
                            <span className="sr-only">{waiting} waiting: </span>
                            {waiting}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Organisation and branch: the context everything below is scoped to. Opens a menu when there is a choice. */
function WorkspaceSwitcher() {
  const session = useRequiredSession();
  const reset = useResetSession();
  const navigate = useNavigate();
  const switchContext = useMutation({
    mutationFn: (input: { organizationId?: string; branchId?: string }) =>
      api.post<typeof session>('/auth/switch-context', input),
    onSuccess: (next) => {
      reset(next);
      navigate('/');
    },
  });
  const otherOrgs = session.memberships.filter((m) => m.organizationId !== session.organization.id);
  const hasChoice = session.branches.length > 1 || otherOrgs.length > 0;

  const label = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold text-white">
          {session.organization.name}
        </span>
        <span className="block truncate text-xs text-green-200">{session.branch.name}</span>
      </span>
      {hasChoice && <ChevronsUpDown className="size-3.5 shrink-0 text-green-300" aria-hidden />}
    </>
  );
  const box = 'flex w-full items-center gap-2 rounded-md border border-green-700 px-3 py-2';
  if (!hasChoice) return <div className={box}>{label}</div>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn(box, 'transition-colors hover:bg-green-800/60')}>
          {label}
          <span className="sr-only">Switch organisation or branch</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Branch</DropdownMenuLabel>
        {session.branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onSelect={() =>
              branch.id !== session.branch.id && switchContext.mutate({ branchId: branch.id })
            }
          >
            <span className="flex-1">{branch.name}</span>
            {branch.id === session.branch.id && <Check className="!text-green-700" />}
          </DropdownMenuItem>
        ))}
        {otherOrgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Switch organisation</DropdownMenuLabel>
            {otherOrgs.map((m) => (
              <DropdownMenuItem
                key={m.organizationId}
                onSelect={() => switchContext.mutate({ organizationId: m.organizationId })}
              >
                <span className="flex-1">{m.organizationName}</span>
                <span className="text-xs text-ink-500">{ROLE_LABELS[m.role]}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const session = useRequiredSession();
  const reset = useResetSession();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: () => api.post<void>('/auth/logout'),
    onSettled: () => {
      reset(null);
      navigate('/login');
    },
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-green-800/60"
        >
          <Avatar name={session.user.fullName} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {session.user.fullName}
            </span>
            <span className="block truncate text-xs text-green-200">
              {ROLE_LABELS[session.role]}
            </span>
          </span>
          <span className="sr-only">Account menu</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <div className="px-2.5 py-2">
          <p className="truncate text-base font-semibold text-ink-950">{session.user.fullName}</p>
          <p className="truncate text-sm text-ink-500">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/account')}>
          <KeyRound /> Account and password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/design-system')}>
          <Palette /> Design system
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem tone="danger" onSelect={() => logout.mutate()}>
          <LogOut className="!text-danger-600" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="on-dark flex h-full flex-col bg-green-900">
      <div className="flex h-14 shrink-0 items-center px-5">
        <Link to="/" onClick={onNavigate} aria-label="LumenHealth home" className="rounded-md">
          <Wordmark inverse />
        </Link>
      </div>
      <div className="px-3">
        <WorkspaceSwitcher />
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="border-t border-green-800 p-3">
        <AccountMenu />
      </div>
    </div>
  );
}

/** Real operational alerts derived from the live queue: urgent patients and long waits. */
function Notifications() {
  const queue = useQueue();
  const alerts = (queue.data?.waiting ?? []).flatMap((a) => {
    const waited = a.checkedInAt ? minutesSince(a.checkedInAt) : 0;
    if (a.priority === 'URGENT')
      return [{ id: `${a.id}-u`, text: `${a.patient.displayName}: urgent, waiting ${waited} min` }];
    if (waited >= 30)
      return [{ id: `${a.id}-w`, text: `${a.patient.displayName}: waiting ${waited} min` }];
    return [];
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          label={`Notifications${alerts.length ? `, ${alerts.length} need attention` : ''}`}
          className="relative"
        >
          <Bell strokeWidth={1.75} />
          {alerts.length > 0 && (
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger-600 ring-2 ring-stone"
            />
          )}
        </IconButton>
      </PopoverTrigger>
      <PopoverContent>
        <div className="border-b border-rule px-4 py-2.5">
          <p className="text-base font-semibold text-ink-950">Needs attention</p>
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-500">No urgent patients or long waits.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-rule-soft overflow-y-auto">
            {alerts.map((a) => (
              <li key={a.id}>
                <Link
                  to="/schedule"
                  className="block px-4 py-2.5 text-sm text-ink-900 hover:bg-lime-50"
                >
                  {a.text}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

function ShellFrame() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const canSearch = useCan('patients.read');

  useEffect(() => {
    if (!canSearch) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSearch]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar />
      </aside>

      <Drawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="left"
        title="Navigation"
        className="bg-green-900"
      >
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-rule bg-stone/90 px-4 backdrop-blur sm:px-6 lg:px-10">
          <IconButton
            label="Open navigation"
            className="-ml-2 lg:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu />
          </IconButton>
          <Link to="/" className="lg:hidden" aria-label="LumenHealth home">
            <LogoMark />
          </Link>
          {/* Where you are: the page's own trail (the branch is already shown in the navigation). */}
          <TopbarSlot />

          {canSearch && (
            <>
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="hidden h-8 w-72 shrink-0 items-center gap-2 rounded-md border border-rule-strong bg-surface px-2.5 text-left text-sm text-ink-500 transition-colors hover:border-ink-300 sm:flex"
              >
                <Search className="size-3.5" aria-hidden />
                <span className="flex-1">Find a patient</span>
                <Kbd>Ctrl K</Kbd>
              </button>
              <IconButton
                label="Find a patient"
                className="sm:hidden"
                onClick={() => setSearchOpen(true)}
              >
                <Search strokeWidth={1.75} />
              </IconButton>
            </>
          )}
          <Notifications />
        </header>

        <main id="main" className="min-w-0 flex-1" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      {canSearch && <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />}
    </div>
  );
}

export function AppShell() {
  return (
    <TopbarProvider>
      <ShellFrame />
    </TopbarProvider>
  );
}
