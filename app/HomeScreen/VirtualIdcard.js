import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Responsive scale: 375 is the baseline (iPhone SE/8) ──
const BASE = 375;
const scale = (size) => Math.round((SCREEN_WIDTH / BASE) * size);

const CARD_WIDTH = SCREEN_WIDTH - scale(40);
const PERSPECTIVE = 900;
const MAX_ROTATE = 18;

const ResidentIdCardScreen = () => {
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
      const details = await ismServices.getUserProfileData();
      setUser(details?.data);
    } catch (err) {
      console.log("ID CARD ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  const onCardLayout = useCallback(
    (e) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) cardHeight.value = h;
    },
    [cardHeight]
  );

  const getAvatarUri = () => {
    if (user?.image_src) return { uri: user.image_src };
    const displayName = getUserField(user?.name, user?.alt_name);
    const name = encodeURIComponent(displayName || "User");
    return {
      uri: `https://ui-avatars.com/api/?name=${name}&background=1996D3&color=fff&size=250`,
    };
  };

  const qrUrl = user
    ? `https://util.isocietymanager.com/qr/?data=${user.user_id}`
    : null;

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scaleVal.value = withSpring(1.04, { damping: 15, stiffness: 200 });
    })
    .onUpdate((e) => {
      rotateY.value = interpolate(
        e.x,
        [0, CARD_WIDTH],
        [-MAX_ROTATE, MAX_ROTATE],
        Extrapolation.CLAMP
      );
      rotateX.value = interpolate(
        e.y,
        [0, cardHeight.value],
        [MAX_ROTATE, -MAX_ROTATE],
        Extrapolation.CLAMP
      );
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
    const translateX = interpolate(
      rotateY.value,
      [-MAX_ROTATE, MAX_ROTATE],
      [-40, 40]
    );
    const translateY = interpolate(
      rotateX.value,
      [-MAX_ROTATE, MAX_ROTATE],
      [40, -40]
    );
    const opacity = interpolate(
      Math.abs(rotateX.value) + Math.abs(rotateY.value),
      [0, MAX_ROTATE * 2],
      [0, 0.3]
    );
    return { transform: [{ translateX }, { translateY }], opacity };
  });

  const residentType = user?.tenant == 1 ? "TENANT" : "OWNER";

  const getUserField = (main, alt) => {
    return user?.tenant == 1 ? (alt || main) : main;
  };

  const parsedId = user?.id ? JSON.parse(user.id) : null;
  const userId = parsedId?.user_id;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppHeader title={"Digital ID"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
        <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
          >
            {loading ? (
              <View style={styles.loaderCard}>
                <ActivityIndicator size="large" color="#1996D3" />
              </View>
            ) : (
              <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>
                  <View style={styles.card} onLayout={onCardLayout}>

                    {/* TOP HEADER BAR */}
                    <View style={styles.cardHeader}>
                      <Text style={styles.headerText} numberOfLines={1}>
                        OFFICIAL RESIDENT ID
                      </Text>
                     
                    </View>

                    {/* MAIN INFO */}
                    <View style={styles.mainInfo}>
                      <View style={styles.avatarRing}>
                        <View style={styles.avatarContainer}>
                          <Image source={getAvatarUri()} style={styles.avatar} />
                        </View>
                      </View>

                      <Text
                        style={styles.name}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                      >
                        {getUserField(user.name, user.alt_name)}
                      </Text>
                      <Text style={styles.orangeUserId} numberOfLines={1}>
                        #{userId}
                      </Text>

                      <View style={styles.tagsRow}>
                        <View style={styles.tagContainer}>
                          <Ionicons
                            name="home-outline"
                            size={scale(11)}
                            color="#475569"
                          />
                          <Text style={styles.unitTag} numberOfLines={1}>
                            {user.tower} • {user.display_unit_no || user.flat_no}
                          </Text>
                        </View>
                        <View style={[styles.tagContainer, styles.typeTagContainer]}>
                          <Text style={styles.typeTagText}>{residentType}</Text>
                        </View>
                      </View>
                    </View>

                    {/* QR CODE */}
                    <View style={styles.qrSection}>
                      <View style={styles.qrFrame}>
                        {qrUrl ? (
                          <Image
                            source={{ uri: qrUrl }}
                            style={styles.qr}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={[styles.qr, styles.qrPlaceholder]}>
                            <Ionicons
                              name="qr-code-outline"
                              size={scale(50)}
                              color="#CBD5E1"
                            />
                          </View>
                        )}
                      </View>
                      <Text style={styles.scanText}>Scan for Verification</Text>
                    </View>

                    <View style={styles.divider} />

                    {/* DETAILS GRID */}
                    <View style={styles.detailsGrid}>
                      <Detail
                        icon="call-outline"
                        label="Phone"
                        value={getUserField(user.phone_no, user.alt_phone_no)}
                        half
                      />
                      <Detail
                        icon="home-outline"
                        label="Unit"
                        value={`${user.display_unit_no || user.flat_no}`}
                        half
                      />
                      <Detail
                        icon="mail-outline"
                        label="Email"
                        value={getUserField(user.email, user.alt_email)}
                        multiline
                      />
                      <Detail
                        icon="business-outline"
                        label="Society"
                        value={user.society_name}
                        half
                      />
                       <Detail
                        icon="key-outline"
                        label="unit-id"
                        value={user.unit_id}
                        half
                      />
                    
                    </View>


                    {/* FOOTER */}
                    <View style={styles.footer}>
                      <Ionicons
                        name="shield-checkmark"
                        size={scale(12)}
                        color="#94A3B8"
                      />
                      <Text style={styles.footerText}>
                        {" "}iSocietyManager Digital ID
                      </Text>
                    </View>

                    {/* GLOSS OVERLAY */}
                    <Animated.View
                      pointerEvents="none"
                      style={[styles.gloss, glossAnimatedStyle]}
                    />
                  </View>
                </Animated.View>
              </GestureDetector>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

// --- Detail Helper ---
const Detail = ({ icon, label, value, half, multiline }) => (
  <View style={[styles.detailRow, half && { width: "48%" }]}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={scale(15)} color="#1996D3" />
    </View>
    <View style={styles.detailTextContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={styles.detailValue}
        numberOfLines={multiline ? undefined : 1}
        adjustsFontSizeToFit={!multiline}
        minimumFontScale={0.75}
      >
        {value || "N/A"}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: scale(20),
    alignItems: "center",
    paddingBottom: scale(60),
  },
  loaderCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.6,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- Card ---
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: scale(24),
    paddingBottom: scale(8),
    overflow: "hidden",
  },

  // --- Header ---
  cardHeader: {
    backgroundColor: "#1996D3",
    paddingVertical: scale(12),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scale(16),
  },
  headerText: {
    color: "#fff",
    fontSize: scale(10),
    fontWeight: "800",
    letterSpacing: 1.2,
    flexShrink: 1,
    marginRight: scale(8),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    gap: scale(4),
  },
  activeDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: "#4ADE80",
  },
  statusText: {
    color: "#fff",
    fontSize: scale(9),
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // --- Avatar / Name ---
  mainInfo: {
    alignItems: "center",
    paddingTop: scale(18),
    paddingBottom: scale(4),
    paddingHorizontal: scale(12),
  },
  avatarRing: {
    padding: scale(3),
    borderRadius: scale(70),
    borderWidth: scale(2.5),
    borderColor: "#1996D3",
  },
  avatarContainer: {
    padding: scale(3),
    backgroundColor: "#fff",
    borderRadius: scale(65),
  },
  avatar: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(48),
  },
  name: {
    fontSize: scale(19),
    fontWeight: "800",
    color: "#1E293B",
    marginTop: scale(10),
    letterSpacing: 0.3,
    textAlign: "center",
    width: "100%",
  },
  orangeUserId: {
    fontSize: scale(13),
    fontWeight: "800",
    color: "#EA580C",
    marginTop: scale(3),
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: scale(8),
    gap: scale(6),
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: scale(8),
  },
  tagContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "#F1F5F9",
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
  },
  unitTag: {
    fontSize: scale(11),
    color: "#475569",
    fontWeight: "700",
  },
  typeTagContainer: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  typeTagText: {
    fontSize: scale(11),
    color: "#0369A1",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // --- QR ---
  qrSection: {
    alignItems: "center",
    marginVertical: scale(16),
  },
  qrFrame: {
    padding: scale(8),
    backgroundColor: "#fff",
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 3,
  },
  qr: {
    width: scale(130),
    height: scale(130),
  },
  qrPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  scanText: {
    fontSize: scale(9),
    color: "#94A3B8",
    marginTop: scale(8),
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
  },

  // --- Details ---
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: scale(20),
    marginBottom: scale(14),
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: scale(16),
    justifyContent: "space-between",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: scale(14),
    width: "100%",
  },
  iconCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  detailTextContent: {
    marginLeft: scale(8),
    flex: 1,
    overflow: "hidden",
  },
  detailLabel: {
    fontSize: scale(9),
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: scale(13),
    fontWeight: "700",
    color: "#334155",
    marginTop: scale(1),
  },

  // --- Footer ---
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: scale(4),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  footerText: {
    fontSize: scale(10),
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  // --- Gloss ---
  gloss: {
    ...StyleSheet.absoluteFill,
    borderRadius: scale(24),
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});

export default ResidentIdCardScreen;