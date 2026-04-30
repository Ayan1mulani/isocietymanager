import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../../Utils/ConetextApi';
import { otherServices } from '../../services/otherServices';
import AppHeader from '../components/AppHeader';
import BRAND from '../config';

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const CACHE_KEY = '@bounced_cheques_cache';
const PRIMARY = BRAND.COLORS.primary;
const DANGER = '#EF4444';
const SUCCESS = '#10B981';

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

const BouncedChequeSkeleton = () => (
  <View style={{ padding: 16 }}>
    {/* Summary Card Skeleton */}
    <SkeletonPulse style={{ width: '100%', height: 100, borderRadius: 14, marginBottom: 16 }} />
    {/* List Items Skeleton */}
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={[styles.card, { marginBottom: 10, elevation: 0, borderColor: '#F3F4F6' }]}>
        <SkeletonPulse style={{ width: 46, height: 46, borderRadius: 12, marginRight: 12 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonPulse style={{ width: '60%', height: 14, borderRadius: 4 }} />
            <SkeletonPulse style={{ width: 60, height: 14, borderRadius: 4 }} />
          </View>
          <SkeletonPulse style={{ width: '40%', height: 10, borderRadius: 4 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <SkeletonPulse style={{ width: 70, height: 20, borderRadius: 6 }} />
            <SkeletonPulse style={{ width: 80, height: 14, borderRadius: 4 }} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Utility: Formatter
───────────────────────────────────────── */
const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  return `₹${(isNaN(num) ? 0 : Math.abs(num)).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function BouncedChequeListScreen() {
  const navigation = useNavigation(); // Fixed syntax error
  const { nightMode } = usePermissions();
  const { t } = useTranslation();

  const theme = {
    bg: nightMode ? '#0F1117' : '#F0F4F8',
    card: nightMode ? '#1A1D27' : '#FFFFFF',
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#2A2D3A' : '#E5E7EB',
    tagBg: nightMode ? '#2D1515' : '#FEF2F2',
    iconBg: nightMode ? '#2D1515' : '#FEF2F2',
    secondaryText: nightMode ? '#CBD5E1' : '#6B7280',
    summaryCard: nightMode ? '#1E1A1A' : '#FEF2F2',
  };

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ count: 0, total: 0 });

  // 1. Initial Load Logic: Cache first then Fresh Fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached);
          setData(list);
          const total = list.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
          setSummary({ count: list.length, total });
          setLoading(false); // Disable skeleton if cache is available
        }
      } catch (e) { console.log("Cache load error:", e); }
      
      fetchData(data.length === 0); // Background refresh
    };
    initializeData();
  }, []);

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await otherServices.getBouncedCheques();
      const list = res?.data || [];
      setData(list);
      
      const total = list.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
      setSummary({ count: list.length, total });
      
      // 2. Persist to Cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(list));
    } catch (e) {
      console.log("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    setRefreshing(false);
  };

  const ListHeader = () => (
    <View style={[styles.summaryCard, { backgroundColor: DANGER }]}>
      <View style={styles.summaryInner}>
        <View>
          <Text style={styles.summaryLabel}>{t("Total Bounced Amount")}</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(summary.total)}</Text>
          <Text style={styles.summaryNote}>
            {t("{{count}} bounced cheque(s)", { count: summary.count })}
          </Text>
        </View>
        <View style={styles.summaryIconBox}>
          <Ionicons name="close-circle-outline" size={32} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyBox}>
      <View style={[styles.emptyIconCircle, { backgroundColor: theme.tagBg }]}>
        <Ionicons name="checkmark-circle-outline" size={40} color={SUCCESS} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{t("No Bounced Cheques")}</Text>
      <Text style={[styles.emptySub, { color: theme.sub }]}>
        {t("All your cheques are clear. Great job!")}
      </Text>
    </View>
  );

  const ChequeCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => navigation.navigate('BouncedChequeDetail', { id: item.id })}
      activeOpacity={0.75}
    >
      <View style={[styles.cardIconBox, { backgroundColor: theme.iconBg }]}>
        <Ionicons name="document-text-outline" size={22} color={DANGER} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            {item.p_type ? `${t("Cheque #")}${item.p_type}` : t("Bounced Cheque")}
          </Text>
          <Text style={[styles.cardAmount, { color: DANGER }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        <View style={styles.cardMidRow}>
          {!!item.o_bank && (
            <View style={styles.metaChip}>
              <Ionicons name="business-outline" size={11} color={theme.sub} />
              <Text style={[styles.metaChipText, { color: theme.sub }]} numberOfLines={1}>
                {item.o_bank}
              </Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={11} color={theme.sub} />
            <Text style={[styles.metaChipText, { color: theme.sub }]}>
              {formatDate(item.transaction_date_time ?? item.date)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <View style={[styles.bouncedTag, { backgroundColor: theme.tagBg }]}>
            <View style={styles.bouncedDot} />
            <Text style={styles.bouncedTagText}>{t("BOUNCED")}</Text>
          </View>
          <View style={styles.viewDetail}>
            <Text style={[styles.viewDetailText, { color: PRIMARY }]}>{t("View Details")}</Text>
            <Ionicons name="chevron-forward" size={13} color={PRIMARY} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && data.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Bounced Cheques")} nightMode={nightMode} showBack />
        <BouncedChequeSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t("Bounced Cheques")} nightMode={nightMode} showBack />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id?.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={data.length > 0 ? <ListHeader /> : null}
        ListEmptyComponent={<EmptyState />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[DANGER]}
            tintColor={DANGER}
          />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <ChequeCard item={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  summaryInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  summaryAmount: { fontSize: 24, fontWeight: '800', color: '#fff' },
  summaryNote: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
  summaryIconBox: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    flexDirection: 'row', borderRadius: 14, padding: 14,
    borderWidth: 1, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardIconBox: {
    width: 46, height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12, alignSelf: 'flex-start', marginTop: 2,
  },
  cardContent: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 8 },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardMidRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaChipText: { fontSize: 11 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bouncedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  bouncedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#EF4444' },
  bouncedTagText: { fontSize: 10, fontWeight: '700', color: '#EF4444', letterSpacing: 0.5 },
  viewDetail: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewDetailText: { fontSize: 12, fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});