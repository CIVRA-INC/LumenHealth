import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { ClinicSwitcher } from "../components/ClinicSwitcher";

export function ClinicSwitcherScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ClinicSwitcher />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f2e8",
  },
});
