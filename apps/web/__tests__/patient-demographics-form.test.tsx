import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { PatientDemographicRecord } from '@qyou/shared';
import { PatientDemographicsForm } from '../src/components/patient-demographics-form';

const sampleRecord: PatientDemographicRecord = {
  patientId: 'patient_401',
  firstName: 'Jane',
  lastName: 'Doe',
  dateOfBirth: '1992-05-14',
  gender: 'female',
  bloodType: 'O+',
  emergencyContact: {
    name: 'John Doe',
    relationship: 'Spouse',
    phoneNumber: '+1-555-0199',
  },
};

describe('PatientDemographicsForm', () => {
  it('renders all form fields with correct labels', () => {
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Blood Type')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
  });

  it('pre-fills fields with initial data', () => {
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1992-05-14')).toBeInTheDocument();
    expect(screen.getByDisplayValue('O+')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Spouse')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1-555-0199')).toBeInTheDocument();
  });

  it('shows validation error when required fields are cleared', () => {
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('Jane'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('First name is required.')).toBeInTheDocument();
  });

  it('shows validation error for short phone number', () => {
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('+1-555-0199'), { target: { value: '123' } });
    fireEvent.click(screen.getByText('Save'));

    expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
  });

  it('calls onSubmit with valid data on successful submission', () => {
    const onSubmit = vi.fn();
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.click(screen.getByText('Save'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }));
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clears validation error when field is updated after error', () => {
    render(<PatientDemographicsForm initialData={sampleRecord} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('Jane'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Save'));
    expect(screen.getByText('First name is required.')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue(''), { target: { value: 'Alice' } });
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument();
  });
});
