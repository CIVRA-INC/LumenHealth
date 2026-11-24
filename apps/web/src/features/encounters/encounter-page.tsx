import {
  DISPOSITION_LABELS,
  SEX_LABELS,
  type EncounterDetail,
  type EncounterListItem,
  type PatientDetail,
} from '@lumen/contracts';
import {
  Alert,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ErrorState,
  IconButton,
  Skeleton,
} from '@lumen/ui';
import { useQuery } from '@tanstack/react-query';
import { Check, CheckCircle2, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { TopbarCrumbs } from '../../app/topbar';
import { Page } from '../../components/page';
import { EncounterStatusBadge } from '../../components/status';
import { ApiError, api } from '../../lib/api';
import { ageLabel, formatDate, formatDateOnly, formatDateTime } from '../../lib/format';
import { useCan, useRequiredSession } from '../../lib/session';
import { useMediaQuery } from '../../lib/use-media-query';
import { AddendaSection } from './addenda-section';
import { DiagnosesSection } from './diagnoses-section';
import { useEncounter } from './hooks';
import { CloseDialog, readiness, SignDialog, VoidEncounterDialog } from './lifecycle-dialogs';
import { NoteSection } from './note-section';
import { OrdersSection } from './orders-section';
import { VitalsSection } from './vitals-section';

function RailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-t border-rule px-4 py-4 first:border-t-0 md:border-t-0 md:border-l md:first:border-l-0 xl:border-t xl:border-l-0 xl:first:border-t-0">
      <h3 className="mb-2 text-xs font-medium text-ink-500">{title}</h3>
      {children}
    </section>
  );
}

/** A label and its value. Long values wrap inside their column; labels never do. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 py-1 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-ink-900">{children}</dd>
    </div>
  );
}

/**
 * Context that stays beside the record: how this encounter is progressing, the patient's contact details, and
 * what came before. Identity (the name) is deliberately not repeated: the header above carries it. From 1280 px
 * this is a sticky column; below that it is a disclosure above the note, so the note keeps the full width.
 */
