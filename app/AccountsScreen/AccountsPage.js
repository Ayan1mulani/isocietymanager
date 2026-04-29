import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
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

// ─── Constants & Cache ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SHIMMER_TRAVEL = SCREEN_WIDTH * 2;

let memoryCache = {
  billTypes: null,
  outstandingMap: null,
  statements: {}, 
};

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
  
  // Skeleton Colors
  shimBaseLight: '#E2E8F0',
  shimShineLight: '#F8FAFC',
  shimBaseDark: '#1E293B',
  shimShineDark: '#334155',
};

const NAV_OPTIONS = [
  { key: 'Debit Credit Note', icon: 'time-outline', screen: 'PaymentHistory' },
  { key: 'Payments', icon: 'card-outline', screen: 'Payment' },
  { key: 'Bills', icon: 'document-text-outline', screen: 'bills' },
  { key: 'Bounced Cheque', icon: 'alert-circle-outline', screen: 'BouncedCheques' }
];

// ─── Pure helpers ──────────────────────────────────────────────────────────────

// ✅ UPDATED: Automatically rounds the number to remove messy decimals (e.g. .506)
const formatCurrency = (amount) => {
  const num = Math.round(parseFloat(amount) || 0);
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (date) => {
  if (!date) return '-';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const getStatementIcon = (item) => {
  if (item.type === 'bill') return { name: 'document-outline', color: THEME.primary };
  if (item.type_of_payment === 'DEBIT') return { name: 'card-outline', color: THEME.danger };
  return { name: 'card-outline', color: THEME.success };
};

// ─── Shimmer Component ─────────────────────────────────────────────────────────
const ShimmerBox = ({ w, h, isDark, style, rad = 4 }) => {
  const translateX = useRef(new Animated.Value(-SHIMMER_TRAVEL)).current;
  const base = isDark ? THEME.shimBaseDark : THEME.shimBaseLight;
  const shine = isDark ? THEME.shimShineDark : THEME.shimShineLight;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, { toValue: SHIMMER_TRAVEL, duration: 1100, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[{ width: w, height: h, backgroundColor: base, borderRadius: rad, overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[base, shine, shine, base]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_TRAVEL, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AccountsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { nightMode, permissions } = usePermissions();

  const isDark = !!nightMode;
  const theme = {
    bg: isDark ? THEME.darkBg : THEME.lightBg,
    card: isDark ? THEME.darkCard : THEME.lightCard,
    text: isDark ? '#F1F5F9' : '#111827',
    sub: isDark ? '#94A3B8' : '#6B7280',
    pillBg: isDark ? '#1E2235' : THEME.primaryLight,
    downloadBtn: isDark ? '#1E3A5F' : '#EFF6FF',
    downloadText: isDark ? '#60A5FA' : THEME.primary,
    iconBg: BRAND.COLORS.iconbg,
    secondaryText: isDark ? '#CBD5E1' : '#6B7280',
    borderColor: isDark ? '#334155' : '#E5E7EB',
    navCard: isDark ? '#1E293B' : '#FFFFFF',
  };

  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canSeeOutstanding = permissionsLoaded && hasPermission(permissions, 'OUTSND', 'R');
  const canSeeBills = permissionsLoaded && hasPermission(permissions, 'BILL', 'R');

  const [billTypes, setBillTypes] = useState(memoryCache.billTypes || []);
  const [outstandingMap, setOutstandingMap] = useState(memoryCache.outstandingMap || {});
  
  const initialTabId = memoryCache.billTypes?.length > 0 ? memoryCache.billTypes[0].id : null;
  const [selectedTabId, setSelectedTabId] = useState(initialTabId);
  
  const [statements, setStatements] = useState(
    initialTabId && memoryCache.statements[initialTabId] ? memoryCache.statements[initialTabId] : []
  );

  const [loading, setLoading] = useState(!memoryCache.billTypes);
  const [tabLoading, setTabLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [navModalVisible, setNavModalVisible] = useState(false);

  const tabScrollRef = useRef(null);
  const activeTabRef = useRef(selectedTabId);
  const { AlertComponent } = useAlert(nightMode);

  useEffect(() => {
    activeTabRef.current = selectedTabId;
  }, [selectedTabId]);

  const ThreeDotsButton = (
    <TouchableOpacity onPress={() => setNavModalVisible(true)} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="ellipsis-vertical" size={20} color={isDark ? '#94A3B8' : '#6B7280'} />
    </TouchableOpacity>
  );

  useEffect(() => {
    if (canSeeOutstanding || canSeeBills) fetchInitialData(false);
  }, [permissionsLoaded]);

  const fetchInitialData = async (forceRefresh = false) => {
    try {
      if (!memoryCache.billTypes && !forceRefresh) setLoading(true);

      const outstandingRes = await otherServices.getOutStandings();
      const outList = outstandingRes?.data ?? [];
      const oMap = {};
      outList.forEach((item) => { oMap[item.id] = item; });

      memoryCache.billTypes = outList;
      memoryCache.outstandingMap = oMap;

      setOutstandingMap(oMap);
      setBillTypes(outList);

      let currentActiveTab = activeTabRef.current;
      if (outList.length > 0 && currentActiveTab === null) {
        currentActiveTab = outList[0].id;
        setSelectedTabId(currentActiveTab);
      }

      if (currentActiveTab !== null) {
        await fetchStatements(currentActiveTab, forceRefresh);
      }
    } catch (e) {
      console.log('fetchInitialData error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatements = async (billTypeId, forceRefresh = false) => {
    if (memoryCache.statements[billTypeId] && !forceRefresh) {
      if (activeTabRef.current === billTypeId) setStatements(memoryCache.statements[billTypeId]);
      return; 
    }
    try {
      if (!forceRefresh) setTabLoading(true);
      const res = await otherServices.getAccountStatement(billTypeId, 1);
      const data = res?.status === 'success' && Array.isArray(res.data) ? res.data : [];
      memoryCache.statements[billTypeId] = data;
      if (activeTabRef.current === billTypeId) setStatements(data);
    } catch {
      if (activeTabRef.current === billTypeId) setStatements([]);
    } finally {
      setTabLoading(false);
    }
  };

  const onTabChange = (id) => {
    if (id === selectedTabId) return;
    setSelectedTabId(id);
    if (memoryCache.statements[id]) {
      setStatements(memoryCache.statements[id]);
    } else {
      setStatements([]);
      const plan = outstandingMap[id];
      if (plan?.show_bal && plan?.data?.balance) fetchStatements(id, false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData(true);
    setRefreshing(false);
  };

  const plansWithBalance = Object.values(outstandingMap).filter((item) => item.show_bal && item?.data?.balance);
  const totalOutstanding = plansWithBalance.reduce((sum, item) => sum + parseFloat(item?.data?.balance || 0), 0);

  const handleDownload = async (item) => {
    try {
      if (!item?.url) return;
      const supported = await Linking.canOpenURL(item.url);
      if (supported) await Linking.openURL(item.url);
    } catch (error) {
      console.log('Download Error:', error);
    }
  };

  // ─── Skeleton Components ──────────────────────────────────────────────────────
  
  const SummarySkeleton = () => (
    <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.card : THEME.primaryLight, borderWidth: isDark ? 1 : 0, borderColor: theme.borderColor }]}>
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

  const OutstandingListSkeleton = () => (
    <View style={[styles.outstandingBlock, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
      {[1, 2].map((k, i) => (
        <View key={k} style={[styles.outRow, i === 0 && { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
          <ShimmerBox w="40%" h={14} isDark={isDark} />
          <ShimmerBox w="25%" h={14} isDark={isDark} />
        </View>
      ))}
    </View>
  );

  const StatementCardSkeleton = () => (
    <View style={[styles.stmtCard, { backgroundColor: theme.card }]}>
      <View style={styles.stmtTopRow}>
        <ShimmerBox w={40} h={40} isDark={isDark} rad={10} style={{ marginRight: 10 }} />
        <View style={styles.stmtInfo}>
          <ShimmerBox w={120} h={16} isDark={isDark} style={{ marginBottom: 6 }} />
          <ShimmerBox w={80} h={12} isDark={isDark} />
        </View>
      </View>
      <View style={[styles.stmtDivider, { backgroundColor: theme.borderColor }]} />
      <View style={styles.stmtAmountsRow}>
        <View style={styles.stmtAmountItem}>
          <ShimmerBox w={50} h={10} isDark={isDark} style={{ marginBottom: 6 }} />
          <ShimmerBox w={70} h={16} isDark={isDark} />
        </View>
        <View style={[styles.stmtAmountItem, { alignItems: 'center' }]}>
          <ShimmerBox w={50} h={10} isDark={isDark} style={{ marginBottom: 6 }} />
          <ShimmerBox w={70} h={16} isDark={isDark} />
        </View>
        <View style={[styles.stmtAmountItem, { alignItems: 'flex-end' }]}>
          <ShimmerBox w={40} h={10} isDark={isDark} style={{ marginBottom: 6 }} />
          <ShimmerBox w={50} h={18} isDark={isDark} rad={5} />
        </View>
      </View>
    </View>
  );

  // ─── Sub-components ─────────────────────────────────────────────────────────

  const OutstandingRow = ({ item, isLast }) => (
    <View style={[styles.outRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}>
      <Text style={[styles.outName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
      <Text style={[styles.outAmount, { color: THEME.danger }]}>{formatCurrency(Math.abs(item?.data?.balance))} Dr</Text>
    </View>
  );

  const StatementCard = ({ item }) => {
    const icon = getStatementIcon(item);
    const current = parseFloat(item.current ?? item.amount ?? 0);
    const balance = parseFloat(item.balance ?? item.bal_amt ?? 0);

    return (
      <View style={[styles.stmtCard, { backgroundColor: theme.card }]}>
        <View style={styles.stmtTopRow}>
          <View style={[styles.stmtIconBox, { backgroundColor: theme.iconBg }]}><Ionicons name={icon.name} size={20} color={icon.color} /></View>
          <View style={styles.stmtInfo}>
            <Text style={[styles.stmtNo, { color: theme.text }]} numberOfLines={1}>{item.statement_no || item.bill_no || 'Statement'}</Text>
            <Text style={[styles.stmtDate, { color: theme.secondaryText }]}>{formatDate(item.date ?? item.bill_date)}</Text>
          </View>
          {!!item.url && (
            <TouchableOpacity onPress={() => handleDownload(item)} style={[styles.downloadBtn, { backgroundColor: theme.downloadBtn }]} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={13} color={theme.downloadText} />
              <Text style={[styles.downloadBtnText, { color: theme.downloadText }]}>Download</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.stmtDivider, { backgroundColor: theme.borderColor }]} />
        <View style={styles.stmtAmountsRow}>
          <View style={styles.stmtAmountItem}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>{t('Amount')}</Text>
            <Text style={[styles.stmtAmountValue, { color: theme.text }]}>{formatCurrency(Math.abs(current))} {item.type_of_payment === 'DEBIT' ? 'Dr' : 'Cr'}</Text>
          </View>
          <View style={[styles.stmtAmountItem, { alignItems: 'center' }]}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>{t('Balance')}</Text>
            <Text style={[styles.stmtAmountValue, { color: BRAND.COLORS.icon }]}>{formatCurrency(Math.abs(balance))} {balance < 0 ? 'Dr' : 'Cr'}</Text>
          </View>
          <View style={[styles.stmtAmountItem, { alignItems: 'flex-end' }]}>
            <Text style={[styles.stmtAmountLabel, { color: theme.secondaryText }]}>{t('Type')}</Text>
            <View style={[styles.typeBadge, { backgroundColor: item.type === 'bill' ? THEME.primary + '20' : item.type_of_payment === 'DEBIT' ? THEME.danger + '20' : THEME.success + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: item.type === 'bill' ? THEME.primary : item.type_of_payment === 'DEBIT' ? THEME.danger : THEME.success }]}>
                {item.type === 'bill' ? t('INVOICE') : item.type_of_payment === 'DEBIT' ? t('DEBIT') : t('CREDIT')}
              </Text>
            </View>
          </View>
        </View>
        {(item.mode || item.o_date || item.o_bank || item.o_number || item.remarks) && (
          <View style={[styles.stmtMeta, { borderTopColor: theme.borderColor }]}>
            {!!item.mode && <View style={styles.metaRow}><Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{t('Transaction Type')}: </Text><Text style={[styles.metaValue, { color: theme.text }]}>{item.mode}</Text></View>}
            {!!item.o_date && item.o_date !== '0000-00-00 00:00:00' && <View style={styles.metaRow}><Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{t('Payment Date')}: </Text><Text style={[styles.metaValue, { color: theme.text }]}>{formatDate(item.o_date)}</Text></View>}
            {!!item.o_bank && <View style={styles.metaRow}><Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{t('Bank')}: </Text><Text style={[styles.metaValue, { color: theme.text }]}>{item.o_bank}</Text></View>}
            {!!item.o_number && <View style={styles.metaRow}><Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{t('Transaction No')}: </Text><Text style={[styles.metaValue, { color: theme.text }]}>{item.o_number}</Text></View>}
            {!!item.remarks && <Text style={[styles.metaRemarks, { color: theme.sub }]}>{item.remarks}</Text>}
          </View>
        )}
      </View>
    );
  };

  // ─── Guards ─────────────────────────────────────────────────────────────────

  if (permissionsLoaded && !canSeeOutstanding && !canSeeBills) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t('Accounts')} nightMode={nightMode} showBack rightIcon={ThreeDotsButton} />
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={64} color={theme.sub} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>{t('Access Restricted')}</Text>
          <Text style={{ color: theme.sub, textAlign: 'center', paddingHorizontal: 40, marginTop: 8 }}>{t('You do not have permission to view account details.')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t('Accounts')} nightMode={nightMode} showBack rightIcon={ThreeDotsButton} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} tintColor={THEME.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* TOTAL OUTSTANDING */}
        {(!permissionsLoaded || canSeeOutstanding) && (
          loading ? (
            <SummarySkeleton />
          ) : (
            <View style={[styles.summaryCard, { backgroundColor: THEME.primary }]}>
              <View style={styles.summaryInner}>
                <View>
                  <Text style={styles.summaryLabel}>{t('Total Outstanding')}</Text>
                  <Text style={styles.summaryAmount}>{formatCurrency(Math.abs(totalOutstanding))} Dr</Text>
                  <Text style={styles.summaryNote}>
                    {t('{{count}} plan{plural} with balance', { count: plansWithBalance.length, plural: plansWithBalance.length !== 1 ? 's' : '' })}
                  </Text>
                </View>
                <View style={styles.summaryIcon}><Ionicons name="wallet-outline" size={32} color="rgba(255,255,255,0.9)" /></View>
              </View>
            </View>
          )
        )}

        {/* OUTSTANDING LIST */}
        {(!permissionsLoaded || canSeeOutstanding) && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Outstanding')}</Text>
              {!loading && (
                <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                  <Text style={[styles.badgeText, { color: THEME.primary }]}>{plansWithBalance.length}</Text>
                </View>
              )}
            </View>

            {loading ? (
              <OutstandingListSkeleton />
            ) : plansWithBalance.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="checkmark-circle-outline" size={18} color={THEME.success} />
                <Text style={[styles.emptyText, { color: theme.sub }]}>{t('No outstanding dues')}</Text>
              </View>
            ) : (
              <View style={[styles.outstandingBlock, { backgroundColor: theme.card, borderColor: theme.borderColor }]}>
                {plansWithBalance.map((item, index) => (
                  <OutstandingRow key={item.id} item={item} isLast={index === plansWithBalance.length - 1} />
                ))}
              </View>
            )}
          </>
        )}

        {/* ACCOUNT STATEMENT */}
        {(!permissionsLoaded || canSeeBills) && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('Account Statement')}</Text>
            </View>

            {loading ? (
               <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                 <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
                 <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
                 <ShimmerBox w={80} h={32} isDark={isDark} rad={20} />
               </View>
            ) : canSeeBills && billTypes.length > 0 && !(billTypes.length === 1 && billTypes[0]?.id === 0) ? (
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
                      style={[styles.tabPill, active ? { backgroundColor: THEME.primary } : { backgroundColor: theme.card, borderColor: theme.borderColor, borderWidth: 1 }]}
                    >
                      <Text style={[styles.tabPillText, { color: active ? '#fff' : theme.text }]}>{bt.name}</Text>
                      {hasBalance && <View style={[styles.tabDot, { backgroundColor: active ? 'rgba(255,255,255,0.8)' : THEME.danger }]} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            {loading || tabLoading ? (
              <>
                <StatementCardSkeleton />
                <StatementCardSkeleton />
                <StatementCardSkeleton />
              </>
            ) : statements.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="document-outline" size={18} color={theme.sub} />
                <Text style={[styles.emptyText, { color: theme.sub }]}>{t('No data found')}</Text>
              </View>
            ) : (
              statements.map((item, index) => (
                <StatementCard key={item.id ?? item.statement_no ?? index} item={item} />
              ))
            )}
          </View>
        )}
      </ScrollView>

      {!loading && permissionsLoaded && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: THEME.primary }]}
          onPress={() => navigation.navigate('BillPaymentScreen', { billType: selectedTabId, outstanding: Object.values(outstandingMap) })}
          activeOpacity={0.85}
        >
          <Ionicons name="card-outline" size={20} color="#fff" />
          <Text style={styles.fabLabel}>Pay</Text>
        </TouchableOpacity>
      )}

      <Modal transparent visible={navModalVisible} animationType="fade" onRequestClose={() => setNavModalVisible(false)}>
        <TouchableOpacity style={styles.navOverlay} activeOpacity={1} onPress={() => setNavModalVisible(false)}>
          <View style={[styles.navDropdown, { backgroundColor: theme.navCard, borderColor: theme.borderColor }]}>
            {NAV_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.navOption, idx < NAV_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderColor }]}
                onPress={() => {
                  setNavModalVisible(false);
                  const selected = outstandingMap[selectedTabId];
                  const amount = parseFloat(selected?.data?.balance ?? selected?.balance ?? 0);
                  navigation.navigate('BillPaymentScreen', { billType: selectedTabId, amount: amount, outstanding: Object.values(outstandingMap) });
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.navOptionIcon, { backgroundColor: theme.pillBg }]}><Ionicons name={opt.icon} size={16} color={THEME.primary} /></View>
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
  outstandingBlock: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  outRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  outName: { fontSize: 13, fontWeight: '500', flex: 1, marginRight: 12 },
  outAmount: { fontSize: 13, fontWeight: '700' },
  tabsContainer: { paddingRight: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  tabPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  tabPillText: { fontSize: 13, fontWeight: '600' },
  tabDot: { width: 6, height: 6, borderRadius: 3 },
  tabLoader: { alignItems: 'center', paddingVertical: 40 },
  stmtCard: { marginBottom: 10, borderRadius: 12, padding: 12, elevation: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  stmtTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  stmtIconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  stmtInfo: { flex: 1 },
  stmtNo: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  stmtDate: { fontSize: 11 },
  stmtDivider: { height: 1, marginBottom: 10 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, marginLeft: 6, alignSelf: 'flex-start' },
  downloadBtnText: { fontSize: 11, fontWeight: '600' },
  stmtAmountsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stmtAmountItem: { flex: 1 },
  stmtAmountLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.2, marginBottom: 3 },
  stmtAmountValue: { fontSize: 13, fontWeight: '700' },
  typeBadge: { alignSelf: 'flex-end', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },
  stmtMeta: { borderTopWidth: 1, marginTop: 10, paddingTop: 8, gap: 3 },
  metaRow: { flexDirection: 'row' },
  metaLabel: { fontSize: 11, fontWeight: '600' },
  metaValue: { fontSize: 11, flex: 1 },
  metaRemarks: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  fab: { position: 'absolute', bottom: 24, right: 20, flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 22, borderRadius: 50, gap: 8, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  fabLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  navOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)' },
  navDropdown: { position: 'absolute', top: 56, right: 12, minWidth: 190, borderRadius: 12, borderWidth: 1, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.14, shadowRadius: 8 },
  navOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  navOptionIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  navOptionText: { flex: 1, fontSize: 13, fontWeight: '600' },
});