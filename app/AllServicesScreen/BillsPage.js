import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefreshControl } from 'react-native';
import BRAND from '../config';
import EmptyState from '../components/EmptyState';
import useAlert from '../components/UseAlert'; // ← import your alert hook

const BillsPage = () => {
  const { nightMode, permissions } = usePermissions();

  const permissionsLoaded =
    permissions !== null && permissions !== undefined;

  const canViewBills =
    permissionsLoaded && hasPermission(permissions, 'BILL', 'R');

  const theme = {
    light: {
      containerBg: '#F5F7FA',
      cardBg: '#FFFFFF',
      textColor: '#111827',
      secondaryText: '#6B7280',
      borderColor: '#E5E7EB',
      iconBg: BRAND.COLORS.iconbg,
      accent: '#1996D3',
      danger: '#DC3545',
      downloadBtn: '#EFF6FF',
      downloadText: '#1996D3',
    },
    dark: {
      containerBg: '#0F172A',
      cardBg: '#1E293B',
      textColor: '#F1F5F9',
      secondaryText: '#CBD5E1',
      borderColor: '#334155',
      iconBg: '#1E3A5F',
      accent: '#60A5FA',
      danger: '#F87171',
      downloadBtn: '#1E3A5F',
      downloadText: '#60A5FA',
    },
  };

  const currentTheme = nightMode ? theme.dark : theme.light;

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);


  const fetchBills = async () => {
    try {
      const response = await otherServices.getBillsByFlat();
      if (Array.isArray(response)) {
        setBills(response);
      } else if (Array.isArray(response?.data)) {
        setBills(response.data);
      } else {
        setBills([]);
      }
    } catch (error) {
      console.log('Bills Fetch Error:', error);
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!canViewBills) return;
    fetchBills();
  }, [canViewBills]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBills();
  }, []);

  // ← Show confirmation popup before downloading
  const handleDownload = (bill) => {
  if (bill?.url) {
    Linking.openURL(bill.url);
  } else {
    console.log('No URL found for this bill');
  }
};
  const formatDate = (date) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const AmountItem = ({ label, value }) => (
    <View style={styles.amountItem}>
      <Text style={[styles.label, { color: currentTheme.secondaryText }]}>
        {label}
      </Text>
      <Text style={[styles.amount, { color: currentTheme.textColor }]}>
        ₹{value.toLocaleString()}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const current = parseFloat(item.amount || 0);
    const arrear = parseFloat(item.arears || 0);
    const tax = parseFloat(item.tax || 0);
    const balance = parseFloat(item.bal_amt || 0);

    return (
      <View style={[styles.card, { backgroundColor: currentTheme.cardBg }]}>
        {/* TOP ROW — Bill No + Download Button */}
        <View style={styles.topRow}>
          <View style={styles.leftPart}>
            <View
              style={[styles.iconBox, { backgroundColor: currentTheme.iconBg }]}
            >
              <Ionicons
                name="document-outline"
                size={20}
                color={BRAND.COLORS.icon}
              />
            </View>

            <View style={styles.billInfo}>
              <Text style={[styles.billNo, { color: currentTheme.textColor }]}>
                {item.bill_no}
              </Text>

              <View style={styles.dateRow}>
                <Text style={[styles.date, { color: currentTheme.secondaryText }]}>
                  {formatDate(item.bill_date)}
                </Text>

                <View
                  style={[
                    styles.dueBadge,
                    { backgroundColor: currentTheme.danger + '20' },
                  ]}
                >
                  <Text
                    style={[styles.dueBadgeText, { color: currentTheme.danger }]}
                  >
                    Due: {formatDate(item.bill_due_date)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ← Direct Download Button (replaces three dots) */}
          <TouchableOpacity
            onPress={() => handleDownload(item)}
            style={[
              styles.downloadBtn,
              { backgroundColor: currentTheme.downloadBtn },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={14} color={currentTheme.downloadText} />
            <Text style={[styles.downloadBtnText, { color: currentTheme.downloadText }]}>
              Download
            </Text>
          </TouchableOpacity>
        </View>

        {/* PERIOD + BALANCE ROW */}
        <View style={styles.periodBalanceRow}>
          <Text style={[styles.periodText, { color: currentTheme.secondaryText }]}>
            {formatDate(item.bill_start_date)} — {formatDate(item.bill_end_date)}
          </Text>

          <View style={styles.balanceInlineBox}>
            <Text
              style={[styles.balanceLabelInline, { color: currentTheme.secondaryText }]}
            >
              Balance:
            </Text>
            <Text
              style={[styles.balanceValueInline, { color: BRAND.COLORS.icon }]}
            >
              ₹{balance.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: currentTheme.borderColor }]} />

        {/* AMOUNT GRID */}
        <View style={styles.amountGrid}>
          <AmountItem label="Current" value={current} />
          <AmountItem label="Tax" value={tax} />
          <AmountItem label="Arrear" value={arrear} />
        </View>
      </View>
    );
  };

  /* ─── STATES ─── */

  if (!permissionsLoaded) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.containerBg }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
        <Text style={{ marginTop: 10, color: currentTheme.secondaryText }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!canViewBills) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.containerBg }]}>
        <Ionicons name="lock-closed-outline" size={60} color={currentTheme.secondaryText} />
        <Text style={{ marginTop: 12, fontSize: 16, color: currentTheme.textColor, fontWeight: '600' }}>
          Access Restricted
        </Text>
        <Text style={{ marginTop: 6, fontSize: 13, color: currentTheme.secondaryText, textAlign: 'center', paddingHorizontal: 40 }}>
          You do not have permission to view bills.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: currentTheme.containerBg }]}>
        <ActivityIndicator size="large" color={currentTheme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: currentTheme.containerBg }]}
    >
      <AppHeader title="Bills" />

      {/* ← FlatList handles scrolling natively */}
      <FlatList
        data={bills}
        keyExtractor={(item, index) =>
          item?.id ? item.id.toString() : index.toString()
        }
        renderItem={renderItem}
        contentContainerStyle={
          bills.length === 0
            ? { flexGrow: 1, paddingTop: 120, paddingHorizontal: 16 }
            : styles.listContent
        }
        ListEmptyComponent={() => (
          <EmptyState
            icon="document-outline"
            title="No Bills Available"
            subtitle=""
            theme={{
              text: currentTheme.textColor,
              textSecondary: currentTheme.secondaryText,
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={currentTheme.accent}
            colors={[BRAND.COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

    </SafeAreaView>
  );
};

export default BillsPage;
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* CARD */
  card: {
    marginBottom: 10,
    borderRadius: 12,
    padding: 12,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    justifyContent: 'space-between',
  },

  leftPart: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },

  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },

  billInfo: {
    flex: 1,
  },

  billNo: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  date: {
    fontSize: 10,
  },

  dueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },

  dueBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },

  /* ← DOWNLOAD BUTTON (replaces three-dot menu) */
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },

  downloadBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* PERIOD + BALANCE ROW */
  periodBalanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  periodText: {
    fontSize: 10,
    flex: 1,
  },

  balanceInlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  balanceLabelInline: {
    fontSize: 9,
    fontWeight: '600',
  },

  balanceValueInline: {
    fontSize: 11,
    fontWeight: '700',
  },

  divider: {
    height: 1,
    marginVertical: 8,
  },

  /* AMOUNTS GRID */
  amountGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },

  amountItem: {
    flex: 1,
    alignItems: 'center',
  },

  label: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },

  amount: {
    fontSize: 12,
    fontWeight: '600',
  },
});