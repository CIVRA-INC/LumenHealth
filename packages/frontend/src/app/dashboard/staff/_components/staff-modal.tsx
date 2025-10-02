'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StaffForm } from './staff-form';
import { StaffMember } from './staff-table';
import { useRef } from 'react';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  staffData: StaffMember | null;
}

export function StaffModal({ isOpen, onClose, onSave, staffData }: StaffModalProps) {
  const formRef = useRef<{ submit: () => void }>(null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staffData ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
        </DialogHeader>
        <StaffForm
          ref={formRef}
          onSubmit={onSave}
          initialData={staffData}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => formRef.current?.submit()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}