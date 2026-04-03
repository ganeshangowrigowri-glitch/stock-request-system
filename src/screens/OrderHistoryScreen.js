import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { APP_COLORS } from '../constants/data';
import { useApp } from '../context/AppContext';
import { getRequestsByShop } from '../api/index';

const STATUS_CONFIG = {
  pending: { label: 'Pending', bg: APP_COLORS.warningBg, color: APP_COLORS.warning },
  approved: { label: 'Approved', bg: APP_COLORS.successBg, color: APP_COLORS.success },
  rejected: { label: 'Rejected', bg: APP_COLORS.dangerBg, color: APP_COLORS.danger },
  received: { label: 'Received', bg: '#e8f0f7', color: '#1a3a5c' },
};

const CATEGORY_ICONS = {
  'UG': '🥃', 'DCSL': '🍸', 'IDL': '🥂',
  'ROCKLAND': '🍷', 'LION BREWERY': '🍺', 'DCSL BEER': '🍻',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected'];

export default function OrderHistoryScreen({ navigation }) {
  const { shopId } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      if (shopId) {
        const data = await getRequestsByShop(shopId);
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchOrders(); };

  const filtered = orders.filter((o) => {
    if (activeFilter === 'All') return true;
    return o.status === activeFilter.toLowerCase();
  });

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText}>Order History</Text>
        <Text style={styles.countText}>{filtered.length} orders</Text>
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No {activeFilter.toLowerCase()} orders</Text>
              <Text style={styles.emptySubText}>Pull down to refresh</Text>
            </View>
          ) : (
            filtered.map((order) => {
              const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const icon = CATEGORY_ICONS[order.category_name] || '🍷';
              return (
                <TouchableOpacity
                  key={order.id} style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetail', { order })}
                  activeOpacity={0.75}
                >
                  <View style={styles.orderIcon}>
                    <Text style={styles.orderEmoji}>{icon}</Text>
                  </View>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderTitle}>{order.category_name} Request</Text>
                    <Text style={styles.orderMeta}>{formatDate(order.submitted_at)}</Text>
                    <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
                      <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.arrowText}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={[styles.navLabel, { color: APP_COLORS.primary }]}>Orders</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  topBar: { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  backArrow: { color: '#ffffff', fontSize: 22 },
  topBarText: { flex: 1, color: '#ffffff', fontSize: 16, fontWeight: '600' },
  countText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  filterRow: { flexDirection: 'row', backgroundColor: APP_COLORS.white, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive: { borderBottomColor: APP_COLORS.primary },
  filterText: { fontSize: 13, color: APP_COLORS.textSecondary },
  filterTextActive: { color: APP_COLORS.primary, fontWeight: '600' },
  body: { flex: 1, padding: 16 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: APP_COLORS.textSecondary },
  orderCard: { backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIcon: { width: 44, height: 44, borderRadius: 11, backgroundColor: '#e8f0f7', alignItems: 'center', justifyContent: 'center' },
  orderEmoji: { fontSize: 20 },
  orderInfo: { flex: 1, gap: 3 },
  orderTitle: { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary },
  orderMeta: { fontSize: 11, color: APP_COLORS.textSecondary },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  arrowText: { fontSize: 18, color: APP_COLORS.textHint },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: APP_COLORS.textSecondary },
  emptySubText: { fontSize: 12, color: APP_COLORS.textHint },
  bottomNav: { flexDirection: 'row', backgroundColor: APP_COLORS.white, borderTopWidth: 1, borderTopColor: APP_COLORS.border, paddingBottom: 24, paddingTop: 10 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { fontSize: 20 },
  navLabel: { fontSize: 10, color: APP_COLORS.textSecondary },
});
