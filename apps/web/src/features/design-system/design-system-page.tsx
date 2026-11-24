import {
  Alert,
  Button,
  Checkbox,
  CheckboxField,
  Combobox,
  ConfirmDialog,
  DataTable,
  DefinitionList,
  Dialog,
  DialogContent,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterSelect,
  FormField,
  FormSection,
  IconButton,
  Kbd,
  Pagination,
  Panel,
  PanelBody,
  PanelHeader,
  RadioGroup,
  RadioItem,
  SearchField,
  SectionHeader,
  Select,
  Skeleton,
  StatusIndicator,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tag,
  TableToolbar,
  TextArea,
  TextField,
  Tooltip,
  toast,
  Breadcrumbs,
  type Column,
  type SortState,
  type Tone,
} from '@lumen/ui';
import { ChevronDown, MoreHorizontal, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { PageHeader as UiPageHeader } from '@lumen/ui';
import { Page, PageHeader } from '../../components/page';
import { PatientBanner, PatientCell } from '../../components/patient-banner';
import { DayRuler } from '../dashboard/day-ruler';

const INK = ['950', '900', '800', '700', '600', '500', '400', '300', '200', '100', '50'];
const GREEN = ['950', '900', '800', '700', '600', '500', '300', '200', '100', '50'];
const LIME = ['50', '100', '200', '300', '400', '500', '600'];
const TONES: Tone[] = ['neutral', 'info', 'success', 'warning', 'danger'];

const DEMO_PATIENT = {
  id: 'demo',
  displayName: 'Oluwadamilare Adebayo-Nwachukwu',
  mrn: 'LH-000000',
  dateOfBirth: '1984-03-12',
  sex: 'MALE' as const,
  phone: '+2348030000000',
  givenName: 'Oluwadamilare',
  familyName: 'Adebayo-Nwachukwu',
  registeredAt: '2026-01-01T00:00:00Z',
};
const DEMO_ROWS = Array.from({ length: 53 }, (_, i) => ({
  id: String(i),
  name: `Demonstration patient ${String(i + 1).padStart(2, '0')}`,
  mrn: `LH-${String(900_000 + i)}`,
  reason: ['Routine review', 'Follow-up', 'Fever', 'Referral letter'][i % 4]!,
  waited: (i * 7) % 55,
}));
type DemoRow = (typeof DEMO_ROWS)[number];

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 border-t border-rule py-10 first:border-t-0 first:pt-0"
    >
      <div className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div>
          <h2 className="display text-xl text-ink-950">{title}</h2>
          {description && <p className="mt-2 max-w-[34ch] text-sm text-ink-600">{description}</p>}
        </div>
        <div className="min-w-0 space-y-8">{children}</div>
      </div>
    </section>
  );
}

