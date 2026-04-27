import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const PRIMARY = BRAND.COLORS.primary;
const DANGER = '#EF4444';
const WARNING = '#F59E0B';

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  return `₹${(isNaN(num) ? 0 : Math.abs(num)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '0000-00-00 00:00:00') return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Reusable Detail Row ───────────────────────────────────────────────────────
const DetailRow = ({ label, value, isLast, theme, valueStyle }) => (
  <View style={[styles.detailRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
    <Text style={[styles.detailLabel, { color: theme.sub }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: theme.text }, valueStyle]} numberOfLines={2}>
      {value || '-'}
    </Text>
  </View>
);

// ─── Section Card ──────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, iconColor, iconBg, children, theme }) => (
  <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={[styles.sectionTitle, { color: iconColor }]}>{title}</Text>
    </View>
    <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
    {children}
  </View>
);

export default function BouncedChequeDetailScreen({ route }) {
  const { id } = route.params;
  const { nightMode } = usePermissions();
  const { t } = useTranslation(); // 👈 Init translation

  const theme = {
    bg: nightMode ? '#0F1117' : '#F0F4F8',
    card: nightMode ? '#1A1D27' : '#FFFFFF',
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#2A2D3A' : '#E5E7EB',
    heroBg: nightMode ? '#2D1515' : '#FEF2F2',
    warningBg: nightMode ? '#2D2415' : '#FFFBEB',
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await otherServices.getBouncedChequeById(id);
      const item = res?.data?.[0];
      if (item?.data) {
        try { item.parsedData = JSON.parse(item.data); } catch { }
      }
      setData(item);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, []);

  const handleDownload = async (url) => {
    try {
      if (!url) return;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (e) {
      console.log('Download error:', e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader
          title={t("Cheque Details")}
          nightMode={nightMode}
          showBack
          rightIcon={
            data?.url ? (
              <TouchableOpacity
                onPress={() => handleDownload(data.url)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="download-outline"
                  size={22}
                  color={nightMode ? '#94A3B8' : '#111827'}
                />
              </TouchableOpacity>
            ) : null
          }
        />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={DANGER} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>{t("Loading details...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Cheque Details")} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={52} color={theme.sub} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 15 }}>{t("No data found")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bounce = data?.parsedData?.bounce_datails;
  const paymentData = data?.parsedData;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader
        title={t("Cheque Details")}
        nightMode={nightMode}
        showBack
        rightIcon={
          data?.url ? (
            <TouchableOpacity
              onPress={() => handleDownload(data.url)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="download-outline"
                size={22}
                color={nightMode ? '#94A3B8' : '#111827'}
              />
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Amount Banner ──────────────────────────────────────────── */}
        <View style={[styles.heroBanner, { backgroundColor: theme.heroBg }]}>
          <View style={styles.heroLeft}>
            <View style={styles.bouncedBadge}>
              <View style={styles.bouncedBadgeDot} />
              <Text style={styles.bouncedBadgeText}>{t("BOUNCED")}</Text>
            </View>
            <Text style={[styles.heroLabel, { color: theme.sub }]}>{t("Cheque Amount")}</Text>
            <Text style={[styles.heroAmount, { color: DANGER }]}>
              {formatCurrency(data.amount)}
            </Text>
            {!!data.o_number && (
              <Text style={[styles.heroChequeNo, { color: theme.sub }]}>
                #{data.o_number}
              </Text>
            )}
          </View>
          <View style={styles.heroIconCircle}>
            <Ionicons name="close-circle" size={38} color={DANGER} opacity={0.9} />
          </View>
        </View>

        {/* ── Cheque Details ──────────────────────────────────────────────── */}
        <SectionCard
          title={t("Cheque Details")}
          icon="document-text-outline"
          iconColor={PRIMARY}
          iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
          theme={theme}
        >
          <DetailRow label={t("Cheque / DD No.")} value={data.o_number} theme={theme} />
          <DetailRow label={t("Bank")} value={data.o_bank} theme={theme} />
          <DetailRow label={t("Cheque Date")} value={formatDate(data.o_date)} theme={theme} />
          <DetailRow label={t("Transaction Date")} value={formatDate(data.transaction_date_time ?? data.date)} theme={theme} />
          {!!data.mode && (
            <DetailRow label={t("Payment Mode")} value={data.mode} theme={theme} />
          )}
          {!!data.remarks && (
            <DetailRow label={t("Remarks")} value={data.remarks} isLast theme={theme} />
          )}
        </SectionCard>

        {/* ── Payment / Plan Info ─────────────────────────────────────────── */}
        {(paymentData?.society_name || paymentData?.plan_name || data.bill_type_name) && (
          <SectionCard
            title={t("Payment Info")}
            icon="card-outline"
            iconColor={PRIMARY}
            iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
            theme={theme}
          >
            {!!paymentData?.society_name && (
              <DetailRow label={t("Society")} value={paymentData.society_name} theme={theme} />
            )}
            {!!paymentData?.plan_name && (
              <DetailRow label={t("Plan")} value={paymentData.plan_name} theme={theme} />
            )}
            {!!data.bill_type_name && (
              <DetailRow label={t("Bill Type")} value={data.bill_type_name} theme={theme} />
            )}
            <DetailRow
              label={t("Amount")}
              value={formatCurrency(data.amount)}
              isLast
              theme={theme}
              valueStyle={{ color: DANGER, fontWeight: '700' }}
            />
          </SectionCard>
        )}

        {/* ── Bounce Details ──────────────────────────────────────────────── */}
        {bounce && (
          <SectionCard
            title={t("Bounce Details")}
            icon="alert-circle-outline"
            iconColor={DANGER}
            iconBg={nightMode ? '#2D1515' : '#FEF2F2'}
            theme={theme}
          >
            {!!bounce.remarks && (
              <DetailRow label={t("Bounce Reason")} value={bounce.remarks} theme={theme} />
            )}
            {!!bounce.bounced_date && (
              <DetailRow label={t("Bounced On")} value={formatDate(bounce.bounced_date)} theme={theme} />
            )}
            {!!bounce.charges && (
              <DetailRow
                label={t("Bounce Charges")}
                value={formatCurrency(bounce.charges)}
                isLast
                theme={theme}
                valueStyle={{ color: WARNING, fontWeight: '700' }}
              />
            )}
          </SectionCard>
        )}

        {/* ── Customer Details ────────────────────────────────────────────── */}
        {(paymentData?.customer_name || paymentData?.phone || paymentData?.email || data.member_name) && (
          <SectionCard
            title={t("Customer Details")}
            icon="person-outline"
            iconColor={PRIMARY}
            iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
            theme={theme}
          >
            <DetailRow label={t("Name")} value={paymentData?.customer_name ?? data.member_name} theme={theme} />
            {!!paymentData?.phone && (
              <DetailRow label={t("Phone")} value={paymentData.phone} theme={theme} />
            )}
            {!!paymentData?.email && (
              <DetailRow label={t("Email")} value={paymentData.email} isLast theme={theme} />
            )}
          </SectionCard>
        )}

        {/* ── Note ───────────────────────────────────────────────────────── */}
        <View style={[styles.noteBox, { backgroundColor: theme.warningBg, borderColor: WARNING + '40' }]}>
          <Ionicons name="information-circle-outline" size={16} color={WARNING} style={{ marginTop: 1 }} />
          <Text style={[styles.noteText, { color: theme.sub }]}>
            {t("Bounced cheques may incur additional bank charges. Please contact your bank for resolution.")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero banner
  heroBanner: {
    borderRadius: 16, padding: 20, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  heroLeft: { flex: 1 },
  bouncedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 10, alignSelf: 'flex-start',
    backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  bouncedBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: DANGER },
  bouncedBadgeText: { fontSize: 10, fontWeight: '700', color: DANGER, letterSpacing: 0.8 },
  heroLabel: { fontSize: 12, marginBottom: 3 },
  heroAmount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroChequeNo: { fontSize: 12, marginTop: 4 },
  heroIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#EF444415',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  // Section card
  sectionCard: {
    borderRadius: 14, borderWidth: 1, marginBottom: 14,
    overflow: 'hidden',
    elevation: 0.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 },
  sectionIconBox: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  sectionDivider: { height: 1 },

  // Detail rows
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 13, paddingHorizontal: 14, gap: 12,
  },
  detailLabel: { fontSize: 13, flex: 1 },
  detailValue: { fontSize: 13, fontWeight: '600', flex: 1.4, textAlign: 'right' },

  // Note box
  noteBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderRadius: 10, borderWidth: 1, padding: 12,
  },
  noteText: { fontSize: 12, flex: 1, lineHeight: 18 },
});