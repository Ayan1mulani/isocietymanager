import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
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
import Text from '../components/TranslatedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = ['Open', 'Closed', 'All'];
const PER_PAGE = 15;

const COLORS = {
  primary: BRAND.COLORS.primary,
  light: { background: '#FFFFFF', text: '#111827', textSecondary: '#6C757D' },
  dark: { background: '#121212', text: '#FFFFFF', textSecondary: '#9E9E9E' },
};

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
  const { t } = useTranslation();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // ✅ Store data, page, and hasMore separately for EACH tab
  const [tabStates, setTabStates] = useState({
    Open: { data: [], page: 1, hasMore: true },
    Closed: { data: [], page: 1, hasMore: true },
    All: { data: [], page: 1, hasMore: true },
  });

  // ✅ Ref to track if a tab has already been loaded initially
  const loadedTabsRef = useRef({ Open: false, Closed: false, All: false });

  const [loadingStates, setLoadingStates] = useState({
    Open: false,
    Closed: false,
    All: false,
  });

  const [loadingMoreStates, setLoadingMoreStates] = useState({
    Open: false,
    Closed: false,
    All: false,
  });

  const isFetchingRef = useRef({
    Open: false,
    Closed: false,
    All: false,
  });
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const { nightMode, permissions } = usePermissions();
  const navigation = useNavigation();
  const theme = nightMode ? COLORS.dark : COLORS.light;

  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canViewComplaints = permissionsLoaded && hasPermission(permissions, 'COM', 'R');
  const canCreateComplaint = permissionsLoaded && hasPermission(permissions, 'COM', 'C');
  const canReopen = permissionsLoaded && hasPermission(permissions, 'COM', 'REOPEN');

  const fetchServiceRequests = useCallback(async (tabName, page = 1, reset = false) => {
    if (isFetchingRef.current[tabName]) return;
    isFetchingRef.current[tabName] = true;

    try {
      if (reset) {
        setLoadingStates(prev => ({
          ...prev,
          [tabName]: true,
        }));
      } else {
        setLoadingMoreStates(prev => ({
          ...prev,
          [tabName]: true,
        }));
      }

      let apiStatus = '';
      if (tabName === 'Open') apiStatus = 'Open';
      else if (tabName === 'Closed') apiStatus = 'Closed';

      const res = await complaintService.getMyComplaints({
        page,
        perPage: PER_PAGE,
        status: apiStatus,
      });

      const pageData = Array.isArray(res?.data) ? res.data : [];

      setTabStates(prev => {
        const currentTabData = prev[tabName].data;
        let newData = pageData;

        if (!reset) {
          const ids = new Set(currentTabData.map(i => i.id ?? i.com_no));
          const newItems = pageData.filter(i => !ids.has(i.id ?? i.com_no));
          newData = [...currentTabData, ...newItems];
        }

        return {
          ...prev,
          [tabName]: {
            data: newData,
            page,
            hasMore: pageData.length === PER_PAGE,
          }
        };
      });

      // Mark this specific tab as loaded so we don't fetch it again purely from scrolling
      loadedTabsRef.current[tabName] = true;

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStates(prev => ({
        ...prev,
        [tabName]: false,
      }));

      setLoadingMoreStates(prev => ({
        ...prev,
        [tabName]: false,
      }));
      isFetchingRef.current[tabName] = false;
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    const currentTab = TABS[activeTabIndex];
    const currentState = tabStates[currentTab];

    if (
      currentState.hasMore &&
      !loadingMoreStates[currentTab] &&
      !loadingStates[currentTab]
    ) {
      fetchServiceRequests(currentTab, currentState.page + 1, false);
    }
  }, [
    activeTabIndex,
    tabStates,
    loadingMoreStates,
    loadingStates,
    fetchServiceRequests,
  ]);

  const handleRefresh = useCallback(() => {
    const currentTab = TABS[activeTabIndex];
    fetchServiceRequests(currentTab, 1, true);
  }, [activeTabIndex, fetchServiceRequests]);

  useEffect(() => {
    // Only load initial 'Open' tab if it hasn't been loaded yet
    if (canViewComplaints && !loadedTabsRef.current['Open']) {
      fetchServiceRequests('Open', 1, true);
    }
  }, [canViewComplaints, fetchServiceRequests]);

  const handleTabPress = useCallback((index) => {
    if (index === activeTabIndex) return;

    const tab = TABS[index];

    // ✅ ONLY fetch if we have never loaded this tab before
    if (!loadedTabsRef.current[tab]) {
      fetchServiceRequests(tab, 1, true);
    }

    setActiveTabIndex(index);

    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  }, [activeTabIndex, fetchServiceRequests]);

  const handleMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index === activeTabIndex) return;

    const tab = TABS[index];

    // ✅ ONLY fetch if we have never loaded this tab before
    if (!loadedTabsRef.current[tab]) {
      fetchServiceRequests(tab, 1, true);
    }

    setActiveTabIndex(index);
  };

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
        <Text>{t("No Permission")}</Text>
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
        nestedScrollEnabled
        directionalLockEnabled
        disableIntervalMomentum
        removeClippedSubviews={false}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        overScrollMode="never"
        automaticallyAdjustContentInsets={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={8}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: true,
          }
        )}
      >
        {TABS.map((tab, index) => {
          const currentTabState = tabStates[tab];
          // ✅ We only show the skeleton loading if THIS specific tab has no data yet
          const isTabLoading =
            loadingStates[tab] && currentTabState.data.length === 0;

          return (
            <LazyTabPage
              key={tab}
              tabIndex={index}
              activeIndex={activeTabIndex}
              backgroundColor={theme.background}
            >
              <ComplaintListScreen
                key={`complaints-${tab}`}
                nightMode={nightMode}
                status={tab}
                complaints={currentTabState.data}
                isLoading={isTabLoading}
                isLoadingMore={loadingMoreStates[tab]}
                hasMore={currentTabState.hasMore}
                onRefresh={handleRefresh}
                onLoadMore={handleLoadMore}
                showStats={tab === 'All'}
                canReopen={canReopen}
              />
            </LazyTabPage>
          );
        })}
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