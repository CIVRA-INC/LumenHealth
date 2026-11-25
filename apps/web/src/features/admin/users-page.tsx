import {
  ROLES,
  ROLE_LABELS,
  STAFF_SORTS,
  type BranchSummary,
  type OrgUserView,
  type Page as PageOf,
  type Role,
} from '@lumen/contracts';
import {
  Alert,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  EmptyState,
  FilterBar,
  FilterSelect,
  FormField,
  SearchField,
  Select,
  StatusIndicator,
  TableToolbar,
  toast,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Page, PageHeader } from '../../components/page';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { InviteStaffDialog } from './invite-staff-dialog';
import { useTableState } from '../../lib/table-state';
import { useSearchInput } from '../../lib/use-search-input';

function BranchPicker({
  branches,
  value,
  onChange,
}: {
  branches: BranchSummary[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Branches</legend>
      {branches.map((b) => (
        <label key={b.id} className="flex items-center gap-2.5 text-base text-ink-800">
          <input
            type="checkbox"
            className="size-4 accent-green-700"
            checked={value.includes(b.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, b.id] : value.filter((id) => id !== b.id))
            }
          />
          {b.name}
        </label>
      ))}
    </fieldset>
  );
}

function useBranches() {
  return useQuery({
    queryKey: ['branches', 'all'],
    queryFn: () => api.get<BranchSummary[]>('/branches'),
    staleTime: 60_000,
  });
}

function EditUserDialog({ user, onClose }: { user: OrgUserView | null; onClose: () => void }) {
  const client = useQueryClient();
  const session = useRequiredSession();
  const branches = useBranches();
  const [role, setRole] = useState<Role>(user?.role ?? 'FRONT_DESK');
  const [status, setStatus] = useState(user?.status ?? 'ACTIVE');
  const [branchIds, setBranchIds] = useState<string[]>(user?.branches.map((b) => b.id) ?? []);
  const [seen, setSeen] = useState(user?.membershipId);
  if (user && user.membershipId !== seen) {
    setSeen(user.membershipId);
    setRole(user.role);
    setStatus(user.status);
    setBranchIds(user.branches.map((b) => b.id));
  }
  const isSelf = user?.userId === session.user.id;
  const save = useMutation({
    mutationFn: () =>
      api.patch<OrgUserView>(`/admin/users/${user?.membershipId}`, { role, status, branchIds }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Staff member updated', {
        description: 'Changes apply to any open sessions immediately.',
      });
      onClose();
    },
  });

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        title={user?.fullName ?? ''}
        description={user?.email}
        footer={
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              loading={save.isPending}
              disabled={branchIds.length === 0}
              onClick={() => save.mutate()}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {save.isError && <Alert tone="danger">{errorMessage(save.error)}</Alert>}
          {isSelf && (
            <Alert tone="info">
              You are editing your own account. You cannot remove your own administrator access.
            </Alert>
          )}
          <FormField label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'DISABLED')}
            >
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled: cannot sign in</option>
            </Select>
          </FormField>
          <FormField label="Branches">
            <BranchPicker
              branches={branches.data ?? []}
              value={branchIds}
              onChange={setBranchIds}
            />
          </FormField>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StaffSort = (typeof STAFF_SORTS)[number];
const TABLE = {
  sorts: STAFF_SORTS,
  defaultSort: () => ({ sort: 'name' as const, order: 'asc' as const }),
  filters: ['role', 'status'] as const,
};

