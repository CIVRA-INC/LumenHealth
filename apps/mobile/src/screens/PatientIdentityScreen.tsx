import React, { useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, StyleSheet } from "react-native";
import { PatientIdentityForm } from "../components/PatientIdentityForm";
import type { PatientIdentityFormData } from "../components/PatientIdentityForm";
import { samplePatientIdentity } from "../fixtures/patient-identity.fixture";

export function PatientIdentityScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [savedData, setSavedData] = useState<PatientIdentityFormData>({
    firstName: samplePatientIdentity.firstName,
    lastName: samplePatientIdentity.lastName,
    dateOfBirth: samplePatientIdentity.dateOfBirth,
    gender: samplePatientIdentity.gender,
    mrn: samplePatientIdentity.mrn,
    phone: samplePatientIdentity.phone,
    email: samplePatientIdentity.email,
    address: samplePatientIdentity.address,
  });

  const handleSubmit = (data: PatientIdentityFormData) => {
    setSavedData(data);
    setIsEditing(false);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.heading}>Patient Identity</Text>
      <TouchableOpacity
        style={[styles.toggleButton, isEditing && styles.toggleButtonActive]}
        onPress={() => setIsEditing(!isEditing)}
        accessibilityLabel={isEditing ? "Cancel editing" : "Edit identity"}
      >
        <Text style={[styles.toggleButtonText, isEditing && styles.toggleButtonTextActive]}>
          {isEditing ? "Cancel" : "Edit"}
        </Text>
      </TouchableOpacity>
      <PatientIdentityForm
        initialData={savedData}
        editable={isEditing}
        onSubmit={isEditing ? handleSubmit : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f2e8",
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#13202b",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  toggleButton: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#006d77",
    alignSelf: "flex-start",
  },
  toggleButtonActive: {
    backgroundColor: "#006d77",
  },
  toggleButtonText: {
    color: "#006d77",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleButtonTextActive: {
    color: "#ffffff",
  },
});
