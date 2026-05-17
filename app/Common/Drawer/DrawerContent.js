import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  StatusBar,
  Platform,
  NativeModules,
  Share,        // ✅ Built-in React Native Share API
  Linking,      // ✅ For direct WhatsApp deep link
  AppState,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import useAlert from '../../components/UseAlert';
import StatusModal from '../../components/StatusModal';
import { OneSignal } from 'react-native-onesignal';
import { UnRegisterOneSignal } from '../../services/oneSignalService';
import { clearAccountsCache } from '../AccountsScreen/AccountsPage';

const { VisitorModule } = NativeModules;

// ─── App share config ─────────────────────────────────────────────────────────
const APP_SHARE_MESSAGE =
  'Please use the link below for downloading Max Estates app on your phone.\n\nhttps://play.google.com/store/apps/details?id=com.factech.maxestate';

const WHATSAPP_URL = `whatsapp://send?text=${encodeURIComponent(APP_SHARE_MESSAGE)}`;

// ─── Menu Items ───────────────────────────────────────────────────────────────
//  type: 'tab'   → Tab.Navigator screen  → navigate via props.navigation
//  type: 'stack' → root Stack screen     → navigate via navigation.getParent()
//  type: 'share' → triggers Share sheet  → no navigation
const DRAWER_ITEMS = [
  { label: 'Home',           icon: 'tv-outline',            route: 'Home',                type: 'tab'   },
  { label: 'Profile',        icon: 'person-circle-outline', route: 'More',                type: 'tab'   },
  { label: 'Notices',        icon: 'clipboard-outline',     route: 'MyNoticesScreen',     type: 'stack' },
  { label: 'Amenities',      icon: 'home-outline',          route: 'AmenitiesListScreen', type: 'stack' },
  { label: 'Request Status', icon: 'alert-circle-outline',  route: 'Service Requests',    type: 'tab'   },
  { label: 'Events',         icon: 'calendar-outline',      route: 'event',               type: 'stack' },
  { label: 'Tell a friend',  icon: 'share-social-outline',  route: null,                  type: 'share' },
  // { label: 'Contact Us',     icon: 'mail-outline',          route: 'ContactUsScreen',     type: 'stack' },
];

