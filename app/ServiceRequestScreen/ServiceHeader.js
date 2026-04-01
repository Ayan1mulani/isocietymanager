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
  light: { background: '#FFFFFF', text: '#111827', textSecondary: '#6C757D' },
  dark: { background: '#121212', text: '#FFFFFF', textSecondary: '#9E9E9E' },
};

const TERMINAL_STATUSES = ['closed', 'resolved', 'completed', 'cancelled', 'rejected', 'withdrawn'];
const normalizeStatus = (status) => (status || '').trim().toLowerCase();

const LazyTabPage = React.memo(({ tabIndex, activeIndex, backgroundColor, children }) => {
  const hasBeenActive = useRef(tabIndex === 0);
  if (activeIndex === tabIndex) hasBeenActive.current = true;

  if (!hasBeenActive.current) {
    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
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

  // ✅ Filter data
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

  // ✅ API Call
  const fetchServiceRequests = useCallback(async (page = 1, reset = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      reset ? setIsLoading(true) : setIsLoadingMore(true);

      const res = await complaintService.getMyComplaints({ page, perPage: PER_PAGE });
      const pageData = Array.isArray(res?.data) ? res.data : [];

      const cleaned = pageData.map((item) => ({
        ...item,
        status: normalizeStatus(item.status),
      }));

      setCurrentPage(page);
      setHasMore(pageData.length === PER_PAGE);

      if (reset) {
        setAllComplaints(cleaned);
      } else {
        setAllComplaints(prev => {
          const ids = new Set(prev.map(i => i.id ?? i.com_no));
          const newItems = cleaned.filter(i => !ids.has(i.id ?? i.com_no));
          return [...prev, ...newItems];
        });
      }

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  }, []);

  // ✅ Load More
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      fetchServiceRequests(currentPage + 1, false);
    }
  }, [hasMore, isLoadingMore, isLoading, currentPage]);

  // ✅ Refresh
  const handleRefresh = useCallback(() => {
    setHasMore(true);
    fetchServiceRequests(1, true);
  }, []);

  // ✅ FIX: Auto load Closed tab
  useEffect(() => {
    const currentTab = TABS[activeTabIndex];

    if (
      currentTab === 'Closed' &&
      requests.closed.length < PER_PAGE &&
      hasMore &&
      !isLoading &&
      !isLoadingMore
    ) {
      fetchServiceRequests(currentPage + 1, false);
    }
  }, [
    activeTabIndex,
    requests.closed.length,
    hasMore,
    isLoading,
    isLoadingMore,
    currentPage,
  ]);

  // Initial Load
  useEffect(() => {
    if (canViewComplaints) {
      fetchServiceRequests(1, true);
    }
  }, [canViewComplaints]);

const handleTabPress = useCallback((index) => {
  setActiveTabIndex(index);

  requestAnimationFrame(() => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  });
}, []);

  const handleMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveTabIndex(index);
  };

  // UI states
  if (!permissionsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!canViewComplaints) {
    return (
      <View style={styles.centered}>
        <Text>No Permission</Text>
      </View>
    );
  }

  if (isLoading && allComplaints.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SlidingTabs tabs={TABS} activeIndex={activeTabIndex} onTabPress={handleTabPress} scrollX={scrollX} />

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
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
          style={[styles.fab, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('CategorySelection')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ServiceRequestTabs;

const styles = StyleSheet.create({
  container: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});