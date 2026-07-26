import { describe, it, expect, vi } from "vitest";

vi.mock("react-native", () => ({
  SafeAreaView: "SafeAreaView",
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  TouchableOpacity: "TouchableOpacity",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: Record<string, unknown>) => s },
}));

vi.mock("react", () => {
  let state: Record<string, unknown> = {};
  return {
    useState: (initial: unknown) => [state as unknown ?? initial, vi.fn()],
    default: { createElement: vi.fn(), Fragment: "Fragment" },
  };
});

import { PatientIdentityScreen } from "../screens/PatientIdentityScreen";
import { PatientIdentityForm } from "../components/PatientIdentityForm";
import { samplePatientIdentity } from "../fixtures/patient-identity.fixture";

describe("PatientIdentityScreen", () => {
  it("exports a screen component", () => {
    expect(typeof PatientIdentityScreen).toBe("function");
  });

  it("screen renders without crashing", () => {
    const result = PatientIdentityScreen();
    expect(result).toBeDefined();
  });
});

describe("PatientIdentityForm", () => {
  it("exports a form component", () => {
    expect(typeof PatientIdentityForm).toBe("function");
  });

  it("form renders without crashing", () => {
    const result = PatientIdentityForm({
      initialData: {
        firstName: samplePatientIdentity.firstName,
        lastName: samplePatientIdentity.lastName,
        dateOfBirth: samplePatientIdentity.dateOfBirth,
        gender: samplePatientIdentity.gender,
        mrn: samplePatientIdentity.mrn,
        phone: samplePatientIdentity.phone,
        email: samplePatientIdentity.email,
        address: samplePatientIdentity.address,
      },
      editable: false,
    });
    expect(result).toBeDefined();
  });

  it("renders with editable mode", () => {
    const onSubmit = vi.fn();
    const result = PatientIdentityForm({
      editable: true,
      onSubmit,
    });
    expect(result).toBeDefined();
  });
});

describe("patient-identity fixture", () => {
  it("has required identity fields", () => {
    expect(samplePatientIdentity.patientId).toBe("patient_831_001");
    expect(samplePatientIdentity.firstName).toBe("Elena");
    expect(samplePatientIdentity.lastName).toBe("Rodriguez");
    expect(samplePatientIdentity.mrn).toBe("MRN-20240001");
    expect(samplePatientIdentity.email).toContain("@");
  });
});
