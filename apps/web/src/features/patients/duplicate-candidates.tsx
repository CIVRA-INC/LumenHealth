import type { DuplicateCandidate } from '@lumen/contracts';
import { SEX_LABELS } from '@lumen/contracts';
import { Link } from 'react-router';
import { ageLabel, formatDateOnly } from '../../lib/format';

const REASONS: Record<DuplicateCandidate['reasons'][number], string> = {
  SAME_NAME_AND_DOB: 'Same name and date of birth',
  SAME_PHONE_AND_DOB: 'Same phone and date of birth',
  SAME_IDENTIFIER: 'Same ID number',
};

export function DuplicateCandidates({ candidates }: { candidates: DuplicateCandidate[] }) {
  return (
    <ul className="divide-y divide-rule-soft overflow-hidden rounded-md border border-rule bg-surface">
      {candidates.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-ink-950">
              {c.displayName}{' '}
              <span className="data ml-1 text-xs font-normal text-ink-500">{c.mrn}</span>
            </p>
            <p className="text-sm text-ink-600">
              {ageLabel(c.dateOfBirth)}, {SEX_LABELS[c.sex].toLowerCase()} · born{' '}
              <span className="data">{formatDateOnly(c.dateOfBirth)}</span>
            </p>
            <p className="text-xs font-medium text-warning-700">
              {c.reasons.map((r) => REASONS[r]).join(' · ')}
            </p>
          </div>
          <Link
            to={`/patients/${c.id}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-medium text-green-700 hover:underline"
          >
            Open record
          </Link>
        </li>
      ))}
    </ul>
  );
}
