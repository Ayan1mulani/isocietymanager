import React, { useState, useEffect } from 'react';
import {
  View, FlatList, RefreshControl, StyleSheet, Dimensions,
  StatusBar
} from 'react-native';

import ProfileRentCard from './RentSection'; // Maps to ResidentProfile
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
import { useIsFocused } from '@react-navigation/native'; 
import AppHeader from '../components/AppHeader'; 

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
  const [loading, setLoading] = useState(false);
  
  // State to track if the dashboard card is rendering
  const [isRentCardVisible, setIsRentCardVisible] = useState(true);

  const canViewNotices = permissions && hasPermission(permissions, 'NTC', 'R');
  const canViewVisitors = permissions && hasPermission(permissions, 'VMS', 'R');
  const canViewStaff = permissions && hasPermission(permissions, 'VMSSTF', 'R');

  useEffect(() => {
    const checkPendingStaff = async () => {
      try {
        const flag = await AsyncStorage.getItem("PENDING_STAFF_NAVIGATE");
        if (flag === "true") {
          await AsyncStorage.removeItem("PENDING_STAFF_NAVIGATE");
          setTimeout(() => {
            navigationRef.navigate("StaffScreen");
          }, 300);
        }
      } catch (e) {
        console.log("❌ checkPendingStaff error:", e);
      }
    };
    checkPendingStaff();
  }, []);

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

  return (
    <View style={[styles.container, { backgroundColor: nightMode ? DARK_BG : LIGHT_BG }]}>
      {isFocused && (
        <StatusBar
          backgroundColor={nightMode ? DARK_BG : "#1a2540"}
          barStyle={nightMode ? "light-content" : "dark-content"}
          animated={true}
        />
      )}

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
            <ProfileRentCard 
               refreshTrigger={refreshTrigger} 
               onSetVisible={setIsRentCardVisible} // Receives visibility status
            />

            <View
              style={[
                styles.sheetWrapper,
                {
                  backgroundColor: nightMode ? DARK_SHEET : LIGHT_SHEET,
                  borderTopWidth: nightMode ? 1 : 0,
                  borderColor: nightMode ? DARK_BORDER : 'transparent',
                },
                // If RentCard is hidden, remove top overlap & radiuses
                !isRentCardVisible && {
                  marginTop: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  elevation: 0,
                  shadowOpacity: 0,
                }
              ]}
            >
              {canViewNotices && <NoticeTickerScreen refreshTrigger={refreshTrigger} />}
              <CarouselSection refreshTrigger={refreshTrigger} />
              <ServicesSection refreshTrigger={refreshTrigger} />
              <Action />
              <QuickActionsScreen />
              {canViewVisitors && <VisitorSection refreshTrigger={refreshTrigger} />}
              {canViewStaff && <StaffSection refreshTrigger={refreshTrigger} />}
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
  container: {
    flex: 1,
  },
  sheetWrapper: {
    flex: 1,
    paddingTop: 8,  
    paddingHorizontal: 5,
    paddingBottom: 40,
    marginTop: -30, 
    borderTopRightRadius: 28,
    borderTopLeftRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 }, 
    shadowOpacity: 0.06, 
    shadowRadius: 16, 
    elevation: 10,
  },
});