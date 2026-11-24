import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Combobox, FormField, SearchField, TextArea, TextField } from './fields';

describe('FormField', () => {
  it('labels the control and marks required fields', () => {
    render(
      <FormField label="Last name" required>
        <TextField />
      </FormField>,
    );
    const input = screen.getByLabelText(/Last name/);
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('ties the description to the control and announces errors', () => {
    const { rerender } = render(
      <FormField label="Phone" description="Use the 0803 format">
        <TextField />
      </FormField>,
    );
    const input = screen.getByLabelText('Phone');
    expect(input).toHaveAccessibleDescription('Use the 0803 format');
    expect(input).not.toHaveAttribute('aria-invalid');

    rerender(
      <FormField label="Phone" description="Use the 0803 format" error="Enter a valid phone number">
        <TextField />
      </FormField>,
    );
    expect(screen.getByLabelText('Phone')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid phone number');
    expect(screen.getByLabelText('Phone')).toHaveAccessibleDescription(
      'Enter a valid phone number',
    );
  });
});

describe('SearchField', () => {
  it('reports typing and clears with its button', async () => {
    const onValueChange = vi.fn();
    render(<SearchField value="abc" onValueChange={onValueChange} label="Search patients" />);
    expect(screen.getByRole('searchbox', { name: 'Search patients' })).toHaveValue('abc');
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onValueChange).toHaveBeenCalledWith('');
  });
});

function Harness({ onSelect }: { onSelect: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const all = ['Amoxicillin', 'Amlodipine', 'Atorvastatin'];
  return (
    <Combobox
      label="Medication"
      query={query}
      onQueryChange={setQuery}
      options={all.filter((o) => o.toLowerCase().includes(query.toLowerCase()))}
      getKey={(o) => o}
      renderOption={(o) => o}
      onSelect={(o) => (setQuery(o), onSelect(o))}
    />
  );
}

describe('Combobox', () => {
  it('opens after enough characters, moves with the arrow keys, and chooses with Enter', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const box = screen.getByRole('combobox', { name: 'Medication' });
    await userEvent.type(box, 'a');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument(); // below the two-character minimum
    await userEvent.type(box, 'm');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2); // Amoxicillin, Amlodipine
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Amlodipine');
  });

  it('closes with Escape and reports when nothing matches', async () => {
    render(<Harness onSelect={() => undefined} />);
    const box = screen.getByRole('combobox', { name: 'Medication' });
    await userEvent.type(box, 'zz');
    expect(screen.getByText('Nothing matches “zz”.')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('TextArea', () => {
  it('keeps its label, description and validity wiring in the document variant', () => {
    render(
      <FormField label="History" description="Required to sign" error="Too long">
        <TextArea variant="document" defaultValue="Three weeks of cough" />
      </FormField>,
    );
    const area = screen.getByLabelText('History');
    expect(area).toHaveValue('Three weeks of cough');
    expect(area).toHaveAttribute('aria-invalid', 'true');
    expect(area.className).toContain('border-b');
    expect(area.className).not.toContain('rounded-md');
  });

  it('is the bordered box by default, and stays editable', async () => {
    render(
      <FormField label="Reason">
        <TextArea />
      </FormField>,
    );
    const area = screen.getByLabelText('Reason');
    expect(area.className).toContain('rounded-md');
    await userEvent.type(area, 'abc');
    expect(area).toHaveValue('abc');
  });
});
