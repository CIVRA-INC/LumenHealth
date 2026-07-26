import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { PatientDemographicRecord } from '@qyou/shared';
import { PatientDemographicsForm } from '../components/PatientDemographicsForm';
import { fetchDemographics, updateDemographics } from '../api/patient-demographics.api';

const DEMO_PATIENT_ID = 'patient_401';

const genderLabel: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  non_binary: 'Non-Binary',
  other: 'Other',
  prefer_not_to_say: 'Prefer Not to Say',
};

export function PatientDemographicsScreen() {
  const [record, setRecord] = useState<PatientDemographicRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemographics(DEMO_PATIENT_ID)
      .then(setRecord)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(data: PatientDemographicRecord) {
    try {
      const updated = await updateDemographics(DEMO_PATIENT_ID, data);
      setRecord(updated);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#006d77" />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !record) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (editing && record) {
    return (
      <SafeAreaView style={styles.screen}>
        <PatientDemographicsForm
          initialData={record}
          onSubmit={handleSave}
          onCancel={() => setEditing(false)}
        />
      </SafeAreaView>
    );
  }

  if (!record) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.heading}>Patient Demographics</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <FieldRow label="First Name" value={record.firstName} />
          <FieldRow label="Last Name" value={record.lastName} />
          <FieldRow label="Date of Birth" value={record.dateOfBirth} />
          <FieldRow label="Gender" value={genderLabel[record.gender] ?? record.gender} />
          <FieldRow label="Blood Type" value={record.bloodType ?? '—'} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Emergency Contact</Text>
          <FieldRow label="Name" value={record.emergencyContact.name} />
          <FieldRow label="Relationship" value={record.emergencyContact.relationship} />
          <FieldRow label="Phone" value={record.emergencyContact.phoneNumber} />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f2e8' },
  scrollContent: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heading: { fontSize: 18, fontWeight: '600', color: '#13202b' },
  editButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, backgroundColor: '#2563eb' },
  editButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(19,32,43,0.12)', backgroundColor: 'rgba(255,255,255,0.76)', marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '500', color: '#64748b', marginBottom: 8 },
  fieldRow: { marginBottom: 8 },
  fieldLabel: { fontSize: 11, color: '#64748b' },
  fieldValue: { fontSize: 14, color: '#13202b', marginTop: 2 },
  errorText: { color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 16 },
});
