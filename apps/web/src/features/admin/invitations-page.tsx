import { Button } from '@lumen/ui';
import { useState } from 'react';
import { Page, PageHeader } from '../../components/page';
import { useCan, useRequiredSession } from '../../lib/session';
import { InvitationsTable } from '../onboarding/invitations-table';
import { InviteStaffDialog } from './invite-staff-dialog';

export function InvitationsPage() {
  const tz = useRequiredSession().organization.timezone;
  const canManage = useCan('users.manage');
  const [open, setOpen] = useState(false);
  return (
    <Page>
      <PageHeader
        eyebrow="Administration"
        title="Invitations"
        description="Pending, accepted, expired and revoked invitations for this hospital."
        actions={
          canManage && (
            <Button variant="primary" onClick={() => setOpen(true)}>
              Invite staff member
            </Button>
          )
        }
      />
      <InvitationsTable scope="admin" canManage={canManage} timezone={tz} />
      {canManage && <InviteStaffDialog open={open} onOpenChange={setOpen} />}
    </Page>
  );
}
