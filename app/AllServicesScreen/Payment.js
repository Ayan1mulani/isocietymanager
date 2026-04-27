import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi';
import { ismServices } from '../../services/ismServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

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

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      const res = await ismServices.getPayments();
      if (res?.status === 'success') setData(res.data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    const isKhmer = i18n.language === 'km';
    // Use Riel for Khmer, Rupee for English
    const symbol = isKhmer ? '៛' : '₹';
    const locale = isKhmer ? 'km-KH' : 'en-IN';
    return `${symbol}${(isNaN(num) ? 0 : num).toLocaleString(locale)}`;
  };

  const formatDate = (raw) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Payments")} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>
            {t("Loading payments...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
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

  const totalCredit = data
    .filter((i) => i.type === 'CREDIT' || i.p_type === 'CR')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const totalDebit = data
    .filter((i) => i.type !== 'CREDIT' && i.p_type !== 'CR')
    .reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const renderItem = ({ item }) => {
    const isCredit  = item.type === 'CREDIT' || item.p_type === 'CR';
    const typeColor = isCredit ? THEME.success : THEME.danger;
    const typeLabel = isCredit ? t('CREDIT') : t('DEBIT');

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
            {item.remarks || item.transaction_id || t('Payment')}
          </Text>
          <Text style={[styles.date, { color: theme.secondaryText }]}>
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

  /* Summary banner */
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

  /* Section header */
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: '600' },
  badge:         { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  badgeText:     { fontSize: 11, fontWeight: '600' },

  /* ── Compact card ── */
  card: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  /* Icon box — same size as stmtIconBox in AccountsScreen */
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Middle */
  mid:     { flex: 1 },
  remarks: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  date:    { fontSize: 11 },

  /* Right — amount + badge stacked */
  right:  { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700', letterSpacing: -0.3 },

  /* Type badge */
  typeBadge:     { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  typeBadgeText: { fontSize: 9, fontWeight: '700' },
});