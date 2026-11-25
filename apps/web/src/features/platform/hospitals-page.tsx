import { zodResolver } from '@hookform/resolvers/zod';
import {
  registerOrganizationSchema,
  type OrganizationDetail,
  type OrganizationSummary,
  type Page as PageOf,
  type RegisterOrganizationInput,
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
  StatusIndicator,
  TableToolbar,
  TextField,
  toast,
  type Column,
} from '@lumen/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import type { z } from 'zod';
import { Page, PageHeader } from '../../components/page';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { useCanPlatform } from '../../lib/session';
import { useDebounced } from '../../lib/use-debounced';
import { announceInvitation } from '../onboarding/invitations-table';

export const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Form values: the contract's output type has a defaulted time zone, the form always supplies one. */
type FormValues = z.input<typeof registerOrganizationSchema>;

function RegisterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<FormValues, unknown, RegisterOrganizationInput>({
    resolver: zodResolver(registerOrganizationSchema),
    defaultValues: {
      name: '',
      timezone: 'Africa/Lagos',
      branch: { name: 'Main campus', code: 'MAIN' },
      admin: { fullName: '', email: '' },
    },
  });
  const errors = form.formState.errors;
  const register = useMutation({
    mutationFn: (v: RegisterOrganizationInput) =>
      api.post<OrganizationDetail>('/platform/organizations', v),
    onSuccess: async (org) => {
      await client.invalidateQueries({ queryKey: ['platform'] });
      toast.success(`${org.name} registered`);
      if (org.invitations[0]) announceInvitation(org.invitations[0], 'created');
      form.reset();
      onOpenChange(false);
      navigate(`/platform/hospitals/${org.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError)
        for (const [path, message] of Object.entries(error.fieldErrors))
          form.setError(path as 'name', { message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Register a hospital"
        description="Creates the hospital and its first branch, then emails an invitation to its first administrator."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={register.isPending}
              onClick={form.handleSubmit((v) => register.mutate(v))}
            >
              Register and invite
            </Button>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {register.isError &&
            !(register.error instanceof ApiError && register.error.status === 400) && (
              <Alert tone="danger">{errorMessage(register.error)}</Alert>
            )}
          <FormField label="Hospital name" required error={errors.name?.message}>
            <TextField autoComplete="off" {...form.register('name')} />
          </FormField>
          <FormField
            label="Time zone"
            required
            description="IANA name, e.g. Africa/Lagos"
            error={errors.timezone?.message}
          >
            <TextField autoComplete="off" {...form.register('timezone')} />
          </FormField>
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <FormField label="First branch" required error={errors.branch?.name?.message}>
              <TextField autoComplete="off" {...form.register('branch.name')} />
            </FormField>
            <FormField label="Code" required error={errors.branch?.code?.message}>
              <TextField autoComplete="off" {...form.register('branch.code')} />
            </FormField>
          </div>
          <fieldset className="space-y-4 border-t border-rule pt-4">
            <legend className="text-sm font-semibold text-ink-900">First administrator</legend>
            <FormField label="Full name" required error={errors.admin?.fullName?.message}>
              <TextField autoComplete="off" {...form.register('admin.fullName')} />
            </FormField>
            <FormField label="Email" required error={errors.admin?.email?.message}>
              <TextField type="email" autoComplete="off" {...form.register('admin.email')} />
            </FormField>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function HospitalsPage() {
  const canManage = useCanPlatform('platform.organizations.manage');
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const q = useDebounced(text.trim(), 250);
  const params = { q, status, page, pageSize };
  const query = useQuery({
    queryKey: ['platform', 'organizations', params],
    queryFn: () => api.get<PageOf<OrganizationSummary>>('/platform/organizations', params),
    placeholderData: keepPreviousData,
  });
  const data = query.data;

  const columns: Column<OrganizationSummary>[] = [
    {
      id: 'name',
      header: 'Hospital',
      mobile: 'title',
      cell: (o) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-950">{o.name}</p>
          <p className="truncate text-xs text-ink-500">{o.slug}</p>
        </div>
      ),
    },
    {
      id: 'onboarding',
      header: 'Onboarding',
      mobile: 'meta',
      cell: (o) =>
        o.onboarding === 'ACTIVE' ? (
          <StatusIndicator tone="success">Administrator joined</StatusIndicator>
        ) : (
          <StatusIndicator tone="warning" pending>
            Awaiting administrator
          </StatusIndicator>
        ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'meta',
      cell: (o) =>
        o.status === 'ACTIVE' ? (
          <span className="text-ink-700">Active</span>
        ) : (
          <StatusIndicator tone="danger">Suspended</StatusIndicator>
        ),
    },
    {
      id: 'branches',
      header: 'Branches',
      showFrom: 'md',
      mobile: 'hidden',
      cell: (o) => <span className="data text-ink-700">{o.branchCount}</span>,
    },
    {
      id: 'staff',
      header: 'Active staff',
      showFrom: 'md',
      mobile: 'hidden',
      cell: (o) => <span className="data text-ink-700">{o.activeStaffCount}</span>,
    },
    {
      id: 'created',
      header: 'Registered',
      showFrom: 'lg',
      mobile: 'hidden',
      className: 'whitespace-nowrap',
      cell: (o) => (
        <span className="data text-ink-700">{formatDateTime(o.createdAt, BROWSER_TZ)}</span>
      ),
    },
  ];

  return (
    <Page>
      <PageHeader
        eyebrow="Platform"
        title="Hospitals"
        description={data ? `${data.total} registered on LumenHealth` : undefined}
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Register a hospital
            </Button>
          )
        }
      />
      <DataTable
        caption="Hospitals"
        columns={columns}
        rows={data?.items}
        rowKey={(o) => o.id}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'Hospitals could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        onRowClick={(o) => navigate(`/platform/hospitals/${o.id}`)}
        rowActions={(o) => (
          <Button
            variant="quiet"
            size="sm"
            aria-label={`Open ${o.name}`}
            onClick={() => navigate(`/platform/hospitals/${o.id}`)}
          >
            Open
          </Button>
        )}
        toolbar={
          <TableToolbar>
            <SearchField
              value={text}
              onValueChange={(v) => {
                setText(v);
                setPage(1);
              }}
              label="Search hospitals"
              placeholder="Hospital name"
              className="min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-auto"
            />
            <FilterBar
              activeCount={status ? 1 : 0}
              onClear={() => {
                setStatus('');
                setPage(1);
              }}
            >
              <FilterSelect
                label="Status"
                allLabel="Any status"
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                options={[
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title={q || status ? 'No hospitals match' : 'No hospitals registered yet'}
            description={
              q || status
                ? 'Change or clear the search and filters.'
                : 'Register the first hospital to get started.'
            }
            action={
              !q && !status && canManage ? (
                <Button variant="primary" onClick={() => setOpen(true)}>
                  Register a hospital
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
                itemLabel: 'hospitals',
                onPageChange: setPage,
                onPageSizeChange: (n) => {
                  setPageSize(n);
                  setPage(1);
                },
              }
            : undefined
        }
      />
      {canManage && <RegisterDialog open={open} onOpenChange={setOpen} />}
    </Page>
  );
}
