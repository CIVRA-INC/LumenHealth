import {
  ROLE_LABELS,
  type InvitationState,
  type InvitationView,
  type Page as PageOf,
} from '@lumen/contracts';
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FilterBar,
  FilterSelect,
  StatusIndicator,
  TableToolbar,
  toast,
  type Column,
  type Tone,
} from '@lumen/ui';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';

const STATE_TONE: Record<InvitationState, Tone> = {
  PENDING: 'info',
  ACCEPTED: 'success',
  EXPIRED: 'warning',
  REVOKED: 'neutral',
};
const STATE_LABEL: Record<InvitationState, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

export const invitationKeys = ['invitations'] as const;

/** Tells the operator the truth about delivery: created is not the same as emailed. */
export function announceInvitation(invitation: InvitationView, verb: 'created' | 'resent') {
  if (invitation.delivery === 'SENT') {
    toast.success(`Invitation ${verb}`, {
      description: `An email was sent to ${invitation.email}.`,
    });
  } else {
    toast.error(`Invitation ${verb}, but the email was not sent`, {
      description: `${invitation.deliveryError ?? 'Delivery failed.'} Fix the email settings, then resend.`,
    });
  }
}

/**
 * Invitations for one scope. `platform` lists across hospitals (optionally one); `admin` lists the signed-in
 * hospital's. The server decides the scope; this component never sends an organisation id for `admin`.
 */
