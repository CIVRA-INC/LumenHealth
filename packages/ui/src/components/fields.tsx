import { Check, ChevronDown, Search, X } from 'lucide-react';
import { Checkbox as RadixCheckbox, RadioGroup as RadixRadioGroup } from 'radix-ui';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '../cn';

/** Shared look of every text-entry control: same height scale and focus treatment as buttons. */
const control =
  'w-full rounded-md border border-rule-strong bg-surface px-2.5 text-base text-ink-950 ' +
  'placeholder:text-ink-400 transition-[border-color,box-shadow] duration-100 ' +
  'hover:border-ink-300 focus-visible:border-green-600 focus-visible:outline-none focus-visible:ring-[3px] ' +
  'focus-visible:ring-green-600/20 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-500 ' +
  'aria-invalid:border-danger-600 aria-invalid:focus-visible:ring-danger-600/20';

const SPANS = {
  2: 'sm:col-span-2',
  3: 'sm:col-span-3',
  4: 'sm:col-span-4',
  6: 'sm:col-span-6',
} as const;

// ── FormField: the one way to label, describe and validate a control ─────────

interface FieldContextValue {
  id: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}
const FieldContext = createContext<FieldContextValue | null>(null);

/** Attributes a control needs to belong to the surrounding FormField (id, description, validity). */
function useFieldAttributes() {
  const ctx = useContext(FieldContext);
  if (!ctx) return {};
  return {
    id: ctx.id,
    'aria-describedby': ctx.describedBy,
    'aria-invalid': ctx.invalid || undefined,
    'aria-required': ctx.required || undefined,
  };
}

/**
 * Label above, control, then description or error beneath. Every form in the product uses this,
 * so spacing, required markers and validation presentation never drift.
 */
export function FormField({
  label,
  description,
  error,
  required,
  optional,
  span,
  className,
  children,
}: {
  label: string;
  /** Width inside a FormSection, in sixths of the row. Default is half. */
  span?: 2 | 3 | 4 | 6;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  /** Shows "optional" next to the label. Prefer marking required fields; use this when most are required. */
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const descId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, descId].filter(Boolean).join(' ') || undefined;
  return (
    <FieldContext.Provider value={{ id, describedBy, invalid: !!error, required: !!required }}>
      <div
        data-span={span}
        className={cn('flex min-w-0 flex-col gap-1.5', span && SPANS[span], className)}
      >
        <label htmlFor={id} className="text-sm font-medium text-ink-800">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
          {optional && <span className="ml-1.5 font-normal text-ink-400">optional</span>}
        </label>
        {children}
        {description && !error && (
          <p id={descId} className="text-xs text-ink-500">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger-700">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function TextField({ className, type = 'text', ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      {...useFieldAttributes()}
      className={cn(control, 'h-8 read-only:bg-sunken pointer-coarse:h-11', className)}
      {...props}
    />
  );
}

/**
 * `box` is the standard bordered control. `document` is for long-form clinical writing: no box, a
 * hairline underline that darkens on hover and turns evergreen on focus, so a page of fields reads as
 * a page of text rather than a stack of inputs. It grows with its content.
 */
export function TextArea({
  className,
  rows = 3,
  variant = 'box',
  ref,
  ...props
}: ComponentProps<'textarea'> & { variant?: 'box' | 'document' }) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  const grows = variant === 'document';

  // `field-sizing: content` makes the document variant grow with its text. Browsers without it get
  // the same behaviour from measuring the content.
  useEffect(() => {
    const el = own.current;
    if (!grows || !el || (typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content')))
      return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [grows, props.value]);

  return (
    <textarea
      rows={rows}
      {...useFieldAttributes()}
      ref={(node) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        grows
          ? 'block field-sizing-content w-full max-w-none resize-none overflow-hidden rounded-none border-0 border-b border-rule bg-transparent px-0 py-1.5 text-prose text-ink-950 ' +
              'transition-[border-color,box-shadow] duration-100 placeholder:text-ink-400 ' +
              'hover:border-ink-400 focus-visible:border-green-700 ' +
              'focus-visible:shadow-[0_1px_0_0_var(--color-green-700)] focus-visible:outline-none ' +
              'read-only:border-transparent aria-invalid:border-danger-600'
          : control + ' min-h-16 resize-y py-2 leading-relaxed read-only:bg-sunken',
        className,
      )}
      {...props}
    />
  );
}

/** A native select: the most accessible and most usable option for short, fixed lists. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        {...useFieldAttributes()}
        className={cn(control, 'h-8 appearance-none pr-8 pointer-coarse:h-11', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

// ── Search ───────────────────────────────────────────────────────────────────

/** A text field specialised for searching, with a clear button and an optional keyboard hint. */
export function SearchField({
  value,
  onValueChange,
  placeholder,
  label = 'Search',
  hint,
  className,
  inputRef,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  /** e.g. a key to focus the field; hidden while the field has text. */
  hint?: ReactNode;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className={cn('relative', className)} role="search">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-ink-400"
      />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          control,
          'h-8 pr-8 pl-8 pointer-coarse:h-11 [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange('')}
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-ink-500 hover:bg-ink-950/5 hover:text-ink-900"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : (
        hint && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:block">
            {hint}
          </span>
        )
      )}
    </div>
  );
}

