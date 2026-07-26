import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import type { PatientDocument } from "@qyou/shared";
import { DocumentCard } from "../components/DocumentCard";
import { listPatientDocuments, deletePatientDocument } from "../api/patient-documents.api";

interface PatientDocumentsScreenProps {
  patientId: string;
  onUploadPress?: () => void;
}

export function PatientDocumentsScreen({ patientId, onUploadPress }: PatientDocumentsScreenProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await listPatientDocuments(patientId);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  const handleDelete = async (documentId: string) => {
    try {
      await deletePatientDocument(patientId, documentId);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  const renderDocument = ({ item }: { item: PatientDocument }) => (
    <DocumentCard document={item} onDelete={handleDelete} />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Patient Documents</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={onUploadPress}>
          <Text style={styles.uploadButtonText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#006d77" />
        </View>
      ) : documents.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No documents found.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          renderItem={renderDocument}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f2e8",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#13202b",
  },
  uploadButton: {
    backgroundColor: "#006d77",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#5d6a73",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
