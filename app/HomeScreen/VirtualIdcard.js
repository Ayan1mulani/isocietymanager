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
  Extrapolation, // ✅ replaces deprecated Extrapolate
} from "react-native-reanimated";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { ismServices } from "../../services/ismServices";
import AppHeader from "../components/AppHeader";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width - 40;
const PERSPECTIVE = 900;
const MAX_ROTATE = 18; // degrees

const ResidentIdCardScreen = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Track actual rendered card height instead of a fixed estimate
  const cardHeight = useSharedValue(CARD_WIDTH * 1.6);

  // 3D Tilt shared values
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const details = await ismServices.getUserDetails();
      console.log(details, "details");
      setUser(details);
    } catch (err) {
      console.log("ID CARD ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Measure the real card height after layout
  const onCardLayout = useCallback(
    (e) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) cardHeight.value = h;
    },
    [cardHeight]
  );

  const getAvatarUri = () => {
    if (user?.image_src) return { uri: user.image_src };
    const name = encodeURIComponent(user?.name || "User");
    return {
      uri: `https://ui-avatars.com/api/?name=${name}&background=1996D3&color=fff&size=250`,
    };
  };

  const qrUrl = user
    ? `https://util.isocietymanager.com/qr/?data=${user.user_id}`
    : null;

  // --- Pan Gesture for 3D tilt ---
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.04, { damping: 15, stiffness: 200 });
    })
    .onUpdate((e) => {
      rotateY.value = interpolate(
        e.x,
        [0, CARD_WIDTH],
        [-MAX_ROTATE, MAX_ROTATE],
        Extrapolation.CLAMP // ✅ fixed
      );
      rotateX.value = interpolate(
        e.y,
        [0, cardHeight.value], // ✅ uses real measured height
        [MAX_ROTATE, -MAX_ROTATE],
        Extrapolation.CLAMP // ✅ fixed
      );
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0, { damping: 12, stiffness: 120 });
      rotateY.value = withSpring(0, { damping: 12, stiffness: 120 });
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    });

  // --- Animated card style ---
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
      { scale: scale.value },
    ],
  }));

  // --- Gloss overlay moves opposite to tilt for realism ---
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

  const residentType = user?.tenant === 0 ? "OWNER" : "TENANT";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppHeader title={"Digital ID"} />

      <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          // ✅ Allow the pan gesture to take priority over scroll when tilting
          scrollEventThrottle={16}
        >
          {loading ? (
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color="#1996D3" />
            </View>
          ) : (
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[styles.cardWrapper, cardAnimatedStyle]}>

                {/* ✅ onLayout measures actual card height */}
                <View style={styles.card} onLayout={onCardLayout}>

                  {/* TOP HEADER BAR */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.headerText}>OFFICIAL RESIDENT ID</Text>
                    <View style={styles.statusBadge}>
                      <View style={styles.activeDot} />
                      <Text style={styles.statusText}>
                        {user.activated ? "ACTIVE" : "INACTIVE"}
                      </Text>
                    </View>
                  </View>

                  {/* MAIN INFO */}
                  <View style={styles.mainInfo}>
                    <View style={styles.avatarRing}>
                      <View style={styles.avatarContainer}>
                        <Image source={getAvatarUri()} style={styles.avatar} />
                      </View>
                    </View>

                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.orangeUserId}>#{user.user_id}</Text>

                    <View style={styles.tagsRow}>
                      <View style={styles.tagContainer}>
                        <Ionicons name="home-outline" size={11} color="#475569" />
                        <Text style={styles.unitTag}>
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
                            size={50}
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
                      value={user.phone_no}
                      half
                    />
                    <Detail
                      icon="business-outline"
                      label="Block"
                      value={user.block}
                      half
                    />
                    <Detail
                      icon="mail-outline"
                      label="Email"
                      value={user.email}
                      multiline
                    />
                  </View>

                  {/* FOOTER */}
                  <View style={styles.footer}>
                    <Ionicons name="shield-checkmark" size={12} color="#94A3B8" />
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
    </GestureHandlerRootView>
  );
};

// --- Detail Helper ---
const Detail = ({ icon, label, value, half, multiline }) => (
  <View style={[styles.detailRow, half && { width: "48%" }]}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={15} color="#1996D3" />
    </View>
    <View style={styles.detailTextContent}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={styles.detailValue}
        numberOfLines={multiline ? undefined : 1}
      >
        {value || "N/A"}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: "center",
    paddingBottom: 60, // ✅ extra bottom breathing room so card never clips
  },
  loaderCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.6,
    justifyContent: "center",
    alignItems: "center",
  },

  // --- 3D Card Wrapper ---
  cardWrapper: {
    width: CARD_WIDTH,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingBottom: 8,
    overflow: "hidden",
  },

  // --- Header ---
  cardHeader: {
    backgroundColor: "#1996D3",
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ADE80",
  },
  statusText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // --- Avatar / Name ---
  mainInfo: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 4,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: "#1996D3",
  },
  avatarContainer: {
    padding: 3,
    backgroundColor: "#fff",
    borderRadius: 65,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 48,
  },
  name: {
    fontSize: 21,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 12,
    letterSpacing: 0.3,
  },
  orangeUserId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EA580C",
    marginTop: 3,
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  tagContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  unitTag: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  typeTagContainer: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  typeTagText: {
    fontSize: 12,
    color: "#0369A1",
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // --- QR ---
  qrSection: {
    alignItems: "center",
    marginVertical: 18,
  },
  qrFrame: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  qr: {
    width: 148,
    height: 148,
  },
  qrPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  scanText: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 9,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
  },

  // --- Details ---
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
    marginBottom: 18,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 18,
    justifyContent: "space-between",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  detailTextContent: {
    marginLeft: 10,
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginTop: 1,
  },

  // --- Footer ---
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  footerText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  // --- Gloss ---
  gloss: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  // --- Hint text ---
  hint: {
    marginTop: 18,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});

export default ResidentIdCardScreen;