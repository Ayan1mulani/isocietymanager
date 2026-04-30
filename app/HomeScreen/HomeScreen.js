import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

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

import BRAND from '../../app/config';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import { ismServices } from '../../services/ismServices';
import { navigationRef } from '../../NavigationService';

const theme = BRAND.COLORS;
const DARK_BG = "#020617";
const DARK_SHEET = "#0F172A";
const DARK_BORDER = "#1E293B";
const LIGHT_BG = "#F1F5F9";
const LIGHT_SHEET = "#FFFFFF";

const HomeScreen = () => {
  const { nightMode, permissions } = usePermissions();
  const isFocused = useIsFocused();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRentCardVisible, setIsRentCardVisible] = useState(true);

  // Load initial visibility state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("RENT_CARD_VISIBLE");
        if (saved !== null) setIsRentCardVisible(saved === "true");
      } catch (e) { console.log(e); }
    })();
  }, []);

  // Safety: Use useCallback for the visibility handler
  const handleVisibilityChange = useCallback(async (visible) => {
    setIsRentCardVisible(!!visible);
    try {
      await AsyncStorage.setItem("RENT_CARD_VISIBLE", String(visible));
    } catch (e) { console.log(e); }
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshTrigger(p => p + 1);
      await ismServices.getUserDetails();
    } finally {
      setRefreshing(false);
    }
  };

  // Permission Checks
  const canViewNotices = permissions && typeof hasPermission === 'function' && hasPermission(permissions, 'NTC', 'R');
  const canViewVisitors = permissions && typeof hasPermission === 'function' && hasPermission(permissions, 'VMS', 'R');
  const canViewStaff = permissions && typeof hasPermission === 'function' && hasPermission(permissions, 'VMSSTF', 'R');

  return (
    <View style={[styles.container, { backgroundColor: nightMode ? DARK_BG : LIGHT_BG }]}>
      {isFocused && (
        <StatusBar
          backgroundColor={nightMode ? DARK_BG : "#1a2540"}
          barStyle="dark-content"
          animated={true}
        />
      )}

      <FlatList
        data={[1]}
        renderItem={() => null}
        keyExtractor={() => 'home'}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={
          <View>
            {/* Always mount the component so it can check permissions in background */}
            <ProfileRentCard
              refreshTrigger={refreshTrigger}
              onSetVisible={handleVisibilityChange}
            />

            <View style={[
              styles.sheetWrapper,
              { backgroundColor: nightMode ? DARK_SHEET : LIGHT_SHEET },
              !isRentCardVisible && { marginTop: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }
            ]}>
              {canViewNotices && <NoticeTickerScreen refreshTrigger={refreshTrigger} />}
              <CarouselSection refreshTrigger={refreshTrigger} />
              <ServicesSection refreshTrigger={refreshTrigger} />
              <Action />
              <QuickActionsScreen />
              {canViewStaff && <StaffSection refreshTrigger={refreshTrigger} />}
              {canViewVisitors && <VisitorSection refreshTrigger={refreshTrigger} />}
              <HomeNoticeSection />
              <ImportantContacts />
            </View>
          </View>
        }
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  sheetWrapper: {
    paddingTop: 8, paddingHorizontal: 5, paddingBottom: 40, marginTop: -30,
    borderTopRightRadius: 28, borderTopLeftRadius: 28, elevation: 10,
  },
});