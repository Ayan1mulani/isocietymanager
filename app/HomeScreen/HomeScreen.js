import React, { useState, useEffect } from 'react'; // ← remove useCallback
import {
  View, FlatList, RefreshControl, Text, ActivityIndicator, StyleSheet,
} from 'react-native';

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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigationRef } from '../../NavigationService';


const theme = BRAND.COLORS;

const HomeScreen = () => {
  const { nightMode, permissions } = usePermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  const canViewNotices = permissions && hasPermission(permissions, 'NTC', 'R');
  const canViewVisitors = permissions && hasPermission(permissions, 'VMS', 'R');
  const canViewStaff = permissions && hasPermission(permissions, 'VMSSTF', 'R');

  /* -------------------------------------------------------
     🔔 CHECK PENDING STAFF NAVIGATION
     useEffect with [] — runs ONLY on mount, never on back press
     Foreground case is handled directly by navigationRef in App.js
  ------------------------------------------------------- */
  useEffect(() => {
    const checkPendingStaff = async () => {
      try {
        const flag = await AsyncStorage.getItem("PENDING_STAFF_NAVIGATE");
        if (flag === "true") {
          await AsyncStorage.removeItem("PENDING_STAFF_NAVIGATE"); // clear first
          console.log("🚀 HomeScreen → navigating to StaffScreen (root)");
          setTimeout(() => {
            navigationRef.navigate("StaffScreen");
          }, 300);
        }
      } catch (e) {
        console.log("❌ checkPendingStaff error:", e);
      }
    };
    checkPendingStaff();
  }, []); // ← mount only — never re-runs on back navigation

  /* -------------------------------------------------------
     📦 LOAD USER DETAILS
  ------------------------------------------------------- */
  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        setLoading(true);
        const res = await ismServices.getUserDetails();
        if (res?.data) {
          await AsyncStorage.setItem("userDetails", JSON.stringify(res.data));
        }
      } catch (error) {
        console.log('❌ User detail API error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserDetails();
  }, []);

  /* -------------------------------------------------------
     🔄 PULL TO REFRESH
  ------------------------------------------------------- */
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshTrigger((prev) => prev + 1);
      await ismServices.getUserDetails();
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.log('❌ Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /* -------------------------------------------------------
     ⏳ LOADING
  ------------------------------------------------------- */
  if (nightMode === undefined || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.bodyText}>Loading...</Text>
      </View>
    );
  }

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */
  return (
    <View style={styles.container}>
      <FlatList
        data={[1]}
        renderItem={() => null}
        keyExtractor={() => 'home'}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        ListHeaderComponent={
          <View>
            <ProfileRentCard refreshTrigger={refreshTrigger} />
            {canViewNotices && <NoticeTickerScreen refreshTrigger={refreshTrigger} />}
            {canViewVisitors && <VisitorSection refreshTrigger={refreshTrigger} />}
            <ServicesSection refreshTrigger={refreshTrigger} />
            <Action />
            <QuickActionsScreen />
            <CarouselSection refreshTrigger={refreshTrigger} />
             {canViewStaff && <StaffSection refreshTrigger={refreshTrigger} />}
            <HomeNoticeSection />
            <ImportantContacts />
          </View>
        }
      />
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffff', padding: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bodyText: { marginTop: 10, fontSize: 16, color: theme.text ?? '#333' },
});