// ─── Component ────────────────────────────────────────────────────────────────
const DrawerContent = (props) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showAlert, AlertComponent } = useAlert(false);

  const [userDetails, setUserDetails] = useState(null);
  const [statusModal, setStatusModal] = useState({
    visible: false, type: 'loading', title: '', subtitle: '',
  });

  // ── Load user info ──────────────────────────────────────────────────────────
  useEffect(() => {
    const loadDrawerUser = async () => {
      try {
        const localProfileData = await AsyncStorage.getItem('@user_profile_cache');
        const parsedProfile = localProfileData ? JSON.parse(localProfileData) : null;

        const cachedImage = await AsyncStorage.getItem('@cached_profile_image');
        const cachedVersion = await AsyncStorage.getItem('@profile_image_version');

        let finalVersion = cachedVersion || '1';

        if (parsedProfile?.image_src || parsedProfile?.profile_image) {
          finalVersion = Date.now().toString();
          await AsyncStorage.setItem('@profile_image_version', finalVersion);
        }

        const raw =
          (await AsyncStorage.getItem('userInfo')) ||
          (await AsyncStorage.getItem('user')) ||
          '{}';

        const user = JSON.parse(raw);

        const latestImage =
          cachedImage ||
          parsedProfile?.image_src ||
          parsedProfile?.profile_image ||
          user?.image_src ||
          user?.profile_image ||
          user?.image;

        setUserDetails({
          ...user,
          ...parsedProfile,
          image_src: latestImage,
          image_version: finalVersion,
        });
      } catch (_) {}
    };

    loadDrawerUser();

    const profileSub = require('react-native').DeviceEventEmitter.addListener(
      'PROFILE_IMAGE_UPDATED',
      loadDrawerUser
    );

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadDrawerUser();
      }
    });

    return () => {
      profileSub.remove();
      appStateSub.remove();
    };
  }, []);

  // ── Share sheet (Tell a friend) ─────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    // Close drawer first, then open share sheet
    props.navigation.closeDrawer();

    setTimeout(async () => {
      try {
        await Share.share({
          message: APP_SHARE_MESSAGE,
          // 'url' is iOS-only; 'message' works on both platforms
          url: 'https://play.google.com/store/apps/details?id=com.factech.maxestate',
        });
      } catch (e) {
        console.log('Share error:', e);
      }
    }, 300);
  }, [props.navigation]);

  // ── WhatsApp direct share ───────────────────────────────────────────────────
  const handleWhatsApp = useCallback(async () => {
    props.navigation.closeDrawer();
    setTimeout(async () => {
      try {
        const supported = await Linking.canOpenURL(WHATSAPP_URL);
        if (supported) {
          await Linking.openURL(WHATSAPP_URL);
        } else {
          // WhatsApp not installed — fall back to generic share
          await Share.share({ message: APP_SHARE_MESSAGE });
        }
      } catch (e) {
        console.log('WhatsApp share error:', e);
      }
    }, 300);
  }, [props.navigation]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = useCallback((item) => {
    if (item.type === 'share') {
      handleShare();
      return;
    }

    props.navigation.closeDrawer();

    setTimeout(() => {
      try {
        if (item.type === 'tab') {
          props.navigation.navigate('MainApp', { screen: item.route });
        } else {
          const rootNav = navigation.getParent();
          if (rootNav) rootNav.navigate(item.route);
          else navigation.navigate(item.route);
        }
      } catch (e) {
        console.log('Drawer nav error:', e);
      }
    }, 300);
  }, [props.navigation, navigation, handleShare]);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    showAlert({
      title: t('Logout'),
      message: t('Are you sure you want to logout?'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              props.navigation.closeDrawer();

              setStatusModal({
                visible: true,
                type: 'loading',
                title: t('Logging out'),
                subtitle: t('Please wait...')
              });

              // OneSignal cleanup
              try {
                OneSignal.User.pushSubscription.optOut();
                OneSignal.logout();
                await UnRegisterOneSignal();
              } catch (osError) {
                console.log('OneSignal cleanup failed:', osError);
              }

              // Native cleanup
              try {
                if (VisitorModule?.clearAll) {
                  await VisitorModule.clearAll();
                }
              } catch (vmError) {
                console.log('VisitorModule cleanup failed:', vmError);
              }

              // Cache cleanup
              try {
                clearAccountsCache();
              } catch (cacheError) {
                console.log('Account cache cleanup failed:', cacheError);
              }

              await AsyncStorage.multiRemove([
                'userInfo',
                'permissions',
                'userDetails',
                '@user_profile_cache',
                '@user_details_cache',
                '@my_notifications_cache',
                'CACHED_OUTSTANDING',
                'RENT_CARD_VISIBLE',
              ]);

              await AsyncStorage.clear();

            } catch (e) {
              console.log('Main Logout error:', e);
            } finally {
              setStatusModal({
                visible: false,
                type: 'loading',
                title: '',
                subtitle: ''
              });

              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            }
          },
        },
      ],
    });
  }, [showAlert, navigation, t]);

  const profilePic =
    userDetails?.image_src ||
    userDetails?.profile_image ||
    userDetails?.image;
  const societyName = userDetails?.society_name || userDetails?.society || 'Max Estates';

  return (
    <View style={styles.root}>

      {/* ── Orange header ─────────────────────────────────────────────── */}
      <ImageBackground
        source={
          profilePic
            ? {
                uri: `${profilePic}${profilePic?.includes('?') ? '&' : '?'}v=${userDetails?.image_version || '1'}`,
              }
            : null
        }
        style={styles.profileSection}
        imageStyle={!profilePic ? { opacity: 0 } : undefined}
      >
        <View style={styles.profileOverlay}>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => props.navigation.closeDrawer()}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.nameContainer}>
            {!profilePic && (
              <View style={styles.personIconWrap}>
                <Ionicons name="person" size={42} color="#FFFFFF" />
              </View>
            )}

            <Text style={styles.userName} numberOfLines={2}>
              {societyName}
            </Text>
          </View>
        </View>
      </ImageBackground>

      {/* ── Menu list ─────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.menuScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="always"
      >
        <View style={styles.menuContainer}>
          {DRAWER_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.6}
              onPress={() => navigate(item)}
            >
              <Ionicons name={item.icon} size={24} color="#F97316" style={styles.icon} />
              <Text style={styles.menuText}>{t(item.label)}</Text>

              {/* Small WhatsApp shortcut button next to "Tell a friend" */}
              {/* {item.type === 'share' && (
                <TouchableOpacity
                  style={styles.whatsappBtn}
                  activeOpacity={0.7}
                  onPress={handleWhatsApp}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                > */}
                  {/* WhatsApp green icon using Ionicons logo */}
                  {/* <Ionicons name="logo-whatsapp" size={22} color="#25D366" /> */}
                {/* </TouchableOpacity>
              )} */}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Logout ── */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t('Logout')}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <AlertComponent />
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

export default DrawerContent;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  profileSection: { backgroundColor: '#F97316', overflow: 'hidden' },
  profileOverlay: {
    paddingTop: Platform.OS === 'ios' ? 18 : (StatusBar.currentHeight || 24) + 2,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  closeBtn: {
    alignSelf: 'flex-end', width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  nameContainer: {
    alignItems: 'flex-start', justifyContent: 'flex-end', marginTop: 30, minHeight: 120,
  },
  personIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    color: '#FFFFFF', fontSize: 28, fontWeight: '800', letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  menuScroll: { flex: 1 },
  menuContainer: { paddingTop: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 24,
  },
  icon: { marginRight: 16, width: 28, textAlign: 'center' },
  menuText: { fontSize: 16, color: '#333333', fontWeight: '500', flex: 1 },

  // WhatsApp quick-share button beside "Tell a friend"
  whatsappBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },

  logoutContainer: { marginTop: 30, paddingHorizontal: 24, alignItems: 'center' },
  logoutButton: {
    backgroundColor: '#F97316', paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: 8, width: '100%', alignItems: 'center',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  logoutText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});