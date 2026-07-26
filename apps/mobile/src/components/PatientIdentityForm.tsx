import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

export type PatientIdentityFormData = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  mrn: string;
  phone: string;
  email: string;
  address: string;
};

type Props = {
  initialData?: PatientIdentityFormData;
  editable?: boolean;
  onSubmit?: (data: PatientIdentityFormData) => void;
};

export function PatientIdentityForm({
  initialData,
  editable = true,
  onSubmit,
}: Props) {
  const [formData, setFormData] = useState<PatientIdentityFormData>(
    initialData ?? {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      mrn: "",
      phone: "",
      email: "",
      address: "",
    }
  );

  const handleChange = (field: keyof PatientIdentityFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSubmit?.(formData);
  };

  return (
    <ScrollView style={styles.container}>
      <Field label="First Name" value={formData.firstName} editable={editable} onChange={(v) => handleChange("firstName", v)} />
      <Field label="Last Name" value={formData.lastName} editable={editable} onChange={(v) => handleChange("lastName", v)} />
      <Field label="Date of Birth" value={formData.dateOfBirth} editable={editable} onChange={(v) => handleChange("dateOfBirth", v)} placeholder="YYYY-MM-DD" />
      <Field label="Gender" value={formData.gender} editable={editable} onChange={(v) => handleChange("gender", v)} />
      <Field label="MRN" value={formData.mrn} editable={editable} onChange={(v) => handleChange("mrn", v)} />
      <Field label="Phone" value={formData.phone} editable={editable} onChange={(v) => handleChange("phone", v)} keyboardType="phone-pad" />
      <Field label="Email" value={formData.email} editable={editable} onChange={(v) => handleChange("email", v)} keyboardType="email-address" />
      <Field label="Address" value={formData.address} editable={editable} onChange={(v) => handleChange("address", v)} multiline />

      {editable && onSubmit && (
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Save</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Field({
  label,
  value,
  editable,
  onChange,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address";
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputDisabled, multiline && styles.multiline]}
        value={value}
        onChangeText={onChange}
        editable={editable}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#13202b",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(19, 32, 43, 0.12)",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#13202b",
    backgroundColor: "rgba(255, 255, 255, 0.76)",
  },
  inputDisabled: {
    backgroundColor: "rgba(247, 242, 232, 0.6)",
    color: "#5d6a73",
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#006d77",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
