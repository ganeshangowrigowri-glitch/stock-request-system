import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { BRANDS, getColumns, APP_COLORS } from '../constants/data';
import { submitRequest } from '../api/index';

export default function RequestSheetScreen({ route, navigation }) {
  const { category } = route.params;
  const { shopName, shopId } = useApp();
  const brands = BRANDS[category.id] || [];
  const columns = getColumns(category.type);
  const [loading, setLoading] = useState(false);

  const [stockData, setStockData] = useState(() =>
    brands.map(() => columns.map(() => ({ present: '', request: '' })))
  );

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const updateValue = useCallback((brandIdx, colIdx, field, value) => {
    setStockData((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[brandIdx][colIdx][field] = value;
      return next;
    });
  }, []);

  const handleSubmit = () => {
    // Check if any quantity is entered
    let hasQuantity = false;
    stockData.forEach((row) => {
      row.forEach((cell) => {
        if (cell.request && parseInt(cell.request) > 0) {
          hasQuantity = true;
        }
      });
    });

    if (!hasQuantity) {
      Alert.alert('Empty Request', 'Please enter at least one quantity before submitting.');
      return;
    }

    Alert.alert(
      'Confirm Request',
      `Submit ${category.label} request for ${shopName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => sendRequest() },
      ]
    );
  };

  const sendRequest = async () => {
    try {
      setLoading(true);
      const categoryIdMap = {
        'UG': 1, 'DCSL': 2, 'IDL': 3, 'RL': 4, 'LION': 5, 'DCSLBEER': 6
      };
      const category_id = categoryIdMap[category.id];

      const items = brands.map((brand, bi) => {
        const presentValues = columns.map((col, ci) => stockData[bi][ci].present || '0');
        const requestValues = columns.map((col, ci) => stockData[bi][ci].request || '0');
        return {
          brand_name: brand,
          present_1: parseInt(presentValues[0]) || 0,
          present_2: parseInt(presentValues[1]) || 0,
          present_3: parseInt(presentValues[2]) || 0,
          present_4: parseInt(presentValues[3]) || 0,
          present_5: parseInt(presentValues[4]) || 0,
          request_1: parseInt(requestValues[0]) || 0,
          request_2: parseInt(requestValues[1]) || 0,
          request_3: parseInt(requestValues[2]) || 0,
          request_4: parseInt(requestValues[3]) || 0,
          request_5: parseInt(requestValues[4]) || 0,
        };
      });

      await submitRequest({ shop_id: shopId, category_id, items });
      navigation.navigate('RequestSuccess', { category });
    } catch (error) {
      console.error('Submit error:', error);
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        Alert.alert('No Internet', 'No internet connection, please try again.');
      } else {
        Alert.alert('Error', 'Failed to submit request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = () => {
    Alert.alert('Draft Saved', 'Your request has been saved as a draft.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText}>{category.label} Request Sheet</Text>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetRow}>
            <Text style={styles.sheetLabel}>Category</Text>
            <Text style={styles.sheetValue}>{category.label}</Text>
          </View>
          <View style={styles.sheetRow}>
            <Text style={styles.sheetLabel}>Bar Name</Text>
            <Text style={styles.sheetValue}>{shopName}</Text>
          </View>
          <View style={styles.sheetRow}>
            <Text style={styles.sheetLabel}>Date</Text>
            <Text style={styles.sheetValue}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.colNote}>
          <Text style={styles.colNoteText}>
            {category.type === 'beer'
              ? 'Columns: 625ml Bottle · 500ml Cane · 330ml Cane · 500ml Bottle · 325ml Bottle'
              : 'Columns: Q (Quarters) · P (Pints) · N (Nips)'}
          </Text>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.fixedColumn}>
            <View style={[styles.fixedHeader, { minHeight: category.type === 'beer' ? 72 : 52 }]}>
              <Text style={styles.headerText}>Brand{'\n'}Name</Text>
            </View>
            {brands.map((brand, bi) => (
              <View key={`fixed-${brand}`} style={[styles.fixedCell, bi % 2 === 1 && styles.fixedCellAlt]}>
                <Text style={styles.brandText}>{brand}</Text>
              </View>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={styles.tableHeaderRow}>
                <View style={[styles.groupHeader, { backgroundColor: '#2a5278' }]}>
                  <Text style={styles.groupHeaderText}>Present Stock</Text>
                  <View style={styles.subHeaders}>
                    {columns.map((col) => (
                      <View key={`ph-${col}`} style={styles.inputHeaderCell}>
                        <Text style={styles.subHeaderText}>{col}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[styles.groupHeader, { backgroundColor: '#0e3d5c' }]}>
                  <Text style={styles.groupHeaderText}>Request Stock</Text>
                  <View style={styles.subHeaders}>
                    {columns.map((col) => (
                      <View key={`rh-${col}`} style={styles.inputHeaderCell}>
                        <Text style={styles.subHeaderText}>{col}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {brands.map((brand, bi) => (
                <View key={`row-${brand}`} style={[styles.dataRow, bi % 2 === 1 && styles.dataRowAlt]}>
                  {columns.map((col, ci) => (
                    <View key={`p-${bi}-${ci}`} style={styles.inputCell}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={APP_COLORS.textHint}
                        value={stockData[bi][ci].present}
                        onChangeText={(v) => updateValue(bi, ci, 'present', v)}
                        maxLength={4}
                      />
                    </View>
                  ))}
                  {columns.map((col, ci) => (
                    <View key={`r-${bi}-${ci}`} style={[styles.inputCell, styles.requestCell]}>
                      <TextInput
                        style={[styles.input, styles.inputRequest]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={APP_COLORS.textHint}
                        value={stockData[bi][ci].request}
                        onChangeText={(v) => updateValue(bi, ci, 'request', v)}
                        maxLength={4}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnOutline} onPress={handleSaveDraft}>
            <Text style={styles.btnOutlineText}>Save Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSubmit, loading && { backgroundColor: '#a0aec0' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnSubmitText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: APP_COLORS.textSecondary },
  topBar: { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { padding: 4 },
  backArrow: { color: '#ffffff', fontSize: 22, fontWeight: '300' },
  topBarText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  body: { flex: 1, padding: 16 },
  sheetHeader: { backgroundColor: APP_COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: APP_COLORS.border, padding: 14, marginBottom: 10, gap: 6 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetLabel: { fontSize: 13, color: APP_COLORS.textSecondary },
  sheetValue: { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  colNote: { backgroundColor: '#e8f0f7', borderRadius: 8, padding: 10, marginBottom: 12 },
  colNoteText: { fontSize: 11, color: APP_COLORS.primary, lineHeight: 16 },
  tableContainer: { flexDirection: 'row', borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  fixedColumn: { width: 140, borderRightWidth: 2, borderRightColor: APP_COLORS.primary, zIndex: 1 },
  fixedHeader: { backgroundColor: APP_COLORS.primary, padding: 10, justifyContent: 'center', alignItems: 'center' },
  fixedCell: { height: 48, padding: 8, justifyContent: 'center', backgroundColor: APP_COLORS.white, borderTopWidth: 0.5, borderTopColor: APP_COLORS.border },
  fixedCellAlt: { backgroundColor: '#f9fafb' },
  tableHeaderRow: { flexDirection: 'row', alignSelf: 'stretch' },
  headerText: { color: '#ffffff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  groupHeader: { padding: 6, alignItems: 'center', justifyContent: 'center' },
  groupHeaderText: { color: '#ffffff', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  subHeaders: { flexDirection: 'row' },
  inputHeaderCell: { width: 52, alignItems: 'center', paddingVertical: 2 },
  subHeaderText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, textAlign: 'center' },
  dataRow: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: APP_COLORS.border, backgroundColor: APP_COLORS.white, height: 48, alignItems: 'center' },
  dataRowAlt: { backgroundColor: '#f9fafb' },
  brandText: { fontSize: 11, color: APP_COLORS.textPrimary, fontWeight: '500', lineHeight: 15 },
  inputCell: { width: 52, padding: 6, alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: APP_COLORS.border },
  requestCell: { backgroundColor: 'rgba(26,58,92,0.04)' },
  input: { width: 40, height: 32, borderWidth: 0.5, borderColor: APP_COLORS.border, borderRadius: 5, textAlign: 'center', fontSize: 12, color: APP_COLORS.textPrimary, backgroundColor: APP_COLORS.white, padding: 0 },
  inputRequest: { borderColor: '#b8cfe8', backgroundColor: '#f0f5ff' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnOutline: { flex: 1, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnOutlineText: { color: APP_COLORS.primary, fontSize: 14, fontWeight: '600' },
  btnSubmit: { flex: 1, backgroundColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSubmitText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
}); 
