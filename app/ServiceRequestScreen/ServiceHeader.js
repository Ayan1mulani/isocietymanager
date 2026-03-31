import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import ComplaintListScreen from './ServiceRequestPage';
import { complaintService } from '../../services/complaintService';
import SlidingTabs from '../components/SlidingTabs';
import BRAND from '../config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Open', 'Closed', 'All'];
const PER_PAGE = 15;

const COLORS = {
  primary: BRAND.COLORS.primary,
  light: { background: '#FFFFFF', surface: '#F8F9FA', text: '#111827', textSecondary: '#6C757D' },
  dark: { background: '#121212', surface: '#1E1E1E', text: '#FFFFFF', textSecondary: '#9E9E9E' },
};



const TERMINAL_STATUSES = ['closed', 'resolved', 'completed', 'cancelled', 'rejected', 'withdrawn',];
const normalizeStatus = (status) => (status || '').trim().toLowerCase();

const LazyTabPage = React.memo(({ tabIndex, activeIndex, backgroundColor, children }) => {
  const hasBeenActive = useRef(tabIndex === 0);
  if (activeIndex === tabIndex) hasBeenActive.current = true;

  if (!hasBeenActive.current) {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BRAND.COLORS.primary} />
      </View>
    );
  }
  return <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor }}>{children}</View>;
});

const ServiceRequestTabs = () => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [allComplaints, setAllComplaints] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isFetchingRef = useRef(false);

  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const { nightMode, permissions } = usePermissions();
  const navigation = useNavigation();
  const theme = nightMode ? COLORS.dark : COLORS.light;

  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canViewComplaints = permissionsLoaded && hasPermission(permissions, 'COM', 'R');
  const canCreateComplaint = permissionsLoaded && hasPermission(permissions, 'COM', 'C');
  const canReopen = permissionsLoaded && hasPermission(permissions, 'COM', 'REOPEN');

  const requests = useMemo(() => ({
    open: allComplaints.filter(i => !TERMINAL_STATUSES.includes(normalizeStatus(i.status))),
    closed: allComplaints.filter(i => TERMINAL_STATUSES.includes(normalizeStatus(i.status))),
    all: allComplaints,
  }), [allComplaints]);

  const tabData = useMemo(() => ({
    Open: requests.open,
    Closed: requests.closed,
    All: requests.all,
  }), [requests]);

  const fetchServiceRequests = useCallback(async (page = 1, reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      reset ? setIsLoading(true) : setIsLoadingMore(true);
      const res = await complaintService.getMyComplaints({ page, perPage: PER_PAGE });
      let pageData = Array.isArray(res?.data) ? res.data : [];

      if (pageData.length === 0 && res?.metadata?.count > 0 && page === 1) {
        const retry = await complaintService.getMyComplaints({ page: 1, perPage: PER_PAGE });
        pageData = Array.isArray(retry?.data) ? retry.data : [];
      }

      const cleaned = pageData.map((item) => {
        let parsedData = {};
        try { parsedData = item?.data ? JSON.parse(item.data) : {}; } catch (_) { }
        return {
          ...item,
          status: normalizeStatus(item.status),
          rawStatus: item?.status || '',
          sub_category: item?.sub_category || 'No Sub Category',
          parsedData,
        };
      });

      const totalCount = res?.metadata?.count ?? res?.metadata?.total ?? null;
      const fetchedSoFar = reset ? cleaned.length : (allComplaints.length + cleaned.length);
      const moreAvailable = cleaned.length === PER_PAGE && (totalCount === null || fetchedSoFar < totalCount);

      setHasMore(moreAvailable);
      setCurrentPage(page);

      if (reset) {
        setAllComplaints(cleaned);
      } else {
        setAllComplaints(prev => {
          const existingIds = new Set(prev.map(i => i.id ?? i.com_no));
          const newItems = cleaned.filter(i => !existingIds.has(i.id ?? i.com_no));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error('fetchServiceRequests:', err);
      if (reset) setAllComplaints([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, [allComplaints.length]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    fetchServiceRequests(currentPage + 1, false);
  }, [hasMore, isLoadingMore, isLoading, currentPage, fetchServiceRequests]);

  const handleRefresh = useCallback(() => {
    setHasMore(true);
    fetchServiceRequests(1, true);
  }, [fetchServiceRequests]);

  const handleTabPress = useCallback((index) => {
    setActiveTabIndex(index);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }, []);

  const handleMomentumScrollEnd = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveTabIndex(index);
  }, []);

  useEffect(() => {
    if (canViewComplaints) fetchServiceRequests(1, true);
  }, [canViewComplaints]);

  if (!permissionsLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>Loading...</Text>
      </View>
    );
  }

  if (!canViewComplaints) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.restrictedTitle, { color: theme.text }]}>Access Restricted</Text>
        <Text style={[styles.restrictedSub, { color: theme.textSecondary }]}>
          You do not have permission to view service requests.{'\n'}
          Please contact your administrator.
        </Text>
      </View>
    );
  }

  if (isLoading && allComplaints.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 14 }}>
          Loading requests...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SlidingTabs tabs={TABS} activeIndex={activeTabIndex} onTabPress={handleTabPress} scrollX={scrollX} />
      <Animated.ScrollView
        ref={scrollViewRef} horizontal pagingEnabled bounces={false} overScrollMode="never"
        showsHorizontalScrollIndicator={false} scrollEventThrottle={16} onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
      >
        {TABS.map((tab, index) => (
          <LazyTabPage key={tab} tabIndex={index} activeIndex={activeTabIndex} backgroundColor={theme.background}>
            <ComplaintListScreen
              nightMode={nightMode}
              status={tab}
              complaints={tabData[tab]}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onRefresh={handleRefresh}
              onLoadMore={handleLoadMore}
              showStats={tab === 'All'}
              canReopen={canReopen}
            />
          </LazyTabPage>
        ))}
      </Animated.ScrollView>

      {canCreateComplaint && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: COLORS.primary, shadowColor: nightMode ? '#000' : COLORS.primary }]}
          onPress={() => navigation.navigate('CategorySelection')} activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ServiceRequestTabs;

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: { position: 'absolute', bottom: 110, right: 30, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  restrictedTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  restrictedSub: { fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});