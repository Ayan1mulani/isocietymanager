import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePermissions } from '../../../Utils/ConetextApi';
import { Common } from '../../../services/Common';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

  // 🎨 FIXED THEME: Uses the exact HTML Navy background and forces white text
  const theme = {
    background: '#1a2540f7', // Exact match to HTML Header/Profile background
    text: '#FFFFFF',       // Pure white text for dark background
    subText: 'rgba(255, 255, 255, 0.6)',
    border: 'transparent', // Removes the harsh line so it blends seamlessly into the cards below
    avatarBg: 'rgba(255, 255, 255, 0.15)', // Glass effect for avatar fallback
    avatarBorder: 'rgba(255, 255, 255, 0.3)', // HTML avatar border style
  };

  const loadHeaderData = async () => {
    try {
      const res = await ismServices.getUserProfileData();
      const details = res?.data || res;
      setUserDetails(details);

      const awayValue = Number(details?.home_away) === 1;
      setIsAway(awayValue);

      const user = await Common.getLoggedInUser();
      setSocietyName(user?.society_name || user?.society?.name || '');

      if (user?.society?.data) {
        const parsed = JSON.parse(user.society.data);
        setSocietyLogo(parsed.logo);
      }
    } catch (err) {
      console.log("Header load error", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHeaderData();
    }, [])
  );

  // Helper to extract First & Last Name initials
  const getInitials = (name) => {
    if (!name) return 'U'; // Default fallback
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length > 1) {
      // First letter of first name + First letter of last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    // Only one name part exists
    return parts[0][0].toUpperCase();
  };

  const profilePic = userDetails?.image_src || userDetails?.profile_image;
  const userName = userDetails?.name || '';

  return (
    <View style={{ backgroundColor: theme.background }}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        
        {/* ─── Left Section: Logo & Name ─── */}
        <View style={styles.leftSection}>
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
        </View>

        {/* ─── Right Section: Icons ─── */}
        <View style={styles.rightSection}>
          
          <TouchableOpacity
            onPress={() => navigation.navigate('AllServicesScreen')}
            style={styles.iconBtn}
          >
            <Ionicons name="search-outline" size={22} color={theme.text} />
          </TouchableOpacity>


          <TouchableOpacity
            onPress={() => navigation.navigate('NotificationsScreen')}
            style={styles.iconBtn}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
          </TouchableOpacity>

          {/* Profile Icon */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ResidentIdCard', { userDetails })}
            style={[styles.avatarContainer, { borderColor: theme.avatarBorder }]}
          >
            {profilePic ? (
              <Image 
                source={{ uri: profilePic }} 
                style={styles.avatarImage} 
              />
            ) : (
              <View style={[styles.initialsBox, { backgroundColor: theme.avatarBg }]}>
                <Text style={[styles.initialsText, { color: theme.text }]}>
                  {getInitials(userName)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

        </View>
      </View>

      {/* ─── Away Banner ─── */}
      {isAway && (
        <TouchableOpacity
          style={styles.awayBanner}
          onPress={() => navigation.navigate("Settings")}
          activeOpacity={0.8}
        >
          <Text style={styles.awayText}>{t("You are marked as away")}</Text>
          <Ionicons name="chevron-forward" size={14} color="#EF4444" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default ResidentHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12, // Slightly increased padding to match HTML top-bar look
    borderBottomWidth: 1,
  },

  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  logoBox: {
    width: 38, // Slightly refined size
    height: 38,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff', // Keeps logo background white so dark logos are readable
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  societyName: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    flexShrink: 1,        
  },

  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBtn: {
    marginLeft: 16,
  },

  // Profile Avatar Styles
  avatarContainer: {
    width: 34,
    height: 34,
    borderRadius: 17, // Perfect circle
    marginLeft: 16,
    overflow: 'hidden',
    borderWidth: 1.5, // Thicker border matching the HTML design
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initialsBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  awayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  awayText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginLeft: 6,
  },
});