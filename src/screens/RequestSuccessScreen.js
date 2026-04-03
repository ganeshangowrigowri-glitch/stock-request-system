import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useApp } from '../context/AppContext';
import { APP_COLORS } from '../constants/data';

export default function RequestSuccessScreen({ route, navigation }) {
  const { category } = route.params;
  const { shopName } = useApp();
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText}>Request Submitted</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={styles.title}>Request Submitted!</Text>
        <Text style={styles.subtitle}>Your request has been sent to the head office for review.</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Category</Text>
            <Text style={styles.infoValue}>{category.label}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Store</Text>
            <Text style={styles.infoValue}>{shopName}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{dateStr}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending Review</Text>
            </View>
          </View>
        </View>
        <Text style={styles.note}>You will be notified once the head office approves your request.</Text>
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.btnOutlineText}>Back to Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => navigation.navigate('OrderHistory')}>
            <Text style={styles.btnPrimaryText}>View Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  topBar: { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  backArrow: { color: '#ffffff', fontSize: 22 },
  topBarText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', padding: 28, paddingTop: 40 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: APP_COLORS.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconText: { fontSize: 36, color: APP_COLORS.success, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '700', color: APP_COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: APP_COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28, maxWidth: 280 },
  infoCard: { width: '100%', backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, overflow: 'hidden', marginBottom: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoDivider: { height: 0.5, backgroundColor: APP_COLORS.border, marginHorizontal: 14 },
  infoLabel: { fontSize: 13, color: APP_COLORS.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  pendingBadge: { backgroundColor: APP_COLORS.warningBg, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  pendingText: { fontSize: 12, fontWeight: '600', color: APP_COLORS.warning },
  note: { fontSize: 12, color: APP_COLORS.textHint, textAlign: 'center', lineHeight: 18, marginBottom: 32, maxWidth: 280 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnOutline: { flex: 1, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnOutlineText: { color: APP_COLORS.primary, fontSize: 14, fontWeight: '600' },
  btnPrimary: { flex: 1, backgroundColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnPrimaryText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
