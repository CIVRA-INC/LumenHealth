'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { forwardRef, useImperativeHandle } from 'react';
import { StaffMember } from './staff-table';

const staffRoles = [ 'Doctor', 'Nurse', 'Pharmacist', 'CHW', 'ClinicAdmin' ];

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.string().min(1, 'Role is required'),
});

interface StaffFormProps {
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  initialData: StaffMember | null;
}

export const StaffForm = forwardRef(({ onSubmit, initialData }: StaffFormProps, ref) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      password: '',
      role: initialData?.role || '',
    },
  });

  useImperativeHandle(ref, () => ({
    submit: form.handleSubmit(onSubmit),
  }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form Fields for firstName, lastName, email, password, role */}
        <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl><Input placeholder="Aisha" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl><Input placeholder="Bello" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input placeholder="a.bello@clinic.com" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
        {!initialData && (
             <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
        )}
        <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                    <SelectContent>
                        {staffRoles.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
      </form>
    </Form>
  );
});

StaffForm.displayName = 'StaffForm';