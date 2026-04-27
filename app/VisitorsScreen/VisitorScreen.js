// VisitorScreen.js
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import VisitRequest from './VisitRequest';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AddPreVisitorModal from './components/AddPreVisitorModal';
import SingleEntry from './SingleEntry';
import { visitorServices } from '../../services/visitorServices';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SlidingTabs from '../components/SlidingTabs';
import MyParkingPage from './singleMultiVisits/MyParkingPage';
import BRAND from '../config';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: BRAND.COLORS.primary,
  light: {
    background: '#FFFFFF',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6C757D',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
  },
};

const VisitorScreen = () => {
  const { t } = useTranslation(); // Add this line
  const navigation = useNavigation();
  const { nightMode, permissions } = usePermissions();
  const theme = nightMode ? COLORS.dark : COLORS.light;

  // ── Permission flags ──────────────────────────────────────────────────────
  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canViewVisitors = permissionsLoaded && hasPermission(permissions, 'VMS', 'R');
  const canCreateVisitor = permissionsLoaded && hasPermission(permissions, 'VMS', 'C');

  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // ── Independent data + loading state per tab ──────────────────────────────
  const [visits, setVisits] = useState([]);
  const [visitsLoading, setVisitsLoading] = useState(false);

  const [passes, setPasses] = useState([]);
  const [passesLoading, setPassesLoading] = useState(false);

  const [parkingBookings, setParkingBookings] = useState([]);
  const [parkingLoading, setParkingLoading] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const [showPreApproveModal, setShowPreApproveModal] = useState(false);

  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 👉 NEW: Refs to track if the first load has finished so we don't show the spinner again
  const initialVisitsLoaded = useRef(false);
  const initialPassesLoaded = useRef(false);
  const initialParkingLoaded = useRef(false);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadVisits = useCallback(async () => {
    try {
      if (!initialVisitsLoaded.current) setVisitsLoading(true);
      const res = await visitorServices.getMyVisitors();
      setVisits(res?.data?.visits || []);
      initialVisitsLoaded.current = true; // Mark initial load as done
    } catch (e) {
      console.log("Visits load error", e);
    } finally {
      setVisitsLoading(false);
    }
  }, []);

  const loadPasses = useCallback(async () => {
    try {
      if (!initialPassesLoaded.current) setPassesLoading(true);
      const res = await visitorServices.getMyPasses();
      setPasses(res?.data || []);
      initialPassesLoaded.current = true; // Mark initial load as done
    } catch (e) {
      console.log("Passes load error", e);
    } finally {
      setPassesLoading(false);
    }
  }, []);

  const loadParking = useCallback(async () => {
    try {
      if (!initialParkingLoaded.current) setParkingLoading(true);
      const res = await visitorServices.getParkingBookings();
      setParkingBookings(res?.data || []);
      initialParkingLoaded.current = true; // Mark initial load as done
    } catch (e) {
      console.log("Parking load error", e);
    } finally {
      setParkingLoading(false);
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const TABS = useMemo(() => {
    return [
      'Visit Requests',
      'Entry Passes',
      ...(parkingBookings?.length > 0 ? ['Parking'] : []),
    ];
  }, [parkingBookings]);

  useEffect(() => {
    if (activeTabIndex > TABS.length - 1) {
      setActiveTabIndex(TABS.length - 1);
    }
  }, [TABS, activeTabIndex]);

  // ── Load data for active tab on first visit ───────────────────────────────
  useEffect(() => {
    if (!canViewVisitors) return;

    const tab = TABS[activeTabIndex];

    if (tab === 'Visit Requests' && visits.length === 0) loadVisits();
    if (tab === 'Entry Passes' && passes.length === 0) loadPasses();
    if (tab === 'Parking' && parkingBookings.length === 0) loadParking();

  }, [activeTabIndex, canViewVisitors, TABS, visits.length, passes.length, parkingBookings.length, loadVisits, loadPasses, loadParking]);


  // ── Permissions still loading ─────────────────────────────────────────────
  if (!permissionsLoaded) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>{t("Loading...")}</Text>      </View>
    );
  }

  // ── No R access ────────────────────────────────────────────────────────
  if (!canViewVisitors) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <Ionicons name="lock-closed-outline" size={64} color={theme.textSecondary} />
        <Text style={[styles.restrictedTitle, { color: theme.text }]}>{t("Access Restricted")}</Text>
        <Text style={[styles.restrictedSub, { color: theme.textSecondary }]}>
          {t("You do not have permission to view visitors.")}{'\n'}{t("Please contact your administrator.")}
        </Text>
      </View>
    );
  }

  const renderPage = (tabName) => {
    if (tabName === 'Visit Requests') {
      return (
        <VisitRequest
          nightMode={nightMode}
          visitorData={{ visits }}
          loading={visitsLoading}
          onRefresh={loadVisits}
        />
      );
    }

    if (tabName === 'Entry Passes') {
      return (
        <SingleEntry
          nightMode={nightMode}
          passData={passes}
          loading={passesLoading}
          onRefresh={loadPasses}
        />
      );
    }

    return (
      <MyParkingPage
        nightMode={nightMode}
        parkingBookings={parkingBookings}
        loading={parkingLoading}
        onRefresh={loadParking}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      <SlidingTabs
        tabs={TABS}
        activeIndex={activeTabIndex}
        onTabPress={(index) => {
          setActiveTabIndex(index);
          scrollViewRef.current?.scrollTo({
            x: index * SCREEN_WIDTH,
            animated: true,
          });
        }}
        primaryColor={COLORS.primary}
        inactiveColor={theme.textSecondary}
        containerStyle={{ backgroundColor: theme.surface }}
        scrollX={scrollX}
      />

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setActiveTabIndex(index);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {TABS.map((tab) => (
          <View key={tab} style={{ width: SCREEN_WIDTH }}>
            {renderPage(tab)}
          </View>
        ))}
      </Animated.ScrollView>

      {/* FAB — only shown if user has CREATE permission */}
      {canCreateVisitor && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: COLORS.primary }]}
          onPress={() => setShowPreApproveModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <AddPreVisitorModal
        visible={showPreApproveModal}
        nightMode={nightMode}
        onClose={() => setShowPreApproveModal(false)}
        onDelivery={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'delivery' }), 200);
        }}
        onGuest={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'guest' }), 200);
        }}
        onCab={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'cab' }), 200);
        }}
        onOthers={() => {
          setShowPreApproveModal(false);
          setTimeout(() => navigation.navigate('AddVisitor', { type: 'others' }), 200);
        }}
      />
    </View>
  );
};

export default VisitorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  restrictedTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  restrictedSub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});