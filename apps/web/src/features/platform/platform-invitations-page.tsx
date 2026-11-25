import { Page, PageHeader } from '../../components/page';
import { useCanPlatform } from '../../lib/session';
import { InvitationsTable } from '../onboarding/invitations-table';
import { BROWSER_TZ } from './hospitals-page';

export function PlatformInvitationsPage() {
  const canInvite = useCanPlatform('platform.invitations.manage');
  return (
    <Page>
      <PageHeader
        eyebrow="Platform"
        title="Invitations"
        description="Every invitation across all hospitals. Resend a link or revoke one that is no longer wanted."
      />
      <InvitationsTable scope="platform" canManage={canInvite} timezone={BROWSER_TZ} showHospital />
    </Page>
  );
}
