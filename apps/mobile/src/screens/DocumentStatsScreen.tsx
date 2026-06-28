import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function DocumentStatsScreen({ patientId }: { patientId: string }) {
  const [stats, setStats] = useState<Record<string,number>>({});
  useEffect(() => {
    fetch(`/api/patients/${patientId}/documents/stats`)
      .then(r => r.json()).then(setStats).catch(() => {});
  }, [patientId]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Summary</Text>
      {Object.entries(stats).map(([k, v]) => (
        <View key={k} style={styles.row}>
          <Text style={styles.label}>{k}</Text>
          <Text style={styles.val}>{v}</Text>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 14, color: '#555', textTransform: 'capitalize' },
  val:   { fontSize: 14, fontWeight: '600', color: '#111' },
});
