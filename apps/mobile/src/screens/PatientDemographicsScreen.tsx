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
