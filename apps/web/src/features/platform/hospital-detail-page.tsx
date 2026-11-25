import type { OrganizationDetail } from '@lumen/contracts';
import {
  Alert,
  Button,
  ConfirmDialog,
  DefinitionList,
  ErrorState,
  Skeleton,
  StatusIndicator,
  toast,
} from '@lumen/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Page, PageHeader } from '../../components/page';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { useCanPlatform } from '../../lib/session';
import { InvitationsTable } from '../onboarding/invitations-table';
import { BROWSER_TZ } from './hospitals-page';

export function HospitalDetailPage() {
  const { organizationId = '' } = useParams();
  const client = useQueryClient();
  const canManage = useCanPlatform('platform.organizations.manage');
  const canInvite = useCanPlatform('platform.invitations.manage');
  const [confirming, setConfirming] = useState(false);
  const query = useQuery({
    queryKey: ['platform', 'organization', organizationId],
    queryFn: () => api.get<OrganizationDetail>(`/platform/organizations/${organizationId}`),
  });
  const org = query.data;

  const setStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'SUSPENDED') =>
      api.patch<OrganizationDetail>(`/platform/organizations/${organizationId}/status`, { status }),
    onSuccess: async (next) => {
      await client.invalidateQueries({ queryKey: ['platform'] });
      toast.success(next.status === 'SUSPENDED' ? 'Hospital suspended' : 'Hospital reactivated', {
        description:
          next.status === 'SUSPENDED'
            ? 'Every staff session has ended and nobody there can sign in.'
            : 'Staff can sign in again.',
      });
      setConfirming(false);
    },
    onError: (error) =>
      toast.error('Could not change the status', { description: errorMessage(error) }),
  });

  if (query.isError)
    return (
      <Page>
        <ErrorState
          title="This hospital could not be loaded"
          onRetry={() => void query.refetch()}
        />
      </Page>
    );
  if (!org)
    return (
      <Page>
        <Skeleton className="h-8 w-64" />
      </Page>
    );

  const suspended = org.status === 'SUSPENDED';
  return (
    <Page>
      <PageHeader
        eyebrow="Hospital"
        title={org.name}
        crumbs={[{ label: 'Hospitals', to: '/platform' }, { label: org.name }]}
        description={
          org.onboarding === 'ACTIVE'
            ? 'An administrator has joined and can invite staff.'
            : 'Waiting for the first administrator to accept their invitation.'
        }
        actions={
          canManage && (
            <Button
              variant={suspended ? 'primary' : 'secondary'}
              onClick={() => (suspended ? setStatus.mutate('ACTIVE') : setConfirming(true))}
              loading={setStatus.isPending && !confirming}
            >
              {suspended ? 'Reactivate hospital' : 'Suspend hospital'}
            </Button>
          )
        }
      />
      {suspended && (
        <Alert tone="danger" title="This hospital is suspended" className="mb-6">
          Its staff cannot sign in and no invitations can be accepted. Its data is kept.
        </Alert>
      )}

      <section className="grid grid-cols-1 gap-x-12 gap-y-4 border-t border-rule py-7 lg:grid-cols-[200px_minmax(0,1fr)]">
        <h2 className="text-base font-semibold text-ink-900">Details</h2>
        <DefinitionList
          className="max-w-xl"
          items={[
            {
              label: 'Status',
              value: suspended ? (
                <StatusIndicator tone="danger">Suspended</StatusIndicator>
              ) : (
                'Active'
              ),
            },
            { label: 'Identifier', value: org.slug },
            { label: 'Time zone', value: org.timezone.replace('_', ' ') },
            { label: 'Registered', value: formatDateTime(org.createdAt, BROWSER_TZ) },
            { label: 'Active staff', value: String(org.activeStaffCount) },
            {
              label: 'Branches',
              value: org.branches
                .map((b) => `${b.name} (${b.code})${b.active ? '' : ' — inactive'}`)
                .join(', '),
            },
            {
              label: 'Administrators',
              value: org.administrators.length
                ? org.administrators.map((a) => `${a.fullName} <${a.email}>`).join(', ')
                : 'None yet',
            },
          ]}
        />
      </section>

      <section className="border-t border-rule py-7">
        <h2 className="mb-3 text-base font-semibold text-ink-900">Invitations</h2>
        <InvitationsTable
          scope="platform"
          organizationId={org.id}
          canManage={canInvite}
          timezone={BROWSER_TZ}
        />
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Suspend ${org.name}?`}
        description="Every staff member is signed out immediately and cannot sign in until you reactivate the hospital. Patient data is kept."
        confirmLabel="Suspend hospital"
        tone="destructive"
        loading={setStatus.isPending}
        onConfirm={() => setStatus.mutate('SUSPENDED')}
      />
    </Page>
  );
}
