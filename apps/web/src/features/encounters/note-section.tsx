import type { EncounterDetail, SaveClinicalNoteInput } from '@lumen/contracts';
import { FormField, TextArea } from '@lumen/ui';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState, type MutableRefObject } from 'react';
import { api } from '../../lib/api';
import { formatTime } from '../../lib/format';
import { useRequiredSession } from '../../lib/session';
import { base, useEncounterAction } from './hooks';
import { EncounterSection } from './section';

const FIELDS = [
  {
    key: 'chiefComplaint',
    label: 'Chief complaint',
    hint: 'Required to sign',
    rows: 1,
    placeholder: 'The reason for the visit',
  },
  {
    key: 'history',
    label: 'History of present illness',
    rows: 3,
    placeholder: 'Onset, course and associated symptoms',
  },
  { key: 'examination', label: 'Examination', rows: 3, placeholder: 'Findings' },
  { key: 'assessment', label: 'Assessment', rows: 2, placeholder: 'Clinical impression' },
  { key: 'plan', label: 'Plan', rows: 2, placeholder: 'Treatment and follow-up' },
] as const;
type Key = (typeof FIELDS)[number]['key'];
type Draft = Record<Key, string>;

const fromServer = (e: EncounterDetail): Draft => ({
  chiefComplaint: e.note?.chiefComplaint ?? '',
  history: e.note?.history ?? '',
  examination: e.note?.examination ?? '',
  assessment: e.note?.assessment ?? '',
  plan: e.note?.plan ?? '',
});

/**
 * The consultation note. While the encounter is a draft it saves automatically a moment after
 * typing stops; once signed it is read-only. `flushRef` lets the page save immediately before signing.
 */
export function NoteSection({
  encounter,
  editable,
  flushRef,
}: {
  encounter: EncounterDetail;
  editable: boolean;
  flushRef: MutableRefObject<(() => Promise<void>) | null>;
}) {
  const tz = useRequiredSession().organization.timezone;
  const [draft, setDraft] = useState<Draft>(() => fromServer(encounter));
  const [saved, setSaved] = useState<Draft>(() => fromServer(encounter));
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const save = useEncounterAction(
    encounter.id,
    (body: SaveClinicalNoteInput) => api.put<EncounterDetail>(`${base(encounter.id)}/note`, body),
    {
      silentError: true,
    },
  );

  const dirty = FIELDS.some((f) => draft[f.key] !== saved[f.key]);

  const flush = useCallback(async () => {
    const changed = FIELDS.filter((f) => draft[f.key] !== saved[f.key]);
    if (changed.length === 0) return;
    setState('saving');
    const body: SaveClinicalNoteInput = Object.fromEntries(
      changed.map((f) => [f.key, draft[f.key].trim() || null]),
    );
    try {
      await save.mutateAsync(body);
      setSaved((prev) => ({
        ...prev,
        ...Object.fromEntries(changed.map((f) => [f.key, draft[f.key]])),
      }));
      setState('saved');
    } catch (error) {
      setState('error');
      throw error;
    }
  }, [draft, saved, save]);

  useEffect(() => {
    flushRef.current = editable ? flush : null;
    return () => {
      flushRef.current = null;
    };
  }, [flush, editable, flushRef]);

  useEffect(() => {
    if (!editable || !dirty) return;
    const timer = setTimeout(() => void flush().catch(() => undefined), 1200);
    return () => clearTimeout(timer);
  }, [draft, editable, dirty, flush]);

  const status =
    state === 'saving' ? (
      <span className="flex items-center gap-1.5 text-sm text-ink-500">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving…
      </span>
    ) : state === 'error' ? (
      <span role="alert" className="text-sm font-medium text-danger-700">
        Not saved. Check your connection; your text is still here.
      </span>
    ) : dirty ? (
      <span className="text-sm text-ink-500">Unsaved changes</span>
    ) : encounter.note ? (
      <span className="text-sm text-ink-500">
        {editable ? 'Draft saved' : 'Saved'}{' '}
        <span className="data">{formatTime(encounter.note.updatedAt, tz)}</span>
      </span>
    ) : null;

  return (
    <EncounterSection id="note" title="Consultation note" action={status}>
      {/* A comfortable measure for reading and writing prose; the sheet itself stays wide. */}
      <div className="max-w-[40rem] space-y-6">
        {FIELDS.map((f) => {
          const value = draft[f.key];
          if (!editable) {
            return (
              <div key={f.key}>
                <h3 className="text-sm font-medium text-ink-600">{f.label}</h3>
                {value ? (
                  <p className="mt-1 text-prose whitespace-pre-wrap text-ink-950">{value}</p>
                ) : (
                  <p className="mt-1 text-prose text-ink-400">Not recorded</p>
                )}
              </div>
            );
          }
          return (
            <FormField
              key={f.key}
              label={f.label}
              description={'hint' in f && !value.trim() ? f.hint : undefined}
            >
              <TextArea
                variant="document"
                rows={f.rows}
                value={value}
                maxLength={10_000}
                placeholder={f.placeholder}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
              />
            </FormField>
          );
        })}
      </div>
    </EncounterSection>
  );
}
