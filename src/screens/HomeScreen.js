import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { APP_COLORS } from '../constants/data';
import { getRequestsByShop, getCategories, getBrandsByCategory } from '../api/index';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const { shopName, shopId, logout } = useApp();
  const [stats, setStats]           = useState({ pending: 0, approved: 0, rejected: 0 });
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  const today  = new Date();
  const dateStr = today.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ✅ Fetch categories + brand counts from DB every time screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchStats();
    }, [shopId])
  );

  const fetchCategories = async () => {
    try {
      setCatLoading(true);
      const cats = await getCategories();

      // ✅ For each category fetch brand count from DB
      const catsWithCount = await Promise.all(
        cats.map(async (cat) => {
          try {
            const brands = await getBrandsByCategory(cat.id);
            return { ...cat, brandCount: brands.length };
          } catch {
            return { ...cat, brandCount: 0 };
          }
        })
      );
      setCategories(catsWithCount);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCatLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      if (shopId) {
        const data = await getRequestsByShop(shopId);
        setStats({
          pending:  data.filter(r => r.status === 'pending').length,
          approved: data.filter(r => r.status === 'approved').length,
          rejected: data.filter(r => r.status === 'rejected').length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getCatIcon = (type, name) => {
  const n = name?.toLowerCase() || '';

  if (n.includes('ug'))    return { icon: '🥃', bgColor: '#e8f0f7' };
  if (n.includes('dcsl'))  return { icon: '🍸', bgColor: '#d1e7dd' };
  if (n.includes('idl'))   return { icon: '🥂', bgColor: '#f8d7da' };
  if (n.includes('rl'))    return { icon: '🍷', bgColor: '#e8d5f7' };
  if (n.includes('lion'))  return { icon: '🍻', bgColor: '#fde8d0' };

  if (type === 'beer') return { icon: '🍺', bgColor: '#fff3cd' };

  return { icon: '🍷', bgColor: '#e8f0f7' };
};
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerStore}>{shopName}</Text>
          <Text style={styles.headerDate}>{dateStr}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: APP_COLORS.warning }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: APP_COLORS.success }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: APP_COLORS.danger }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>SELECT CATEGORY</Text>

        {catLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={APP_COLORS.primary} />
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const { icon, bgColor } = getCatIcon(cat.category_type, cat.category_name);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.catCard}
                  onPress={() => navigation.navigate('RequestSheet', { category: cat })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catIcon, { backgroundColor: bgColor }]}>
                    <Text style={styles.catEmoji}>{icon}</Text>
                  </View>
                  <Text style={styles.catLabel}>{cat.category_name}</Text>
                  <Text style={styles.catCount}>{cat.brandCount} brands</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, { color: APP_COLORS.primary }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('OrderHistory')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={logout}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: APP_COLORS.background },
  header:       { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft:   { flex: 1 },
  headerStore:  { fontSize: 17, fontWeight: '600', color: '#ffffff', marginBottom: 2 },
  headerDate:   { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  logoutBtn:    { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  logoutText:   { color: '#ffffff', fontSize: 13, fontWeight: '500' },
  statsRow:     { flexDirection: 'row', backgroundColor: APP_COLORS.white, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  statItem:     { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statNum:      { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel:    { fontSize: 11, color: APP_COLORS.textSecondary },
  statDivider:  { width: 1, backgroundColor: APP_COLORS.border },
  body:         { flex: 1, padding: 18 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: APP_COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 12 },
  loadingWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard:      { width: '47%', backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, padding: 18, alignItems: 'center', gap: 8 },
  catIcon:      { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catEmoji:     { fontSize: 22 },
  catLabel:     { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary, textAlign: 'center' },
  catCount:     { fontSize: 11, color: APP_COLORS.textSecondary },
  bottomNav:    { flexDirection: 'row', backgroundColor: APP_COLORS.white, borderTopWidth: 1, borderTopColor: APP_COLORS.border, paddingBottom: 24, paddingTop: 10 },
  navItem:      { flex: 1, alignItems: 'center', gap: 3 },
  navIcon:      { fontSize: 20 },
  navLabel:     { fontSize: 10, color: APP_COLORS.textSecondary },
});
