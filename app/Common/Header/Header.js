import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
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


const ResidentHeader = () => {
  const navigation = useNavigation();
  const { nightMode } = usePermissions();
  const [societyName, setSocietyName] = useState('');

  const [userDetails, setUserDetails] = useState(null);
  const [societyLogo, setSocietyLogo] = useState(null);
  const [isAway, setIsAway] = useState(false);

  const theme = {
    background: nightMode ? '#1f2937' : '#ffffff',
    text: nightMode ? '#f9fafb' : '#111827',
    subText: nightMode ? '#9ca3af' : '#6b7280',
    border: nightMode ? '#374151' : '#E5E7EB',
  };

  /* ------------------------------
      LOAD DATA (RUNS EVERY TIME SCREEN OPENS)
  ------------------------------ */
  const loadHeaderData = async () => {
    try {
      const res = await ismServices.getUserProfileData();
      const details = res?.data || res;
      console.log(details, "det")

      setUserDetails(details);

      // ✅ FIX AWAY STATUS
      const awayValue = Number(details?.home_away) === 1;
      setIsAway(awayValue);

      // ✅ FIX LOGO (RESTORE THIS)
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

  /* 🔥 THIS IS THE KEY FIX */
  useFocusEffect(
    useCallback(() => {
      loadHeaderData();
    }, [])
  );

  return (
    <View style={{ backgroundColor: theme.background }}>

      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>

        {/* LEFT */}
        {/* LEFT */}
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
            >
              {societyName}
            </Text>
          )}
        </View>

        {/* RIGHT */}
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

        </View>
      </View>

      {/* 🔴 AWAY INDICATOR */}
      {isAway && (
        <>
          <TouchableOpacity
            style={styles.awayBanner}
            onPress={() => navigation.navigate("Settings")}
            activeOpacity={0.8}
          >
            <Text style={styles.awayText}>You are marked as away</Text>
            <Ionicons name="chevron-forward" size={14} color="#EF4444" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </>
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
    paddingVertical: 8,
    borderBottomWidth: 1,
  },


  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBtn: {
    marginLeft: 16,
  },


  greetingText: {
    fontSize: 16,
    fontWeight: '700',
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
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  societyName: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    flexShrink: 1,        // shrinks before truncating
  },
});