import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { getShops } from '../api/index';
import { APP_COLORS } from '../constants/data';

export default function LoginScreen({ navigation }) {
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const { login } = useApp();

  useEffect(() => { fetchShops(); }, []);

  const fetchShops = async () => {
    try {
      const data = await getShops();
      setShops(data);
    } catch (error) {
      Alert.alert('Error', 'Could not load shops. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!selectedStore) {
      Alert.alert('Select Store', 'Please select your store to continue.');
      return;
    }
    login(selectedStore, selectedShopId);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>🍷</Text>
        </View>
        <Text style={styles.appTitle}>Stock Request System</Text>
        <Text style={styles.appSub}>Wine Store Management</Text>
      </View>
      <View style={styles.formWrap}>
        <Text style={styles.formHeading}>Welcome Back</Text>
        <Text style={styles.formSub}>Select your store to continue</Text>
        <Text style={styles.label}>SHOP / BAR NAME</Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setShowDropdown(!showDropdown)}
          activeOpacity={0.8}
        >
          <Text style={selectedStore ? styles.dropdownSelected : styles.dropdownPlaceholder}>
            {selectedStore || 'Select your store...'}
          </Text>
          <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDropdown && (
          <View style={styles.dropdownList}>
            {loading ? (
              <ActivityIndicator size="small" color={APP_COLORS.primary} style={{ padding: 20 }} />
            ) : (
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {shops.map((shop) => (
                  <TouchableOpacity
                    key={shop.id}
                    style={[styles.dropdownItem, selectedShopId === shop.id && styles.dropdownItemActive]}
                    onPress={() => { setSelectedStore(shop.shop_name); setSelectedShopId(shop.id); setShowDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, selectedShopId === shop.id && styles.dropdownItemTextActive]}>
                      {shop.shop_name}
                    </Text>
                    {selectedShopId === shop.id && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        <TouchableOpacity
          style={[styles.loginBtn, !selectedStore && styles.loginBtnDisabled]}
          onPress={handleLogin} activeOpacity={0.85}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>No password required</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  hero: { backgroundColor: APP_COLORS.primary, paddingTop: 60, paddingBottom: 40, alignItems: 'center', gap: 8 },
  iconWrap: { width: 72, height: 72, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  iconText: { fontSize: 34 },
  appTitle: { fontSize: 22, fontWeight: '600', color: '#ffffff', letterSpacing: 0.3 },
  appSub: { fontSize: 13, color: 'rgba(255,255,255,0.72)' },
  formWrap: { flex: 1, backgroundColor: APP_COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -16, padding: 28 },
  formHeading: { fontSize: 20, fontWeight: '600', color: APP_COLORS.textPrimary, marginBottom: 4 },
  formSub: { fontSize: 13, color: APP_COLORS.textSecondary, marginBottom: 28 },
  label: { fontSize: 11, fontWeight: '600', color: APP_COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 8 },
  dropdownBtn: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9fafb' },
  dropdownSelected: { fontSize: 15, color: APP_COLORS.textPrimary, flex: 1 },
  dropdownPlaceholder: { fontSize: 15, color: APP_COLORS.textHint, flex: 1 },
  dropdownArrow: { fontSize: 11, color: APP_COLORS.textSecondary },
  dropdownList: { borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, marginTop: 4, backgroundColor: APP_COLORS.white, elevation: 4, zIndex: 999 },
  dropdownItem: { padding: 14, borderBottomWidth: 0.5, borderBottomColor: APP_COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownItemActive: { backgroundColor: '#f0f5ff' },
  dropdownItemText: { fontSize: 14, color: APP_COLORS.textPrimary },
  dropdownItemTextActive: { color: APP_COLORS.primary, fontWeight: '500' },
  checkmark: { color: APP_COLORS.primary, fontWeight: '700', fontSize: 14 },
  loginBtn: { backgroundColor: APP_COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  loginBtnDisabled: { backgroundColor: '#a0aec0' },
  loginBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  hint: { textAlign: 'center', color: APP_COLORS.textHint, fontSize: 12, marginTop: 14 },
});