// ── Checkbox and radio group ─────────────────────────────────────────────────

export function Checkbox({ className, ...props }: ComponentProps<typeof RadixCheckbox.Root>) {
  return (
    <RadixCheckbox.Root
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-xs border border-rule-strong bg-surface',
        'transition-colors hover:border-ink-300 data-[state=checked]:border-green-700 data-[state=checked]:bg-green-700',
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator>
        <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}

/** A checkbox with its label as one click target. */
export function CheckboxField({
  label,
  description,
  ...props
}: ComponentProps<typeof RadixCheckbox.Root> & { label: ReactNode; description?: ReactNode }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={id} className="mt-0.5" {...props} />
      <label htmlFor={id} className="text-base text-ink-900">
        {label}
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </label>
    </div>
  );
}

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadixRadioGroup.Root>) {
  return <RadixRadioGroup.Root className={cn('flex flex-col gap-2', className)} {...props} />;
}

export function RadioItem({
  label,
  description,
  value,
  ...props
}: { label: ReactNode; description?: ReactNode; value: string } & Omit<
  ComponentProps<typeof RadixRadioGroup.Item>,
  'children'
>) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <RadixRadioGroup.Item
        id={id}
        value={value}
        className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border border-rule-strong bg-surface data-[state=checked]:border-green-700"
        {...props}
      >
        <RadixRadioGroup.Indicator className="size-2 rounded-full bg-green-700" />
      </RadixRadioGroup.Item>
      <label htmlFor={id} className="text-base text-ink-900">
        {label}
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </label>
    </div>
  );
}

// ── Combobox: a searchable single-choice picker (ARIA 1.2 list autocomplete) ─

export interface ComboboxProps<T> {
  /** Current text in the input. The parent owns it so it can drive the search request. */
  query: string;
  onQueryChange: (query: string) => void;
  /** Options for the current query. */
  options: T[];
  getKey: (option: T) => string;
  renderOption: (option: T) => ReactNode;
  onSelect: (option: T) => void;
  loading?: boolean;
  /** Minimum characters before the list opens. */
  minChars?: number;
  placeholder?: string;
  /** Shown when the query is long enough but nothing matches. */
  emptyMessage?: (query: string) => string;
  label: string;
  invalid?: boolean;
}

/**
 * Keyboard-operable search-and-pick control. Up/Down move, Enter chooses, Escape closes. Built for
 * choosing a record (e.g. a patient) from server-side search results; for short fixed lists use Select.
 */
export function Combobox<T>({
  query,
  onQueryChange,
  options,
  getKey,
  renderOption,
  onSelect,
  loading,
  minChars = 2,
  placeholder,
  emptyMessage,
  label,
  invalid,
}: ComboboxProps<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const field = useFieldAttributes();
  const showList = open && query.trim().length >= minChars;
  const current = Math.min(active, Math.max(options.length - 1, 0));
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const choose = (option: T) => {
    onSelect(option);
    setOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive(Math.min(current + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(Math.max(current - 1, 0));
    } else if (e.key === 'Enter' && showList && options[current]) {
      e.preventDefault();
      choose(options[current]);
    } else if (e.key === 'Escape' && showList) {
      e.stopPropagation();
      setOpen(false);
    }
  };
  const activeId =
    showList && options[current] ? `${listId}-${getKey(options[current])}` : undefined;
  const status = useMemo(
    () => (loading ? 'Searching' : options.length ? `${options.length} results` : ''),
    [loading, options.length],
  );

  return (
    <div ref={rootRef} className="relative">
      <input
        {...field}
        role="combobox"
        aria-label={field.id ? undefined : label}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-invalid={invalid || field['aria-invalid']}
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(control, 'h-8 pointer-coarse:h-11')}
      />
      <span className="sr-only" role="status">
        {status}
      </span>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-rule bg-surface py-1 shadow-pop"
        >
          {options.map((option, index) => (
            <li
              key={getKey(option)}
              id={`${listId}-${getKey(option)}`}
              role="option"
              aria-selected={index === current}
              onMouseMove={() => setActive(index)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(option)}
              className={cn('cursor-pointer px-2.5 py-1.5', index === current && 'bg-lime-100')}
            >
              {renderOption(option)}
            </li>
          ))}
          {!loading && options.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-ink-500">
              {emptyMessage?.(query.trim()) ?? `Nothing matches “${query.trim()}”.`}
            </li>
          )}
          {loading && options.length === 0 && (
            <li className="px-2.5 py-2 text-sm text-ink-500">Searching…</li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * A titled group in a long form: the title sits in the left column, the fields in the right, and a thin
 * rule separates groups. The form is one continuous sheet, not a card per group.
 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-x-12 gap-y-4 border-t border-rule py-7 first:border-t-0 first:pt-0 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="text-md font-semibold text-ink-950">{title}</h2>
        {description && <p className="mt-1 max-w-[30ch] text-sm text-ink-500">{description}</p>}
      </div>
      <div className="grid max-w-3xl grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-6 [&>*:not([data-span])]:sm:col-span-3">
        {children}
      </div>
    </section>
  );
}
