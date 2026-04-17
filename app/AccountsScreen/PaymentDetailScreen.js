import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi';
import { ismServices } from '../../services/ismServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';

const PRIMARY = BRAND.COLORS.primary;
const SUCCESS = '#10B981';
const DANGER = '#EF4444';
const WARNING = '#F59E0B';

// --- Helpers ---
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

// --- Reusable Components ---
const DetailRow = ({ label, value, isLast, theme, valueStyle }) => (
  <View style={[styles.detailRow, !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
    <Text style={[styles.detailLabel, { color: theme.sub }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: theme.text }, valueStyle]} numberOfLines={2}>
      {value || '-'}
    </Text>
  </View>
);

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

// --- Main Screen ---
export default function PaymentDetailScreen({ route }) {
  const { paymentId } = route.params;
  const { nightMode } = usePermissions();

  const theme = {
    bg: nightMode ? '#0F1117' : '#F0F4F8',
    card: nightMode ? '#1A1D27' : '#FFFFFF',
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#2A2D3A' : '#E5E7EB',
    warningBg: nightMode ? '#2D2415' : '#FFFBEB',
  };

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = async () => {
    try {
      const res = await ismServices.getPaymentById(paymentId);
      const item = res?.data?.[0];
      
      // Parse nested stringified JSON if available
      if (item?.data) {
        try { 
          item.parsedData = JSON.parse(item.data); 
        } catch { }
      }
      
      setData(item);
    } catch (e) {
      console.log('Error fetching payment detail:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDetail(); 
  }, [paymentId]);

  const handleDownload = async (url) => {
    try {
      if (!url) return;
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
    } catch (e) {
      console.log('Download error:', e);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title="Payment Details" nightMode={nightMode} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- No Data State ---
  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title="Payment Details" nightMode={nightMode} showBack />
        <View style={styles.center}>
          <Ionicons name="document-outline" size={52} color={theme.sub} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 15 }}>No data found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCredit = data.type === 'CREDIT';
  const typeColor = isCredit ? SUCCESS : DANGER;
  const heroBgColor = isCredit 
    ? (nightMode ? '#132C21' : '#ECFDF5') // Success soft background
    : (nightMode ? '#2D1515' : '#FEF2F2'); // Danger soft background

  const extraData = data?.parsedData;
  const customerName = extraData?.user?.name || extraData?.billdata?.[0]?.bill_data?.user?.name || 'Customer';
  const charges = extraData?.pay_charges || [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader
        title="Payment Details"
        nightMode={nightMode}
        showBack
        rightIcon={
          data?.url ? (
            <TouchableOpacity
              onPress={() => handleDownload(data.url)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {/* NOTE: Color changed to handle Light/Dark mode instead of fixed #fff */}
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
        <View style={[styles.heroBanner, { backgroundColor: heroBgColor }]}>
          <View style={styles.heroLeft}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <View style={[styles.typeBadgeDot, { backgroundColor: typeColor }]} />
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {isCredit ? 'CREDIT' : 'DEBIT'}
              </Text>
            </View>
            <Text style={[styles.heroLabel, { color: theme.sub }]}>Total Amount</Text>
            <Text style={[styles.heroAmount, { color: typeColor }]}>
              {formatCurrency(data.amount)}
            </Text>
            <Text style={[styles.heroSubtext, { color: theme.sub }]}>
              {data.status || 'PROCESSED'}
            </Text>
          </View>
          <View style={[styles.heroIconCircle, { backgroundColor: typeColor + '15' }]}>
            <Ionicons 
              name={isCredit ? "arrow-down-circle" : "arrow-up-circle"} 
              size={38} 
              color={typeColor} 
              opacity={0.9} 
            />
          </View>
        </View>

        {/* ── Transaction Details ──────────────────────────────────────────────── */}
        <SectionCard
          title="Transaction Details"
          icon="document-text-outline"
          iconColor={PRIMARY}
          iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
          theme={theme}
        >
          <DetailRow label="Sequence No." value={data.sequence_no} theme={theme} />
          <DetailRow label="Date" value={formatDate(data.transaction_date_time)} theme={theme} />
          <DetailRow label="Flat No." value={data.flat_no} theme={theme} />
          {!!data.o_bank && (
            <DetailRow label="Bank Name" value={data.o_bank} theme={theme} />
          )}
          {!!data.remarks && (
            <DetailRow label="Remarks" value={data.remarks} isLast theme={theme} />
          )}
        </SectionCard>

        {/* ── Payment Breakdown ─────────────────────────────────────────── */}
        <SectionCard
          title="Payment Breakdown"
          icon="pie-chart-outline"
          iconColor={PRIMARY}
          iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
          theme={theme}
        >
          <DetailRow label="Tax" value={formatCurrency(data.tax)} theme={theme} />
          {extraData?.TDS != null && (
            <DetailRow label="TDS" value={formatCurrency(extraData.TDS)} theme={theme} />
          )}
          <DetailRow
            label="Total Amount"
            value={formatCurrency(data.amount)}
            isLast={charges.length === 0}
            theme={theme}
            valueStyle={{ color: typeColor, fontWeight: '700' }}
          />
        </SectionCard>

        {/* ── Charge Breakdown List (If Multiple Charges Exist) ──────────────── */}
        {charges.length > 0 && charges[0]?.name && (
          <SectionCard
            title="Charges Included"
            icon="list-outline"
            iconColor={WARNING}
            iconBg={nightMode ? '#2D2415' : '#FFFBEB'}
            theme={theme}
          >
            {charges.map((charge, index) => (
              <DetailRow 
                key={index} 
                label={charge.name} 
                value={formatCurrency(charge.total || charge.amount)} 
                isLast={index === charges.length - 1} 
                theme={theme} 
              />
            ))}
          </SectionCard>
        )}

        {/* ── Customer Details ────────────────────────────────────────────── */}
        <SectionCard
          title="Customer Details"
          icon="person-outline"
          iconColor={PRIMARY}
          iconBg={nightMode ? '#1A2940' : '#EFF6FF'}
          theme={theme}
        >
          <DetailRow label="Name" value={customerName} isLast theme={theme} />
        </SectionCard>

        {/* ── Note ───────────────────────────────────────────────────────── */}
        <View style={[styles.noteBox, { backgroundColor: theme.warningBg, borderColor: WARNING + '40' }]}>
          <Ionicons name="information-circle-outline" size={16} color={WARNING} style={{ marginTop: 1 }} />
          <Text style={[styles.noteText, { color: theme.sub }]}>
            Payments made through cheques or DDs are subject to realization by the bank. Keep your transaction ID safe.
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
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 10, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  typeBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  heroLabel: { fontSize: 12, marginBottom: 3 },
  heroAmount: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heroSubtext: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  heroIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  // Section card
  sectionCard: {
    borderRadius: 14, borderWidth: 1, marginBottom: 5,
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