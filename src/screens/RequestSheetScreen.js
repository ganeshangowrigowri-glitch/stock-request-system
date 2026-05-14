import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { APP_COLORS } from '../constants/data';
import { submitRequest, getBrandsByCategory } from '../api/index';

// ── 325ml removed from beer columns ──────────────────────────────────────────
const getColumns = (categoryType) => {
  if (categoryType === 'beer') return ['625ml', '500ml C', '330ml', '500ml B'];
  return ['Q', 'P', 'N'];
};

// ── Layout config per category type ──────────────────────────────────────────
const LAYOUT = {
  beer: {
    fixedColWidth:     110,
    colWidth:           46,
    inputWidth:         44,
    inputHeight:        30,
    brandFontSize:      10,
    headerMinHeight:    8,
    subHeaderFontSize:   9,
  },
  qpn: {
    fixedColWidth:     140,
    colWidth:           52,
    inputWidth:         40,
    inputHeight:        30,
    brandFontSize:      11,
    headerMinHeight:    50,
    subHeaderFontSize:  10,
  },
};

// ── Beer column multiples: index matches getColumns('beer') ───────────────────
// 0: 625ml Bottle → ×12
// 1: 500ml Can    → ×24  (labelled '500ml C')
// 2: 330ml Can    → ×24
// 3: 500ml Bottle → ×12  (labelled '500ml B')
const BEER_COLUMN_MULTIPLES = [12, 24, 24, 12];

// ── QPN brand multiples ───────────────────────────────────────────────────────
// Returns [Q_multiple, P_multiple, N_multiple] for a given brand name.
// Brand name matching is case-insensitive and checks if the name includes the keyword.
// UG special N×25 brands — exact match (case-insensitive)
const UG_N25_BRANDS = [
  'lemonark arrack',
  'origin premium white arrack',
  'appleark arrack',
  'royal black arrack',
];

const getQPNMultiples = (brandName, categoryName) => {
  const name = (brandName || '').toLowerCase().trim();
  const cat  = (categoryName || '').toLowerCase();

  if (cat.includes('dcsl')) {
    return [12, 12, 12];
  }
  if (cat.includes('rockland') || cat.includes('idl')) {
    return [12, 24, 25];
  }
  // UG (default QPN)
  const isSpecialNBrand = UG_N25_BRANDS.includes(name);
  return [12, 24, isSpecialNBrand ? 25 : 48];
};

// ── Validate that a value is a valid multiple ─────────────────────────────────
const isValidMultiple = (value, multiple) => {
  const num = parseInt(value, 10);
  if (isNaN(num) || num === 0) return true; // empty / zero is allowed
  return num % multiple === 0;
};

// ── Get the multiple for a specific cell ─────────────────────────────────────
const getCellMultiple = (categoryType, colIdx, brandName, categoryName) => {
  if (categoryType === 'beer') {
    return BEER_COLUMN_MULTIPLES[colIdx] || 1;
  }
  return getQPNMultiples(brandName, categoryName)[colIdx] || 1;
};

