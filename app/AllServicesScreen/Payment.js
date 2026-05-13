import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated, // Added for Skeleton
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for cache
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi';
import { ismServices } from '../../services/ismServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const CACHE_KEY = 'cached_payments_data';

const THEME = {
  primary:      BRAND.COLORS.primary,
  primaryLight: '#E8F5FD',
  success:      '#10B981',
  danger:       '#EF4444',
  lightBg:      '#F0F4F8',
  darkBg:       '#0F1117',
  lightCard:    '#FFFFFF',
  darkCard:     '#1A1D27',
};

/* ─────────────────────────────────────────
   Helper: Skeleton Pulse Effect
───────────────────────────────────────── */
const SkeletonPulse = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[style, { opacity: pulseAnim, backgroundColor: '#E5E7EB' }]} />;
};

const PaymentSkeleton = ({ theme }) => (
  <View style={{ padding: 16 }}>
    {/* Summary Card Skeleton */}
    <SkeletonPulse style={{ width: '100%', height: 130, borderRadius: 14, marginBottom: 20 }} />
    {/* List Header Skeleton */}
    <SkeletonPulse style={{ width: 150, height: 20, borderRadius: 4, marginBottom: 15 }} />
    {/* List Items Skeleton */}
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={[styles.card, { backgroundColor: theme.card, marginBottom: 8, elevation: 0 }]}>
        <SkeletonPulse style={{ width: 40, height: 40, borderRadius: 10 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonPulse style={{ width: '60%', height: 14, borderRadius: 4 }} />
          <SkeletonPulse style={{ width: '40%', height: 10, borderRadius: 4 }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <SkeletonPulse style={{ width: 60, height: 14, borderRadius: 4 }} />
          <SkeletonPulse style={{ width: 40, height: 12, borderRadius: 4 }} />
        </View>
      </View>
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const Payment = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { nightMode } = usePermissions();

  const theme = {
    bg:            nightMode ? THEME.darkBg   : '#F0F4F8',
    card:          nightMode ? THEME.darkCard : THEME.lightCard,
    text:          nightMode ? '#F1F5F9'      : '#111827',
    sub:           nightMode ? '#94A3B8'      : '#6B7280',
    pillBg:        nightMode ? '#1E2235'      : THEME.primaryLight,
    secondaryText: nightMode ? '#CBD5E1'      : '#6B7280',
    borderColor:   nightMode ? '#334155'      : '#E5E7EB',
    iconBg:        BRAND.COLORS.iconbg,
  };

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Initial Load Logic: Check Cache first
  useEffect(() => {
    const init = async () => {
      try {
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          setData(JSON.parse(cachedData));
          setLoading(false); // Hide global loader if cache exists
        }
      } catch (e) {
        console.log("Cache load error:", e);
      }
      loadPayments(); // Fetch fresh data in background
    };
    init();
  }, []);

  const loadPayments = async () => {
    try {
      const res = await ismServices.getPayments();
      if (res?.status === 'success') {
        const payments = res.data || [];
        setData(payments);
        // 2. Save to Cache
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payments));
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    const isKhmer = i18n.language === 'km';
    const symbol = isKhmer ? '៛' : '₹';
    const locale = isKhmer ? 'km-KH' : 'en-IN';
    return `${symbol}${(isNaN(num) ? 0 : num).toLocaleString(locale)}`;
  };

  const formatDate = (raw) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleString(i18n.language === 'km' ? 'km-KH' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const totalCredit = data
    .filter((i) => i.type === 'CREDIT' || i.p_type === 'CR')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const totalDebit = data
    .filter((i) => i.type !== 'CREDIT' && i.p_type !== 'CR')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  // ── Skeleton State ──
  if (loading && data.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Payments")} nightMode={nightMode} showBack />
        <PaymentSkeleton theme={theme} />
      </SafeAreaView>
    );
  }

  // ── Empty State ──
  if (data.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Payments")} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <Ionicons name="wallet-outline" size={64} color={theme.sub} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
            {t("No Payments Found")}
          </Text>
          <Text style={{ color: theme.sub, textAlign: 'center', paddingHorizontal: 40, marginTop: 8, fontSize: 13 }}>
            {t("Your payment history will appear here.")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }) => {
    const isCredit  = item.type === 'CREDIT' || item.p_type === 'CR';
    const typeColor = isCredit ? THEME.success : THEME.danger;
    const typeLabel = isCredit ? t('CREDIT') : t('DEBIT');
    const transactionType = item.mode || item.type || t('Payment');
    const billPlan = item.bill_plan_name || item.bill_plan || item.bill_type || '';

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => navigation.navigate('PaymentDetailScreen', { id: item.id })}
        style={[styles.card, { backgroundColor: theme.card }]}
      >
        <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
          <Ionicons name="card-outline" size={20} color={isCredit ? THEME.success : THEME.danger} />
        </View>

        <View style={styles.mid}>
          <Text style={[styles.remarks, { color: theme.text }]} numberOfLines={1}>
            {transactionType}
          </Text>

          <Text
            style={[
              styles.date,
              {
                color: theme.secondaryText,
                marginTop: 2,
                fontSize: 11,
                fontWeight: '500',
              },
            ]}
            numberOfLines={1}
          >
            {billPlan || t('Bill Plan Not Available')}
          </Text>

          <Text style={[styles.date, { color: theme.secondaryText, marginTop: 2 }]}>
            {formatDate(item.transaction_date_time)}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: isCredit ? THEME.success : theme.text }]}>
            {formatCurrency(item.amount)}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>
              {typeLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t("Payments")} nightMode={nightMode} showBack />

      <FlatList
        data={data}
        keyExtractor={(item, i) => (item.id ? item.id.toString() : i.toString())}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <>
            <View style={[styles.summaryCard, { backgroundColor: THEME.primary }]}>
              <View style={styles.summaryInner}>
                <View>
                  <Text style={styles.summaryLabel}>{t("Total Payments")}</Text>
                  <Text style={styles.summaryAmount}>{data.length} {t("transactions")}</Text>
                  <Text style={styles.summaryNote}>{formatCurrency(totalCredit)} {t("received")}</Text>
                </View>
                <View style={styles.summaryIcon}>
                  <Ionicons name="card-outline" size={32} color="rgba(255,255,255,0.9)" />
                </View>
              </View>

              <View style={styles.summarySplitRow}>
                <View style={styles.summarySplitItem}>
                  <Ionicons name="arrow-down-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.summarySplitLabel}>{t("Credit")}</Text>
                  <Text style={styles.summarySplitValue}>{formatCurrency(totalCredit)}</Text>
                </View>
                <View style={styles.summarySplitDivider} />
                <View style={styles.summarySplitItem}>
                  <Ionicons name="arrow-up-circle-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.summarySplitLabel}>{t("Debit")}</Text>
                  <Text style={styles.summarySplitValue}>{formatCurrency(totalDebit)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {t("Transaction History")}
              </Text>
              <View style={[styles.badge, { backgroundColor: theme.pillBg }]}>
                <Text style={[styles.badgeText, { color: THEME.primary }]}>{data.length}</Text>
              </View>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
};

export default Payment;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard:        { borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2 },
  summaryInner:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel:       { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryAmount:      { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
  summaryNote:        { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  summaryIcon:        { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  summarySplitRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingVertical: 8 },
  summarySplitItem:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  summarySplitDivider:{ width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  summarySplitLabel:  { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  summarySplitValue:  { fontSize: 12, fontWeight: '700', color: '#fff' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: '600' },
  badge:         { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText:     { fontSize: 11, fontWeight: '600' },
  card: {
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
    elevation: 0.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  mid:     { flex: 1 },
  remarks: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  date:    { fontSize: 11, lineHeight: 16 },
  right:  { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },
  typeBadge:     { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },
});