export function UsersPage() {
  const tz = useRequiredSession().organization.timezone;
  const canManage = useCan('users.manage');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState<OrgUserView | null>(null);
  const { state, update, activeFilterCount } = useTableState<StaffSort>(TABLE);
  const [text, setText] = useSearchInput(state.q, (q) =>
    update({ q }, { resetPage: true, replace: true }),
  );

  const params = {
    q: state.q.trim(),
    role: state.filters.role,
    status: state.filters.status,
    sort: state.sort,
    order: state.order,
    page: state.page,
    pageSize: state.pageSize,
  };
  const query = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => api.get<PageOf<OrgUserView>>('/admin/users', params),
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  useEffect(() => {
    if (data && !query.isPlaceholderData && state.page > data.totalPages)
      update({ page: data.totalPages }, { replace: true });
  }, [data, query.isPlaceholderData, state.page, update]);

  const columns: Column<OrgUserView>[] = [
    {
      id: 'name',
      header: 'Name',
      sortKey: 'name',
      mobile: 'title',
      cell: (u) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-950">{u.fullName}</p>
          <p className="truncate text-xs text-ink-500">{u.email}</p>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      sortKey: 'role',
      mobile: 'meta',
      cell: (u) => <span className="text-ink-800">{ROLE_LABELS[u.role]}</span>,
    },
    {
      id: 'branches',
      header: 'Branches',
      showFrom: 'lg',
      mobile: 'hidden',
      cell: (u) => <span className="text-ink-700">{u.branches.map((b) => b.name).join(', ')}</span>,
    },
    {
      id: 'last',
      header: 'Last sign-in',
      sortKey: 'lastLogin',
      firstDirection: 'desc',
      showFrom: 'md',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (u) => (
        <span className="data text-ink-700">
          {u.lastLoginAt ? formatDateTime(u.lastLoginAt, tz) : 'Never'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      sortKey: 'status',
      mobile: 'meta',
      cell: (u) =>
        u.status === 'ACTIVE' ? (
          <span className="text-ink-700">Active</span>
        ) : (
          <StatusIndicator tone="warning">Disabled</StatusIndicator>
        ),
    },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Staff"
        description={
          data
            ? `${data.total} ${data.total === 1 ? 'person' : 'people'} ${activeFilterCount || state.q ? 'match' : 'can sign in to this organisation'}`
            : undefined
        }
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              Invite staff member
            </Button>
          )
        }
      />
      <DataTable
        caption="Staff"
        columns={columns}
        rows={data?.items}
        rowKey={(u) => u.membershipId}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'Staff could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        sort={{ key: state.sort, direction: state.order }}
        onSortChange={(s) =>
          update({ sort: s.key as StaffSort, order: s.direction }, { resetPage: true })
        }
        onRowClick={canManage ? (u) => setEditing(u) : undefined}
        rowActions={
          canManage
            ? (u) => (
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Edit ${u.fullName}`}
                  onClick={() => setEditing(u)}
                >
                  Edit
                </Button>
              )
            : undefined
        }
        toolbar={
          <TableToolbar>
            <SearchField
              value={text}
              onValueChange={setText}
              label="Search staff"
              placeholder="Name or email"
              className="min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-auto"
            />
            <FilterBar
              activeCount={activeFilterCount}
              onClear={() => update({ filters: { role: '', status: '' } }, { resetPage: true })}
            >
              <FilterSelect
                label="Role"
                allLabel="All roles"
                value={state.filters.role ?? ''}
                onChange={(role) => update({ filters: { role } }, { resetPage: true })}
                options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
              />
              <FilterSelect
                label="Status"
                allLabel="Any status"
                value={state.filters.status ?? ''}
                onChange={(status) => update({ filters: { status } }, { resetPage: true })}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'DISABLED', label: 'Disabled' },
                ]}
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title={state.q || activeFilterCount ? 'No staff match' : 'No staff yet'}
            description={
              state.q || activeFilterCount ? 'Change or clear the search and filters.' : undefined
            }
            action={
              activeFilterCount || state.q ? (
                <Button
                  onClick={() => {
                    setText('');
                    update({ q: '', filters: { role: '', status: '' } }, { resetPage: true });
                  }}
                >
                  Clear search and filters
                </Button>
              ) : undefined
            }
          />
        }
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                itemLabel: 'people',
                onPageChange: (page) => update({ page }),
                onPageSizeChange: (pageSize) => update({ pageSize }, { resetPage: true }),
              }
            : undefined
        }
      />
      {canManage && <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} />}
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </Page>
  );
}
