import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader, SectionHeader } from './layout';

describe('SectionHeader', () => {
  it('shows a count of zero, which is information, but nothing for no count', () => {
    const { rerender } = render(<SectionHeader title="Waiting" meta={0} />);
    expect(screen.getByRole('heading', { name: /^Waiting\s*0$/ })).toBeInTheDocument();
    rerender(<SectionHeader title="Waiting" />);
    expect(screen.getByRole('heading', { name: 'Waiting' })).toBeInTheDocument();
  });

  it('has a quieter heading for supporting regions', () => {
    render(<SectionHeader quiet title="Expected" />);
    expect(screen.getByRole('heading', { name: 'Expected' }).className).toContain('font-medium');
  });
});

describe('PageHeader', () => {
  it('puts the title and the actions on one row, with the description beneath', () => {
    render(
      <PageHeader title="Patients" description="336 registered" actions={<button>Add</button>} />,
    );
    const heading = screen.getByRole('heading', { name: 'Patients' });
    expect(heading.parentElement).toContainElement(screen.getByRole('button', { name: 'Add' }));
    expect(heading.parentElement).not.toContainElement(screen.getByText('336 registered'));
  });
});
