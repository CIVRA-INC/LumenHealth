import { zodResolver } from '@hookform/resolvers/zod';
import {
  inviteStaffSchema,
  ROLES,
  ROLE_LABELS,
  type BranchSummary,
  type InvitationView,
  type InviteStaffInput,
} from '@lumen/contracts';
import { Alert, Button, Dialog, DialogContent, FormField, Select, TextField } from '@lumen/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { ApiError, api } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import { announceInvitation, invitationKeys } from '../onboarding/invitations-table';

/** Invite someone by email. They choose their own password, so no credential is ever typed or shared here. */
export function InviteStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useQueryClient();
  const branches = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: () => api.get<BranchSummary[]>('/branches'),
    staleTime: 60_000,
  });
  const form = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { email: '', fullName: '', role: 'FRONT_DESK', branchIds: [] },
  });
  const { errors } = form.formState;
  const invite = useMutation({
    mutationFn: (v: InviteStaffInput) => api.post<InvitationView>('/admin/invitations', v),
    onSuccess: async (inv) => {
      announceInvitation(inv, 'created');
      await client.invalidateQueries({ queryKey: invitationKeys });
      await client.invalidateQueries({ queryKey: ['admin'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      if (error instanceof ApiError)
        for (const [path, message] of Object.entries(error.fieldErrors))
          form.setError(path as keyof InviteStaffInput, { message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Invite a staff member"
        description="They’ll get an email with a one-time link to set their own password."
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={invite.isPending}
              onClick={form.handleSubmit((v) => invite.mutate(v))}
            >
              Send invitation
            </Button>
          </>
        }
      >
        <form noValidate className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {invite.isError && !(invite.error instanceof ApiError && invite.error.status === 400) && (
            <Alert tone="danger">{errorMessage(invite.error)}</Alert>
          )}
          <FormField label="Full name" required error={errors.fullName?.message}>
            <TextField autoComplete="off" {...form.register('fullName')} />
          </FormField>
          <FormField label="Work email" required error={errors.email?.message}>
            <TextField type="email" autoComplete="off" {...form.register('email')} />
          </FormField>
          <FormField label="Role" required error={errors.role?.message}>
            <Select {...form.register('role')}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Branches" required error={errors.branchIds?.message}>
            <Controller
              control={form.control}
              name="branchIds"
              render={({ field }) => (
                <fieldset className="space-y-2">
                  <legend className="sr-only">Branches</legend>
                  {(branches.data ?? []).map((b) => (
                    <label key={b.id} className="flex items-center gap-2.5 text-base text-ink-800">
                      <input
                        type="checkbox"
                        className="size-4 accent-green-700"
                        checked={field.value.includes(b.id)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked
                              ? [...field.value, b.id]
                              : field.value.filter((id) => id !== b.id),
                          )
                        }
                      />
                      {b.name}
                    </label>
                  ))}
                </fieldset>
              )}
            />
          </FormField>
        </form>
      </DialogContent>
    </Dialog>
  );
}
