'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPatientSchema,
  updatePatientSchema,
  type CreatePatientInput,
  type UpdatePatientInput,
  type PatientDemographics,
} from '@qyou/shared';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

interface PatientDemographicsFormProps {
  patient?: PatientDemographics;
  onSubmit: (data: CreatePatientInput | UpdatePatientInput) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const fieldStyle: React.CSSProperties = {
  display: 'grid',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#1e293b',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: '40px',
  padding: '0 12px',
  borderRadius: '10px',
  border: '1px solid rgba(19, 32, 43, 0.12)',
  background: 'rgba(255, 255, 255, 0.88)',
  fontSize: '0.95rem',
};

const errorStyle: React.CSSProperties = {
  color: '#b3261e',
  fontSize: '0.8rem',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '16px 0 8px',
  fontSize: '0.9rem',
  fontWeight: 700,
  color: '#5d6a73',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export function PatientDemographicsForm({
  patient,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: PatientDemographicsFormProps) {
  const isEditing = !!patient;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePatientInput>({
    resolver: zodResolver(isEditing ? updatePatientSchema : createPatientSchema),
    defaultValues: patient
      ? {
          firstName: patient.firstName,
          lastName: patient.lastName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          bloodType: patient.bloodType ?? '',
          phone: patient.phone ?? '',
          email: patient.email ?? '',
          address: patient.address ?? undefined,
          emergencyContact: patient.emergencyContact,
        }
      : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
        {isEditing ? 'Edit Patient Demographics' : 'New Patient Demographics'}
      </h3>

      <div style={sectionTitleStyle}>Personal Information</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>First Name *</label>
          <input {...register('firstName')} style={inputStyle} placeholder="First name" />
          {errors.firstName && <span style={errorStyle}>{errors.firstName.message}</span>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Last Name *</label>
          <input {...register('lastName')} style={inputStyle} placeholder="Last name" />
          {errors.lastName && <span style={errorStyle}>{errors.lastName.message}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Date of Birth *</label>
          <input {...register('dateOfBirth')} type="date" style={inputStyle} />
          {errors.dateOfBirth && <span style={errorStyle}>{errors.dateOfBirth.message}</span>}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Gender *</label>
          <select {...register('gender')} style={inputStyle}>
            <option value="">Select gender</option>
            {genderOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.gender && <span style={errorStyle}>{errors.gender.message}</span>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Blood Type</label>
          <input {...register('bloodType')} style={inputStyle} placeholder="e.g. O+, A-" />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Phone</label>
          <input {...register('phone')} style={inputStyle} placeholder="+1-555-0100" />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Email</label>
        <input {...register('email')} type="email" style={inputStyle} placeholder="patient@example.com" />
        {errors.email && <span style={errorStyle}>{errors.email.message}</span>}
      </div>

      <div style={sectionTitleStyle}>Address</div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Street</label>
        <input {...register('address.street')} style={inputStyle} placeholder="123 Main St" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>City</label>
          <input {...register('address.city')} style={inputStyle} placeholder="City" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>State</label>
          <input {...register('address.state')} style={inputStyle} placeholder="State" />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Zip Code</label>
          <input {...register('address.zipCode')} style={inputStyle} placeholder="12345" />
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Country</label>
        <input {...register('address.country')} style={inputStyle} placeholder="Country" />
      </div>

      <div style={sectionTitleStyle}>Emergency Contact</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Contact Name *</label>
          <input {...register('emergencyContact.name')} style={inputStyle} placeholder="Contact name" />
          {errors.emergencyContact?.name && (
            <span style={errorStyle}>{errors.emergencyContact.name.message}</span>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Relationship *</label>
          <input {...register('emergencyContact.relationship')} style={inputStyle} placeholder="Spouse, Parent, etc." />
          {errors.emergencyContact?.relationship && (
            <span style={errorStyle}>{errors.emergencyContact.relationship.message}</span>
          )}
        </div>
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>Contact Phone *</label>
        <input {...register('emergencyContact.phoneNumber')} style={inputStyle} placeholder="+1-555-0100" />
        {errors.emergencyContact?.phoneNumber && (
          <span style={errorStyle}>{errors.emergencyContact.phoneNumber.message}</span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '999px',
              border: '1px solid rgba(19, 32, 43, 0.12)',
              background: 'rgba(255, 255, 255, 0.88)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '10px 20px',
            borderRadius: '999px',
            border: '1px solid transparent',
            background: '#006d77',
            color: '#fff',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Patient' : 'Create Patient'}
        </button>
      </div>
    </form>
  );
}