function ContextRail({ encounter }: { encounter: EncounterDetail }) {
  const session = useRequiredSession();
  const tz = session.organization.timezone;
  const wide = useMediaQuery('(min-width: 1280px)');
  const [open, setOpen] = useState(false);
  const patient = useQuery({
    queryKey: ['patient', encounter.patient.id],
    queryFn: () => api.get<PatientDetail>(`/patients/${encounter.patient.id}`),
  });
  const history = useQuery({
    queryKey: ['patient', encounter.patient.id, 'encounters'],
    queryFn: () => api.get<EncounterListItem[]>(`/patients/${encounter.patient.id}/encounters`),
  });
  const previous = (history.data ?? []).filter((e) => e.id !== encounter.id).slice(0, 5);
  const contact = patient.data?.emergencyContacts[0];

  return (
    <aside
      aria-label="Encounter context"
      className="min-w-0 overflow-hidden rounded-lg border border-rule bg-surface max-xl:order-first xl:sticky xl:top-40 xl:self-start"
    >
      <details
        open={wide || open}
        onToggle={(e) => !wide && setOpen(e.currentTarget.open)}
        className="group"
      >
        <summary
          className={`flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-ink-800 marker:hidden xl:hidden [&::-webkit-details-marker]:hidden`}
        >
          Patient and visit details
          <ChevronDown
            className="size-4 text-ink-500 transition-transform group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="max-xl:border-t max-xl:border-rule md:grid md:grid-cols-3 xl:block">
          <RailBlock title="Encounter">
            <dl>
              <Fact label="Started">
                <span className="data">{formatDateTime(encounter.startedAt, tz)}</span>
              </Fact>
              <Fact label="Clinician">
                {encounter.attending.userId === session.user.id
                  ? 'You'
                  : encounter.attending.fullName}
              </Fact>
              {encounter.finalizedAt && (
                <Fact label="Signed">
                  <span className="data">{formatDateTime(encounter.finalizedAt, tz)}</span>
                  {encounter.finalizedBy && (
                    <span className="block text-xs text-ink-500">
                      by {encounter.finalizedBy.fullName}
                    </span>
                  )}
                </Fact>
              )}
              {encounter.closedAt && (
                <Fact label="Closed">
                  <span className="data">{formatDateTime(encounter.closedAt, tz)}</span>
                  {encounter.disposition && (
                    <span className="block text-xs text-ink-500">
                      {DISPOSITION_LABELS[encounter.disposition]}
                    </span>
                  )}
                </Fact>
              )}
            </dl>
          </RailBlock>
          <RailBlock title="Patient">
            {patient.isLoading ? (
              <Skeleton className="h-16" />
            ) : patient.data ? (
              <dl>
                <Fact label="Born">
                  <span className="data">{formatDateOnly(patient.data.dateOfBirth)}</span>
                </Fact>
                <Fact label="Phone">
                  <span className="data">{patient.data.phone}</span>
                </Fact>
                <Fact label="Emergency">
                  {contact ? (
                    <>
                      <span className="block">{contact.name}</span>
                      <span className="block text-xs text-ink-500">
                        {contact.relationship}
                        <span className="data"> · {contact.phone}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-400">None on file</span>
                  )}
                </Fact>
              </dl>
            ) : (
              <p className="text-sm text-ink-500">Details are not available.</p>
            )}
          </RailBlock>
          <RailBlock title="Previous visits">
            {previous.length === 0 ? (
              <p className="text-sm text-ink-500">No earlier consultations.</p>
            ) : (
              <ul className="-mx-1 space-y-0.5">
                {previous.map((e) => (
                  <li key={e.id}>
                    <Link
                      to={`/encounters/${e.id}`}
                      className="block rounded-sm px-1 py-1 hover:bg-sunken"
                    >
                      <span className="block truncate text-sm font-medium text-ink-900">
                        {e.primaryDiagnosis ?? 'No diagnosis recorded'}
                      </span>
                      <span className="data block text-xs text-ink-500">
                        {formatDate(e.startedAt, tz)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </RailBlock>
        </div>
      </details>
    </aside>
  );
}

/**
 * Who this chart belongs to, what state it is in, and the one action that moves it forward. The name
 * takes the room the actions leave over and wraps to a second line rather than colliding with them;
 * rarely used, consequential actions live in a menu, away from the primary action.
 */
function EncounterHeader({
  encounter,
  onSign,
  onClose,
  onVoid,
  canSign,
  canClose,
  canVoid,
}: {
  encounter: EncounterDetail;
  onSign: () => void;
  onClose: () => void;
  onVoid: () => void;
  canSign: boolean;
  canClose: boolean;
  canVoid: boolean;
}) {
  const { patient } = encounter;
  return (
    <div className="border-l-[3px] border-green-800 pl-4">
      {/* Identity gets the whole width: the full name is never shortened and never competes with buttons. */}
      <h1 className="display text-xl text-balance break-words text-ink-950">
        {patient.displayName}
      </h1>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
          <span className="data rounded-xs border border-ink-800 px-1.5 py-px text-xs font-medium text-ink-950">
            {patient.mrn}
          </span>
          <span>
            {ageLabel(patient.dateOfBirth)}, {SEX_LABELS[patient.sex].toLowerCase()}
          </span>
          <span>
            Born <span className="data">{formatDateOnly(patient.dateOfBirth)}</span>
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <EncounterStatusBadge status={encounter.status} />
          {canSign && (
            <Button variant="primary" onClick={onSign}>
              Review and sign
            </Button>
          )}
          {canClose && (
            <Button variant="primary" onClick={onClose}>
              Close encounter
            </Button>
          )}
          {canVoid && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="More encounter actions">
                  <MoreHorizontal />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem tone="danger" onSelect={onVoid}>
                  Mark as entered in error…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

/** A one-line statement about the record's state, at the head of the document. */
function RecordNotice({
  tone,
  title,
  children,
}: {
  tone: 'success' | 'info';
  title: string;
  children: React.ReactNode;
}) {
  const colour =
    tone === 'success' ? 'bg-success-50/70 text-success-700' : 'bg-green-50/70 text-green-700';
  return (
    <div
      className={`flex items-start gap-2.5 border-b border-rule px-5 py-2.5 text-sm sm:px-7 ${colour}`}
    >
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0 text-ink-800">
        <span className="font-semibold text-ink-950">{title}</span> {children}
      </p>
    </div>
  );
}

function SectionNav({ encounter }: { encounter: EncounterDetail }) {
  const draft = encounter.status === 'IN_PROGRESS';
  const checks = readiness(encounter);
  const vitals = encounter.vitals.filter((v) => !v.enteredInError).length;
  const orders = encounter.medicationOrders.length;
  const signed = encounter.status === 'FINALIZED' || encounter.status === 'CLOSED';
  const items: { href: string; label: string; done?: boolean; count?: number }[] = [
    { href: '#vitals', label: 'Vitals', count: vitals },
    { href: '#note', label: 'Note', done: draft ? checks[0]?.done : undefined },
    {
      href: '#diagnoses',
      label: 'Diagnoses',
      done: draft ? checks[1]?.done : undefined,
      count: encounter.diagnoses.length,
    },
    { href: '#orders', label: 'Prescription', count: orders },
    ...(signed ? [{ href: '#addenda', label: 'Addenda', count: encounter.addenda.length }] : []),
  ];
  return (
    <nav aria-label="Sections of this encounter" className="-mb-px flex gap-5 overflow-x-auto">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="flex h-9 items-center gap-1.5 border-b-2 border-transparent text-sm font-medium whitespace-nowrap text-ink-600 hover:border-ink-300 hover:text-ink-950"
        >
          {item.label}
          {item.done !== undefined &&
            (item.done ? (
              <>
                <Check className="size-3.5 text-success-600" aria-hidden />
                <span className="sr-only">complete</span>
              </>
            ) : (
              <span className="text-xs font-normal text-warning-700">needed</span>
            ))}
          {item.done === undefined && item.count ? (
            <span className="data text-xs font-normal text-ink-500">{item.count}</span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}

export function EncounterPage() {
  const { encounterId = '' } = useParams();
  const session = useRequiredSession();
  const tz = session.organization.timezone;
  const { data: encounter, isLoading, error, refetch } = useEncounter(encounterId);
  const canFinalize = useCan('encounters.finalize');
  const canClose = useCan('encounters.close');
  const canVoid = useCan('encounters.void');
  const flushRef = useRef<(() => Promise<void>) | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <Page width="document">
        <TopbarCrumbs
          crumbs={[
            { label: 'Consultations', to: '/consultations' },
            { label: notFound ? 'Not found' : 'Error' },
          ]}
        />
        <ErrorState
          title={notFound ? 'Encounter not found' : 'The encounter could not be loaded'}
          message={
            notFound
              ? 'It may not exist, or it belongs to a branch you cannot access.'
              : 'Check your connection and try again.'
          }
          onRetry={notFound ? undefined : () => void refetch()}
        />
      </Page>
    );
  }
  if (isLoading || !encounter) {
    return (
      <Page width="fluid">
        <Skeleton className="mb-6 h-16" />
        <Skeleton className="h-96" />
      </Page>
    );
  }

  const draft = encounter.status === 'IN_PROGRESS';
  const signed = encounter.status === 'FINALIZED' || encounter.status === 'CLOSED';
  const isAttending = encounter.attending.userId === session.user.id;

  return (
    <Page width="fluid">
      <TopbarCrumbs
        crumbs={[
          { label: 'Consultations', to: '/consultations' },
          // The patient's name is the page heading; the trail says which visit this is, not who.
          { label: `Consultation, ${formatDate(encounter.startedAt, tz)}` },
        ]}
      />

      {/* Identity, state, actions and section navigation stay in view while the record scrolls. */}
      <div className="top-12 z-20 -mx-4 -mt-6 mb-6 border-b border-rule bg-stone/95 px-4 pt-4 backdrop-blur sm:-mx-6 sm:px-6 md:sticky lg:-mx-10 lg:-mt-8 lg:px-10">
        <EncounterHeader
          encounter={encounter}
          onSign={() => setSignOpen(true)}
          onClose={() => setCloseOpen(true)}
          onVoid={() => setVoidOpen(true)}
          canSign={draft && isAttending && canFinalize}
          canClose={encounter.status === 'FINALIZED' && canClose}
          canVoid={draft && isAttending && canVoid}
        />
        <div className="mt-2">
          <SectionNav encounter={encounter} />
        </div>
      </div>

      {encounter.status === 'ENTERED_IN_ERROR' && (
        <Alert tone="danger" className="mb-5" title="Entered in error">
          {encounter.voidReason}
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-rule bg-surface">
          {draft && !isAttending && (
            <RecordNotice
              tone="info"
              title={`${encounter.attending.fullName} is the attending clinician.`}
            >
              You can read this encounter and record vitals. Only the attending clinician can edit
              the note, diagnoses and prescription.
            </RecordNotice>
          )}
          {signed && (
            <RecordNotice tone="success" title="Signed and locked.">
              Signed by {encounter.finalizedBy?.fullName ?? 'the attending clinician'}
              {encounter.finalizedAt ? ` on ${formatDateTime(encounter.finalizedAt, tz)}` : ''}. To
              correct the record, add an addendum.
            </RecordNotice>
          )}
          <VitalsSection encounter={encounter} />
          <NoteSection
            key={encounter.id}
            encounter={encounter}
            editable={encounter.editable}
            flushRef={flushRef}
          />
          <DiagnosesSection encounter={encounter} editable={encounter.editable} />
          <OrdersSection encounter={encounter} editable={encounter.editable} />
          {signed && <AddendaSection encounter={encounter} />}
          {encounter.status === 'CLOSED' && encounter.dischargeInstructions && (
            <section className="border-t border-rule px-5 py-6 sm:px-7">
              <h2 className="display mb-3 text-lg text-ink-950">Discharge instructions</h2>
              <p className="max-w-[40rem] text-prose whitespace-pre-wrap text-ink-950">
                {encounter.dischargeInstructions}
              </p>
            </section>
          )}
        </div>
        <ContextRail encounter={encounter} />
      </div>

      <SignDialog
        encounter={encounter}
        open={signOpen}
        onOpenChange={setSignOpen}
        flushRef={flushRef}
      />
      <CloseDialog encounter={encounter} open={closeOpen} onOpenChange={setCloseOpen} />
      <VoidEncounterDialog encounter={encounter} open={voidOpen} onOpenChange={setVoidOpen} />
    </Page>
  );
}
