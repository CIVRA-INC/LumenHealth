import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { getActivePatient } from "../store/patient-demographics.js";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function PatientDemographicsScreen() {
  const patient = getActivePatient();

  if (!patient) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.empty}>No patient selected.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>
          {patient.firstName} {patient.lastName}
        </Text>

        <Field label="Patient ID" value={patient.patientId} />
        <Field label="Date of Birth" value={patient.dateOfBirth} />
        <Field label="Gender" value={patient.gender} />
        <Field label="Blood Type" value={patient.bloodType} />
        <Field label="Phone" value={patient.phone} />
        <Field label="Email" value={patient.email} />
        <Field label="Address" value={patient.address} />
        <Field label="MRN" value={patient.medicalRecordNumber} />
        <Field label="Clinic ID" value={patient.clinicId} />

        <Text style={styles.sectionTitle}>Emergency Contact</Text>
        <Field label="Name" value={patient.emergencyContact.name} />
        <Field label="Relationship" value={patient.emergencyContact.relationship} />
        <Field label="Phone" value={patient.emergencyContact.phoneNumber} />

        <Text style={styles.sectionTitle}>Insurance</Text>
        <Field label="Provider" value={patient.insuranceInfo.provider} />
        <Field label="Policy #" value={patient.insuranceInfo.policyNumber} />
        <Field label="Group #" value={patient.insuranceInfo.groupNumber} />

        <Field label="Created" value={patient.createdAt} />
        <Field label="Updated" value={patient.updatedAt} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f2e8" },
  container: { padding: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 16, color: "#1a1a1a" },
  field: { marginBottom: 12 },
  label: { fontSize: 12, color: "#888", marginBottom: 2 },
  value: { fontSize: 16, color: "#1a1a1a" },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 16, marginBottom: 8, color: "#333" },
  empty: { fontSize: 16, color: "#888", textAlign: "center", marginTop: 40 },
});
