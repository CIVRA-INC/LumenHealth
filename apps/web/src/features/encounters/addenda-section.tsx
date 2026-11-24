import type { EncounterDetail } from '@lumen/contracts';
import { Button, FormField, TextArea } from '@lumen/ui';
import { useState } from 'react';
import { api } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { base, useEncounterAction } from './hooks';
import { EncounterSection } from './section';

/** Corrections to a signed record are added, never overwritten. */
export function AddendaSection({ encounter }: { encounter: EncounterDetail }) {
  const tz = useRequiredSession().organization.timezone;
  const canAdd = useCan('encounters.document');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const add = useEncounterAction(
    encounter.id,
    (t: string) => api.post<EncounterDetail>(`${base(encounter.id)}/addenda`, { text: t }),
    {
      success: 'Addendum added to the record',
    },
  );

  return (
    <EncounterSection
      id="addenda"
      title="Addenda"
      meta="Corrections after signing"
      action={
        canAdd &&
        !open && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Add addendum
          </Button>
        )
      }
    >
      {encounter.addenda.length === 0 && !open && (
        <p className="text-base text-ink-500">None. The signed record stands as written.</p>
      )}
      {encounter.addenda.length > 0 && (
        <ul className="divide-y divide-rule-soft border-y border-rule-soft">
          {encounter.addenda.map((a) => (
            <li key={a.id} className="py-3">
              <p className="max-w-[40rem] text-prose whitespace-pre-wrap text-ink-950">{a.text}</p>
              <p className="mt-1 text-xs text-ink-500">
                {a.author.fullName} ·{' '}
                <span className="data">{formatDateTime(a.createdAt, tz)}</span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="mt-4 max-w-[40rem] space-y-3">
          <FormField
            label="Addendum"
            description="Becomes a permanent part of the record and cannot be edited."
          >
            <TextArea
              variant="document"
              autoFocus
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={5000}
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button onClick={() => (setOpen(false), setText(''))}>Cancel</Button>
            <Button
              variant="primary"
              disabled={text.trim().length < 3}
              loading={add.isPending}
              onClick={() => add.mutate(text, { onSuccess: () => (setOpen(false), setText('')) })}
            >
              Add to record
            </Button>
          </div>
        </div>
      )}
    </EncounterSection>
  );
}
