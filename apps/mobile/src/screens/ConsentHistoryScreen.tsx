import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

interface ConsentRecord { id: string; consentType: string; status: string; grantedAt?: string; }

export function ConsentHistoryScreen({ patientId }: { patientId: string }) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  useEffect(() => {
    fetch(`/api/patients/${patientId}/consents`)
      .then(r => r.json()).then(setRecords).catch(() => {});
  }, [patientId]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consent History</Text>
      <FlatList
        data={records}
        keyExtractor={r => r.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.type}>{item.consentType.replace(/_/g,' ')}</Text>
            <View style={[styles.badge, item.status==='granted'?styles.granted:styles.revoked]}>
              <Text style={styles.badgeTxt}>{item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records</Text>}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container:{flex:1,padding:16,backgroundColor:'#fff'},
  title:{fontSize:18,fontWeight:'700',marginBottom:12},
  row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f0f0f0'},
  type:{fontSize:14,color:'#333',textTransform:'capitalize',flex:1},
  badge:{paddingHorizontal:8,paddingVertical:3,borderRadius:10},
  granted:{backgroundColor:'#d1fae5'},revoked:{backgroundColor:'#fee2e2'},
  badgeTxt:{fontSize:10,fontWeight:'700',textTransform:'uppercase'},
  empty:{textAlign:'center',color:'#999',marginTop:24},
});
