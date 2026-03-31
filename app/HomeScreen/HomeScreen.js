import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  Text,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import ProfileRentCard from './RentSection';
import VisitorSection from './VisitorSection';
import CarouselSection from './SocietyImage';
import ServicesSection from './ServiceSection';
import ImportantContacts from './ContactSection';
import { usePermissions } from '../../Utils/ConetextApi';
import Action from './Action';
import QuickActionsScreen from './QuickActionsScreen';
import BRAND from '../../app/config';
import NoticeTickerScreen from './NoticeTickerScreen';
import { ismServices } from '../../services/ismServices';
import { visitorServices } from '../../services/visitorServices';
import { hasPermission } from '../../Utils/PermissionHelper';
import { useFocusEffect, useNavigation, CommonActions } from '@react-navigation/native'; // ✅ Added CommonActions
import DefaultPreference from 'react-native-default-preference';

const theme = BRAND.COLORS;

const commonStyles = {
  container: { flex: 1, backgroundColor: '#fff', padding: 5 },
  safeArea: { flex: 1, backgroundColor: theme.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  bodyText: { color: theme.text, fontSize: 16 },
};

const HomeScreen = () => {
  const { nightMode, permissions } = usePermissions();
  const navigation = useNavigation();

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ✅ Controls the full-screen loading overlay
  const [processingVisitor, setProcessingVisitor] = useState(false);

  // 🔒 Lock to prevent useFocusEffect from firing twice simultaneously
  const isProcessingRef = useRef(false);

  const canViewNotices = permissions && hasPermission(permissions, "NTC", "R");

  /* -------------------------------------------------------
     CHECK PENDING VISITOR ON FOCUS
  ------------------------------------------------------- */
  useFocusEffect(
    useCallback(() => {
      const checkPendingVisitor = async () => {
        // Stop immediately if a process is already running
        if (isProcessingRef.current) return;

        try {
          const justHandled = await DefaultPreference.get("VISITOR_JUST_HANDLED");
          if (justHandled) {
            await DefaultPreference.clear("VISITOR_JUST_HANDLED");
            return;
          }

          /* ======================================================
             CASE 1: User pressed ACCEPT / DECLINE on Lock Screen
          ====================================================== */
          const pendingAction = await DefaultPreference.get("PENDING_VISITOR_ACTION");
          if (pendingAction) {
            isProcessingRef.current = true; // 🔒 Lock it

            const { visitor, action } = JSON.parse(pendingAction);

            // Delete it immediately so it doesn't trigger again
           await DefaultPreference.delete("PENDING_VISITOR_ACTION");

            if (visitor?.id) {
              setProcessingVisitor(true); // Show loader

              // ✅ Fix — hide loader BEFORE navigating
              try {
                if (action === 'ACCEPT') {
                  await visitorServices.acceptVisitor(visitor.id);
                } else if (action === 'DECLINE') {
                  await visitorServices.denyVisitor(visitor.id);
                }
              } catch (apiError) {
                console.error("❌ Background API Error:", apiError);
              } finally {
                setProcessingVisitor(false);        // ← hide first
                setTimeout(() => { isProcessingRef.current = false; }, 1000);
              }

              // Navigate AFTER finally, outside try/catch
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "MainApp", state: { routes: [{ name: "Visitors" }] } }],
                })
              );
              return;
            }}

              /* ======================================================
                 CASE 2: User pressed VIEW VISITOR on Lock Screen
              ====================================================== */
              const stored = await DefaultPreference.get("PENDING_VISITOR");
              if (!stored) return;

              isProcessingRef.current = true; // 🔒 Lock it

              const visitor = JSON.parse(stored);
              if (!visitor?.id) {
                isProcessingRef.current = false;
                return;
              }

              await DefaultPreference.clear("PENDING_VISITOR");

              navigation.navigate("VisitorApproval", { visitor });

              setTimeout(() => { isProcessingRef.current = false; }, 1000); // 🔓 Unlock

            } catch (e) {
              console.log("❌ checkPendingVisitor error:", e);
              setProcessingVisitor(false);
              isProcessingRef.current = false;
            }
          };

          checkPendingVisitor();
        }, [])
  );

  /* -------------------------------------------------------
     LOAD USER DETAILS
  ------------------------------------------------------- */
  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        await ismServices.getUserDetails();
      } catch (error) {
        console.log("User detail API error:", error);
      }
    };
    loadUserDetails();
  }, []);

  if (nightMode === undefined) {
    return (
      <View style={[commonStyles.safeArea, commonStyles.center]}>
        <Text style={commonStyles.bodyText}>Loading...</Text>
      </View>
    );
  }

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshTrigger(prev => prev + 1);
      await ismServices.getUserDetails();
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.log('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /* ======================================================
     UI RENDER
  ====================================================== */
  return (
    <>
      <View style={commonStyles.container}>
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

      {/* ✅ Overlay moved OUTSIDE the padded container so it natively covers the whole screen */}
      {processingVisitor && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#22C55E" />
          <Text style={styles.overlayText}>Processing Request...</Text>
        </View>
      )}
    </>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  overlayText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  }
});