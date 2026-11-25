import { ChevronRight } from 'lucide-react';
import { Tabs as RadixTabs } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof RadixTabs.List>) {
  return <RadixTabs.List className={cn('flex gap-5 border-b border-rule', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 border-transparent text-base font-medium text-ink-500',
        'transition-colors hover:text-ink-900 data-[state=active]:border-green-700 data-[state=active]:text-ink-950',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn('pt-5 focus-visible:outline-offset-4', className)}
      {...props}
    />
  );
}

export interface Crumb {
  label: string;
  /** Rendered by the app so the router stays out of the design system. */
  node?: ReactNode;
}

/** The last item is the current page and truncates; earlier items drop away on small screens. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-ink-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn(
                'flex items-center gap-1',
                last ? 'min-w-0' : 'hidden shrink-0 sm:flex',
              )}
            >
              {last ? (
                <span
                  aria-current="page"
                  title={item.label}
                  className="truncate font-medium text-ink-900"
                >
                  {item.label}
                </span>
              ) : (
                (item.node ?? item.label)
              )}
              {!last && <ChevronRight aria-hidden className="size-3.5 text-ink-300" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
