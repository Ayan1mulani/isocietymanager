import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import ProfileRentCard from './RentSection';
import VisitorSection from './VisitorSection';
import CarouselSection from './SocietyImage';
import ServicesSection from './ServiceSection';
import ImportantContacts from './ContactSection';
import Action from './Action';
import QuickActionsScreen from './QuickActionsScreen';
import NoticeTickerScreen from './NoticeTickerScreen';

import BRAND from '../../app/config';
import { usePermissions } from '../../Utils/ConetextApi';
import { hasPermission } from '../../Utils/PermissionHelper';
import { ismServices } from '../../services/ismServices';

const theme = BRAND.COLORS;

const HomeScreen = () => {
  const { nightMode, permissions } = usePermissions();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);

  const canViewNotices =
    permissions && hasPermission(permissions, 'NTC', 'R');

  /* -------------------------------------------------------
     📦 LOAD USER DETAILS
  ------------------------------------------------------- */
  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        setLoading(true);
        await ismServices.getUserDetails();
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <ProfileRentCard refreshTrigger={refreshTrigger} />

            {canViewNotices && (
              <NoticeTickerScreen refreshTrigger={refreshTrigger} />
            )}

            <VisitorSection refreshTrigger={refreshTrigger} />
            <CarouselSection refreshTrigger={refreshTrigger} />
            <ServicesSection refreshTrigger={refreshTrigger} />

            <Action />
            <QuickActionsScreen />

            <ImportantContacts refreshTrigger={refreshTrigger} />
          </View>
        }
      />
    </View>
  );
};

export default HomeScreen;

/* -------------------------------------------------------
   🎨 STYLES
------------------------------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.text ?? '#333',
  },
});