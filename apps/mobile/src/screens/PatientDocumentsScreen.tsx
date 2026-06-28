import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface Doc { id: string; fileName: string; documentType: string; status: string; }

export function PatientDocumentsScreen({ patientId }: { patientId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/patients/${patientId}/documents`)
      .then(r => r.json()).then(setDocs).finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documents</Text>
      <FlatList
        data={docs}
        keyExtractor={d => d.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>{item.fileName}</Text>
            <Text style={[styles.badge, item.status === 'active' ? styles.active : styles.inactive]}>
              {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No documents</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  name: { flex: 1, fontSize: 14, color: '#333' },
  badge: { fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  active: { backgroundColor: '#d1fae5', color: '#065f46' },
  inactive: { backgroundColor: '#fee2e2', color: '#991b1b' },
  empty: { textAlign: 'center', color: '#999', marginTop: 24 },
});
