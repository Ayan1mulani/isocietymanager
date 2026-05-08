import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../../Utils/ConetextApi'; // Adjust path
import { ismServices } from '../../services/ismServices'; // Adjust path
import { Common } from '../../services/Common'; // Adjust path
import AppHeader from '../components/AppHeader'; // Adjust path
import BRAND from '../config'; // Adjust path
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText'; // Adjust path

const THEME = {
  primary:      BRAND?.COLORS?.primary || '#0066cc',
  success:      '#10B981',
  danger:       '#EF4444',
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

const SurveySkeleton = ({ theme }) => (
  <View style={{ padding: 16 }}>
    {[1, 2, 3].map((i) => (
      <View key={i} style={[styles.card, { backgroundColor: theme.card, marginBottom: 16, elevation: 0 }]}>
        <View style={styles.headerRow}>
          <SkeletonPulse style={{ width: '60%', height: 18, borderRadius: 4 }} />
          <SkeletonPulse style={{ width: 50, height: 20, borderRadius: 12 }} />
        </View>
        <SkeletonPulse style={{ width: '100%', height: 14, borderRadius: 4, marginTop: 12 }} />
        <SkeletonPulse style={{ width: '80%', height: 14, borderRadius: 4, marginTop: 6 }} />
        
        <View style={[styles.dateContainer, { backgroundColor: theme.pillBg, marginTop: 16 }]}>
          <SkeletonPulse style={{ width: '40%', height: 30, borderRadius: 4 }} />
          <SkeletonPulse style={{ width: '40%', height: 30, borderRadius: 4 }} />
        </View>
        
        <SkeletonPulse style={{ width: '100%', height: 45, borderRadius: 6, marginTop: 16 }} />
      </View>
    ))}
  </View>
);

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const SurveysPage = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { nightMode } = usePermissions();

  const theme = {
    bg:            nightMode ? THEME.darkBg   : '#F0F4F8',
    card:          nightMode ? THEME.darkCard : THEME.lightCard,
    text:          nightMode ? '#F1F5F9'      : '#111827',
    sub:           nightMode ? '#94A3B8'      : '#6B7280',
    pillBg:        nightMode ? '#1E2235'      : '#F9FAFB',
    borderColor:   nightMode ? '#334155'      : '#E5E7EB',
  };

  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await Common.getLoggedInUser();
        const cacheKey = `@cached_surveys_${user.id}`; // User-specific cache

        // 1. Check Cache
        const cachedData = await AsyncStorage.getItem(cacheKey);
        if (cachedData) {
          setSurveys(JSON.parse(cachedData));
          setLoading(false); 
        }

        // 2. Fetch Fresh Data
        const res = await ismServices.getSurveys();
        let freshData = [];
        
        if (res && Array.isArray(res)) {
          freshData = res;
        } else if (res?.data && Array.isArray(res.data)) {
          freshData = res.data;
        }

        // 3. Update State & Cache
        setSurveys(freshData);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(freshData));
      } catch (e) {
        console.log("Surveys Error:", e);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

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

  // ── Skeleton State ──
  if (loading && surveys.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Active Surveys")} nightMode={nightMode} showBack />
        <SurveySkeleton theme={theme} />
      </SafeAreaView>
    );
  }

  // ── Empty State ──
  if (surveys.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <AppHeader title={t("Active Surveys")} nightMode={nightMode} showBack />
        <View style={styles.center}>
          <Ionicons name="clipboard-outline" size={64} color={theme.sub} />
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
            {t("No Surveys Found")}
          </Text>
          <Text style={{ color: theme.sub, textAlign: 'center', paddingHorizontal: 40, marginTop: 8, fontSize: 13 }}>
            {t("There are no active surveys available for your unit right now.")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render Item ──
  const renderItem = ({ item }) => {
    const cleanDescription = item.description ? item.description.replace(/^"|"$/g, '') : '';
    const isActive = item.isActive === 1;

    return (
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            {item.name.replace(/^"|"$/g, '')}
          </Text>
          <View style={[styles.badge, { backgroundColor: isActive ? THEME.success + '20' : THEME.danger + '20' }]}>
            <Text style={[styles.badgeText, { color: isActive ? THEME.success : THEME.danger }]}>
              {isActive ? t('Active') : t('Closed')}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: theme.sub }]}>{cleanDescription}</Text>
        
        <View style={[styles.dateContainer, { backgroundColor: theme.pillBg }]}>
          <View style={styles.dateCol}>
            <Text style={[styles.dateLabel, { color: theme.sub }]}>{t("Start Date")}</Text>
            <Text style={[styles.dateValue, { color: theme.text }]}>{formatDate(item.start_date)}</Text>
          </View>
          <View style={styles.dateCol}>
            <Text style={[styles.dateLabel, { color: theme.sub }]}>{t("Close Date")}</Text>
            <Text style={[styles.dateValue, { color: theme.text }]}>{formatDate(item.close_date)}</Text>
          </View>
        </View>

        <TouchableOpacity 
          activeOpacity={0.8}
          style={[styles.btn, { backgroundColor: isActive ? THEME.primary : theme.borderColor }]} 
          disabled={!isActive}
          onPress={() => console.log('Open Survey Form ID:', item.form_id)}
        >
          <Text style={[styles.btnText, { color: isActive ? '#fff' : theme.sub }]}>
            {t("Take Survey")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title={t("Active Surveys")} nightMode={nightMode} showBack />

      <FlatList
        data={surveys}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
};

export default SurveysPage;

const styles = StyleSheet.create({
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sectionTitle:  { 
    fontSize: 16, 
    fontWeight: '600' 
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 1, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  }
});