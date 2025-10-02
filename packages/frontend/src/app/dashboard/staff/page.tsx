'use client';

import useSWR from 'swr';
import { getStaff, createStaff, updateStaff, toggleStaffStatus } from '@/lib/api';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffTable, StaffMember } from './_components/staff-table';
import { useState } from 'react';
import { StaffModal } from './_components/staff-modal';
import { toast } from "sonner"


export default function StaffManagementPage() {
  const { data: staff, error, isLoading, mutate } = useSWR<StaffMember[]>('/staff', getStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const handleAddNew = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };
  
  const handleEdit = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setIsModalOpen(true);
  };
  
  const handleToggleStatus = async (staffId: string) => {
     try {
        await toggleStaffStatus(staffId);
        mutate(); // Re-fetch data
        toast.success("Staff status updated successfully!");
    } catch (error: any) {
        toast.error(error.message || "Failed to update staff status.");
    }
  }

  const handleSave = async (data: any) => {
     try {
        if (editingStaff) {
            await updateStaff(editingStaff._id, data);
            toast.success("Staff member updated successfully!");
        } else {
            await createStaff(data);
            toast.success("New staff member added successfully!");
        }
        mutate(); // Re-fetch data
        setIsModalOpen(false);
        setEditingStaff(null);
    } catch (error: any) {
         toast.error(error.message || "Failed to save staff member.");
    }
  };

  if (isLoading) return <div>Loading staff...</div>;
  if (error) return <div>Failed to load staff data.</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add New Staff
        </Button>
      </div>
      
      {staff && (
        <StaffTable 
            staff={staff}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
        />
      )}

      <StaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        staffData={editingStaff}
      />
    </div>
  );
}