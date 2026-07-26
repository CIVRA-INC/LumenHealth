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
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { fetchDemographics, type PatientDemographics } from "../api/patient-demographics.api";

type Props = {
  patientId: string;
  onEdit?: (patientId: string) => void;
};

export function PatientDemographicsScreen({ patientId, onEdit }: Props) {
  const [data, setData] = useState<PatientDemographics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDemographics(patientId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demographics");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#006d77" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No demographics found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {data.firstName} {data.lastName}
        </Text>
        <TouchableOpacity style={styles.editButton} onPress={() => onEdit?.(patientId)}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Date of Birth</Text>
        <Text style={styles.value}>{data.dateOfBirth}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Gender</Text>
        <Text style={styles.value}>{data.gender.replace(/_/g, " ")}</Text>
      </View>

      {data.bloodType && (
        <View style={styles.section}>
          <Text style={styles.label}>Blood Type</Text>
          <Text style={styles.value}>{data.bloodType}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Emergency Contact</Text>
        <Text style={styles.value}>{data.emergencyContact.name}</Text>
        <Text style={styles.subValue}>
          {data.emergencyContact.relationship} · {data.emergencyContact.phoneNumber}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f2e8",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f2e8",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: "600",
    color: "#13202b",
  },
  editButton: {
    backgroundColor: "#006d77",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: "#13202b",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    color: "#5d6a73",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: "#13202b",
  },
  subValue: {
    fontSize: 14,
    color: "#5d6a73",
    marginTop: 2,
  },
  errorText: {
    fontSize: 16,
    color: "#c0392b",
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#006d77",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#5d6a73",
  },
});
