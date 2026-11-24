import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './overlay';

describe('ConfirmDialog', () => {
  it('keeps a consequential action disabled until it is acknowledged', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Sign this encounter?"
        description="The record will be locked."
        confirmLabel="Sign"
        requireAcknowledgement="I have reviewed it."
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Sign' });
    expect(confirm).toBeDisabled();
    await userEvent.click(screen.getByLabelText('I have reviewed it.'));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('has an accessible name and description, and can be cancelled', async () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Cancel appointment"
        description="This removes the patient from the queue."
        confirmLabel="Cancel appointment"
        onConfirm={() => undefined}
      />,
    );
    expect(
      screen.getByRole('alertdialog', { name: 'Cancel appointment' }),
    ).toHaveAccessibleDescription('This removes the patient from the queue.');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
