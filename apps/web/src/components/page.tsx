import { PageHeader as UiPageHeader } from '@lumen/ui';
import type { ComponentProps, ReactNode } from 'react';
import { TopbarCrumbs } from '../app/topbar';

/**
 * Page title row. Breadcrumbs are drawn in the top bar; a page with a plain string title gets a
 * one-item trail automatically, so the top bar always says where you are.
 */
export function PageHeader({
  crumbs,
  title,
  ...rest
}: ComponentProps<typeof UiPageHeader> & { crumbs?: { label: string; to?: string }[] }) {
  const trail = crumbs ?? (typeof title === 'string' ? [{ label: title }] : undefined);
  return (
    <>
      {trail && <TopbarCrumbs crumbs={trail} />}
      <UiPageHeader title={title} {...rest} />
    </>
  );
}

/**
 * The page container. `fluid` uses the available width (tables, worklists); `document` suits reading and
 * writing (clinical records); `form` suits long forms. There is deliberately no one-size narrow column.
 */
export function Page({
  children,
  width = 'fluid',
}: {
  children: ReactNode;
  width?: 'fluid' | 'document' | 'form';
}) {
  const max = {
    fluid: 'mx-auto max-w-[1680px]',
    document: 'mx-auto max-w-[1240px]',
    form: 'mr-auto max-w-[1180px]',
  }[width];
  return <div className={`w-full ${max} px-4 py-6 sm:px-6 lg:px-10 lg:py-8`}>{children}</div>;
}
