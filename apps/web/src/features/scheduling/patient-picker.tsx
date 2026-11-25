import type { Page, PatientSummary } from '@lumen/contracts';
import { Combobox, IconButton } from '@lumen/ui';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { ageLabel } from '../../lib/format';
import { useDebounced } from '../../lib/use-debounced';

/** Choose an existing patient by searching the registry. The chosen patient is always shown with name and MRN. */
export function PatientPicker({
  value,
  onChange,
  invalid,
}: {
  value: PatientSummary | null;
  onChange: (patient: PatientSummary | null) => void;
  invalid?: boolean;
}) {
  const [text, setText] = useState('');
  const q = useDebounced(text.trim(), 200);
  const { data, isFetching } = useQuery({
    queryKey: ['patients', 'picker', q],
    queryFn: () => api.get<Page<PatientSummary>>('/patients', { q, pageSize: 6, sort: 'name' }),
    enabled: q.length >= 2 && !value,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-rule-strong bg-sunken px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-ink-950">{value.displayName}</p>
          <p className="text-xs text-ink-500">
            <span className="data">{value.mrn}</span> · {ageLabel(value.dateOfBirth)} ·{' '}
            <span className="data">{value.phone}</span>
          </p>
        </div>
        <IconButton label="Choose a different patient" size="sm" onClick={() => onChange(null)}>
          <X />
        </IconButton>
      </div>
    );
  }

  return (
    <Combobox
      label="Search for a patient"
      placeholder="Name, MRN or phone number"
      query={text}
      onQueryChange={setText}
      options={q.length >= 2 ? (data?.items ?? []) : []}
      loading={isFetching}
      getKey={(p) => p.id}
      invalid={invalid}
      emptyMessage={(query) => `No patients match “${query}”.`}
      onSelect={(p) => {
        onChange(p);
        setText('');
      }}
      renderOption={(p) => (
        <span className="block">
          <span className="block text-base font-medium text-ink-950">{p.displayName}</span>
          <span className="block text-xs text-ink-500">
            <span className="data">{p.mrn}</span> · {ageLabel(p.dateOfBirth)} ·{' '}
            <span className="data">{p.phone}</span>
          </span>
        </span>
      )}
    />
  );
}
