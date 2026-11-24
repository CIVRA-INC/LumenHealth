import { ConfirmDialog } from '@lumen/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('ConfirmDialog for consequential actions', () => {
  it('keeps the action disabled until the user acknowledges it', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => undefined}
        title="Sign and lock this encounter?"
        description="After signing, the record is locked."
        confirmLabel="Sign encounter"
        requireAcknowledgement="I have reviewed this documentation."
        onConfirm={onConfirm}
      />,
    );
    const confirm = screen.getByRole('button', { name: 'Sign encounter' });
    expect(confirm).toBeDisabled();

    await userEvent.click(screen.getByLabelText('I have reviewed this documentation.'));
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('exposes an accessible name and description and can be cancelled', async () => {
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
