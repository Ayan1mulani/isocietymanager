import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated, // 👈 Added for skeleton pulse
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 Added for cache
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ismServices } from '../../services/ismServices';
import AppHeader from '../components/AppHeader';
import { usePermissions } from '../../Utils/ConetextApi';
import BRAND from '../config'; 

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const getCacheKey = (userId) => `@payment_history_cache_${userId}`;
const PRIMARY = BRAND.COLORS.primary || '#0A5EB0';
const SUCCESS = '#10B981';
const DANGER = '#EF4444';

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

const HistorySkeleton = ({ theme }) => (
  <View style={styles.listContainer}>
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, elevation: 0 }]}>
        <View style={styles.row}>
          <SkeletonPulse style={styles.iconCircle} />
          <View style={styles.middle}>
            <SkeletonPulse style={{ width: '60%', height: 14, borderRadius: 4, marginBottom: 8 }} />
            <SkeletonPulse style={{ width: '40%', height: 10, borderRadius: 4, marginBottom: 6 }} />
            <SkeletonPulse style={{ width: '80%', height: 10, borderRadius: 4 }} />
          </View>
          <View style={styles.right}>
            <SkeletonPulse style={{ width: 70, height: 16, borderRadius: 4 }} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  return `₹${(isNaN(num) ? 0 : Math.abs(num)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PaymentHistoryScreen = ({ navigation }) => {
  const { nightMode } = usePermissions();
  const { t } = useTranslation();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const theme = {
    bg: nightMode ? '#0F1117' : '#F0F4F8',
    card: nightMode ? '#1A1D27' : '#FFFFFF',
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#2A2D3A' : '#E5E7EB',
  };

  // 1. Initial Load: Check Cache then Background Fetch
  useEffect(() => {
    const initializeData = async () => {
      try {
        const userInfoRaw = await AsyncStorage.getItem("userInfo");
        const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
        const uid = userInfo?.id || userInfo?.user_id || "default";
        setUserId(uid);

        const cacheKey = getCacheKey(uid);
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setPayments(JSON.parse(cached));
          setLoading(false);
        }

        fetchPayments(payments.length === 0, uid);
      } catch (e) {
        console.log(e);
      }
    };
    initializeData();
  }, []);

  const fetchPayments = async (showLoading = false, uidParam = null) => {
    if (showLoading) setLoading(true);
    try {
      const response = await ismServices.getPaymentsList();
      if (response && response.status === 'success') {
        const data = response.data || [];
        setPayments(data);
        // 2. Persist to Cache
        const finalUserId = uidParam || userId;
        if (finalUserId) {
          const cacheKey = getCacheKey(finalUserId);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } else {
        if (showLoading) Alert.alert(t('Error'), t('Failed to fetch payments.'));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      if (showLoading) Alert.alert(t('Error'), t('Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }) => {
    const isCredit = item.p_type === 'CR' || item.type === 'CREDIT';
    const typeColor = isCredit ? SUCCESS : DANGER;
    const iconBg = isCredit 
      ? (nightMode ? '#132C21' : '#ECFDF5') 
      : (nightMode ? '#2D1515' : '#FEF2F2');

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
      >
        <View style={styles.row}>
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons
              name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={typeColor}
            />
          </View>

          <View style={styles.middle}>
            <Text style={[styles.title, { color: theme.text }]}>
              {isCredit ? t('Credit Note') : t('Debit Note')}
            </Text>
            <Text style={[styles.date, { color: theme.sub }]}>
              {new Date(item.transaction_date_time).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric'
              })}
            </Text>
            <Text style={[styles.remarks, { color: theme.sub }]} numberOfLines={1}>
              {item.remarks || t('No remarks provided')}
            </Text>
          </View>

          <View style={styles.right}>
            <Text style={[styles.amount, { color: typeColor }]}>
              {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Skeleton State ---
  if (loading && payments.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Debit Credit Note")} nightMode={nightMode} showBack />
        <HistorySkeleton theme={theme} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t("Debit Credit Note")} nightMode={nightMode} showBack />

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPaymentItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.center, { marginTop: 80 }]}>
             <Ionicons name="receipt-outline" size={52} color={theme.sub} />
             <Text style={{ color: theme.sub, marginTop: 12, fontSize: 15 }}>
               {t("No transactions found")}
             </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default PaymentHistoryScreen;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 14, borderWidth: 1, marginBottom: 8,
    paddingHorizontal: 16, paddingVertical: 16,
    elevation: 0.5, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  middle: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2, marginBottom: 2 },
  date: { fontSize: 12, marginBottom: 4 },
  remarks: { fontSize: 12 },
  right: { alignItems: 'flex-end', justifyContent: 'center', marginLeft: 8 },
  amount: { fontSize: 15, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
});