export default function RequestSheetScreen({ route, navigation }) {
  const { category } = route.params;
  const { shopName, shopId } = useApp();

  const [brands, setBrands]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [stockData, setStockData] = useState([]);

  const categoryType = category.category_type || category.type || 'qpn';
  const columns = getColumns(categoryType);
  const layout = LAYOUT[categoryType] || LAYOUT.qpn;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  useEffect(() => {
    fetchBrands();
  }, [category.id]);

  const fetchBrands = async () => {
    try {
      setFetching(true);
      const data = await getBrandsByCategory(category.id);
      const brandNames = data.map(b => b.brand_name);
      setBrands(brandNames);
      setStockData(brandNames.map(() => columns.map(() => ({ present: '', request: '' }))));
    } catch (error) {
      console.error('Error fetching brands:', error);
      Alert.alert('Error', 'Failed to load brands. Please go back and try again.');
    } finally {
      setFetching(false);
    }
  };

  const updateValue = useCallback((brandIdx, colIdx, field, value) => {
    setStockData((prev) => {
      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[brandIdx][colIdx][field] = value;
      return next;
    });
  }, []);

  // ── Validate multiples on blur (request stock only) ─────────────────────
  const handleBlurValidation = (brandIdx, colIdx, field, value) => {
    if (field !== 'request') return; // only validate request stock
    if (!value || value === '' || parseInt(value, 10) === 0) return;
    const brandName = brands[brandIdx] || '';
    const multiple = getCellMultiple(categoryType, colIdx, brandName, category.category_name || category.label || '');
    if (!isValidMultiple(value, multiple)) {
      Alert.alert(
        'Invalid Quantity',
        'Please enter the correct quantity.',
      );
      // Clear the invalid value
      updateValue(brandIdx, colIdx, field, '');
    }
  };

  // ── Submit: allow if any present OR request stock is entered ─────────────
  const handleSubmit = () => {
    // 1. Check all request stock values are valid multiples before submitting
    for (let bi = 0; bi < stockData.length; bi++) {
      for (let ci = 0; ci < columns.length; ci++) {
        const val = stockData[bi][ci].request;
        if (!val || val === '' || parseInt(val, 10) === 0) continue;
        const brandName = brands[bi] || '';
        const multiple = getCellMultiple(categoryType, ci, brandName, category.category_name || category.label || '');
        if (!isValidMultiple(val, multiple)) {
          Alert.alert('Invalid Quantity', 'Please enter the correct quantity.');
          return;
        }
      }
    }

    // 2. Check at least one value is entered
    let hasAnyValue = false;
    stockData.forEach((row) => {
      row.forEach((cell) => {
        if ((cell.present && parseInt(cell.present, 10) > 0) ||
            (cell.request && parseInt(cell.request, 10) > 0)) {
          hasAnyValue = true;
        }
      });
    });

    if (!hasAnyValue) {
      Alert.alert('Empty Request', 'Please enter at least one quantity before submitting.');
      return;
    }

    Alert.alert(
      'Confirm Request',
      `Submit ${category.category_name || category.label} request for ${shopName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Submit', onPress: () => sendRequest() },
      ]
    );
  };

  const sendRequest = async () => {
    try {
      setLoading(true);

      const items = brands.map((brand, bi) => {
        // Always pad to 5 slots so the payload shape stays consistent with the backend
        const pad = (arr) => Array.from({ length: 5 }, (_, i) => parseInt(arr[i]) || 0);
        const presentValues = pad(columns.map((col, ci) => stockData[bi][ci].present || '0'));
        const requestValues = pad(columns.map((col, ci) => stockData[bi][ci].request || '0'));
        return {
          brand_name: brand,
          present_1: presentValues[0],
          present_2: presentValues[1],
          present_3: presentValues[2],
          present_4: presentValues[3],
          present_5: presentValues[4],
          request_1: requestValues[0],
          request_2: requestValues[1],
          request_3: requestValues[2],
          request_4: requestValues[3],
          request_5: requestValues[4],
        };
      });

      const payload = { shop_id: shopId, category_id: category.id, items };
      await submitRequest(payload);
      navigation.navigate('RequestSuccess', { category });
    } catch (error) {
      console.warn('Submit error:', error);
     if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
  Alert.alert('No Internet', 'No internet connection, please try again.');
} else if (error.response?.status === 403) {
  Alert.alert(
    'Access Denied 🔒',
    error.response?.data?.message || 'Your shop access is restricted. Please contact admin.',
    [{ text: 'OK', style: 'default' }]
  );
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

  if (fetching) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={APP_COLORS.primary} />
        <Text style={styles.loadingText}>Loading brands...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={APP_COLORS.primary} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarText} numberOfLines={1}>
          {category.category_name || category.label} Request Sheet
        </Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetRow}>
            <Text style={styles.sheetLabel}>Category</Text>
            <Text style={styles.sheetValue}>{category.category_name || category.label}</Text>
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
            {categoryType === 'beer'
              ? 'Columns: 625ml Bottle · 500ml Can · 330ml Can · 500ml Bottle'
              : 'Columns: Q (Quarters) · P (Pints) · N (Nips)'}
          </Text>
        </View>

        <View style={styles.tableContainer}>
          {/* ── Fixed brand name column ── */}
          <View style={[styles.fixedColumn, { width: layout.fixedColWidth }]}>
            <View style={[styles.fixedHeader, { minHeight: layout.headerMinHeight }]}>
              <Text style={styles.headerText}>Brand{'\n'}Name</Text>
            </View>
            {brands.map((brand, bi) => (
              <View
                key={`fixed-${brand}-${bi}`}
                style={[styles.fixedCell, bi % 2 === 1 && styles.fixedCellAlt]}
              >
                <Text
                  style={[styles.brandText, { fontSize: layout.brandFontSize }]}
                  numberOfLines={2}
                >
                  {brand}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Scrollable input columns ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {/* Header row */}
              <View style={styles.tableHeaderRow}>
                {/* Present Stock group */}
                <View
                  style={[
                    styles.groupHeader,
                    { backgroundColor: '#2a5278', width: layout.colWidth * columns.length },
                  ]}
                >
                  <Text style={styles.groupHeaderText}>Present Stock</Text>
                  <View style={styles.subHeaders}>
                    {columns.map((col) => (
                      <View
                        key={`ph-${col}`}
                        style={[styles.inputHeaderCell, { width: layout.colWidth }]}
                      >
                        <Text style={[styles.subHeaderText, { fontSize: layout.subHeaderFontSize }]}>
                          {col}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Request Stock group */}
                <View
                  style={[
                    styles.groupHeader,
                    { backgroundColor: '#0e3d5c', width: layout.colWidth * columns.length },
                  ]}
                >
                  <Text style={styles.groupHeaderText}>Request Stock</Text>
                  <View style={styles.subHeaders}>
                    {columns.map((col) => (
                      <View
                        key={`rh-${col}`}
                        style={[styles.inputHeaderCell, { width: layout.colWidth }]}
                      >
                        <Text style={[styles.subHeaderText, { fontSize: layout.subHeaderFontSize }]}>
                          {col}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Data rows */}
              {brands.map((brand, bi) => (
                <View
                  key={`row-${brand}-${bi}`}
                  style={[styles.dataRow, bi % 2 === 1 && styles.dataRowAlt]}
                >
                  {/* Present inputs */}
                  {columns.map((col, ci) => (
                    <View
                      key={`p-${bi}-${ci}`}
                      style={[styles.inputCell, { width: layout.colWidth }]}
                    >
                      <TextInput
                        style={[
                          styles.input,
                          { width: layout.inputWidth, height: layout.inputHeight },
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={APP_COLORS.textHint}
                        value={stockData[bi]?.[ci]?.present || ''}
                        onChangeText={(v) => updateValue(bi, ci, 'present', v)}
                        onBlur={() => handleBlurValidation(bi, ci, 'present', stockData[bi]?.[ci]?.present)}
                        maxLength={4}
                      />
                    </View>
                  ))}
                  {/* Request inputs */}
                  {columns.map((col, ci) => (
                    <View
                      key={`r-${bi}-${ci}`}
                      style={[styles.inputCell, styles.requestCell, { width: layout.colWidth }]}
                    >
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputRequest,
                          { width: layout.inputWidth, height: layout.inputHeight },
                        ]}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={APP_COLORS.textHint}
                        value={stockData[bi]?.[ci]?.request || ''}
                        onChangeText={(v) => updateValue(bi, ci, 'request', v)}
                        onBlur={() => handleBlurValidation(bi, ci, 'request', stockData[bi]?.[ci]?.request)}
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
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.btnSubmitText}>Submit Request</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: APP_COLORS.background },
  loadingWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:     { fontSize: 14, color: APP_COLORS.textSecondary },
  topBar:          { backgroundColor: APP_COLORS.primary, paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:         { padding: 4 },
  backArrow:       { color: '#ffffff', fontSize: 22, fontWeight: '300' },
  topBarText:      { color: '#ffffff', fontSize: 16, fontWeight: '600', flex: 1 },
  body:            { flex: 1, padding: 16 },
  sheetHeader:     { backgroundColor: APP_COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: APP_COLORS.border, padding: 14, marginBottom: 10, gap: 6 },
  sheetRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetLabel:      { fontSize: 13, color: APP_COLORS.textSecondary },
  sheetValue:      { fontSize: 13, fontWeight: '600', color: APP_COLORS.textPrimary },
  colNote:         { backgroundColor: '#e8f0f7', borderRadius: 8, padding: 10, marginBottom: 12 },
  colNoteText:     { fontSize: 11, color: APP_COLORS.primary, lineHeight: 16 },
  tableContainer:  { flexDirection: 'row', borderWidth: 1, borderColor: APP_COLORS.border, borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  fixedColumn:     { borderRightWidth: 2, borderRightColor: APP_COLORS.primary, zIndex: 1 },
  fixedHeader:     { backgroundColor: APP_COLORS.primary, padding: 10, justifyContent: 'center', alignItems: 'center' },
  fixedCell:       { height: 48, padding: 8, justifyContent: 'center', backgroundColor: APP_COLORS.white, borderTopWidth: 0.5, borderTopColor: APP_COLORS.border },
  fixedCellAlt:    { backgroundColor: '#f9fafb' },
  tableHeaderRow:  { flexDirection: 'row' },
  headerText:      { color: '#ffffff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  groupHeader:     { padding: 6, alignItems: 'center', justifyContent: 'center' },
  groupHeaderText: { color: '#ffffff', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  subHeaders:      { flexDirection: 'row' },
  inputHeaderCell: { alignItems: 'center', paddingVertical: 2 },
  subHeaderText:   { color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  dataRow:         { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: APP_COLORS.border, backgroundColor: APP_COLORS.white, height: 48, alignItems: 'center' },
  dataRowAlt:      { backgroundColor: '#f9fafb' },
  brandText:       { color: APP_COLORS.textPrimary, fontWeight: '500', lineHeight: 15 },
  inputCell:       { padding: 4, alignItems: 'center', justifyContent: 'center', borderRightWidth: 0.5, borderRightColor: APP_COLORS.border },
  requestCell:     { backgroundColor: 'rgba(26,58,92,0.04)' },
  input:           { borderWidth: 0.5, borderColor: APP_COLORS.border, borderRadius: 5, textAlign: 'center', fontSize: 12, color: APP_COLORS.textPrimary, backgroundColor: APP_COLORS.white, padding: 0 },
  inputRequest:    { borderColor: '#b8cfe8', backgroundColor: '#f0f5ff' },
  btnRow:          { flexDirection: 'row', gap: 12, marginTop: 16 },
  btnOutline:      { flex: 1, borderWidth: 1.5, borderColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnOutlineText:  { color: APP_COLORS.primary, fontSize: 14, fontWeight: '600' },
  btnSubmit:       { flex: 1, backgroundColor: APP_COLORS.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnSubmitText:   { color: '#ffffff', fontSize: 14, fontWeight: '600' },
});
