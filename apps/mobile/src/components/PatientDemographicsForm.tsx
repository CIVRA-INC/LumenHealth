import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { PatientDemographicRecord, GenderCategory } from '@qyou/shared';

interface PatientDemographicsFormProps {
  initialData: PatientDemographicRecord;
  onSubmit: (data: PatientDemographicRecord) => void;
  onCancel: () => void;
}

const genderOptions: { value: GenderCategory; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-Binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
];

export function PatientDemographicsForm({ initialData, onSubmit, onCancel }: PatientDemographicsFormProps) {
  const [formData, setFormData] = useState<PatientDemographicRecord>({ ...initialData });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function handleContactChange(field: string, value: string) {
    setFormData((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`emergencyContact.${field}`];
      return next;
    });
  }

  function handleSubmit() {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = 'Date of birth is required.';
    if (!formData.emergencyContact.name.trim()) newErrors['emergencyContact.name'] = 'Contact name is required.';
    if (!formData.emergencyContact.relationship.trim()) newErrors['emergencyContact.relationship'] = 'Relationship is required.';
    if (formData.emergencyContact.phoneNumber.trim().length < 5) newErrors['emergencyContact.phoneNumber'] = 'Phone number is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Edit Demographics</Text>

      <Text style={styles.label}>First Name</Text>
      <TextInput style={styles.input} value={formData.firstName} onChangeText={(v) => handleChange('firstName', v)} />
      {errors.firstName && <Text style={styles.error}>{errors.firstName}</Text>}

      <Text style={styles.label}>Last Name</Text>
      <TextInput style={styles.input} value={formData.lastName} onChangeText={(v) => handleChange('lastName', v)} />
      {errors.lastName && <Text style={styles.error}>{errors.lastName}</Text>}

      <Text style={styles.label}>Date of Birth</Text>
      <TextInput style={styles.input} value={formData.dateOfBirth} onChangeText={(v) => handleChange('dateOfBirth', v)} placeholder="YYYY-MM-DD" />
      {errors.dateOfBirth && <Text style={styles.error}>{errors.dateOfBirth}</Text>}

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {genderOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.genderChip, formData.gender === opt.value && styles.genderChipActive]}
            onPress={() => handleChange('gender', opt.value)}
          >
            <Text style={[styles.genderChipText, formData.gender === opt.value && styles.genderChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Blood Type</Text>
      <TextInput style={styles.input} value={formData.bloodType ?? ''} onChangeText={(v) => handleChange('bloodType', v)} placeholder="Optional" />

      <Text style={styles.sectionLabel}>Emergency Contact</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={formData.emergencyContact.name} onChangeText={(v) => handleContactChange('name', v)} />
      {errors['emergencyContact.name'] && <Text style={styles.error}>{errors['emergencyContact.name']}</Text>}

      <Text style={styles.label}>Relationship</Text>
      <TextInput style={styles.input} value={formData.emergencyContact.relationship} onChangeText={(v) => handleContactChange('relationship', v)} />
      {errors['emergencyContact.relationship'] && <Text style={styles.error}>{errors['emergencyContact.relationship']}</Text>}

      <Text style={styles.label}>Phone Number</Text>
      <TextInput style={styles.input} value={formData.emergencyContact.phoneNumber} onChangeText={(v) => handleContactChange('phoneNumber', v)} keyboardType="phone-pad" />
      {errors['emergencyContact.phoneNumber'] && <Text style={styles.error}>{errors['emergencyContact.phoneNumber']}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heading: { fontSize: 18, fontWeight: '600', color: '#13202b', marginBottom: 12 },
  label: { fontSize: 12, color: '#64748b', marginBottom: 4, marginTop: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b', marginTop: 16, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 10, fontSize: 14, backgroundColor: '#fff' },
  error: { color: '#dc2626', fontSize: 11, marginTop: 2 },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  genderChipActive: { borderColor: '#006d77', backgroundColor: 'rgba(0,109,119,0.08)' },
  genderChipText: { fontSize: 13, color: '#475569' },
  genderChipTextActive: { color: '#006d77', fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 32 },
  saveButton: { flex: 1, padding: 12, borderRadius: 6, backgroundColor: '#2563eb', alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelButton: { flex: 1, padding: 12, borderRadius: 6, backgroundColor: '#e2e8f0', alignItems: 'center' },
  cancelButtonText: { color: '#475569', fontSize: 14 },
});
