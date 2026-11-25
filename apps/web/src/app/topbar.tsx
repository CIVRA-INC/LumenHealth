import { Breadcrumbs, type Crumb } from '@lumen/ui';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';

const SlotContext = createContext<{
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
}>({
  slot: null,
  setSlot: () => undefined,
});

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <SlotContext.Provider value={{ slot, setSlot }}>{children}</SlotContext.Provider>;
}

/** The place in the top bar where the current page announces where it sits. */
export function TopbarSlot() {
  const { setSlot } = useContext(SlotContext);
  return <div ref={setSlot} className="min-w-0 flex-1 overflow-hidden" />;
}

/**
 * Pages declare their breadcrumb trail; it is drawn in the top bar, so the page itself stays
 * free of navigation chrome. The last item is the current page. A top-level page (a single item)
 * already says where it is in its own title, so the trail appears only when there is somewhere to go back to.
 */
export function TopbarCrumbs({ crumbs }: { crumbs: { label: string; to?: string }[] }) {
  const { slot } = useContext(SlotContext);
  if (!slot || crumbs.length < 2) return null;
  const items: Crumb[] = crumbs.map((c) => ({
    label: c.label,
    node: c.to ? (
      <Link to={c.to} className="rounded-xs hover:text-ink-900 hover:underline">
        {c.label}
      </Link>
    ) : undefined,
  }));
  return createPortal(<Breadcrumbs items={items} />, slot);
}
