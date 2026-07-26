"use client";

import { useState } from "react";
import type { PatientSummary, UpdateDemographicsPayload } from "../../app/patients/api";

type Props = {
  patient: PatientSummary;
  onSave: (data: UpdateDemographicsPayload) => Promise<void>;
  onCancel: () => void;
};

export function PatientDemographicsForm({ patient, onSave, onCancel }: Props) {
  const [firstName, setFirstName] = useState(patient.firstName);
  const [lastName, setLastName] = useState(patient.lastName);
  const [dateOfBirth, setDateOfBirth] = useState(patient.dateOfBirth);
  const [gender, setGender] = useState(patient.gender);
  const [bloodType, setBloodType] = useState(patient.bloodType ?? "");
  const [emergencyName, setEmergencyName] = useState(
    patient.emergencyContact.name,
  );
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    patient.emergencyContact.relationship,
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    patient.emergencyContact.phoneNumber,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const GENDER_OPTIONS = [
    "male",
    "female",
    "non_binary",
    "other",
    "prefer_not_to_say",
  ];

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "First name is required.";
    if (!lastName.trim()) errs.lastName = "Last name is required.";
    if (!dateOfBirth.trim()) errs.dateOfBirth = "Date of birth is required.";
    if (!gender) errs.gender = "Gender is required.";
    if (!emergencyName.trim())
      errs.emergencyName = "Emergency contact name is required.";
    if (!emergencyRelationship.trim())
      errs.emergencyRelationship = "Relationship is required.";
    if (!emergencyPhone.trim() || emergencyPhone.trim().length < 5)
      errs.emergencyPhone = "Valid phone number is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth.trim(),
        gender,
        bloodType: bloodType.trim() || undefined,
        emergencyContact: {
          name: emergencyName.trim(),
          relationship: emergencyRelationship.trim(),
          phoneNumber: emergencyPhone.trim(),
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="auditFilters">
        <label>
          First Name
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        {errors.firstName && <span className="muted">{errors.firstName}</span>}

        <label>
          Last Name
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
        {errors.lastName && <span className="muted">{errors.lastName}</span>}

        <label>
          Date of Birth
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </label>
        {errors.dateOfBirth && (
          <span className="muted">{errors.dateOfBirth}</span>
        )}

        <label>
          Gender
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Select...</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        {errors.gender && <span className="muted">{errors.gender}</span>}

        <label>
          Blood Type
          <input
            type="text"
            value={bloodType}
            onChange={(e) => setBloodType(e.target.value)}
            placeholder="e.g. O+"
          />
        </label>

        <label>
          Emergency Contact Name
          <input
            type="text"
            value={emergencyName}
            onChange={(e) => setEmergencyName(e.target.value)}
          />
        </label>
        {errors.emergencyName && (
          <span className="muted">{errors.emergencyName}</span>
        )}

        <label>
          Relationship
          <input
            type="text"
            value={emergencyRelationship}
            onChange={(e) => setEmergencyRelationship(e.target.value)}
          />
        </label>
        {errors.emergencyRelationship && (
          <span className="muted">{errors.emergencyRelationship}</span>
        )}

        <label>
          Phone Number
          <input
            type="tel"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
          />
        </label>
        {errors.emergencyPhone && (
          <span className="muted">{errors.emergencyPhone}</span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
