import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Animated, PanResponder,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_COLORS } from '../constants/data';
import { useApp } from '../context/AppContext';
import { getRequestsByShop } from '../api/index';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: APP_COLORS.warningBg, color: APP_COLORS.warning,  icon: '⏳' },
  approved: { label: 'Approved', bg: APP_COLORS.successBg, color: APP_COLORS.success,  icon: '✅' },
  rejected: { label: 'Rejected', bg: APP_COLORS.dangerBg,  color: APP_COLORS.danger,   icon: '❌' },
  received: { label: 'Received', bg: '#e8f0f7',            color: '#1a3a5c',            icon: '📦' },
};

const CATEGORY_ICONS = {
  'UG': '🥃', 'DCSL': '🍸', 'IDL': '🥂',
  'ROCKLAND': '🍷', 'LION BREWERY': '🍺', 'DCSL BEER': '🍻',
};

const FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Received'];

const getStorageKey = (shopId) => `hidden_orders_${shopId}`;

// ─── Swipeable Order Card ────────────────────────────────────────────────────
function SwipeableOrderCard({ order, onDelete, onPress }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const SWIPE_THRESHOLD = -75;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy),
      onPanResponderGrant: () => {
        Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) {
          const clamped = Math.max(dx, -110);
          translateX.setValue(clamped);
          deleteOpacity.setValue(Math.min(Math.abs(clamped) / 80, 1));
        }
      },
      onPanResponderRelease: (_, { dx }) => {
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true }).start();
        if (dx < SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -90, useNativeDriver: true, tension: 100, friction: 10,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0, useNativeDriver: true, tension: 100, friction: 10,
          }).start(() => deleteOpacity.setValue(0));
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Alert.alert(
      'Remove Order',
      'This order will be permanently removed from your history view.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
            deleteOpacity.setValue(0);
          },
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Animated.parallel([
              Animated.timing(translateX, { toValue: -400, duration: 250, useNativeDriver: true }),
              Animated.timing(cardScale, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => onDelete(order.id));
          },
        },
      ]
    );
  };

  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const icon = CATEGORY_ICONS[order.category_name] || '🍷';
  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  return (
    <View style={styles.swipeWrapper}>
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteLabel}>Remove</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{ transform: [{ translateX }, { scale: cardScale }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity style={styles.orderCard} onPress={onPress} activeOpacity={0.75}>
          <View style={[styles.orderIconWrap, { backgroundColor: statusCfg.bg }]}>
            <Text style={styles.orderEmoji}>{icon}</Text>
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>{order.category_name} Request</Text>
            <Text style={styles.orderMeta}>📅 {formatDate(order.submitted_at)}</Text>
            <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
              <Text style={styles.badgeStatus}>{statusCfg.icon}</Text>
              <Text style={[styles.badgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.arrowText}>›</Text>
            <Text style={styles.swipeHint}>← swipe</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function OrderHistoryScreen({ navigation }) {
  const { shopId } = useApp();
  const [orders, setOrders]             = useState([]);
  const [hiddenIds, setHiddenIds]       = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // 1. Phone-ல் save ஆன hidden IDs load பண்ணு
      const saved = await AsyncStorage.getItem(getStorageKey(shopId));
      if (saved) {
        setHiddenIds(new Set(JSON.parse(saved)));
      }
      // 2. Backend-ல் இருந்து orders fetch பண்ணு
      if (shopId) {
        const data = await getRequestsByShop(shopId);
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Phone-ல் permanently save
  const saveHiddenIds = async (newSet) => {
    try {
      await AsyncStorage.setItem(
        getStorageKey(shopId),
        JSON.stringify([...newSet])
      );
    } catch (error) {
      console.error('Error saving hidden IDs:', error);
    }
  };

  // Single order — permanently remove
  const handleDeleteSingle = (id) => {
    setHiddenIds((prev) => {
      const updated = new Set([...prev, id]);
      saveHiddenIds(updated);
      return updated;
    });
  };

  // Clear all — எல்லாத்தையும் permanently remove
  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'All orders will be permanently removed from your view.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            const allIds = new Set(orders.map((o) => o.id));
            setHiddenIds(allIds);
            saveHiddenIds(allIds);
          },
        },
      ]
    );
  };

  const filtered = orders.filter((o) => {
    if (hiddenIds.has(o.id)) return false;
    if (activeFilter === 'All') return true;
    return o.status === activeFilter.toLowerCase();
  });

  const visibleCount = orders.filter((o) => !hiddenIds.has(o.id)).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarText}>Order History</Text>
          <Text style={styles.countPill}>{filtered.length} orders</Text>
        </View>
        {visibleCount > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearAll}>
            <Text style={styles.clearBtnText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const count = f === 'All'
            ? orders.filter((o) => !hiddenIds.has(o.id)).length
            : orders.filter((o) => !hiddenIds.has(o.id) && o.status === f.toLowerCase()).length;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
              {count > 0 && (
                <View style={[styles.filterBadge, activeFilter === f && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, activeFilter === f && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!loading && filtered.length > 0 && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>💡 Swipe left on any order to permanently remove it</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧹</Text>
              <Text style={styles.emptyTitle}>No orders here</Text>
              <Text style={styles.emptySubtext}>
                {visibleCount === 0 ? 'All orders have been removed' : `No ${activeFilter.toLowerCase()} orders`}
              </Text>
            </View>
          ) : (
            filtered.map((order) => (
              <SwipeableOrderCard
                key={order.id}
                order={order}
                onDelete={handleDeleteSingle}
                onPress={() => navigation.navigate('OrderDetail', { order })}
              />
            ))
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
  container:            { flex: 1, backgroundColor: APP_COLORS.background },
  topBar:               { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn:              { padding: 4 },
  backArrow:            { color: '#ffffff', fontSize: 22 },
  topBarCenter:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarText:           { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  countPill:            { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  clearBtn:             { backgroundColor: 'rgba(255,80,80,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  clearBtnText:         { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  filterScroll:         { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border },
  filterRow:            { flexDirection: 'row', paddingHorizontal: 12, alignItems: 'center', gap: 4 },
  filterTab:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, gap: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  filterTabActive:      { borderBottomColor: APP_COLORS.primary },
  filterText:           { fontSize: 13, color: APP_COLORS.textSecondary },
  filterTextActive:     { color: APP_COLORS.primary, fontWeight: '700' },
  filterBadge:          { backgroundColor: '#eee', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeActive:    { backgroundColor: APP_COLORS.primary },
  filterBadgeText:      { fontSize: 10, color: APP_COLORS.textSecondary, fontWeight: '600' },
  filterBadgeTextActive:{ color: '#fff' },
  hintBanner:           { backgroundColor: '#fffbe6', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0e9c8' },
  hintText:             { fontSize: 11, color: '#7a6a00' },
  body:                 { flex: 1, padding: 12 },
  loadingWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:          { fontSize: 14, color: APP_COLORS.textSecondary },
  swipeWrapper:         { marginBottom: 10, borderRadius: 14, overflow: 'hidden' },
  deleteBackground:     { position: 'absolute', right: 0, top: 0, bottom: 0, width: 90, backgroundColor: '#ff3b30', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  deleteAction:         { alignItems: 'center', gap: 2 },
  deleteIcon:           { fontSize: 20 },
  deleteLabel:          { color: '#fff', fontSize: 11, fontWeight: '600' },
  orderCard:            { backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  orderIconWrap:        { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  orderEmoji:           { fontSize: 22 },
  orderInfo:            { flex: 1, gap: 4 },
  orderTitle:           { fontSize: 14, fontWeight: '700', color: APP_COLORS.textPrimary },
  orderMeta:            { fontSize: 11, color: APP_COLORS.textSecondary },
  badge:                { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, gap: 4, marginTop: 2 },
  badgeStatus:          { fontSize: 10 },
  badgeText:            { fontSize: 11, fontWeight: '600' },
  cardRight:            { alignItems: 'center', gap: 4 },
  arrowText:            { fontSize: 20, color: APP_COLORS.textHint },
  swipeHint:            { fontSize: 9, color: APP_COLORS.textHint },
  empty:                { alignItems: 'center', paddingTop: 70, gap: 8 },
  emptyIcon:            { fontSize: 44 },
  emptyTitle:           { fontSize: 16, fontWeight: '700', color: APP_COLORS.textPrimary },
  emptySubtext:         { fontSize: 13, color: APP_COLORS.textSecondary },
  bottomNav:            { flexDirection: 'row', backgroundColor: APP_COLORS.white, borderTopWidth: 1, borderTopColor: APP_COLORS.border, paddingBottom: 24, paddingTop: 10 },
  navItem:              { flex: 1, alignItems: 'center', gap: 3 },
  navIcon:              { fontSize: 20 },
  navLabel:             { fontSize: 10, color: APP_COLORS.textSecondary },
});
