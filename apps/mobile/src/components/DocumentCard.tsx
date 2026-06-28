import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DocumentCardProps {
  fileName: string;
  documentType: string;
  status: string;
  fileSizeBytes: number;
  createdAt: string;
  onPress?: () => void;
}

export function DocumentCard({ fileName, documentType, status, fileSizeBytes, createdAt, onPress }: DocumentCardProps) {
  const sizeLabel = fileSizeBytes < 1024 ? `${fileSizeBytes}B`
    : fileSizeBytes < 1024**2 ? `${(fileSizeBytes/1024).toFixed(1)}KB`
    : `${(fileSizeBytes/1024**2).toFixed(1)}MB`;
  const isActive = status === 'active';
  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.7}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{fileName}</Text>
          <Text style={styles.meta}>{documentType.replace(/_/g,' ')} · {sizeLabel} · {new Date(createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.badge, isActive ? styles.active : styles.inactive]}>
          <Text style={[styles.badgeText, isActive ? styles.activeText : styles.inactiveText]}>{status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  row:  { flexDirection: 'row', alignItems: 'center' },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 14, fontWeight: '600', color: '#111' },
  meta: { fontSize: 11, color: '#888', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  active: { backgroundColor: '#d1fae5' }, inactive: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  activeText: { color: '#065f46' }, inactiveText: { color: '#991b1b' },
});
