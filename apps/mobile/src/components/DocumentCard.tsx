import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { PatientDocument, DocumentCategory } from "@qyou/shared";

interface DocumentCardProps {
  document: PatientDocument;
  onPress?: (documentId: string) => void;
  onDelete?: (documentId: string) => void;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_report: "Lab Report",
  prescription: "Prescription",
  imaging: "Imaging",
  discharge_summary: "Discharge Summary",
  other: "Other",
};

export function DocumentCard({ document, onPress, onDelete }: DocumentCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(document.id)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {document.title}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{CATEGORY_LABELS[document.category]}</Text>
        </View>
      </View>

      <Text style={styles.fileName} numberOfLines={1}>
        {document.attachment.fileName}
      </Text>

      <View style={styles.footer}>
        <Text style={styles.date}>
          {new Date(document.uploadedAt).toLocaleDateString()}
        </Text>
        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(document.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      {document.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {document.notes}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(19, 32, 43, 0.12)",
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#13202b",
    flex: 1,
    marginRight: 8,
  },
  badge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1d4ed8",
  },
  fileName: {
    fontSize: 13,
    color: "#5d6a73",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    color: "#5d6a73",
  },
  deleteText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#b91c1c",
  },
  notes: {
    marginTop: 8,
    fontSize: 13,
    color: "#5d6a73",
    fontStyle: "italic",
  },
});
