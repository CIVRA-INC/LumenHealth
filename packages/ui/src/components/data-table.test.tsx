import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataTable, Pagination, pageWindow, type Column } from './data-table';

interface Row {
  id: string;
  name: string;
  mrn: string;
}
const rows: Row[] = [
  { id: '1', name: 'Ada Bello', mrn: 'LH-000001' },
  { id: '2', name: 'Chidi Eze', mrn: 'LH-000002' },
];
const columns: Column<Row>[] = [
  { id: 'name', header: 'Patient', sortKey: 'name', mobile: 'title', cell: (r) => r.name },
  { id: 'mrn', header: 'MRN', sortKey: 'mrn', mobile: 'meta', cell: (r) => r.mrn },
];
const base = { caption: 'Patients', columns, rowKey: (r: Row) => r.id, empty: <p>Nothing here</p> };
const table = () => screen.getAllByRole('table')[0]!;

describe('pageWindow', () => {
  it('shows every page when there are few', () => {
    expect(pageWindow(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('keeps first, last and neighbours with gaps for long lists', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 'gap-end', 20]);
    expect(pageWindow(10, 20)).toEqual([1, 'gap-start', 9, 10, 11, 'gap-end', 20]);
    expect(pageWindow(20, 20)).toEqual([1, 'gap-start', 17, 18, 19, 20]);
  });
});

describe('DataTable', () => {
  it('renders rows with an accessible name and marks the sorted column', () => {
    render(
      <DataTable
        {...base}
        rows={rows}
        sort={{ key: 'name', direction: 'asc' }}
        onSortChange={() => undefined}
      />,
    );
    expect(screen.getByRole('table', { name: 'Patients' })).toBeInTheDocument();
    expect(within(table()).getAllByRole('row')).toHaveLength(3); // header + 2
    expect(screen.getByRole('columnheader', { name: /Patient/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    expect(screen.getByRole('columnheader', { name: /MRN/ })).toHaveAttribute('aria-sort', 'none');
  });

  it('asks for the opposite direction when the active column is chosen again, and the first direction for a new one', async () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        {...base}
        rows={rows}
        sort={{ key: 'name', direction: 'asc' }}
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /Patient/ })).getByRole('button'),
    );
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', direction: 'desc' });
    await userEvent.click(
      within(screen.getByRole('columnheader', { name: /MRN/ })).getByRole('button'),
    );
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'mrn', direction: 'asc' });
  });

  it('keeps the layout while loading with skeleton rows and no data', () => {
    render(
      <DataTable {...base} rows={undefined} loading skeletonRows={4} pagination={undefined} />,
    );
    expect(within(table()).getAllByRole('row')).toHaveLength(5); // header + 4 skeletons
    expect(screen.queryByText('Ada Bello')).not.toBeInTheDocument();
  });

  it('shows the empty state, and the error state with a working retry', async () => {
    const { rerender } = render(<DataTable {...base} rows={[]} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    const onRetry = vi.fn();
    rerender(
      <DataTable
        {...base}
        rows={undefined}
        error={{ title: 'Could not load', message: 'Try again', onRetry }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('opens a row on click but not when a row action is used', async () => {
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    render(
      <DataTable
        {...base}
        rows={rows}
        onRowClick={onRowClick}
        rowActions={(r) => <button onClick={() => onAction(r.id)}>Act on {r.name}</button>}
      />,
    );
    await userEvent.click(within(table()).getByText('Chidi Eze'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
    await userEvent.click(within(table()).getByRole('button', { name: 'Act on Ada Bello' }));
    expect(onAction).toHaveBeenCalledWith('1');
    expect(onRowClick).toHaveBeenCalledOnce();
  });

  it('dims row actions only when asked, and keeps them available either way', () => {
    const actions = (r: { name: string }) => <button>Act on {r.name}</button>;
    const { rerender } = render(<DataTable {...base} rows={rows} rowActions={actions} />);
    const wrapper = () =>
      within(table()).getAllByRole('button', { name: /Act on/ })[0]!.parentElement!;
    expect(wrapper().className).not.toContain('opacity-50');
    rerender(<DataTable {...base} rows={rows} rowActions={actions} quietActions />);
    expect(wrapper().className).toContain('opacity-50');
    expect(wrapper().className).toContain('group-hover/row:opacity-100');
    expect(wrapper().className).toContain('group-focus-within/row:opacity-100');
    expect(within(table()).getAllByRole('button', { name: /Act on/ })).toHaveLength(rows.length);
  });

  it('applies a column width to the heading and every cell, so columns do not move between pages', () => {
    render(
      <DataTable
        {...base}
        rows={rows}
        columns={[
          { id: 'name', header: 'Patient', width: 'w-[38%]', mobile: 'title', cell: (r) => r.name },
          { id: 'mrn', header: 'MRN', mobile: 'meta', cell: (r) => r.mrn },
        ]}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Patient' }).className).toContain('w-[38%]');
    expect(within(table()).getByText('Ada Bello').closest('td')!.className).toContain('w-[38%]');
  });

  it('provides an equivalent record list and sort control for narrow screens', () => {
    render(
      <DataTable
        {...base}
        rows={rows}
        sort={{ key: 'name', direction: 'asc' }}
        onSortChange={() => undefined}
      />,
    );
    expect(screen.getAllByRole('list', { name: 'Patients' })[0]).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveValue('name:asc');
  });
});

describe('Pagination', () => {
  const props = {
    pageSize: 25,
    total: 243,
    totalPages: 10,
    itemLabel: 'patients',
    onPageChange: () => undefined,
  };

  it('summarises the visible range', () => {
    const { rerender } = render(<Pagination {...props} page={2} />);
    expect(screen.getByText('26–50 of 243 patients')).toBeInTheDocument();
    rerender(<Pagination {...props} page={10} />);
    expect(screen.getByText('226–243 of 243 patients')).toBeInTheDocument();
  });

  it('disables backward controls on the first page and forward controls on the last', () => {
    const { rerender } = render(<Pagination {...props} page={1} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'First page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
    rerender(<Pagination {...props} page={10} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Last page' })).toBeDisabled();
  });

  it('navigates by number, neighbour, first and last, and marks the current page', async () => {
    const onPageChange = vi.fn();
    render(<Pagination {...props} page={5} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Page 5' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    await userEvent.click(screen.getByRole('button', { name: 'First page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Last page' }));
    expect(onPageChange).toHaveBeenLastCalledWith(10);
    await userEvent.click(screen.getByRole('button', { name: 'Page 6' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
  });

  it('offers page sizes and reports a change', async () => {
    const onPageSizeChange = vi.fn();
    render(<Pagination {...props} page={1} onPageSizeChange={onPageSizeChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('shows no page controls for an empty or single-page list', () => {
    const { rerender } = render(<Pagination {...props} page={1} total={0} totalPages={1} />);
    expect(screen.getByText('0 patients')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    rerender(<Pagination {...props} page={1} total={7} totalPages={1} />);
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });
});
