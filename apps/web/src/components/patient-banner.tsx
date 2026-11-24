import { SEX_LABELS, type PatientSummary } from '@lumen/contracts';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ageLabel, formatDateOnly } from '../lib/format';

/**
 * How a patient appears in a list: name over MRN, always in that order. The MRN is monospaced so
 * identifiers are recognisable and comparable at a glance anywhere in the product.
 */
export function PatientCell({
  patient,
  to = `/patients/${patient.id}`,
  showMeta,
}: {
  patient: Pick<PatientSummary, 'id' | 'displayName' | 'mrn' | 'dateOfBirth' | 'sex'>;
  to?: string | null;
  showMeta?: boolean;
}) {
  const name = (
    <span title={patient.displayName} className="line-clamp-2 font-medium break-words text-ink-950">
      {patient.displayName}
    </span>
  );
  return (
    <div className="min-w-0">
      {to ? (
        <Link to={to} className="block hover:underline" onClick={(e) => e.stopPropagation()}>
          {name}
        </Link>
      ) : (
        <span className="block">{name}</span>
      )}
      <p className="data truncate text-xs text-ink-500">
        {patient.mrn}
        {showMeta && (
          <span className="font-sans">
            {' '}
            · {ageLabel(patient.dateOfBirth)}, {SEX_LABELS[patient.sex].toLowerCase()}
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * The patient's identity band: the one place a clinician confirms who they are working with. The name
 * is set in the display face, the MRN in a bordered mono label (like a wristband), then the facts used
 * to confirm identity. A graphite rule on the left marks "patient context" wherever it appears.
 */
export function PatientBanner({
  patient,
  trailing,
  compact,
  as: Heading = 'h2',
}: {
  patient: PatientSummary;
  trailing?: ReactNode;
  compact?: boolean;
  as?: 'h1' | 'h2';
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-l-[3px] border-green-800 pl-4">
      <div className="min-w-0">
        <Heading className={`display truncate text-ink-950 ${compact ? 'text-xl' : 'text-2xl'}`}>
          {patient.displayName}
        </Heading>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-600">
          <span className="data rounded-xs border border-ink-800 px-1.5 py-px text-xs font-medium text-ink-950">
            {patient.mrn}
          </span>
          <span>
            {ageLabel(patient.dateOfBirth)}, {SEX_LABELS[patient.sex].toLowerCase()}
          </span>
          <span>
            Born <span className="data">{formatDateOnly(patient.dateOfBirth)}</span>
          </span>
          {!compact && <span className="data">{patient.phone}</span>}
        </p>
      </div>
      {trailing && <div className="ml-auto flex flex-wrap items-center gap-2">{trailing}</div>}
    </div>
  );
}
