import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ismServices } from '../../services/ismServices';
import AppHeader from '../components/AppHeader';
import { usePermissions } from '../../Utils/ConetextApi';
import BRAND from '../config'; 

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const PRIMARY = BRAND.COLORS.primary || '#0A5EB0';
const SUCCESS = '#10B981';
const DANGER = '#EF4444';

const formatCurrency = (amount) => {
  const num = parseFloat(amount);
  return `₹${(isNaN(num) ? 0 : Math.abs(num)).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const PaymentHistoryScreen = ({ navigation }) => {
  const { nightMode } = usePermissions();
  const { t } = useTranslation(); // 👈 Init translation

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Theme Palette
  const theme = {
    bg: nightMode ? '#0F1117' : '#F0F4F8',
    card: nightMode ? '#1A1D27' : '#FFFFFF',
    text: nightMode ? '#F1F5F9' : '#111827',
    sub: nightMode ? '#94A3B8' : '#6B7280',
    border: nightMode ? '#2A2D3A' : '#E5E7EB',
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await ismServices.getPaymentsList();
      if (response && response.status === 'success') {
        setPayments(response.data);
      } else {
        Alert.alert(t('Error'), t('Failed to fetch payments.'));
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      Alert.alert(t('Error'), t('Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }) => {
    const isCredit = item.p_type === 'CR' || item.type === 'CREDIT';
    const typeColor = isCredit ? SUCCESS : DANGER;
    
    // Dynamic soft backgrounds for the icon based on theme
    const iconBg = isCredit 
      ? (nightMode ? '#132C21' : '#ECFDF5') 
      : (nightMode ? '#2D1515' : '#FEF2F2');

    return (
      <TouchableOpacity
        style={[
          styles.card, 
          { backgroundColor: theme.card, borderColor: theme.border }
        ]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PaymentDetail', { paymentId: item.id })}
      >
        <View style={styles.row}>
          {/* LEFT ICON */}
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons
              name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color={typeColor}
            />
          </View>

          {/* MIDDLE CONTENT */}
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

          {/* RIGHT SIDE */}
          <View style={styles.right}>
            <Text style={[styles.amount, { color: typeColor }]}>
              {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Debit Credit Note")} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={{ color: theme.sub, marginTop: 12, fontSize: 14 }}>
            {t("Loading records...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Render ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader
        title={t("Debit Credit Note")}
        nightMode={nightMode}
        showBack
      />

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    marginBottom: 4,
  },
  remarks: {
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});