import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, StatusBar, Modal, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import ProfileRentCard from './RentSection';
import VisitorSection from './VisitorSection';
import CarouselSection from './SocietyImage';
import ServicesSection from './ServiceSection.js';
import ImportantContacts from './ContactSection';
import Action from './Action';
import QuickActionsScreen from './QuickActionsScreen';
import NoticeTickerScreen from './NoticeTickerScreen';
import StaffSection from './StaffSection';
import HomeNoticeSection from './HomeNoticeSection';
import Text from '../components/TranslatedText';
import BRAND from '../../app/config';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import { ismServices } from '../../services/ismServices';

const theme = BRAND.COLORS;
const DARK_BG = "#020617";
const DARK_SHEET = "#0F172A";
const LIGHT_BG = "#F1F5F9";
const LIGHT_SHEET = "#FFFFFF";

const HomeScreen = () => {
  const { nightMode, permissions } = usePermissions();
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ✅ FIX: null = still loading from storage (prevents flash of wrong margin)
  const [isRentCardVisible, setIsRentCardVisible] = useState(null);
  const [showOutstandingConfig, setShowOutstandingConfig] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showIvrModal, setShowIvrModal] = useState(false);
  const [dontShowIvrAgain, setDontShowIvrAgain] = useState(false);
  const ivrPopupShownThisSession = useRef(false);

  /* ─────────────────────────────────────────────────────────────────────────────
    Parse Society Data to find `show_outstanding`
  ───────────────────────────────────────────────────────────────────────────── */
  const parseSocietyData = useCallback((userData) => {
    console.log('🔍 Parsing society data:', userData);

    try {
      if (userData?.society?.data) {
        const societyConfig = typeof userData.society.data === 'string'
          ? JSON.parse(userData.society.data)
          : userData.society.data;

        console.log('📊 Society config parsed:', societyConfig);

        const dashboardConfig = societyConfig?.resident_dashboard;
        console.log('🏠 Dashboard config:', dashboardConfig);

        if (!dashboardConfig || dashboardConfig.show_outstanding === undefined || dashboardConfig.show_outstanding === null) {
          console.log('✅ No dashboard config or show_outstanding undefined - defaulting to TRUE');
          setShowOutstandingConfig(true);
        } else {
          const val = dashboardConfig.show_outstanding;
          const shouldShow = val === 1 || val === true || val === "1" || String(val).toLowerCase() === "true";
          console.log('🎯 show_outstanding value:', val, '-> shouldShow:', shouldShow);
          setShowOutstandingConfig(shouldShow);
        }
      } else {
        console.log('⚠️ No society.data found - defaulting to TRUE');
        setShowOutstandingConfig(true);
      }
    } catch (e) {
      console.error("❌ Error parsing society data:", e);
      setShowOutstandingConfig(true);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────────
    Load Data on Mount & Focus
  ───────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      try {
        console.log('🚀 Initializing HomeScreen data...');

        // ✅ FIX: Load visibility FIRST before anything else renders
        // null saved = never set before → default true
        // "true"/"false" saved = use that value
        const saved = await AsyncStorage.getItem("RENT_CARD_VISIBLE");
        if (isMounted) {
          const isVisible = saved === null ? true : saved === "true";
          console.log('💾 Loaded component visibility from storage:', isVisible, '(raw saved:', saved, ')');
          setIsRentCardVisible(isVisible);
        }

        // 2. Load cached user details (for instant UI render)
        const cachedUser = await AsyncStorage.getItem("userDetails");
        if (cachedUser && isMounted) {
          const userData = JSON.parse(cachedUser);
          console.log('💾 Loaded cached user details');
          setUserDetails(userData);
          parseSocietyData(userData);
          console.log('📞 Cached IVR Details:', {
            ivr_enable: userData?.ivr_enable,
            ivr_p: userData?.ivr_p,
            name: userData?.name,
          });

          const shouldShowCachedIvrPopup =
            (userData?.ivr_enable !== 1 && userData?.ivr_enable !== "1") ||
            !userData?.ivr_p;

          const ivrStorageKey = `IVR_POPUP_DISABLED_${userData?.user_id || userData?.id}`;
          const disabledPopup = await AsyncStorage.getItem(ivrStorageKey);

          console.log('📞 Cached IVR Popup Decision:', {
            shouldShowCachedIvrPopup,
            disabledPopup,
          });

          if (
            !disabledPopup &&
            shouldShowCachedIvrPopup &&
            !ivrPopupShownThisSession.current
          ) {
            ivrPopupShownThisSession.current = true;
            setShowIvrModal(true);
          }
        }

        // 3. Fetch fresh user details
        console.log('🌐 Fetching fresh user details...');
        const res = await ismServices.getUserDetails();
        if (res?.data && isMounted) {
          console.log('✅ Fresh user details received');
          await AsyncStorage.setItem("userDetails", JSON.stringify(res.data));

          // Sync IVR fields into userInfo cache
          try {
            const existingUserInfo = await AsyncStorage.getItem("userInfo");

            if (existingUserInfo) {
              const parsedUserInfo = JSON.parse(existingUserInfo);

              const updatedUserInfo = {
                ...parsedUserInfo,
                ivr_enable: res?.data?.ivr_enable,
                ivr_p: res?.data?.ivr_p,
                ivr_s: res?.data?.ivr_s,
              };

              await AsyncStorage.setItem(
                "userInfo",
                JSON.stringify(updatedUserInfo)
              );

              console.log('✅ Synced IVR fields into userInfo cache');
            }
          } catch (syncError) {
            console.log('❌ Failed syncing IVR fields:', syncError);
          }

          setUserDetails(res.data);
          parseSocietyData(res.data);
          console.log('IVR Details From API:', {
            ivr_enable: res?.data?.ivr_enable,
            ivr_p: res?.data?.ivr_p,
            name: res?.data?.name,
          });

          const shouldShowApiIvrPopup =
            (res?.data?.ivr_enable !== 1 && res?.data?.ivr_enable !== "1") ||
            !res?.data?.ivr_p;

          const ivrStorageKey = `IVR_POPUP_DISABLED_${res?.data?.user_id || res?.data?.id}`;
          const disabledPopup = await AsyncStorage.getItem(ivrStorageKey);

          console.log('📞 API IVR Popup Decision:', {
            shouldShowApiIvrPopup,
            disabledPopup,
          });
          if (
            !disabledPopup &&
            shouldShowApiIvrPopup &&
            !ivrPopupShownThisSession.current
          ) {
            ivrPopupShownThisSession.current = true;
            setShowIvrModal(true);
          }
        } else if (!cachedUser && isMounted) {
          console.log('⚠️ API failed and no cache found. Triggering default state.');
          setShowOutstandingConfig(true);
        }
      } catch (e) {
        console.error("❌ Init Data Error:", e);
        if (isMounted) {
          // ✅ FIX: Failsafe — if storage read itself crashed, default both to safe values
          if (isRentCardVisible === null) setIsRentCardVisible(true);
          if (showOutstandingConfig === null) setShowOutstandingConfig(true);
        }
      }
    };

    if (isFocused) {
      initData();
    }

    return () => { isMounted = false; };
  }, [isFocused, parseSocietyData]);

  const handleVisibilityChange = useCallback(async (visible) => {
    console.log('🔄 Component visibility changed to:', visible);
    setIsRentCardVisible(!!visible);
    try {
      await AsyncStorage.setItem("RENT_CARD_VISIBLE", String(!!visible));
    } catch (e) {
      console.error("❌ Error saving visibility:", e);
    }
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────────
    Pull to Refresh
  ───────────────────────────────────────────────────────────────────────────── */
  const onRefresh = async () => {
    try {
      console.log('🔄 Refreshing data...');
      setRefreshing(true);
      setRefreshTrigger(p => p + 1);

      const res = await ismServices.getUserDetails();
      if (res?.data) {
        console.log('✅ Refreshed user details');
        await AsyncStorage.setItem("userDetails", JSON.stringify(res.data));

        // Sync IVR fields into userInfo cache
        try {
          const existingUserInfo = await AsyncStorage.getItem("userInfo");

          if (existingUserInfo) {
            const parsedUserInfo = JSON.parse(existingUserInfo);

            const updatedUserInfo = {
              ...parsedUserInfo,
              ivr_enable: res?.data?.ivr_enable,
              ivr_p: res?.data?.ivr_p,
              ivr_s: res?.data?.ivr_s,
            };

            await AsyncStorage.setItem(
              "userInfo",
              JSON.stringify(updatedUserInfo)
            );

            console.log('✅ Refreshed IVR fields into userInfo cache');
          }
        } catch (syncError) {
          console.log('❌ Failed syncing refreshed IVR fields:', syncError);
        }

        setUserDetails(res.data);
        parseSocietyData(res.data);
      }
    } catch (e) {
      console.error("❌ Refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  /* ─────────────────────────────────────────────────────────────────────────────
    Permissions & Final Logic
  ───────────────────────────────────────────────────────────────────────────── */
  const canViewOutstandings = permissions &&
    typeof hasPermission === 'function' &&
    (hasPermission(permissions, 'OUTSND', 'R') || hasPermission(permissions, 'OUTSND', 'READ'));

  const canViewDashboard = permissions &&
    typeof hasPermission === 'function' &&
    hasPermission(permissions, 'RESDSB', 'R');

  const canViewNotices = permissions &&
    typeof hasPermission === 'function' &&
    hasPermission(permissions, 'NTC', 'R');

  const canViewVisitors = permissions &&
    typeof hasPermission === 'function' &&
    hasPermission(permissions, 'VMS', 'R');

  const canViewStaff = permissions &&
    typeof hasPermission === 'function' &&
    hasPermission(permissions, 'VMSSTF', 'R');

  const canMountRentCard = permissions &&
    typeof hasPermission === 'function' &&
    canViewOutstandings &&
    canViewDashboard &&
    showOutstandingConfig !== false &&
    showOutstandingConfig !== null &&
    isRentCardVisible === true; // ← strictly true, null = loading = don't mount

  // ✅ FIX: isRentCardVisible must be strictly true (not null/false)
  // null means still loading → treat as not visible to avoid premature -30 margin
  const shouldOverlapSheet = canMountRentCard && isRentCardVisible === true;

  console.log('🔍 HomeScreen Debug Info:', {
    permissions: permissions ? 'loaded' : 'null',
    canViewOutstandings,
    canViewDashboard,
    showOutstandingConfig,
    isRentCardVisible,
    canMountRentCard,
    shouldOverlapSheet,
    userDetailsLoaded: !!userDetails
  });

  return (
    <View style={[styles.container, { backgroundColor: nightMode ? DARK_BG : LIGHT_BG }]}>
      {isFocused && (
        <StatusBar
          barStyle="dark-content"
          animated={true}
        />
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View>
          {canMountRentCard && (
            <ProfileRentCard
              refreshTrigger={refreshTrigger}
              onSetVisible={handleVisibilityChange}
            />
          )}

          <View style={[
            styles.sheetWrapper,
            { backgroundColor: nightMode ? DARK_SHEET : LIGHT_SHEET },
            // ✅ FIX: Only apply -30 overlap when we KNOW the card is visible (strictly true)
            !shouldOverlapSheet && {
              marginTop: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0
            }
          ]}>
            {canViewNotices && <NoticeTickerScreen refreshTrigger={refreshTrigger} />}
            <CarouselSection refreshTrigger={refreshTrigger} />
            <ServicesSection refreshTrigger={refreshTrigger} />
            <Action />
            {/* <QuickActionsScreen /> */}
            {/* {canViewStaff && <StaffSection refreshTrigger={refreshTrigger} />} */}
            {/* {canViewVisitors && <VisitorSection refreshTrigger={refreshTrigger} />} */}
            {/* <HomeNoticeSection /> */}
            <ImportantContacts />
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showIvrModal}
        transparent
        animationType="fade"
      >
        <View style={styles.ivrOverlay}>
          <View style={styles.ivrModal}>



            <Text style={styles.ivrTitle}>
              IVR NOT SET
            </Text>

            <Text style={styles.ivrDescription}>
              IVR number is not configured. Click below to set one.
            </Text>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.8}
              onPress={() => {
                setDontShowIvrAgain(!dontShowIvrAgain);
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  dontShowIvrAgain && styles.checkboxActive,
                ]}
              >
                {dontShowIvrAgain ? (
                  <Text style={styles.checkboxTick}>✓</Text>
                ) : null}
              </View>

              <Text style={styles.checkboxText}>
                {"DON'T SHOW AGAIN"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ivrButton}
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  if (dontShowIvrAgain && userDetails) {
                    const ivrStorageKey = `IVR_POPUP_DISABLED_${userDetails?.user_id || userDetails?.id}`;

                    await AsyncStorage.setItem(
                      ivrStorageKey,
                      'true'
                    );
                  }
                } catch (e) {
                  console.log('IVR popup storage error:', e);
                }

                setShowIvrModal(false);
                if (!dontShowIvrAgain) {

                  navigation.navigate('Settings');

                }
              }}
            >
              <Text style={styles.ivrButtonText}>
                {dontShowIvrAgain
                  ? 'Save'
                  : 'Set IVR'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheetWrapper: {
    paddingTop: 8,
    paddingHorizontal: 5,
    paddingBottom: 100,
    marginTop: -30,
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    elevation: 10,
  },

  ivrOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  ivrModal: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    paddingTop: 24,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
  },




  ivrTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 18,
    marginBottom: 14,
    paddingHorizontal: 18,
  },

  ivrDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    color: '#6B7280',
    paddingHorizontal: 18,
    marginBottom: 18,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 22,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxActive: {
    backgroundColor: BRAND.COLORS.primary,
    borderColor: BRAND.COLORS.primary,
  },

  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  checkboxText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },

  ivrButton: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: BRAND.COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  ivrButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});