function Swatches({ name, steps }: { name: string; steps: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-700 capitalize">{name}</p>
      <div className="flex overflow-hidden rounded-md border border-rule">
        {steps.map((s) => (
          <div key={s} className="min-w-0 flex-1">
            <div className="h-10" style={{ background: `var(--color-${name}-${s})` }} />
            <p className="data bg-surface py-1 text-center text-2xs text-ink-500">{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Spec({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-500">{label}</p>
      {children}
    </div>
  );
}

/** A working DataTable over local demo data: sort, paginate, filter, and every state, using the same component as the app. */
function TableDemo() {
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'data' | 'loading' | 'empty' | 'error'>('data');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_ROWS.filter(
      (r) =>
        (!q || r.name.toLowerCase().includes(q) || r.mrn.toLowerCase().includes(q)) &&
        (!reason || r.reason === reason),
    );
  }, [query, reason]);
  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) =>
          (sort.direction === 'asc' ? 1 : -1) *
          (sort.key === 'waited'
            ? a.waited - b.waited
            : String(a[sort.key as keyof DemoRow]).localeCompare(
                String(b[sort.key as keyof DemoRow]),
              )),
      ),
    [filtered, sort],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, totalPages);
  const rows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const columns: Column<DemoRow>[] = [
    {
      id: 'name',
      header: 'Patient',
      sortKey: 'name',
      mobile: 'title',
      cell: (r) => (
        <PatientCell
          patient={{
            id: r.id,
            displayName: r.name,
            mrn: r.mrn,
            dateOfBirth: '1990-01-01',
            sex: 'FEMALE',
          }}
          to={null}
        />
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      sortKey: 'reason',
      showFrom: 'md',
      mobile: 'meta',
      cell: (r) => <span className="text-ink-700">{r.reason}</span>,
    },
    {
      id: 'waited',
      header: 'Waiting',
      sortKey: 'waited',
      align: 'right',
      mobile: 'meta',
      cell: (r) => <span className="data text-ink-700">{r.waited} min</span>,
    },
  ];
  const reset = () => (setQuery(''), setReason(''), setPage(1));
  return (
    <div className="space-y-3">
      <div role="group" aria-label="Table state" className="flex flex-wrap gap-2">
        {(['data', 'loading', 'empty', 'error'] as const).map((m) => (
          <Button
            key={m}
            size="sm"
            variant={mode === m ? 'primary' : 'secondary'}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'data' ? 'With data' : m[0]!.toUpperCase() + m.slice(1)}
          </Button>
        ))}
      </div>
      <DataTable
        caption="Demonstration table"
        columns={columns}
        rows={mode === 'data' ? rows : mode === 'empty' ? [] : undefined}
        rowKey={(r) => r.id}
        loading={mode === 'loading'}
        error={
          mode === 'error'
            ? {
                title: 'The table could not be loaded',
                message: 'This is a demonstration of the error state.',
                onRetry: () => setMode('data'),
              }
            : null
        }
        sort={sort}
        onSortChange={(s) => (setSort(s), setPage(1))}
        rowActions={() => (
          <IconButton label="Row actions" size="sm">
            <MoreHorizontal />
          </IconButton>
        )}
        toolbar={
          <TableToolbar>
            <SearchField
              value={query}
              onValueChange={(v) => (setQuery(v), setPage(1))}
              label="Search the demonstration table"
              placeholder="Name or MRN"
              className="min-w-0 basis-full sm:max-w-xs sm:flex-1 sm:basis-auto"
            />
            <FilterBar activeCount={reason ? 1 : 0} onClear={reset}>
              <FilterSelect
                label="Reason"
                allLabel="Any reason"
                value={reason}
                onChange={(v) => (setReason(v), setPage(1))}
                options={['Routine review', 'Follow-up', 'Fever', 'Referral letter'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            </FilterBar>
          </TableToolbar>
        }
        empty={
          <EmptyState
            title="No rows match"
            description="Change or clear the search and filters."
            action={<Button onClick={reset}>Clear</Button>}
          />
        }
        pagination={
          mode === 'data'
            ? {
                page: current,
                pageSize,
                total: sorted.length,
                totalPages,
                itemLabel: 'patients',
                onPageChange: setPage,
                onPageSizeChange: (n) => (setPageSize(n), setPage(1)),
              }
            : undefined
        }
      />
    </div>
  );
}

function ComboboxDemo() {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const options = [
    'Amoxicillin',
    'Artemether/lumefantrine',
    'Atorvastatin',
    'Azithromycin',
    'Paracetamol',
  ].filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="max-w-sm space-y-2">
      <FormField
        label="Medication"
        description="Type two letters, then use the arrow keys and Enter."
      >
        <Combobox
          label="Medication"
          query={query}
          onQueryChange={setQuery}
          options={options}
          getKey={(o) => o}
          renderOption={(o) => o}
          onSelect={(o) => (setChosen(o), setQuery(o))}
        />
      </FormField>
      <p className="text-sm text-ink-600">Chosen: {chosen ?? 'nothing yet'}</p>
    </div>
  );
}

const DEMO_APPOINTMENTS = [
  {
    id: '1',
    status: 'COMPLETED',
    patient: DEMO_PATIENT,
    type: 'SCHEDULED',
    scheduledStart: '2026-10-23T07:30:00Z',
    checkedInAt: null,
  },
  {
    id: '2',
    status: 'COMPLETED',
    patient: DEMO_PATIENT,
    type: 'SCHEDULED',
    scheduledStart: '2026-10-23T08:40:00Z',
    checkedInAt: null,
  },
  {
    id: '3',
    status: 'IN_CONSULTATION',
    patient: DEMO_PATIENT,
    type: 'SCHEDULED',
    scheduledStart: '2026-10-23T10:00:00Z',
    checkedInAt: null,
  },
  {
    id: '4',
    status: 'CHECKED_IN',
    patient: DEMO_PATIENT,
    type: 'WALK_IN',
    scheduledStart: '2026-10-23T10:20:00Z',
    checkedInAt: '2026-10-23T10:20:00Z',
  },
  {
    id: '5',
    status: 'SCHEDULED',
    patient: DEMO_PATIENT,
    type: 'SCHEDULED',
    scheduledStart: '2026-10-23T12:00:00Z',
    checkedInAt: null,
  },
  {
    id: '6',
    status: 'SCHEDULED',
    patient: DEMO_PATIENT,
    type: 'SCHEDULED',
    scheduledStart: '2026-10-23T13:30:00Z',
    checkedInAt: null,
  },
] as unknown as Parameters<typeof DayRuler>[0]['appointments'];

export function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <Page>
      <PageHeader
        eyebrow="Reference"
        title="Design system"
        description="Lumen Instrument: every component below is the one the application uses. Names and figures here are demonstration data."
      />

      <Section
        id="thesis"
        title="Thesis"
        description="A precise clinical workspace: editorial type, architectural layouts, thin rules, one accent."
      >
        <ul className="grid max-w-3xl grid-cols-1 gap-x-10 gap-y-4 text-base text-ink-800 sm:grid-cols-2">
          <li>
            <span className="font-semibold text-ink-950">Stone desk, white sheets.</span> Work
            happens on white surfaces with thin rules, laid on a pale warm-stone background. Boxes
            are for self-contained regions, not for every heading.
          </li>
          <li>
            <span className="font-semibold text-ink-950">Evergreen structure.</span> Navigation and
            selected structure are deep evergreen. Chartreuse marks the primary action and the
            current location, always as a fill with dark text.
          </li>
          <li>
            <span className="font-semibold text-ink-950">Three voices of type.</span> A display
            serif for page titles and patient names, a clear sans for reading, and a mono face only
            for identifiers, measurements and times.
          </li>
          <li>
            <span className="font-semibold text-ink-950">Status is a word.</span> A dot (or ring, if
            still to come) and a label. Semantic colours appear only where state is meaningful.
          </li>
        </ul>
      </Section>

      <Section
        id="colour"
        title="Colour"
        description="Text steps from ink-400 up meet 4.5:1 on stone. Chartreuse never carries text or thin lines."
      >
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Swatches name="ink" steps={INK} />
          <Swatches name="green" steps={GREEN} />
          <Swatches name="lime" steps={LIME} />
          <div>
            <p className="mb-2 text-sm font-medium text-ink-700">Surfaces and semantics</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                ['Stone', 'bg-stone'],
                ['Surface', 'bg-surface'],
                ['Sunken', 'bg-sunken'],
                ['Success', 'bg-success-600'],
                ['Warning', 'bg-warning-600'],
                ['Danger', 'bg-danger-600'],
              ].map(([label, cls]) => (
                <div key={label} className="overflow-hidden rounded-md border border-rule">
                  <div className={`h-10 ${cls}`} />
                  <p className="bg-surface px-2 py-1 text-xs text-ink-700">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section
        id="type"
        title="Typography"
        description="Fraunces for titles, Instrument Sans for reading, Geist Mono for data. All are bundled with the app."
      >
        <Panel>
          <PanelBody className="space-y-3">
            <p className="display text-3xl text-ink-950">
              Display 40: page titles and patient names
            </p>
            <p className="display text-xl text-ink-950">Display 22: record titles</p>
            <p className="text-md font-semibold text-ink-950">Section heading 15, semibold</p>
            <p className="text-base">
              Body 14. A consultation note is read for long stretches, so its measure is limited to
              about seventy-five characters.
            </p>
            <p className="text-sm text-ink-600">Table and secondary text 13.</p>
            <p className="text-xs text-ink-500">Caption and description 12.</p>
            <p>
              Identifiers and readings: <span className="data">LH-000123</span> ·{' '}
              <span className="data">09:45</span> · <span className="data">38.6 °C</span> ·{' '}
              <span className="data">120/80 mmHg</span>
            </p>
          </PanelBody>
        </Panel>
      </Section>

      <Section
        id="buttons"
        title="Buttons"
        description="One height scale: 28, 32 and 40 px (44 on touch). One primary action per view."
      >
        <Spec label="Variants">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="quiet">Quiet</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="destructive-quiet">Destructive quiet</Button>
          </div>
        </Spec>
        <Spec label="Sizes, icon, loading and disabled">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Medium</Button>
            <Button size="lg">Large</Button>
            <Button variant="primary">
              <Plus /> With icon
            </Button>
            <Button variant="primary" loading>
              Saving
            </Button>
            <Button disabled>Disabled</Button>
            <IconButton label="Refresh">
              <RefreshCw />
            </IconButton>
            <IconButton label="More actions" variant="secondary">
              <MoreHorizontal />
            </IconButton>
          </div>
        </Spec>
      </Section>

      <Section
        id="forms"
        title="Forms"
        description="Label above, description or error beneath. Required fields carry an asterisk; validation is announced and tied to its control."
      >
        <div className="grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Default" description="A description sits below the control.">
            <TextField placeholder="Placeholder" />
          </FormField>
          <FormField label="Required" required>
            <TextField defaultValue="Filled value" />
          </FormField>
          <FormField label="With an error" required error="Enter the patient’s last name.">
            <TextField defaultValue="" />
          </FormField>
          <FormField label="Disabled">
            <TextField disabled defaultValue="Cannot edit" />
          </FormField>
          <FormField label="Select">
            <Select defaultValue="b">
              <option value="a">Option A</option>
              <option value="b">Option B</option>
            </Select>
          </FormField>
          <FormField label="Search">
            <SearchField
              value={search}
              onValueChange={setSearch}
              placeholder="Name, MRN or phone number"
              hint={<Kbd>/</Kbd>}
            />
          </FormField>
          <FormField label="Text area" optional span={6} className="sm:col-span-2">
            <TextArea rows={3} placeholder="Longer free text" />
          </FormField>
          <FormField
            label="Document text area"
            description="For long clinical writing: a hairline underline, grows with the text."
            span={6}
            className="sm:col-span-2"
          >
            <TextArea
              variant="document"
              rows={2}
              defaultValue="Three-week history of progressive exertional dyspnoea."
            />
          </FormField>
          <div className="space-y-2.5">
            <CheckboxField
              label="Checkbox with a label"
              description="The whole label is clickable."
              defaultChecked
            />
            <Checkbox aria-label="Bare checkbox" />
          </div>
          <RadioGroup defaultValue="routine" aria-label="Priority">
            <RadioItem value="routine" label="Routine" />
            <RadioItem
              value="urgent"
              label="Urgent"
              description="Moves ahead of routine patients"
            />
          </RadioGroup>
        </div>
        <ComboboxDemo />
        <Spec label="Form section: title column and a six-column grid. Fields choose a span of 2, 3, 4 or 6.">
          <Panel className="px-6 py-6">
            <FormSection
              title="Identity"
              description="As it appears on the patient’s identification."
            >
              <FormField label="First name" required span={2}>
                <TextField />
              </FormField>
              <FormField label="Middle name" optional span={2}>
                <TextField />
              </FormField>
              <FormField label="Last name" required span={2}>
                <TextField />
              </FormField>
              <FormField label="Date of birth" required span={3}>
                <TextField type="date" />
              </FormField>
              <FormField label="Sex" required span={3}>
                <Select>
                  <option>Select</option>
                </Select>
              </FormField>
            </FormSection>
          </Panel>
        </Spec>
      </Section>

      <Section
        id="status"
        title="Status and notices"
        description="A status is a dot and a word; a ring means the state is still to come. Tags label a category. Notices describe a condition on the page."
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {TONES.map((t) => (
            <StatusIndicator key={t} tone={t}>
              {t[0]!.toUpperCase() + t.slice(1)}
            </StatusIndicator>
          ))}
          <StatusIndicator pending>Expected</StatusIndicator>
          <Tag>Walk-in</Tag>
          <Tag tone="danger">Urgent</Tag>
        </div>
        <div className="grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
          <Alert tone="info" title="Information">
            A neutral note about the current screen.
          </Alert>
          <Alert tone="success" title="Done">
            An outcome that completed as expected.
          </Alert>
          <Alert tone="warning" title="Check before continuing">
            Something that deserves a second look.
          </Alert>
          <Alert tone="danger" title="Not saved">
            Something failed and was not saved.
          </Alert>
        </div>
      </Section>

      <Section
        id="tables"
        title="Data table"
        description="Server-driven sorting and pagination, a stable layout while loading, accessible sort controls, and a record list on narrow screens."
      >
        <TableDemo />
        <Spec label="Pagination alone, on a long list (page 6 of 22)">
          <Panel>
            <Pagination
              page={6}
              pageSize={25}
              total={543}
              totalPages={22}
              itemLabel="patients"
              onPageChange={() => undefined}
              onPageSizeChange={() => undefined}
            />
          </Panel>
        </Spec>
      </Section>

      <Section
        id="patterns"
        title="Page patterns"
        description="Titles, sections, patient identity and the day ruler."
      >
        <Spec label="Page header">
          <Panel className="px-5 pt-5">
            <UiPageHeader
              as="h2"
              eyebrow="Friday, 23 October 2026"
              title="Today"
              actions={<Button variant="primary">Add walk-in</Button>}
              className="mb-5"
            />
          </Panel>
        </Spec>
        <Spec label="Section header and list">
          <div className="max-w-xl">
            <SectionHeader title="Waiting" meta={3} />
            <ul className="divide-y divide-rule-soft">
              {['Demo patient A', 'Demo patient B'].map((n, i) => (
                <li key={n} className="flex items-center justify-between py-2.5">
                  <PatientCell
                    patient={{ ...DEMO_PATIENT, displayName: n, mrn: `LH-00000${i}` }}
                    to={null}
                  />
                  <span className="data text-sm text-ink-700">{12 + i * 9} min</span>
                </li>
              ))}
            </ul>
          </div>
        </Spec>
        <Spec label="Patient identity band (a long name, wrapping and truncating safely)">
          <Panel>
            <PanelBody>
              <PatientBanner patient={DEMO_PATIENT} />
            </PanelBody>
          </Panel>
        </Spec>
        <Spec label="Record view">
          <DefinitionList
            className="max-w-xl"
            items={[
              { label: 'Phone', value: <span className="data">+2348030000000</span> },
              { label: 'Email', value: null },
            ]}
          />
        </Spec>
        <Spec label="Day ruler (demonstration appointments)">
          <DayRuler appointments={DEMO_APPOINTMENTS} timeZone="UTC" date="2026-10-23" />
        </Spec>
      </Section>

      <Section
        id="states"
        title="Loading and empty states"
        description="Skeletons keep the layout still. Empty and error states say what happened and what to do next."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Panel>
            <div className="space-y-3 p-4" role="status" aria-label="Loading example">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Panel>
          <Panel>
            <EmptyState
              title="Nothing here yet"
              description="Empty states say what will appear and offer the next step."
              action={<Button variant="primary">Primary action</Button>}
            />
          </Panel>
          <Panel>
            <ErrorState
              title="Could not load"
              message="Error states say what failed and offer a retry."
              onRetry={() => toast.info('Retrying…')}
            />
          </Panel>
        </div>
      </Section>

      <Section
        id="overlays"
        title="Overlays and navigation"
        description="Built on accessible primitives: focus is trapped, Escape closes, and focus returns to the trigger."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setDialogOpen(true)}>Dialog</Button>
          <Button onClick={() => setConfirmOpen(true)}>Confirmation</Button>
          <Button onClick={() => setDrawerOpen(true)}>Drawer</Button>
          <Tooltip content="Tooltips describe icon-only controls">
            <Button variant="quiet">Hover or focus me</Button>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                Menu <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Open</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem tone="danger">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={() => toast.success('Saved', { description: 'Toasts confirm outcomes.' })}
          >
            Toast
          </Button>
        </div>
        <Breadcrumbs
          items={[{ label: 'Patients' }, { label: 'Demo patient A' }, { label: 'Consultation' }]}
        />
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">Record</TabsTrigger>
            <TabsTrigger value="two">Consultations</TabsTrigger>
            <TabsTrigger value="three">Appointments</TabsTrigger>
          </TabsList>
          <TabsContent value="one" className="text-base text-ink-600">
            Tabs use the arrow keys to move between triggers.
          </TabsContent>
          <TabsContent value="two">Second panel</TabsContent>
          <TabsContent value="three">Third panel</TabsContent>
        </Tabs>
        <p className="text-sm text-ink-500">
          Keyboard: <Kbd>Tab</Kbd> moves, <Kbd>Enter</Kbd> activates, <Kbd>Esc</Kbd> dismisses,{' '}
          <Kbd>Ctrl K</Kbd> finds a patient.
        </p>
      </Section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title="Example dialog"
          description="Dialogs focus one task. The primary action sits on the right."
          footer={
            <>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Save
              </Button>
            </>
          }
        >
          <FormField label="Name">
            <TextField autoFocus />
          </FormField>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm a consequential action"
        description="Actions that lock or commit records name exactly what will happen and ask for explicit confirmation."
        confirmLabel="Confirm"
        requireAcknowledgement="I understand this cannot be undone."
        onConfirm={() => setConfirmOpen(false)}
      />
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Example drawer">
        <PanelHeader
          title="Drawer"
          description="Secondary tasks that keep the page in view"
          action={
            <Button size="sm" onClick={() => setDrawerOpen(false)}>
              Done
            </Button>
          }
        />
        <div className="p-4 text-base text-ink-600">
          Drawers slide in from the edge and also carry navigation on small screens.
        </div>
      </Drawer>
    </Page>
  );
}
