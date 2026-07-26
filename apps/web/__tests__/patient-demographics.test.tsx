import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { PatientDemographicRecord } from '@qyou/shared';
import { PatientDemographicsCard } from '../src/components/patient-demographics-card';

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

describe('PatientDemographicsCard', () => {
  it('renders all demographics fields in read-only mode', () => {
    render(<PatientDemographicsCard record={sampleRecord} />);

    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
    expect(screen.getByText('1992-05-14')).toBeInTheDocument();
    expect(screen.getByText('Female')).toBeInTheDocument();
    expect(screen.getByText('O+')).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('shows "—" for optional bloodType when not provided', () => {
    const noBloodType = { ...sampleRecord, bloodType: undefined };
    render(<PatientDemographicsCard record={noBloodType} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('switches to edit mode when Edit button is clicked', () => {
    render(<PatientDemographicsCard record={sampleRecord} />);

    fireEvent.click(screen.getByText('Edit'));

    expect(screen.getByText('Edit Demographics')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane')).toBeInTheDocument();
  });

  it('calls onSave with updated data when form is submitted', () => {
    const onSave = vi.fn();
    render(<PatientDemographicsCard record={sampleRecord} onSave={onSave} />);

    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Save'));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ patientId: 'patient_401' }));
  });

  it('returns to read-only mode when Cancel is clicked', () => {
    render(<PatientDemographicsCard record={sampleRecord} />);

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Edit Demographics')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Patient Demographics')).toBeInTheDocument();
  });
});
