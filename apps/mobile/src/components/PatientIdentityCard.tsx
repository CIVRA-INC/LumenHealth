import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PatientIdentity } from "@qyou/shared";

interface PatientIdentityCardProps {
  patient: PatientIdentity;
}

export function PatientIdentityCard({ patient }: PatientIdentityCardProps) {
  const statusColor =
    patient.status === "active"
      ? "#15803d"
      : patient.status === "deceased"
        ? "#b91c1c"
        : patient.status === "pending_verification"
          ? "#b45309"
          : "#64748b";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.name}>
            {patient.firstName} {patient.lastName}
          </Text>
          <Text style={styles.mrn}>MRN: {patient.mrn}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + "14" }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>
            {patient.status.replace("_", " ").toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.detailText}>
          <Text style={styles.label}>DOB: </Text>
          {patient.dateOfBirth}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.label}>Gender: </Text>
          {patient.gender.replace("_", " ")}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  mrn: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  details: {
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#334155",
  },
  label: {
    color: "#64748b",
  },
});
