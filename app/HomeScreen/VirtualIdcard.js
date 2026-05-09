import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ismServices } from "../../services/ismServices";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";
import BRAND from "../config";

const COLORS = BRAND.COLORS;

// --- UPDATED SCALING LOGIC ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812; // Standard modern phone height

// This ensures the scale adapts to both width AND height, preventing vertical overflow on small devices
const scaleFactor = Math.min(SCREEN_WIDTH / BASE_WIDTH, SCREEN_HEIGHT / BASE_HEIGHT);
const scale = (size) => Math.round(scaleFactor * size);

const CARD_WIDTH = SCREEN_WIDTH - scale(40);
const PERSPECTIVE = 900;
const MAX_ROTATE = 18;

const getProfileCacheKey = (userId) => `@user_profile_cache_${userId}`;
const PROFILE_IMAGE_CACHE_KEY = '@cached_profile_image';
const PROFILE_IMAGE_VERSION_KEY = '@profile_image_version';

const SkeletonLine = ({ width = 100, height = 12, style }) => (
  <View style={[{ width, height, backgroundColor: '#E2E8F0', borderRadius: 4 }, style]} />
);

const ResidentIdCardScreen = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const cardHeight = useSharedValue(CARD_WIDTH * 1.6);
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scaleVal = useSharedValue(1);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("userInfo");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const uid = parsedUser?.id || parsedUser?.user_id || "default";
      const cacheKey = getProfileCacheKey(uid);

      const cachedProfile = await AsyncStorage.getItem(cacheKey);
      if (cachedProfile) {
        setUser(JSON.parse(cachedProfile));
        setLoading(false);
      }

      const [res, res2] = await Promise.all([
        ismServices.getUserProfileData(),
        ismServices.getUserDetails(),
      ]);

      if (res?.status === 'success') {

        const cachedImage = await AsyncStorage.getItem(
          PROFILE_IMAGE_CACHE_KEY
        );

        const imageVersion = await AsyncStorage.getItem(
          PROFILE_IMAGE_VERSION_KEY
        );

        const latestImage =
          cachedImage ||
          res2?.image_src ||
          res2?.profile_image ||
          res?.data?.image_src;

        const mergedUser = {
          ...res.data,
          image_src: latestImage,
          image_version: imageVersion || '1',
        };

        setUser(mergedUser);

        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify(mergedUser)
        );
      }
    } catch (err) {
      console.log("ID CARD ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const onCardLayout = useCallback((e) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) cardHeight.value = h;
  }, [cardHeight]);

  const getUserField = (main, alt) => {
    return user?.tenant == 1 ? (alt || main) : main;
  };

  const getAvatarUri = () => {
    if (user?.image_src) {
      return {
        uri: `${user.image_src}?v=${user?.image_version || '1'}`,
      };
    }

    const displayName = getUserField(user?.name, user?.alt_name);
    const name = encodeURIComponent(displayName || "User");

    return {
      uri: `https://ui-avatars.com/api/?name=${name}&background=FB923C&color=fff&size=250`
    };
  };


  const panGesture = Gesture.Pan()
    .onBegin(() => { scaleVal.value = withSpring(1.04, { damping: 15, stiffness: 200 }); })
    .onUpdate((e) => {
      rotateY.value = interpolate(e.x, [0, CARD_WIDTH], [-MAX_ROTATE, MAX_ROTATE], Extrapolation.CLAMP);
      rotateX.value = interpolate(e.y, [0, cardHeight.value], [MAX_ROTATE, -MAX_ROTATE], Extrapolation.CLAMP);
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0, { damping: 12, stiffness: 120 });
      rotateY.value = withSpring(0, { damping: 12, stiffness: 120 });
      scaleVal.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scaleVal.value },
    ],
  }));

  const glossAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(rotateY.value, [-MAX_ROTATE, MAX_ROTATE], [-40, 40]);
    const translateY = interpolate(rotateX.value, [-MAX_ROTATE, MAX_ROTATE], [40, -40]);
    const opacity = interpolate(Math.abs(rotateX.value) + Math.abs(rotateY.value), [0, MAX_ROTATE * 2], [0, 0.3]);
    return { transform: [{ translateX }, { translateY }], opacity };
  });

  const residentType = user?.tenant == 1 ? t("TENANT") : t("Resident");
  const parsedId = user?.id ? (typeof user.id === 'string' ? JSON.parse(user.id) : user.id) : null;
  const userId = parsedId?.user_id || user?.user_id;
  const qrUrl = user ? `https://util.isocietymanager.com/qr/?data=${userId}` : null;
  console.log("USER DATA:", user);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaView handles device notches and home bars automatically */}
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "#F0F4F8" }}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <AppHeader title={t("Virtual ID Card")} />
        {/* UPDATED: Added flexGrow: 1 and justifyContent: 'center' to properly contain the card */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>
              <View style={styles.card} onLayout={onCardLayout}>

                <View style={styles.cardHeader}>
                  <Text style={styles.headerText} numberOfLines={1}>{user?.society_name}</Text>
                </View>

                <View style={styles.mainInfo}>
                  <View style={styles.avatarRing}>
                    <View style={styles.avatarContainer}>
                      {loading && !user ? (
                        <View style={[styles.avatar, { backgroundColor: '#F1F5F9' }]} />
                      ) : (
                        <Image source={getAvatarUri()} style={styles.avatar} />
                      )}
                    </View>
                  </View>

                  {loading && !user ? (
                    <View style={{ alignItems: 'center', marginTop: scale(10) }}>
                      <SkeletonLine width={scale(150)} height={20} style={{ marginBottom: 8 }} />
                      <SkeletonLine width={scale(60)} height={14} />
                    </View>
                  ) : (
                    <>
                      <Text style={styles.name} numberOfLines={1}>{getUserField(user?.name, user?.alt_name)}</Text>
                      <Text style={styles.orangeUserId} numberOfLines={1}>#{userId}</Text>
                    </>
                  )}

                  <View style={styles.tagsRow}>
                    {loading && !user ? (
                      <SkeletonLine width={scale(100)} height={30} style={{ borderRadius: 20 }} />
                    ) : (
                      <>
                        <View style={styles.tagContainer}>
                          <Ionicons name="home-outline" size={scale(11)} color="#475569" />
                          <Text style={styles.unitTag}>{user?.tower} • {user?.display_unit_no || user?.flat_no}</Text>
                        </View>
                        <View style={[styles.tagContainer, styles.typeTagContainer]}>
                          <Text style={styles.typeTagText}>{residentType}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.qrSection}>
                  <View style={styles.qrFrame}>
                    {loading && !user ? (
                      <View style={[styles.qr, { backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator color="#CBD5E1" />
                      </View>
                    ) : (
                      <Image source={{ uri: qrUrl }} style={styles.qr} resizeMode="contain" />
                    )}
                  </View>
                  <Text style={styles.scanText}>{t("Scan for verification")}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.detailsGrid}>
                  <Detail icon="call-outline" label={t("Phone")} value={getUserField(user?.phone_no, user?.alt_phone_no)} loading={loading && !user} half />
                  <Detail icon="home-outline" label={t("Unit")} value={user?.display_unit_no || user?.flat_no} loading={loading && !user} half />
                  <Detail icon="mail-outline" label={t("Email")} value={getUserField(user?.email, user?.alt_email)} loading={loading && !user} />
                  <Detail icon="business-outline" label={t("Society")} value={user?.society_name} loading={loading && !user} half />
                  <Detail icon="key-outline" label={t("unit-id")} value={user?.unit_id} loading={loading && !user} half />
                </View>

                <View style={styles.footer}>
                  <Ionicons name="shield-checkmark" size={scale(12)} color="#94A3B8" />
                  <Text style={styles.footerText}>{t("iSocietyManager Virtual ID")}</Text>
                </View>

                <Animated.View pointerEvents="none" style={[styles.gloss, glossAnimatedStyle]} />
              </View>
            </Animated.View>
          </GestureDetector>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const Detail = ({ icon, label, value, half, loading }) => (
  <View style={[styles.detailRow, half && { width: "48%" }]}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={scale(15)} color={COLORS.primary} />
    </View>
    <View style={styles.detailTextContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      {loading ? (
        <SkeletonLine width="80%" height={12} style={{ marginTop: 4 }} />
      ) : (
        <Text style={styles.detailValue} numberOfLines={1}>{value || "N/A"}</Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  // UPDATED container style
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: scale(20)
  },
  cardWrapper: { width: CARD_WIDTH },
  card: { width: "100%", backgroundColor: COLORS.card, borderRadius: scale(24), paddingBottom: scale(8), overflow: "hidden" },
  cardHeader: { backgroundColor: COLORS.primary, paddingVertical: scale(12), paddingHorizontal: scale(16) },
  headerText: { color: "#fff", fontSize: scale(10), fontWeight: "800", letterSpacing: 1.2 },
  mainInfo: { alignItems: "center", paddingTop: scale(18), paddingBottom: scale(4), paddingHorizontal: scale(12) },
  avatarRing: { padding: scale(3), borderRadius: scale(70), borderWidth: scale(2.5), borderColor: COLORS.primary },
  avatarContainer: { padding: scale(3), backgroundColor: "#fff", borderRadius: scale(65) },
  avatar: { width: scale(80), height: scale(80), borderRadius: scale(48) },
  name: { fontSize: scale(19), fontWeight: "800", color: "#1E293B", marginTop: scale(10), textAlign: "center", width: "100%" },
  orangeUserId: { fontSize: scale(13), fontWeight: "800", color: COLORS.primary, marginTop: scale(3) },
  tagsRow: { flexDirection: "row", alignItems: "center", marginTop: scale(8), gap: scale(6), justifyContent: "center" },
  tagContainer: { flexDirection: "row", alignItems: "center", gap: scale(4), backgroundColor: "#F1F5F9", paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(20) },
  unitTag: { fontSize: scale(11), color: "#475569", fontWeight: "700" },
  typeTagContainer: { backgroundColor: COLORS.iconBackground, borderWidth: 1, borderColor: COLORS.iconBorder },
  typeTagText: { fontSize: scale(11), color: COLORS.primary, fontWeight: "800" },
  qrSection: { alignItems: "center", marginVertical: scale(16) },
  qrFrame: { padding: scale(8), backgroundColor: "#fff", borderRadius: scale(14), borderWidth: 1, borderColor: "#E2E8F0", elevation: 3 },
  qr: { width: scale(130), height: scale(130) },
  scanText: { fontSize: scale(9), color: "#94A3B8", marginTop: scale(8), textTransform: "uppercase", letterSpacing: 1.2, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginHorizontal: scale(20), marginBottom: scale(14) },
  detailsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: scale(16), justifyContent: "space-between" },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: scale(14), width: "100%" },
  iconCircle: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: COLORS.iconBackground, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: COLORS.iconBorder },
  detailTextContent: { marginLeft: scale(8), flex: 1 },
  detailLabel: { fontSize: scale(9), color: "#94A3B8", textTransform: "uppercase", fontWeight: "700" },
  detailValue: { fontSize: scale(13), fontWeight: "700", color: "#334155", marginTop: scale(1) },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", paddingVertical: scale(10), borderTopWidth: 1, borderTopColor: "#F8FAFC", gap: 5 },
  footerText: { fontSize: scale(10), color: "#94A3B8", fontWeight: "600" },
  gloss: { ...StyleSheet.absoluteFill, borderRadius: scale(24), backgroundColor: "rgba(255,255,255,0.15)" },
});

export default ResidentIdCardScreen;