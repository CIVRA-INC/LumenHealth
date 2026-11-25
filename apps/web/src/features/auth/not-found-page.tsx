import { buttonVariants, EmptyState } from '@lumen/ui';
import { Link } from 'react-router';
import { Page } from '../../components/page';

export function NotFoundPage() {
  return (
    <Page width="document">
      <EmptyState
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved."
        action={
          <Link to="/" className={buttonVariants({ variant: 'primary' })}>
            Back to dashboard
          </Link>
        }
      />
    </Page>
  );
}
