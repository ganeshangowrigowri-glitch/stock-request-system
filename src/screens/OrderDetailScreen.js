import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { APP_COLORS } from '../constants/data';
import { getRequestById, markOrderReceived } from '../api/index';

const STATUS_CONFIG = {
  pending:  { label: 'Pending Review', bg: '#fff3cd', color: '#856404' },
  approved: { label: 'Approved',       bg: '#d1e7dd', color: '#0f5132' },
  rejected: { label: 'Rejected',       bg: '#f8d7da', color: '#842029' },
  received: { label: 'Received',       bg: '#e8f0f7', color: '#1a3a5c' },
};

export default function OrderDetailScreen({ route, navigation }) {
  const { order } = route.params;
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState(false);

  // ✅ FIX: always use the fetched request object for id and status
  const request   = detail?.request || order;
  const requestId = request?.id || order?.id;
  const status    = request?.status || order?.status;

  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  useEffect(() => { fetchDetail(); }, []);

  const fetchDetail = async () => {
    try {
      const data = await getRequestById(order.id);
      setDetail(data);
      // ✅ FIX: if already received from server, mark checkbox done
      if (data?.request?.status === 'received') {
        setReceived(true);
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceived = () => {
    if (received) return;

    // ✅ FIX: safety check before calling API
    if (!requestId) {
      Alert.alert('Error', 'Order ID not found. Please go back and try again.');
      return;
    }

    Alert.alert('Confirm Receipt', 'Mark this order as received?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            // ✅ FIX: use requestId (from fetched detail, not just route param)
            await markOrderReceived(requestId);
            setReceived(true);
          } catch (error) {
            // ✅ FIX: show exact server error if available
            const msg =
              error?.response?.data?.message ||
              error?.message ||
              'Failed to update. Please try again.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  const getColumns = (categoryType) => {
    if (categoryType === 'beer') return ['625ml', '500ml C', '330ml', '500ml B', '325ml'];
    return ['Q', 'P', 'N'];
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  const items   = detail?.items || [];
  const columns = getColumns(request.category_type);

  // ✅ FIX: show button when status is approved OR received (to show checked state)
  const showReceivedButton = status === 'approved' || status === 'received';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText}>{request.category_name} Request</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Category</Text>
            <Text style={styles.headerValue}>{request.category_name}</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Bar Name</Text>
            <Text style={styles.headerValue}>{request.shop_name}</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Date</Text>
            <Text style={styles.headerValue}>{formatDate(request.submitted_at)}</Text>
          </View>
          <View style={styles.headerDivider} />
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>Status</Text>
            <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.badgeText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table */}
        {items.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <View style={styles.brandHeadCell}>
                  <Text style={styles.headText}>Brand</Text>
                </View>
                <View style={[styles.groupHead, { backgroundColor: '#2a5278' }]}>
                  <Text style={styles.groupHeadText}>Present</Text>
                  <View style={styles.subRow}>
                    {columns.map((c) => (
                      <View key={`ph${c}`} style={styles.subCell}>
                        <Text style={styles.subHeadText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.groupHead, { backgroundColor: '#0e3d5c' }]}>
                  <Text style={styles.groupHeadText}>Requested</Text>
                  <View style={styles.subRow}>
                    {columns.map((c) => (
                      <View key={`rh${c}`} style={styles.subCell}>
                        <Text style={styles.subHeadText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {/* ✅ FIX: use status variable (from fetched detail) not order.status */}
                {(status === 'approved' || status === 'received') && (
                  <View style={[styles.groupHead, { backgroundColor: '#1a5c3d' }]}>
                    <Text style={styles.groupHeadText}>Approved</Text>
                    <View style={styles.subRow}>
                      {columns.map((c) => (
                        <View key={`ah${c}`} style={styles.subCell}>
                          <Text style={styles.subHeadText}>{c}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {items.map((item, bi) => (
                <View key={item.id} style={[styles.dataRow, bi % 2 === 1 && styles.dataRowAlt]}>
                  <View style={styles.brandCell}>
                    <Text style={styles.brandText}>{item.brand_name}</Text>
                  </View>
                  <View style={styles.valueCell}><Text style={styles.valueText}>{item.present_1}</Text></View>
                  <View style={styles.valueCell}><Text style={styles.valueText}>{item.present_2}</Text></View>
                  <View style={styles.valueCell}><Text style={styles.valueText}>{item.present_3}</Text></View>
                  {request.category_type === 'beer' && (
                    <>
                      <View style={styles.valueCell}><Text style={styles.valueText}>{item.present_4}</Text></View>
                      <View style={styles.valueCell}><Text style={styles.valueText}>{item.present_5}</Text></View>
                    </>
                  )}
                  <View style={[styles.valueCell, styles.reqCell]}><Text style={styles.valueText}>{item.request_1}</Text></View>
                  <View style={[styles.valueCell, styles.reqCell]}><Text style={styles.valueText}>{item.request_2}</Text></View>
                  <View style={[styles.valueCell, styles.reqCell]}><Text style={styles.valueText}>{item.request_3}</Text></View>
                  {request.category_type === 'beer' && (
                    <>
                      <View style={[styles.valueCell, styles.reqCell]}><Text style={styles.valueText}>{item.request_4}</Text></View>
                      <View style={[styles.valueCell, styles.reqCell]}><Text style={styles.valueText}>{item.request_5}</Text></View>
                    </>
                  )}
                  {/* ✅ FIX: use status variable */}
                  {(status === 'approved' || status === 'received') && (
                    <>
                      <View style={[styles.valueCell, styles.approvedCell]}>
                        <Text style={[styles.valueText, styles.approvedText]}>{item.approved_1}</Text>
                      </View>
                      <View style={[styles.valueCell, styles.approvedCell]}>
                        <Text style={[styles.valueText, styles.approvedText]}>{item.approved_2}</Text>
                      </View>
                      <View style={[styles.valueCell, styles.approvedCell]}>
                        <Text style={[styles.valueText, styles.approvedText]}>{item.approved_3}</Text>
                      </View>
                      {request.category_type === 'beer' && (
                        <>
                          <View style={[styles.valueCell, styles.approvedCell]}>
                            <Text style={[styles.valueText, styles.approvedText]}>{item.approved_4}</Text>
                          </View>
                          <View style={[styles.valueCell, styles.approvedCell]}>
                            <Text style={[styles.valueText, styles.approvedText]}>{item.approved_5}</Text>
                          </View>
                        </>
                      )}
                    </>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.noItems}>
            <Text style={styles.noItemsText}>No items found</Text>
          </View>
        )}

        {/* ✅ FIX: Mark as Received Button — uses requestId and status from fetched detail */}
        {showReceivedButton && (
          <TouchableOpacity
            style={[styles.receivedRow, received && styles.receivedRowDone]}
            onPress={handleReceived}
            activeOpacity={received ? 1 : 0.8}
          >
            <View style={[styles.checkbox, received && styles.checkboxDone]}>
              {received && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <View style={styles.receivedInfo}>
              <Text style={styles.receivedTitle}>
                {received ? 'Order Received' : 'Mark as Order Received'}
              </Text>
              <Text style={styles.receivedSub}>
                {received
                  ? 'Confirmed — head office notified'
                  : 'Tap to confirm when you receive the stock'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: APP_COLORS.background },
  loadingWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:    { fontSize: 14, color: APP_COLORS.textSecondary },
  topBar:         { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:        { padding: 4 },
  backArrow:      { color: '#ffffff', fontSize: 22 },
  topBarText:     { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  body:           { flex: 1, padding: 16 },
  headerCard:     { backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, overflow: 'hidden', marginBottom: 14 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  headerDivider:  { height: 0.5, backgroundColor: APP_COLORS.border, marginHorizontal: 14 },
  headerLabel:    { fontSize: 13, color: APP_COLORS.textSecondary },
  headerValue:    { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  badge:          { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100 },
  badgeText:      { fontSize: 12, fontWeight: '600' },
  table:          { borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: APP_COLORS.border, marginBottom: 14 },
  tableHead:      { flexDirection: 'row' },
  brandHeadCell:  { width: 140, backgroundColor: APP_COLORS.primary, padding: 8, justifyContent: 'center' },
  headText:       { color: '#fff', fontSize: 11, fontWeight: '600' },
  groupHead:      { padding: 5, alignItems: 'center' },
  groupHeadText:  { color: '#fff', fontSize: 10, fontWeight: '600', marginBottom: 3 },
  subRow:         { flexDirection: 'row' },
  subCell:        { width: 44, alignItems: 'center' },
  subHeadText:    { color: 'rgba(255,255,255,0.85)', fontSize: 9 },
  dataRow:        { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: APP_COLORS.border, backgroundColor: APP_COLORS.white },
  dataRowAlt:     { backgroundColor: '#f9fafb' },
  brandCell:      { width: 140, padding: 8, justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: APP_COLORS.border },
  brandText:      { fontSize: 10, color: APP_COLORS.textPrimary, fontWeight: '500' },
  valueCell:      { width: 44, padding: 6, alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: APP_COLORS.border },
  reqCell:        { backgroundColor: 'rgba(26,58,92,0.04)' },
  approvedCell:   { backgroundColor: 'rgba(46,125,50,0.06)' },
  valueText:      { fontSize: 11, color: APP_COLORS.textPrimary },
  approvedText:   { color: APP_COLORS.success, fontWeight: '600' },
  noItems:        { alignItems: 'center', padding: 32 },
  noItemsText:    { fontSize: 14, color: APP_COLORS.textSecondary },
  receivedRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: APP_COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: APP_COLORS.border, padding: 16, gap: 14, marginBottom: 8 },
  receivedRowDone:{ borderColor: APP_COLORS.success, backgroundColor: APP_COLORS.successBg },
  checkbox:       { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: APP_COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxDone:   { backgroundColor: APP_COLORS.success, borderColor: APP_COLORS.success },
  checkMark:      { color: '#fff', fontSize: 13, fontWeight: '700' },
  receivedInfo:   { flex: 1 },
  receivedTitle:  { fontSize: 14, fontWeight: '600', color: APP_COLORS.textPrimary, marginBottom: 2 },
  receivedSub:    { fontSize: 11, color: APP_COLORS.textSecondary, lineHeight: 16 },
});
