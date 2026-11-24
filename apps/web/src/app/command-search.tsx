import type { Page, PatientSummary } from '@lumen/contracts';
import { Dialog, DialogPrimitive as RadixDialog, Spinner } from '@lumen/ui';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { ageLabel } from '../lib/format';
import { useDebounced } from '../lib/use-debounced';

/** Global patient finder (Ctrl/⌘ K). Arrow keys move, Enter opens, Esc closes. */
export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-ink-950/40 data-[state=open]:animate-fade-in" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[14vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-rule bg-surface shadow-pop data-[state=open]:animate-pop-in"
        >
          <RadixDialog.Title className="sr-only">Find a patient</RadixDialog.Title>
          {/* Mounted only while open, so the query and highlight reset every time. */}
          <SearchBody onDone={() => onOpenChange(false)} />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </Dialog>
  );
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const query = useDebounced(text.trim(), 200);
  const navigate = useNavigate();
  const listRef = useRef<HTMLUListElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['patients', 'quick-search', query],
    queryFn: () => api.get<Page<PatientSummary>>('/patients', { q: query, pageSize: 8 }),
    enabled: query.length >= 2,
    placeholderData: (previous) => previous,
  });
  const results = query.length >= 2 ? (data?.items ?? []) : [];
  const current = Math.min(active, Math.max(results.length - 1, 0));

  const move = (next: number) => {
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
  };
  const choose = (patient: PatientSummary) => {
    onDone();
    navigate(`/patients/${patient.id}`);
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-rule px-4">
        <Search className="size-4 text-ink-400" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="command-results"
          aria-activedescendant={
            results[current] ? `command-result-${results[current].id}` : undefined
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              move(Math.min(current + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              move(Math.max(current - 1, 0));
            } else if (e.key === 'Enter' && results[current]) {
              e.preventDefault();
              choose(results[current]);
            }
          }}
          placeholder="Search by name, MRN or phone number"
          className="h-12 flex-1 bg-transparent text-base text-ink-900 outline-none placeholder:text-ink-400"
          aria-label="Search patients"
        />
        {isFetching && <Spinner />}
      </div>
      <ul
        id="command-results"
        role="listbox"
        ref={listRef}
        className="max-h-80 overflow-y-auto p-1.5"
      >
        {results.map((p, index) => (
          <li
            key={p.id}
            id={`command-result-${p.id}`}
            role="option"
            aria-selected={index === current}
            onMouseMove={() => setActive(index)}
            onClick={() => choose(p)}
            className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 ${index === current ? 'bg-lime-100' : ''}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-medium text-ink-900">
                {p.displayName}
              </span>
              <span className="block text-xs text-ink-500">
                <span className="data">{p.mrn}</span> · {ageLabel(p.dateOfBirth)} ·{' '}
                <span className="data">{p.phone}</span>
              </span>
            </span>
          </li>
        ))}
        {query.length >= 2 && !isFetching && results.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-ink-500">
            No patients match “{query}”.
          </li>
        )}
        {query.length < 2 && (
          <li className="px-3 py-8 text-center text-sm text-ink-500">
            Type at least two characters.
          </li>
        )}
      </ul>
    </>
  );
}
