import React from "react";
import { SafeAreaView, Text, StyleSheet } from "react-native";
import { PatientIdentityCard } from "../components/PatientIdentityCard";
import { mockMobilePatientIdentityFixture } from "../fixtures/patient-identity.fixture";

export function PatientIdentityScreen() {
  const patient = mockMobilePatientIdentityFixture.records[0];

  if (!patient) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.empty}>Patient not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.heading}>Patient Identity</Text>
      <PatientIdentityCard patient={patient} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f2e8",
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    color: "#13202b",
    marginBottom: 12,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    color: "#5d6a73",
  },
});
