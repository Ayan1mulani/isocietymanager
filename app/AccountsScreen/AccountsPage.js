import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../../Utils/ConetextApi';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { hasPermission } from '../../Utils/PermissionHelper';
import BRAND from '../config';
import useAlert from '../components/UseAlert';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHIMMER_TRAVEL = SCREEN_WIDTH * 2;

// ─── Module-level cache (survives component re-mounts) ────────────────────────
const cache = {
  billTypes: null,   // array of bill type objects
  outstandingMap: null,   // id → item
  statements: {},     // tabId → array
};

const THEME = {
  primary: BRAND.COLORS.primary,
  primaryLight: '#E8F5FD',
  success: '#10B981',
  danger: '#EF4444',
  lightBg: '#F0F4F8',
  darkBg: '#0F1117',
  shimBaseLight: '#E2E8F0',
  shimShineLight: '#F8FAFC',
  shimBaseDark: '#1E293B',
  shimShineDark: '#334155',
};

const NAV_OPTIONS = [
  { key: 'Debit Credit Note', icon: 'time-outline', screen: 'PaymentHistory' },
  { key: 'Payments', icon: 'card-outline', screen: 'Payment' },
  { key: 'Bills', icon: 'document-text-outline', screen: 'bills' },
  { key: 'Bounced Cheque', icon: 'alert-circle-outline', screen: 'BouncedCheques' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (amount) => {
  const n = Math.round(parseFloat(amount) || 0);
  return `₹${n.toLocaleString('en-IN')}`;
};

const fmtDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const stmtIcon = (item) => {
  if (item.type === 'bill') return { name: 'document-outline', color: THEME.primary };
  if (item.type_of_payment === 'DEBIT') return { name: 'card-outline', color: THEME.danger };
  return { name: 'card-outline', color: THEME.success };
};

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const ShimmerBox = React.memo(({ w, h, isDark, style, rad = 4 }) => {
  const tx = useRef(new Animated.Value(-SHIMMER_TRAVEL)).current;
  const base = isDark ? THEME.shimBaseDark : THEME.shimBaseLight;
  const shine = isDark ? THEME.shimShineDark : THEME.shimShineLight;

  useEffect(() => {
    const a = Animated.loop(
      Animated.timing(tx, { toValue: SHIMMER_TRAVEL, duration: 1100, useNativeDriver: true })
    );
    a.start();
    return () => a.stop();
  }, []);

  return (
    <View style={[{ width: w, height: h, backgroundColor: base, borderRadius: rad, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: tx }] }]}>
        <LinearGradient
          colors={[base, shine, shine, base]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_TRAVEL, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function AccountsScreen() {
  const { t } = useTranslation();
  const nav = useNavigation();
  const { nightMode, permissions } = usePermissions();
  const isDark = !!nightMode;

  const theme = useMemo(() => ({
    bg: isDark ? THEME.darkBg : THEME.lightBg,
    card: isDark ? '#1A1D27' : '#FFFFFF',
    text: isDark ? '#F1F5F9' : '#111827',
    sub: isDark ? '#94A3B8' : '#6B7280',
    pillBg: isDark ? '#1E2235' : THEME.primaryLight,
    downloadBtn: isDark ? '#1E3A5F' : '#EFF6FF',
    downloadText: isDark ? '#60A5FA' : THEME.primary,
    iconBg: BRAND.COLORS.iconbg,
    secondary: isDark ? '#CBD5E1' : '#6B7280',
    border: isDark ? '#334155' : '#E5E7EB',
    navCard: isDark ? '#1E293B' : '#FFFFFF',
  }), [isDark]);

  const pLoaded = permissions !== null && permissions !== undefined;
  const canOutstanding = pLoaded && hasPermission(permissions, 'OUTSND', 'R');
  const canBills = pLoaded && hasPermission(permissions, 'BILL', 'R');

  // ── State — seeded from cache for instant 2nd-open ────────────────────────
  const initTabId = cache.billTypes?.[0]?.id ?? null;

  const [billTypes, setBillTypes] = useState(cache.billTypes ?? []);
  const [outstandingMap, setOutstandingMap] = useState(cache.outstandingMap ?? {});
  const [selectedTabId, setSelectedTabId] = useState(initTabId);
  const [statements, setStatements] = useState(
    initTabId && cache.statements[initTabId] ? cache.statements[initTabId] : []
  );

  // Independent loading states — each section controls its own skeleton
  const [outLoading, setOutLoading] = useState(!cache.outstandingMap);
  const [stmtLoading, setStmtLoading] = useState(!cache.statements[initTabId ?? '']);
  const [refreshing, setRefreshing] = useState(false);
  const [navModal, setNavModal] = useState(false);

  const activeTab = useRef(initTabId);
  const tabScrollRef = useRef(null);
  const { AlertComponent } = useAlert(nightMode);

  useEffect(() => { activeTab.current = selectedTabId; }, [selectedTabId]);

  // ── Fetch outstanding ──────────────────────────────────────────────────────
  const fetchOutstanding = useCallback(async (force = false) => {
    if (cache.outstandingMap && !force) {
      setOutstandingMap(cache.outstandingMap);
      setBillTypes(cache.billTypes ?? []);
      setOutLoading(false);
      return;
    }
    try {
      setOutLoading(true);
      const res = await otherServices.getOutStandings();
      const list = res?.data ?? [];
      const oMap = {};
      list.forEach((i) => { oMap[i.id] = i; });
      cache.billTypes = list;
      cache.outstandingMap = oMap;
      setBillTypes(list);
      setOutstandingMap(oMap);
      // Set first tab if nothing selected yet — but do NOT block statements on this
      if (activeTab.current === null && list.length > 0) {
        activeTab.current = list[0].id;
        setSelectedTabId(list[0].id);
      }
    } catch (e) {
      console.log('fetchOutstanding:', e);
    } finally {
      setOutLoading(false);
    }
  }, []);

  // ── Fetch statements for a given tab ──────────────────────────────────────
  const fetchStatements = useCallback(async (tabId, force = false) => {
    if (tabId === null || tabId === undefined) return;
    if (cache.statements[tabId] && !force) {
      if (activeTab.current === tabId) {
        setStatements(cache.statements[tabId]);
        setStmtLoading(false);
      }
      return;
    }
    try {
      setStmtLoading(true);
      const res = await otherServices.getAccountStatement(tabId, 1);
      const data = res?.status === 'success' && Array.isArray(res.data) ? res.data : [];
      cache.statements[tabId] = data;
      if (activeTab.current === tabId) setStatements(data);
    } catch {
      if (activeTab.current === tabId) setStatements([]);
    } finally {
      if (activeTab.current === tabId) setStmtLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // TRUE PARALLEL LOAD — root cause of the slow first load was that tabId was
  // null at call-time, so statements waited for outstanding to finish first.
  //
  // Fix: resolve the tab ID BEFORE kicking off async work.
  //   • If cache has billTypes → tab ID is known immediately → fire both at once
  //   • If no cache → outstanding must run first to learn the tab ID,
  //     then fire statements immediately (no awaiting outstanding's full settle)
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (force = false) => {
    const knownTabId = activeTab.current ?? cache.billTypes?.[0]?.id ?? null;

    if (knownTabId !== null) {
      // Tab ID already known — fire both simultaneously, zero sequential wait
      await Promise.allSettled([
        fetchOutstanding(force),
        fetchStatements(knownTabId, force),
      ]);
    } else {
      // First ever load, no cache — fetch outstanding to discover tab IDs,
      // then immediately kick off statements without a second await chain
      await fetchOutstanding(force);
      // After outstanding resolves, activeTab.current is now set
      if (activeTab.current !== null) {
        fetchStatements(activeTab.current, force); // intentionally NOT awaited — runs concurrently
      }
    }
  }, [fetchOutstanding, fetchStatements]);

  useEffect(() => {
    if (canOutstanding || canBills) fetchAll(false);
  }, [pLoaded]);

  // ── Tab switch ─────────────────────────────────────────────────────────────
  const onTabChange = useCallback((id) => {
    if (id === selectedTabId) return;
    setSelectedTabId(id);
    activeTab.current = id;
    if (cache.statements[id]) {
      setStatements(cache.statements[id]);
      setStmtLoading(false);
    } else {
      setStatements([]);
      fetchStatements(id, false);
    }
  }, [selectedTabId, fetchStatements]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selectedTabId !== null) delete cache.statements[selectedTabId];
    cache.outstandingMap = null;
    cache.billTypes = null;
    await fetchAll(true);
    setRefreshing(false);
  }, [selectedTabId, fetchAll]);

  const handleDownload = useCallback(async (item) => {
    try {
      if (item?.url && await Linking.canOpenURL(item.url)) await Linking.openURL(item.url);
    } catch (e) { console.log('Download:', e); }
  }, []);

  // ── Derived — only items with show_bal:true are shown in outstanding ───────
  // Items where show_bal:false mean the server has no balance data for that plan.
  // Items where show_bal:true but balance=0 are still shown (e.g. advance cleared).
  const visiblePlans = useMemo(
    () => Object.values(outstandingMap).filter((i) => i.show_bal === true),
    [outstandingMap]
  );
  const plansWithDue = useMemo(
    () => visiblePlans.filter((i) => parseFloat(i?.data?.balance || 0) > 0),
    [visiblePlans]
  );
  const totalOutstanding = useMemo(
    () => plansWithDue.reduce((s, i) => s + parseFloat(i?.data?.balance || 0), 0),
    [plansWithDue]
  );

  // ── Skeletons ──────────────────────────────────────────────────────────────
  const SummarySkel = () => (
    <View style={[styles.summaryCard, {
      backgroundColor: isDark ? theme.card : THEME.primaryLight,
      borderWidth: isDark ? 1 : 0, borderColor: theme.border,
    }]}>
      <View style={styles.summaryInner}>
        <View style={{ flex: 1 }}>
          <ShimmerBox w={120} h={12} isDark={isDark} />
          <ShimmerBox w={180} h={26} isDark={isDark} style={{ marginTop: 8 }} />
          <ShimmerBox w={100} h={10} isDark={isDark} style={{ marginTop: 8 }} />
        </View>
        <ShimmerBox w={44} h={44} isDark={isDark} rad={10} />
      </View>
    </View>
  );

  const OutSkel = () => (
    <View style={[styles.outBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {[0, 1, 2].map((k) => (
        <View key={k} style={[styles.outRow, k < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
          <ShimmerBox w="45%" h={13} isDark={isDark} />
          <ShimmerBox w="25%" h={13} isDark={isDark} />
        </View>
      ))}
    </View>
  );

  const StmtSkel = () => (
    <View style={[styles.stmtCard, { backgroundColor: theme.card }]}>
      <View style={styles.stmtTopRow}>
        <ShimmerBox w={40} h={40} isDark={isDark} rad={10} style={{ marginRight: 10 }} />
        <View style={styles.stmtInfo}>
          <ShimmerBox w={130} h={15} isDark={isDark} style={{ marginBottom: 6 }} />
          <ShimmerBox w={80} h={11} isDark={isDark} />
        </View>
      </View>
      <View style={[styles.stmtDivider, { backgroundColor: theme.border }]} />
      <View style={styles.stmtAmountsRow}>
        {[0, 1, 2].map((k) => (
          <View key={k} style={[styles.stmtAmountItem, k === 1 && { alignItems: 'center' }, k === 2 && { alignItems: 'flex-end' }]}>
            <ShimmerBox w={48} h={9} isDark={isDark} style={{ marginBottom: 5 }} />
            <ShimmerBox w={68} h={15} isDark={isDark} />
          </View>
        ))}
      </View>
    </View>
  );

  // ── Statement card ─────────────────────────────────────────────────────────
  const StatementCard = useCallback(({ item }) => {
    const ico = stmtIcon(item);
    const current = parseFloat(item.current ?? item.amount ?? 0);
    const balance = parseFloat(item.balance ?? item.bal_amt ?? 0);
    const isBill = item.type === 'bill';
    const isDr = item.type_of_payment === 'DEBIT';

    return (
      <View style={[styles.stmtCard, { backgroundColor: theme.card }]}>
        <View style={styles.stmtTopRow}>
          <View style={[styles.stmtIconBox, { backgroundColor: theme.iconBg }]}>
            <Ionicons name={ico.name} size={20} color={ico.color} />
          </View>
          <View style={styles.stmtInfo}>
            <Text style={[styles.stmtNo, { color: theme.text }]} numberOfLines={1}>
              {item.statement_no || item.bill_no || 'Statement'}
            </Text>
            <Text style={[styles.stmtDate, { color: theme.secondary }]}>
              {fmtDate(item.date ?? item.bill_date)}
            </Text>
          </View>
          {!!item.url && (
            <TouchableOpacity onPress={() => handleDownload(item)} style={[styles.dlBtn, { backgroundColor: theme.downloadBtn }]} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={13} color={theme.downloadText} />
              <Text style={[styles.dlBtnText, { color: theme.downloadText }]}>{t('Download')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.stmtDivider, { backgroundColor: theme.border }]} />

        <View style={styles.stmtAmountsRow}>
          <View style={styles.stmtAmountItem}>
            <Text style={[styles.stmtAmtLabel, { color: theme.secondary }]}>{t('Amount')}</Text>
            <Text style={[styles.stmtAmtValue, { color: theme.text }]}>
              {fmt(Math.abs(current))}
            </Text>
          </View>
          <View style={[styles.stmtAmountItem, { alignItems: 'center' }]}>
            <Text style={[styles.stmtAmtLabel, { color: theme.secondary }]}>{t('Balance')}</Text>
            <Text style={[styles.stmtAmtValue, { color: BRAND.COLORS.icon }]}>
             {fmt(Math.abs(balance))}
            </Text>
          </View>
          <View style={[styles.stmtAmountItem, { alignItems: 'flex-end' }]}>
            <Text style={[styles.stmtAmtLabel, { color: theme.secondary }]}>{t('Type')}</Text>
            <View style={[styles.typeBadge, {
              backgroundColor: isBill ? THEME.primary + '20' : isDr ? THEME.danger + '20' : THEME.success + '20',
            }]}>
              <Text style={[styles.typeBadgeText, {
                color: isBill ? THEME.primary : isDr ? THEME.danger : THEME.success,
              }]}>
                {isBill ? t('INVOICE') : isDr ? t('DEBIT') : t('CREDIT')}
              </Text>
            </View>
          </View>
        </View>

        {(item.mode || (item.o_date && item.o_date !== '0000-00-00 00:00:00') || item.o_bank || item.o_number || item.remarks) && (
          <View style={[styles.stmtMeta, { borderTopColor: theme.border }]}>
            {!!item.mode && <View style={styles.metaRow}><Text style={[styles.metaLbl, { color: theme.secondary }]}>{t('Transaction Type')}: </Text><Text style={[styles.metaVal, { color: theme.text }]}>{item.mode}</Text></View>}
            {!!item.o_date && <View style={styles.metaRow}><Text style={[styles.metaLbl, { color: theme.secondary }]}>{t('Payment Date')}: </Text><Text style={[styles.metaVal, { color: theme.text }]}>{fmtDate(item.o_date)}</Text></View>}
            {!!item.o_bank && <View style={styles.metaRow}><Text style={[styles.metaLbl, { color: theme.secondary }]}>{t('Bank')}: </Text><Text style={[styles.metaVal, { color: theme.text }]}>{item.o_bank}</Text></View>}
            {!!item.o_number && <View style={styles.metaRow}><Text style={[styles.metaLbl, { color: theme.secondary }]}>{t('Transaction No')}: </Text><Text style={[styles.metaVal, { color: theme.text }]}>{item.o_number}</Text></View>}
            {!!item.remarks && <Text style={[styles.metaRemarks, { color: theme.sub }]}>{item.remarks}</Text>}
          </View>
        )}
      </View>
    );
  }, [theme, t, handleDownload]);

  // ── Access guard ──────────────────────────────────────────────────────────
  if (pLoaded && !canOutstanding && !canBills) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t('Accounts')} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.sub} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
            {t('Access Restricted')}
          </Text>
          <Text style={{ color: theme.sub, textAlign: 'center', paddingHorizontal: 40, marginTop: 8 }}>
            {t('You do not have permission to view account details.')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Three-dots button ─────────────────────────────────────────────────────
  const ThreeDots = (
    <TouchableOpacity
      onPress={() => setNavModal(true)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="ellipsis-vertical" size={20} color={isDark ? '#94A3B8' : '#6B7280'} />
    </TouchableOpacity>
  );

  // ── ListHeaderComponent ────────────────────────────────────────────────────
  const Header = (
    <View style={{ padding: 16 }}>

      {/* ── Total outstanding summary card ── */}
      {(!pLoaded || canOutstanding) && (
        outLoading ? <SummarySkel /> : (
          <View style={[styles.summaryCard, { backgroundColor: THEME.primary }]}>
            <View style={styles.summaryInner}>
              <View>
                <Text style={styles.summaryLabel}>{t('Total Outstanding')}</Text>
                <Text style={styles.summaryAmount}>{fmt(Math.abs(totalOutstanding))}</Text>
                <Text style={styles.summaryNote}>
                  {plansWithDue.length} {plansWithDue.length === 1 ? t('plan') : t('plans')} {t('with dues')}
                </Text>
              </View>
              <View style={styles.summaryIcon}>
                <Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
          </View>
        )
      )}

      {/* ── Outstanding list ──
          Only renders items where show_bal === true (server confirmed it has data).
          Balance = 0 items are shown as "Advance" or "Clear".
          No scroll — with real data this is a short fixed list (2-4 items max).
      ── */}
      {(!pLoaded || canOutstanding) && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Outstanding')}</Text>
            {!outLoading && plansWithDue.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                <Text style={[styles.badgeText, { color: THEME.primary }]}>{plansWithDue.length}</Text>
              </View>
            )}
          </View>

          {outLoading ? (
            <OutSkel />
          ) : visiblePlans.length === 0 ? (
            <View style={styles.emptyRow}>
              <Ionicons name="checkmark-circle-outline" size={18} color={THEME.success} />
              <Text style={[styles.emptyText, { color: theme.sub }]}>{t('No outstanding dues')}</Text>
            </View>
          ) : (
            <View style={[styles.outBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {visiblePlans.map((item, idx) => {
                const balance = parseFloat(item?.data?.balance || 0);
                const isDue = balance > 0;
                const isAdv = balance < 0;
                const isClear = balance === 0;
                return (
                  <View
                    key={String(item.id)}
                    style={[
                      styles.outRow,
                      idx < visiblePlans.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.outLeft}>
                      <Text style={[styles.outName, { color: theme.text }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {/* Show the server message as subtitle e.g. "Due left" / "Advance left" */}
                      {!!item.message && (
                        <Text style={[styles.outMsg, { color: theme.sub }]}>{item.message}</Text>
                      )}
                    </View>
                    <Text style={[styles.outAmount, {
                      color: isDue ? THEME.danger : isAdv ? THEME.success : theme.sub,
                    }]}>
                      <Text style={[styles.outAmount, {
                        color: isDue ? THEME.danger : isAdv ? THEME.success : theme.sub,
                      }]}>
                        {balance === 0
                          ? fmt(0)   // ✅ just show ₹0
                          : fmt(Math.abs(balance))}
                      </Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ── Statement section: header + tab pills ── */}
      {(!pLoaded || canBills) && (
        <View style={{ marginTop: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Account Statement')}</Text>
          </View>

          {outLoading ? (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
              <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
              <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
            </View>
          ) : canBills && billTypes.length > 0 && !(billTypes.length === 1 && billTypes[0]?.id === 0) ? (
            <ScrollView
              ref={tabScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContainer}
              style={{ marginBottom: 12 }}
            >
              {billTypes.map((bt) => {
                const active = bt.id === selectedTabId;
                const hasDue = outstandingMap[bt.id]?.show_bal &&
                  parseFloat(outstandingMap[bt.id]?.data?.balance || 0) > 0;
                return (
                  <TouchableOpacity
                    key={bt.id}
                    onPress={() => onTabChange(bt.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.tabPill,
                      active
                        ? { backgroundColor: THEME.primary }
                        : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 },
                    ]}
                  >
                    <Text style={[styles.tabPillText, { color: active ? '#fff' : theme.text }]}>
                      {bt.name}
                    </Text>
                    {/* Red dot only when there is an actual outstanding due amount */}
                    {hasDue && (
                      <View style={[styles.tabDot, {
                        backgroundColor: active ? 'rgba(255,255,255,0.8)' : THEME.danger,
                      }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      )}
    </View>
  );

  const Footer = (!pLoaded || canBills) ? (
    stmtLoading ? (
      <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
        <StmtSkel /><StmtSkel /><StmtSkel />
      </View>
    ) : statements.length === 0 ? (
      <View style={[styles.emptyRow, { paddingBottom: 100 }]}>
        <Ionicons name="document-outline" size={18} color={theme.sub} />
        <Text style={[styles.emptyText, { color: theme.sub }]}>{t('No data found')}</Text>
      </View>
    ) : null
  ) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t('Accounts')} nightMode={nightMode} showBack rightIcon={ThreeDots} />

      <FlatList
        data={stmtLoading ? [] : statements}
        keyExtractor={(item, idx) => String(item.id ?? item.statement_no ?? idx)}
        renderItem={({ item, index }) => (
          <View style={{
            paddingHorizontal: 16,
            paddingBottom: index === statements.length - 1 ? 100 : 0,
          }}>
            <StatementCard item={item} />
          </View>
        )}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[THEME.primary]}
            tintColor={THEME.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={10}
        keyboardShouldPersistTaps="handled"
      />

      {/* Pay FAB */}
      {!outLoading && pLoaded && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: THEME.primary }]}
          onPress={() => nav.navigate('BillPaymentScreen', {
            billType: selectedTabId,
            outstanding: Object.values(outstandingMap),
          })}
          activeOpacity={0.85}
        >
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.fabLabel}>{t('Pay')}</Text>
        </TouchableOpacity>
      )}

      {/* Nav modal */}
      <Modal transparent visible={navModal} animationType="fade" onRequestClose={() => setNavModal(false)}>
        <TouchableOpacity style={styles.navOverlay} activeOpacity={1} onPress={() => setNavModal(false)}>
          <View style={[styles.navDropdown, { backgroundColor: theme.navCard, borderColor: theme.border }]}>
            {NAV_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.navOption,
                  idx < NAV_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
                onPress={() => {
                  setNavModal(false);
                  const sel = outstandingMap[selectedTabId];
                  const amount = parseFloat(sel?.data?.balance ?? sel?.balance ?? 0);
                  nav.navigate(opt.screen, {
                    billType: selectedTabId, amount,
                    outstanding: Object.values(outstandingMap),
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navOptionIcon, { backgroundColor: theme.pillBg }]}>
                  <Ionicons name={opt.icon} size={16} color={THEME.primary} />
                </View>
                <Text style={[styles.navOptionText, { color: theme.text }]}>{t(opt.key)}</Text>
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

  summaryCard: { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  summaryInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryAmount: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  summaryNote: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyRow: { flexDirection: 'column', alignItems: 'center', gap: 6, paddingVertical: 10 },
  emptyText: { fontSize: 13, fontWeight: '500' },

  // Outstanding block — plain View, no scroll, height is natural
  outBlock: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  outRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 14 },
  outLeft: { flex: 1, marginRight: 12 },
  outName: { fontSize: 13, fontWeight: '600' },
  outMsg: { fontSize: 11, marginTop: 1 },
  outAmount: { fontSize: 13, fontWeight: '700' },

  // Tab pills
  tabsContainer: { paddingRight: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tabPillText: { fontSize: 13, fontWeight: '600' },
  tabDot: { width: 6, height: 6, borderRadius: 3 },

  // Statement card
  stmtCard: { marginBottom: 10, borderRadius: 12, padding: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  stmtTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stmtIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  stmtInfo: { flex: 1 },
  stmtNo: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  stmtDate: { fontSize: 11 },
  stmtDivider: { height: 1, marginBottom: 10 },
  dlBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginLeft: 6, alignSelf: 'flex-start' },
  dlBtnText: { fontSize: 11, fontWeight: '600' },
  stmtAmountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stmtAmountItem: { flex: 1 },
  stmtAmtLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 3 },
  stmtAmtValue: { fontSize: 13, fontWeight: '700' },
  typeBadge: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },
  stmtMeta: { borderTopWidth: 1, marginTop: 10, paddingTop: 8, gap: 3 },
  metaRow: { flexDirection: 'row' },
  metaLbl: { fontSize: 11, fontWeight: '600' },
  metaVal: { fontSize: 11, flex: 1 },
  metaRemarks: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },

  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 22, borderRadius: 50, gap: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  fabLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },

  navOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  navDropdown: { position: 'absolute', top: 56, right: 12, minWidth: 190, borderRadius: 12, borderWidth: 1, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 8 },
  navOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  navOptionIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  navOptionText: { flex: 1, fontSize: 13, fontWeight: '600' },
});