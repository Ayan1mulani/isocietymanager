// PassPage.js
import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';

import BRAND from '../config';
import EmptyState from '../components/EmptyState';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const BASE_URL = "https://ism-vms.s3.amazonaws.com/company-logo/";
const DEFAULT_GUEST_URI = "https://app.factech.co.in/user/assets/images/visitor/default-guest.png";
const LOCAL_IMAGES = {
  cab: require('../../assets/images/cab.jpg'),
  delivery: require('../../assets/images/delivery.jpg'),
};

const COLORS = {
  primary: BRAND.COLORS.primaryDark,
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  light: {
    background: '#FFFFFF',
    surface: '#ffffff',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#E5E7EB',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    border: '#2C2C2C',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// getPassImage — pure function, returns STABLE references
// ─────────────────────────────────────────────────────────────────────────────
const getPassImageSource = (pass) => {
  const purpose = (pass.purpose || '').toLowerCase();
  const name = (pass.company_name || pass.name || '').toLowerCase();

  if (purpose === 'guest') {
    return DEFAULT_GUEST_URI;
  }

  if (purpose === 'cab' || purpose === 'delivery') {
    if (!name) {
      return LOCAL_IMAGES[purpose];
    }
    return `${BASE_URL}${name.replace(/\s+/g, '-')}.png`;
  }

  return DEFAULT_GUEST_URI;
};

// ─────────────────────────────────────────────────────────────────────────────
// PassAvatar — handles stable image loading
// ─────────────────────────────────────────────────────────────────────────────
const PassAvatar = memo(({ source, purpose, style }) => {
  const isRemote = typeof source === 'string';
  const [imgSrc, setImgSrc] = useState(
    isRemote ? { uri: source } : source
  );

  const prevSource = useRef(source);

  useEffect(() => {
    if (prevSource.current === source) return;
    prevSource.current = source;
    setImgSrc(isRemote ? { uri: source } : source);
  }, [source, isRemote]);

  const handleError = useCallback(() => {
    const p = (purpose || '').toLowerCase();
    if (p === 'cab') setImgSrc(LOCAL_IMAGES.cab);
    else if (p === 'delivery') setImgSrc(LOCAL_IMAGES.delivery);
    else setImgSrc({ uri: DEFAULT_GUEST_URI });
  }, [purpose]);

  return (
    <Image
      source={imgSrc}
      style={style}
      resizeMode="cover"
      onError={handleError}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PassCard — isolated memo component
// ─────────────────────────────────────────────────────────────────────────────
const PassCard = memo(({ pass, theme, parkingBooking, onPress }) => {
  const { t } = useTranslation(); // Add this

  const formatDate = (ds) => {
    try {
      return new Date(ds).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return ds; }
  };

  const smartDate = useMemo(() => {
    if (!pass.date_time) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const visitDate = new Date(pass.date_time); visitDate.setHours(0, 0, 0, 0);
    const diff = (visitDate - today) / 86_400_000;
    const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : formatDate(pass.date_time);
    return { label, color: theme.textSecondary };
  }, [pass.date_time, theme.textSecondary]);

  const purposeLower = (pass.purpose || '').toLowerCase();
  const isCabOrDelivery = purposeLower === 'cab' || purposeLower === 'delivery';
  const imgSource = useMemo(() => getPassImageSource(pass), [pass.purpose, pass.company_name, pass.name]);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <PassAvatar source={imgSource} purpose={pass.purpose} style={styles.passImage} />
          </View>
          <View style={styles.passInfo}>
            <Text style={[styles.passTitle, { color: theme.text }]} numberOfLines={1}>
             {pass.purpose ? t(pass.purpose.charAt(0).toUpperCase() + pass.purpose.slice(1)) : ''} {t("Pass")}
            </Text>
            {!isCabOrDelivery && (
              <>
                <Text style={[styles.passName, { color: theme.textSecondary }]} numberOfLines={1}>
                  {pass.name}
                </Text>
                <Text style={[styles.passPhone, { color: theme.textSecondary }]}>
                  {pass.mobile}
                </Text>
              </>
            )}
            {isCabOrDelivery && (
              <Text style={[styles.companyName, { color: COLORS.primary }]} numberOfLines={1}>
                {pass.company_name || pass.name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {pass.pass_no && purposeLower !== 'delivery' && (
            <Text style={[styles.passNumber, { color: COLORS.primary }]}>
              #{pass.pass_no}
            </Text>
          )}
          {parkingBooking && (
            <View style={styles.parkingIndicator}>
              <Ionicons name="car" size={18} color={COLORS.primary} />
            </View>
          )}
        </View>
      </View>

      <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
        <View>
          {smartDate && (
            <Text style={{ fontSize: 12, color: smartDate.color, fontWeight: '600' }}>
              {t("Visit")}: {t(smartDate.label)}
            </Text>
          )}
        </View>

        <View>
          <Text style={[styles.createdDate, { color: theme.textSecondary }]}>
            {t("Created")}: {formatDate(pass.created_at)}
          </Text>
        </View>
      </View>

      {!!pass.remarks && (
        <View style={[styles.remarksSection, { borderTopColor: theme.border }]}>
          <Ionicons name="chatbubble-outline" size={14} color={theme.textSecondary} />
          <Text style={[styles.remarksText, { color: theme.textSecondary }]} numberOfLines={2}>
            {pass.remarks}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SingleEntryPassPage = ({ nightMode, passData, parkingBookings, onRefresh }) => {
  const { t } = useTranslation();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const theme = nightMode ? COLORS.dark : COLORS.light;

  const parkingMap = useMemo(() => {
    const map = new Map();
    (parkingBookings || []).forEach(b => {
      if (b.reference_id != null) map.set(String(b.reference_id), b);
    });
    return map;
  }, [parkingBookings]);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (passData || [])
      .filter(pass => {
      const text = [t(pass.name), pass.mobile, t(pass.purpose), t(pass.company_name)]
       .filter(Boolean).join(' ').toLowerCase();
        const matchSearch = !q || text.includes(q);
        const matchType =
          selectedStatus === 'ALL' ||
          (pass.purpose || '').toLowerCase() === selectedStatus.toLowerCase();
        return matchSearch && matchType;
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [passData, searchQuery, selectedStatus]);

  // 👉 FIXED: Support three distinct loading modes
  const handleRefresh = useCallback(async (refreshType = 'silent') => {
    if (refreshType === 'initial') {
      setIsInitialLoading(true);
    } else if (refreshType === 'pull') {
      setIsRefreshing(true);
    }
    // If refreshType is 'silent', we don't trigger ANY loading spinners

    if (onRefresh) {
      await onRefresh();
    }

    setIsInitialLoading(false);
    setIsRefreshing(false);
  }, [onRefresh]);

  // Handle Initial Load
  useEffect(() => {
    handleRefresh('initial');
  }, [handleRefresh]);

  // 👉 FIXED: Handle Focus Load (Silent update on background return)
  const isFirstMount = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstMount.current) {
        isFirstMount.current = false;
        return; // Skip the first focus because useEffect handles the 'initial' load
      }
      handleRefresh('silent'); // Invisible background refresh
    }, [handleRefresh])
  );

  // Handle route param refreshes
  useEffect(() => {
    if (route.params?.refreshStamp) {
      handleRefresh('silent');
      navigation.setParams({ refreshStamp: undefined });
    }
  }, [route.params?.refreshStamp, handleRefresh, navigation]);

  const handleClearSearch = useCallback(() => setSearchQuery(''), []);
  const handleToggleFilters = useCallback(() => setShowFilters(v => !v), []);

  const renderItem = useCallback(({ item: pass }) => (
    <PassCard
      pass={pass}
      theme={theme}
      parkingBooking={parkingMap.get(String(pass.id))}
      onPress={() =>
        navigation.navigate('PassDetails', { pass, onGoBack: () => handleRefresh('silent') })
      }
    />
  ), [theme, parkingMap, handleRefresh, navigation]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  if (isInitialLoading) {
    return (
      <View style={[styles.loadingState, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
     <Text style={[styles.loadingText, { color: theme.text }]}>{t("Loading passes...")}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
           placeholder={t("Search name, purpose or phone")}
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: showFilters ? COLORS.primary : theme.surface },
          ]}
          onPress={handleToggleFilters}
        >
          <Ionicons name="filter" size={20} color={showFilters ? '#fff' : theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      {showFilters && (
        <View style={styles.filterContainer}>
          {['ALL', 'guest', 'delivery', 'cab'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                { backgroundColor: selectedStatus === type ? COLORS.primary : theme.surface },
              ]}
              onPress={() => setSelectedStatus(type)}
            >
              <Text style={{ color: selectedStatus === type ? '#fff' : theme.text, fontWeight: '600' }}>
                {type === 'ALL' ? t('All') : t(type.charAt(0).toUpperCase() + type.slice(1))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List */}
      <View style={styles.container}>
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={30}
          windowSize={7}
          initialNumToRender={10}
          contentContainerStyle={
            filteredData.length === 0
              ? { flexGrow: 1, paddingTop: 120, paddingHorizontal: 16 }
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => handleRefresh('pull')} // 👉 Tells handleRefresh to explicitly show the pull spinner
              colors={[COLORS.primary]}               // 👉 Restored visibility so you can see it on Android
              tintColor={COLORS.primary}              // 👉 Restored visibility so you can see it on iOS
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title={t("No Passes Found")}
              subtitle={t("Create a new pass to get started")}
              theme={theme}
            />
          }
        />
      </View>
    </View>
  );
};

export default SingleEntryPassPage;

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500' },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 200 },
  card: { padding: 15, borderRadius: 14, marginBottom: 8, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  leftSection: { flexDirection: 'row', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  passInfo: { flex: 1 },
  passImage: { width: 44, height: 44, borderRadius: 22 },
  passTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  passName: { fontSize: 14, marginBottom: 2 },
  passPhone: { fontSize: 13, marginBottom: 2 },
  companyName: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  rightSection: { alignItems: 'flex-end', gap: 4 },
  passNumber: { fontSize: 13, fontWeight: '700' },
  parkingIndicator: { marginTop: 4, padding: 4, borderRadius: 6 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  createdDate: { fontSize: 12, fontWeight: '600' },
  remarksSection: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 10, marginTop: 10, borderTopWidth: 1, gap: 6 },
  remarksText: { flex: 1, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  searchContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, height: 45, borderWidth: 0.1, borderColor: "#8c95cd" },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  filterButton: { width: 45, height: 45, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
});