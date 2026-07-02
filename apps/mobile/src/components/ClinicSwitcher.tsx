import React, { useCallback, useSyncExternalStore } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  getClinics,
  getActiveClinicId,
  switchClinic,
  subscribe,
  type ClinicOption,
} from "../store/clinic-switcher";

function useClinics(): { clinics: ClinicOption[]; activeId: string | null } {
  const clinics = useSyncExternalStore(subscribe, getClinics, getClinics);
  const activeId = useSyncExternalStore(
    subscribe,
    getActiveClinicId,
    getActiveClinicId,
  );
  return { clinics, activeId };
}

export function ClinicSwitcher() {
  const { clinics, activeId } = useClinics();

  const handleSwitch = useCallback((clinicId: string) => {
    switchClinic(clinicId);
  }, []);

  if (clinics.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No clinics available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Switch clinic</Text>
      {clinics.map((clinic) => {
        const isActive = clinic.clinicId === activeId;
        return (
          <TouchableOpacity
            key={clinic.clinicId}
            style={[styles.item, isActive && styles.activeItem]}
            onPress={() => handleSwitch(clinic.clinicId)}
            disabled={isActive}
          >
            <View style={styles.row}>
              <Text style={[styles.name, isActive && styles.activeName]}>
                {clinic.name}
              </Text>
              <Text style={styles.role}>{clinic.role}</Text>
            </View>
            {isActive && <Text style={styles.badge}>Active</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#13202b",
  },
  empty: {
    fontSize: 14,
    color: "#5d6a73",
  },
  item: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(19, 32, 43, 0.12)",
    marginBottom: 8,
    backgroundColor: "rgba(255, 255, 255, 0.76)",
  },
  activeItem: {
    borderColor: "#006d77",
    backgroundColor: "rgba(0, 109, 119, 0.08)",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "500",
    color: "#13202b",
  },
  activeName: {
    color: "#006d77",
  },
  role: {
    fontSize: 13,
    color: "#5d6a73",
    textTransform: "capitalize",
  },
  badge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#006d77",
  },
});
