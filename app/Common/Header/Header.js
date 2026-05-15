import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePermissions } from '../../../Utils/ConetextApi';
import { Common } from '../../../services/Common';
import { useNavigation } from '@react-navigation/native';
import BRAND from '../../config';
import { ismServices } from '../../../services/ismServices';
import { useTranslation } from 'react-i18next';
import Text from '../../components/TranslatedText';

const ResidentHeader = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { nightMode } = usePermissions();

  const [societyName, setSocietyName] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [societyLogo, setSocietyLogo] = useState(null);
  const [isAway, setIsAway] = useState(false);

  const theme = {
    background: '#F27B22',
    text: '#ffffff',
    subText: 'rgba(255, 255, 255, 0.6)',
    border: 'transparent',
    avatarBg: '#EA580C',
    avatarBorder: '#60A5FA',
  };

  const loadHeaderData = async () => {
    try {
      const user = await Common.getLoggedInUser();
      const [res, res2] = await Promise.all([
        ismServices.getUserProfileData(),
        ismServices.getUserDetails(),
      ]);
      const details = res?.data || res;
      const latestImage = res2?.image_src || details?.image_src || details?.profile_image;
      const cachedVersion = await AsyncStorage.getItem('@profile_image_version');
      if (latestImage) await AsyncStorage.setItem('@cached_profile_image', latestImage);
      setUserDetails({ ...details, image_src: latestImage, image_version: cachedVersion || '1' });

      const cachedSettings = await AsyncStorage.getItem('cached_user_settings');
      if (cachedSettings) {
        const parsed = JSON.parse(cachedSettings);
        if (typeof parsed.isAway === 'boolean') setIsAway(parsed.isAway);
      }

      const awayValue = Number(res2?.home_away || details?.home_away) === 1;
      setIsAway(awayValue);
      await AsyncStorage.setItem(
        'cached_user_settings',
        JSON.stringify({ ...(cachedSettings ? JSON.parse(cachedSettings) : {}), isAway: awayValue })
      );

      setSocietyName(user?.society_name || user?.society?.name || '');
      if (user?.society?.data) {
        const parsed = JSON.parse(user.society.data);
        setSocietyLogo(parsed.logo);
      }
    } catch (err) {
      console.log('Header load error', err);
    }
  };

  useEffect(() => {
    loadHeaderData();
    const profileSub = DeviceEventEmitter.addListener('PROFILE_IMAGE_UPDATED', loadHeaderData);
    const awaySub = DeviceEventEmitter.addListener('AWAY_STATUS_CHANGED', setIsAway);
    return () => { profileSub.remove(); awaySub.remove(); };
  }, []);

  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const profilePic = userDetails?.image_src || userDetails?.profile_image;
  const userName = userDetails?.name;

  return (
    <View style={{ backgroundColor: theme.background }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>

        {/* ─── Hamburger: now calls navigation.openDrawer() directly ─── */}
        <TouchableOpacity
          onPress={() => navigation.openDrawer()}  // ✅ works because Drawer.Navigator is the parent
          style={styles.drawerBtn}
        >
          <Ionicons name="menu" size={26} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.leftSection}
          onPress={() =>
            navigation.navigate('MainApp', {
              screen: 'Home',
            })
          }
        >
          <View style={styles.logoBox}>
            <Image
              source={societyLogo ? { uri: societyLogo } : BRAND.LOGO}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {!!societyName && (
            <Text
              style={[styles.societyName, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {t(societyName)}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.rightSection}>
          <TouchableOpacity onPress={() => navigation.navigate('AllServicesScreen')} style={styles.iconBtn}>
            <Ionicons name="search" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NotificationsScreen')} style={styles.iconBtn}>
            <Ionicons name="notifications" size={22} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MainApp', { screen: 'More' })}
            style={[styles.avatarContainer, { borderColor: theme.avatarBorder }]}
          >
            {profilePic ? (
              <Image
                source={{ uri: `${profilePic}?v=${userDetails?.image_version || '1'}` }}
                style={styles.avatarImage}
              />
            ) : userName ? (
              <View style={[styles.initialsBox, { backgroundColor: theme.avatarBg }]}>
                <Text style={[styles.initialsText, { color: theme.text }]}>
                  {getInitials(userName)}
                </Text>
              </View>
            ) : (
              <View style={[styles.initialsBox, { backgroundColor: theme.avatarBg }]} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isAway && (
        <TouchableOpacity
          style={styles.awayBanner}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.8}
        >
          <Text style={styles.awayText}>{t('You are marked as away')}</Text>
          <Ionicons name="chevron-forward" size={14} color="#ffffff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ResidentHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  drawerBtn: { marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  leftSection: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  logoBox: {
    width: 42, height: 42, borderRadius: 12, overflow: 'hidden',
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', flexShrink: 0, padding: 2,
  },
  logoImage: { width: '112%', height: '112%' },
  societyName: { fontSize: 16, fontWeight: '700', marginLeft: 10, flexShrink: 1 },
  rightSection: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 16 },
  avatarContainer: {
    width: 38, height: 38, borderRadius: 19, marginLeft: 16, overflow: 'hidden',
    borderWidth: 2.5, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#ffffff', shadowColor: '#60A5FA',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4,
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  initialsBox: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  initialsText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  awayBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ebcfcf', paddingVertical: 6, paddingHorizontal: 12,
  },
  awayText: { fontSize: 12, color: '#1F3D72', fontWeight: '500', marginLeft: 6 },
});