import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../../Utils/ConetextApi';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasPermission } from '../../Utils/PermissionHelper';
import BRAND from '../config';
import useAlert from '../components/UseAlert';

// ─── Theme constants ───────────────────────────────────────────────────────────

const THEME = {
  primary: BRAND.COLORS.primary,
  primaryLight: '#E8F5FD',
  success: '#10B981',
  danger: '#EF4444',
  lightBg: '#F0F4F8',
  darkBg: '#0F1117',
  lightCard: '#FFFFFF',
  darkCard: '#1A1D27',
  border: '#E5E7EB',
  darkBorder: '#2A2D3A',
};

const NAV_OPTIONS = [
  { key: 'Payments', icon: 'card-outline', screen: 'Payment' },
  { key: 'Bills', icon: 'document-text-outline', screen: 'bills' },
];

// ─── Pure helpers (defined outside component so they are never re-created) ─────

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  return `₹${(isNaN(num) ? 0 : num).toLocaleString('en-IN')}`;
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

/**
 * Maps a statement row to an icon — same logic as Angular's getIcon():
 *   type === 'bill'           → document / primary blue
 *   type_of_payment === DEBIT → card / danger red   (money out)
 *   anything else             → card / success green (money in)
 */
const getStatementIcon = (item) => {
  if (item.type === 'bill')
    return { name: 'document-outline', color: THEME.primary };
  if (item.type_of_payment === 'DEBIT')
    return { name: 'card-outline', color: THEME.danger };
  return { name: 'card-outline', color: THEME.success };
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AccountsScreen() {
  const navigation = useNavigation();
  const { nightMode, permissions } = usePermissions();

  const theme = {
    bg: nightMode ? THEME.darkBg : THEME.lightBg,
    card: nightMode ? THEME.darkCard : THEME.lightCard,
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    pillBg: nightMode ? '#1E2235' : THEME.primaryLight,
    downloadBtn: nightMode ? '#1E3A5F' : '#EFF6FF',
    downloadText: nightMode ? '#60A5FA' : THEME.primary,
    iconBg: BRAND.COLORS.iconbg,
    secondaryText: nightMode ? '#CBD5E1' : '#6B7280',
    borderColor: nightMode ? '#334155' : '#E5E7EB',
    navCard: nightMode ? '#1E293B' : '#FFFFFF',
  };

  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canSeeOutstanding = permissionsLoaded && hasPermission(permissions, 'OUTSND', 'R');
  const canSeeBills = permissionsLoaded && hasPermission(permissions, 'BILL', 'R');

  // ── State ──────────────────────────────────────────────────────────────────
  //
  //  billTypes      → tab list         from GET /getBillType/{societyId}
  //  outstandingMap → balance per plan from GET /my/outstandingbalances  { [id]: item }
  //  selectedTabId  → currently active tab id
  //  statements     → per-tab rows     from GET /getAccountStatement?bill_type=X
  //
  const [billTypes, setBillTypes] = useState([]);
  const [outstandingMap, setOutstandingMap] = useState({});
  const [selectedTabId, setSelectedTabId] = useState(null);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [navModalVisible, setNavModalVisible] = useState(false);

  const tabScrollRef = useRef(null);
  const { showAlert, AlertComponent } = useAlert(nightMode);

  // ── Three-dot button ───────────────────────────────────────────────────────
  const ThreeDotsButton = (
    <TouchableOpacity
      onPress={() => setNavModalVisible(true)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="ellipsis-vertical"
        size={20}
        color={nightMode ? '#94A3B8' : '#6B7280'}
      />
    </TouchableOpacity>
  );

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (!permissionsLoaded) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title="Accounts" nightMode={nightMode} showBack rightIcon={ThreeDotsButton} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!canSeeOutstanding && !canSeeBills) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title="Accounts" nightMode={nightMode} showBack rightIcon={ThreeDotsButton} />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.sub} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
            Access Restricted
          </Text>
          <Text style={{ color: theme.sub, textAlign: 'center', paddingHorizontal: 40, marginTop: 8 }}>
            You do not have permission to view account details.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (canSeeOutstanding || canSeeBills) fetchInitialData();
  }, [permissionsLoaded]);

  /**
   * Loads both APIs in parallel, then auto-selects the first tab.
   *
   *   GET /getBillType/{societyId}   → bill plan list  → tabs
   *   GET /my/outstandingbalances    → balance per plan → outstanding banner
   */
  const fetchInitialData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const outstandingRes = await otherServices.getOutStandings();
      const outList = outstandingRes?.data ?? [];

      // Build map for quick balance lookup
      const oMap = {};
      outList.forEach((item) => { oMap[item.id] = item; });
      setOutstandingMap(oMap);

      // Tabs = ALL items from outstanding (same as Angular)
      setBillTypes(outList);

      // Auto-select first tab only on initial load
      if (outList.length > 0 && selectedTabId === null) {
        const firstId = outList[0].id;
        setSelectedTabId(firstId);
        await fetchStatements(firstId);
      } else if (selectedTabId !== null) {
        await fetchStatements(selectedTabId);
      }

    } catch (e) {
      console.log('fetchInitialData error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };
  /**
   * Fetches invoice / payment rows for a specific bill plan.
   *
   *   GET /getAccountStatement?bill_type={id}&page_no=1
   *
   * Mirrors Angular's bpProvider.getAccountStatement(id, pageNo).
   * ⚠️  Confirm the exact endpoint path with your backend if needed.
   */
  const fetchStatements = async (billTypeId) => {
    try {
      setTabLoading(true);
      const res = await otherServices.getAccountStatement(billTypeId, 1);
      const data = res?.status === 'success' && Array.isArray(res.data) ? res.data : [];
      setStatements(data);
    } catch {
      setStatements([]);
    } finally {
      setTabLoading(false);
    }
  };

  /** Tab tap — mirrors Angular onChange(id) */
  const onTabChange = (id) => {
    if (id === selectedTabId) return;
    setSelectedTabId(id);
    setStatements([]);

    // Only call API if this plan has actual data
    const plan = outstandingMap[id];
    if (plan?.show_bal && plan?.data?.balance) {
      fetchStatements(id);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData(true);
    setRefreshing(false);
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const plansWithBalance = Object.values(outstandingMap).filter(
    (item) => item.show_bal && item?.data?.balance,
  );

  const totalOutstanding = plansWithBalance.reduce(
    (sum, item) => sum + parseFloat(item?.data?.balance || 0), 0,
  );
const handleDownload = async (item) => {
  try {
    if (!item?.url) {
      console.log("No URL found");
      return;
    }

    const url = item.url;

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      console.log("Cannot open URL:", url);
      return;
    }

    // 🔥 DIRECT OPEN (no popup)
    await Linking.openURL(url);

  } catch (error) {
    console.log("Download Error:", error);
  }
};

  // ── Sub-components ─────────────────────────────────────────────────────────

  /**
   * Horizontal pill tabs — one per plan from /getBillType.
   * Plans that have an outstanding balance get a small red dot.
   * Hidden when only a single tab with id === 0.
   */


  /** Outstanding flat row — name left, balance right */
  const OutstandingRow = ({ item, isLast }) => (
    <View style={[
      styles.outRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: theme.borderColor },
    ]}>
      <Text style={[styles.outName, { color: theme.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.outAmount, { color: THEME.danger }]}>
        {formatCurrency(item?.data?.balance)}
      </Text>
    </View>
  );

  /**
   * Statement card — one per row from /getAccountStatement.
   * Shows: icon | statement_no + date | download
   *        amount | balance | type badge
   *        optional meta fields
   */
  const StatementCard = ({ item }) => {
    const icon = getStatementIcon(item);
    const current = parseFloat(item.current ?? item.amount ?? 0);
    const balance = parseFloat(item.balance ?? item.bal_amt ?? 0);

    return (
      <View
        style={[styles.stmtCard, { backgroundColor: theme.card }]}
      >
        {/* TOP: icon | info | download button */}
        <View style={styles.stmtTopRow}>
          <View style={[styles.stmtIconBox, { backgroundColor: theme.iconBg }]}>
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>

          <View style={styles.stmtInfo}>
            <Text style={[styles.stmtNo, { color: theme.text }]} numberOfLines={1}>
              {item.statement_no || item.bill_no || 'Statement'}
            </Text>
            <Text style={[styles.stmtDate, { color: theme.secondaryText }]}>
              {formatDate(item.date ?? item.bill_date)}
            </Text>
          </View>

          {!!item.url && (
            <TouchableOpacity
              onPress={() => handleDownload(item)}
              style={[styles.downloadBtn, { backgroundColor: theme.downloadBtn }]}
              activeOpacity={0.7}
            >
              <Ionicons name="download-outline" size={13} color={theme.downloadText} />
              <Text style={[styles.downloadBtnText, { color: theme.downloadText }]}>
                Download
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.stmtDivider, { backgroundColor: theme.borderColor }]} />

        {/* AMOUNTS ROW */}
        <View style={styles.stmtAmountsRow}>
          <View style={styles.stmtAmountItem}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>Amount</Text>
            <Text style={[styles.stmtAmountValue, { color: theme.text }]}>
              {formatCurrency(current)}
            </Text>
          </View>

          <View style={[styles.stmtAmountItem, { alignItems: 'center' }]}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>Balance</Text>
            <Text style={[styles.stmtAmountValue, { color: BRAND.COLORS.icon }]}>
              {formatCurrency(balance)}
            </Text>
          </View>

          <View style={[styles.stmtAmountItem, { alignItems: 'flex-end' }]}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>Type</Text>
            <View style={[styles.typeBadge, {
              backgroundColor: item.type === 'bill'
                ? THEME.primary + '20'
                : item.type_of_payment === 'DEBIT'
                  ? THEME.danger + '20'
                  : THEME.success + '20',
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: item.type === 'bill'
                  ? THEME.primary
                  : item.type_of_payment === 'DEBIT'
                    ? THEME.danger
                    : THEME.success,
              }]}>
                {item.type === 'bill' ? 'INVOICE' : (item.type_of_payment || 'CREDIT')}
              </Text>
            </View>
          </View>
        </View>

        {/* OPTIONAL META */}
        {(item.mode || item.o_date || item.o_bank || item.o_number || item.remarks) && (
          <View style={[styles.stmtMeta, { borderTopColor: theme.borderColor }]}>
            {!!item.mode && (
              <MetaRow label="Transaction Type" value={item.mode} theme={theme} />
            )}
            {!!item.o_date && item.o_date !== '0000-00-00 00:00:00' && (
              <MetaRow label="Payment Date" value={formatDate(item.o_date)} theme={theme} />
            )}
            {!!item.o_bank && <MetaRow label="Bank" value={item.o_bank} theme={theme} />}
            {!!item.o_number && <MetaRow label="Transaction No" value={item.o_number} theme={theme} />}
            {!!item.remarks && (
              <Text style={[styles.metaRemarks, { color: theme.sub }]}>{item.remarks}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const MetaRow = ({ label, value, theme }) => (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{label}: </Text>
      <Text style={[styles.metaValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  // ── Loading splash ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader
          title="Accounts"
          nightMode={nightMode}
          showBack
          rightIcon={ThreeDotsButton}
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>
            Loading accounts...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>

      <AppHeader
        title="Accounts"
        nightMode={nightMode}
        showBack
        rightIcon={ThreeDotsButton}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Total outstanding banner ──────────────────────────────────── */}
        {canSeeOutstanding && (
          <View style={[styles.summaryCard, { backgroundColor: THEME.primary }]}>
            <View style={styles.summaryInner}>
              <View>
                <Text style={styles.summaryLabel}>Total Outstanding</Text>
                <Text style={styles.summaryAmount}>{formatCurrency(totalOutstanding)}</Text>
                <Text style={styles.summaryNote}>
                  {plansWithBalance.length} plan{plansWithBalance.length !== 1 ? 's' : ''} with balance
                </Text>
              </View>
              <View style={styles.summaryIcon}>
                <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        )}

        {/* ── Outstanding per-plan rows ─────────────────────────────────── */}
        {canSeeOutstanding && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Outstanding</Text>
              <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                <Text style={[styles.badgeText, { color: THEME.primary }]}>
                  {plansWithBalance.length}
                </Text>
              </View>
            </View>

            {plansWithBalance.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={THEME.success} />
                <Text style={[styles.emptyText, { color: theme.sub }]}>No outstanding dues</Text>
              </View>
            ) : (
              <View style={[styles.outstandingBlock, {
                backgroundColor: theme.card,
                borderColor: theme.borderColor,
              }]}>
                {plansWithBalance.map((item, index) => (
                  <OutstandingRow
                    key={item.id}
                    item={item}
                    isLast={index === plansWithBalance.length - 1}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Account Statement section ─────────────────────────────────── */}
        {canSeeBills && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Statement</Text>
            </View>

            {/* Horizontal tabs from /getBillType */}
            {canSeeBills && billTypes.length > 0 && !(billTypes.length === 1 && billTypes[0]?.id === 0) && (
              <ScrollView
                ref={tabScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
                style={{ marginBottom: 12 }}
              >
                {billTypes.map((bt) => {
                  const active = bt.id === selectedTabId;
                  const hasBalance = outstandingMap[bt.id]?.show_bal;
                  return (
                    <TouchableOpacity
                      key={bt.id}
                      onPress={() => onTabChange(bt.id)}
                      activeOpacity={0.75}
                      style={[
                        styles.tabPill,
                        active
                          ? { backgroundColor: THEME.primary }
                          : { backgroundColor: theme.card, borderColor: theme.borderColor, borderWidth: 1 },
                      ]}
                    >
                      <Text style={[styles.tabPillText, { color: active ? '#fff' : theme.text }]}>
                        {bt.name}
                      </Text>
                      {hasBalance && (
                        <View style={[
                          styles.tabDot,
                          { backgroundColor: active ? 'rgba(255,255,255,0.8)' : THEME.danger },
                        ]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Statement cards for the active tab */}
            {tabLoading ? (
              <View style={styles.tabLoader}>
                <ActivityIndicator size="small" color={THEME.primary} />
                <Text style={{ color: theme.sub, marginTop: 8, fontSize: 13 }}>Loading...</Text>
              </View>
            ) : statements.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="document-outline" size={18} color={theme.sub} />
                <Text style={[styles.emptyText, { color: theme.sub }]}>No data found</Text>
              </View>
            ) : (
              statements.map((item, index) => (
                <StatementCard
                  key={item.id ?? item.statement_no ?? index}
                  item={item}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Pay FAB ──────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: THEME.primary }]}
        onPress={() => navigation.navigate('BillPaymentScreen', {
          billType: selectedTabId,
          outstanding: Object.values(outstandingMap),
        })}
        activeOpacity={0.85}
      >
        <Ionicons name="card-outline" size={20} color="#fff" />
        <Text style={styles.fabLabel}>Pay</Text>
      </TouchableOpacity>

      {/* ── Nav dropdown ─────────────────────────────────────────────────── */}
      <Modal
        transparent
        visible={navModalVisible}
        animationType="fade"
        onRequestClose={() => setNavModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.navOverlay}
          activeOpacity={1}
          onPress={() => setNavModalVisible(false)}
        >
          <View style={[styles.navDropdown, {
            backgroundColor: theme.navCard,
            borderColor: theme.borderColor,
          }]}>
            {NAV_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.navOption,
                  idx < NAV_OPTIONS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.borderColor,
                  },
                ]}
                onPress={() => { setNavModalVisible(false); navigation.navigate(opt.screen); }}
                activeOpacity={0.7}
              >
                <View style={[styles.navOptionIcon, { backgroundColor: theme.pillBg }]}>
                  <Ionicons name={opt.icon} size={16} color={THEME.primary} />
                </View>
                <Text style={[styles.navOptionText, { color: theme.text }]}>{opt.key}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.sub} />
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <AlertComponent />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Summary banner */
  summaryCard: { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  summaryInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  summaryNote: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryIcon: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  /* Empty */
  emptyRow: { flexDirection: 'column', alignItems: 'center', gap: 6, paddingVertical: 10 },
  emptyText: { fontSize: 13, fontWeight: '500' },

  /* Outstanding flat rows */
  outstandingBlock: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  outRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14,
  },
  outName: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 12 },
  outAmount: { fontSize: 13, fontWeight: '700' },

  /* Horizontal tabs */
  tabsContainer: { paddingRight: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
  },
  tabPillText: { fontSize: 13, fontWeight: '600' },
  tabDot: { width: 6, height: 6, borderRadius: 3 },

  /* Tab loader */
  tabLoader: { alignItems: 'center', paddingVertical: 40 },

  /* Statement card */
  stmtCard: {
    marginBottom: 10, borderRadius: 12, padding: 12,
    elevation: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  stmtTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stmtIconBox: {
    width: 40, height: 40, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  stmtInfo: { flex: 1 },
  stmtNo: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  stmtDate: { fontSize: 11 },
  stmtDivider: { height: 1, marginBottom: 10 },

  /* Download button */
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
    marginLeft: 6, alignSelf: 'flex-start',
  },
  downloadBtnText: { fontSize: 11, fontWeight: '600' },

  /* Amounts row */
  stmtAmountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stmtAmountItem: { flex: 1 },
  stmtAmountLabel: {
    fontSize: 9, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 3,
  },
  stmtAmountValue: { fontSize: 13, fontWeight: '700' },

  /* Type badge */
  typeBadge: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },

  /* Meta section */
  stmtMeta: { borderTopWidth: 1, marginTop: 10, paddingTop: 8, gap: 3 },
  metaRow: { flexDirection: 'row' },
  metaLabel: { fontSize: 11, fontWeight: '600' },
  metaValue: { fontSize: 11, flex: 1 },
  metaRemarks: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },

  /* Pay FAB */
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 13, paddingHorizontal: 22,
    borderRadius: 50, gap: 8, elevation: 5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 6,
  },
  fabLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* Three-dot nav dropdown */
  navOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  navDropdown: {
    position: 'absolute', top: 56, right: 12,
    minWidth: 190, borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14, shadowRadius: 8,
  },
  navOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14, gap: 10,
  },
  navOptionIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  navOptionText: { flex: 1, fontSize: 13, fontWeight: '600' },
});