export function InvitationsTable({
  scope,
  organizationId,
  canManage,
  timezone,
  showHospital,
}: {
  scope: 'platform' | 'admin';
  organizationId?: string;
  canManage: boolean;
  timezone: string;
  showHospital?: boolean;
}) {
  const client = useQueryClient();
  const [state, setState] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [revoking, setRevoking] = useState<InvitationView | null>(null);
  const base = scope === 'platform' ? '/platform/invitations' : '/admin/invitations';

  const params = {
    state,
    page,
    pageSize,
    organizationId: scope === 'platform' ? organizationId : undefined,
  };
  const query = useQuery({
    queryKey: [...invitationKeys, scope, params],
    queryFn: () => api.get<PageOf<InvitationView>>(base, params),
    placeholderData: keepPreviousData,
  });
  const refresh = () =>
    client
      .invalidateQueries({ queryKey: [scope === 'platform' ? 'platform' : 'admin'] })
      .then(() => client.invalidateQueries({ queryKey: invitationKeys }));

  const resend = useMutation({
    mutationFn: (inv: InvitationView) => api.post<InvitationView>(`${base}/${inv.id}/resend`),
    onSuccess: async (inv) => {
      announceInvitation(inv, 'resent');
      await refresh();
    },
    onError: (error) => toast.error('Could not resend', { description: errorMessage(error) }),
  });
  const revoke = useMutation({
    mutationFn: (inv: InvitationView) => api.post<InvitationView>(`${base}/${inv.id}/revoke`),
    onSuccess: async () => {
      toast.success('Invitation revoked', { description: 'The link no longer works.' });
      setRevoking(null);
      await refresh();
    },
    onError: (error) => toast.error('Could not revoke', { description: errorMessage(error) }),
  });

  const columns: Column<InvitationView>[] = [
    {
      id: 'who',
      header: 'Invitee',
      mobile: 'title',
      cell: (i) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink-950">{i.fullName}</p>
          <p className="truncate text-xs text-ink-500">{i.email}</p>
        </div>
      ),
    },
    ...(showHospital
      ? [
          {
            id: 'hospital',
            header: 'Hospital',
            showFrom: 'md',
            mobile: 'meta',
            cell: (i: InvitationView) => <span className="text-ink-800">{i.organizationName}</span>,
          } as Column<InvitationView>,
        ]
      : []),
    {
      id: 'role',
      header: 'Role',
      mobile: 'meta',
      cell: (i) => (
        <div className="text-ink-800">
          {ROLE_LABELS[i.role]}
          <p className="text-xs text-ink-500">{i.branches.map((b) => b.name).join(', ')}</p>
        </div>
      ),
    },
    {
      id: 'state',
      header: 'Status',
      mobile: 'meta',
      cell: (i) => (
        <StatusIndicator tone={STATE_TONE[i.state]}>{STATE_LABEL[i.state]}</StatusIndicator>
      ),
    },
    {
      id: 'delivery',
      header: 'Email',
      showFrom: 'lg',
      mobile: 'hidden',
      cell: (i) =>
        i.delivery === 'SENT' ? (
          <span className="text-ink-700">Sent{i.sendCount > 1 ? ` (${i.sendCount}×)` : ''}</span>
        ) : i.delivery === 'FAILED' ? (
          <span title={i.deliveryError ?? undefined}>
            <StatusIndicator tone="danger">Not sent</StatusIndicator>
          </span>
        ) : (
          <StatusIndicator tone="neutral" pending>
            Sending
          </StatusIndicator>
        ),
    },
    {
      id: 'expires',
      header: 'Expires',
      showFrom: 'md',
      mobile: 'meta',
      className: 'whitespace-nowrap',
      cell: (i) => (
        <span className="data text-ink-700">
          {i.state === 'ACCEPTED' && i.acceptedAt
            ? `Accepted ${formatDateTime(i.acceptedAt, timezone)}`
            : formatDateTime(i.expiresAt, timezone)}
        </span>
      ),
    },
  ];

  const data = query.data;
  return (
    <>
      <DataTable
        caption="Invitations"
        columns={columns}
        rows={data?.items}
        rowKey={(i) => i.id}
        loading={query.isLoading}
        refreshing={query.isPlaceholderData}
        error={
          query.isError
            ? {
                title: 'Invitations could not be loaded',
                message: 'Check your connection and try again.',
                onRetry: () => void query.refetch(),
              }
            : null
        }
        rowActions={
          canManage
            ? (i) =>
                i.state === 'ACCEPTED' || i.state === 'REVOKED' ? null : (
                  <div className="flex gap-1">
                    <Button
                      variant="quiet"
                      size="sm"
                      aria-label={`Resend invitation to ${i.email}`}
                      loading={resend.isPending && resend.variables?.id === i.id}
                      onClick={() => resend.mutate(i)}
                    >
                      Resend
                    </Button>
                    <Button
                      variant="quiet"
                      size="sm"
                      aria-label={`Revoke invitation to ${i.email}`}
                      onClick={() => setRevoking(i)}
                    >
                      Revoke
                    </Button>
                  </div>
                )
            : undefined
        }
        toolbar={
          <TableToolbar>
            <FilterBar
              activeCount={state ? 1 : 0}
              onClear={() => {
                setState('');
                setPage(1);
              }}
            >
              <FilterSelect
                label="Status"
                allLabel="Any status"
                value={state}
                onChange={(v) => {
                  setState(v);
                  setPage(1);
                }}
                options={(Object.keys(STATE_LABEL) as InvitationState[]).map((s) => ({
                  value: s,
                  label: STATE_LABEL[s],
                }))}
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title={state ? 'No invitations with that status' : 'No invitations yet'}
            description={state ? undefined : 'Invitations you send will appear here.'}
          />
        }
        pagination={
          data
            ? {
                page: data.page,
                pageSize: data.pageSize,
                total: data.total,
                totalPages: data.totalPages,
                itemLabel: 'invitations',
                onPageChange: setPage,
                onPageSizeChange: (n) => {
                  setPageSize(n);
                  setPage(1);
                },
              }
            : undefined
        }
      />
      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Revoke this invitation?"
        description={
          revoking
            ? `${revoking.fullName} (${revoking.email}) will no longer be able to use the link. You can invite them again later.`
            : ''
        }
        confirmLabel="Revoke invitation"
        tone="destructive"
        loading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking)}
      />
    </>
  );
}
