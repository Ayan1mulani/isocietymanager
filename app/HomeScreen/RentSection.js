import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Utils/ConetextApi";
import { ismServices } from "../../services/ismServices";
import { otherServices } from "../../services/otherServices";
import { hasPermission } from "../../Utils/PermissionHelper";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = SCREEN_WIDTH - 40;
const SHIMMER_TRAVEL = PAGE_WIDTH * 2;

/* ── Hardcoded palette ── */
const LIGHT = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
  accent: "#2888cd",
  primary: "#3499e0",
  primaryDark: "#0369ad",
  shimBase: "#EFEFEF",
  shimShine: "#FAFAFA",
};

const DARK = {
  background: "#0F172A",
  card: "#1E293B",
  text: "#F1F5F9",
  subText: "#94A3B8",
  border: "#334155",
  accent: "#818CF8",
  primary: "#818CF8",
  primaryDark: "#6366F1",
  shimBase: "#1E293B",
  shimShine: "#293548",
};

/* ─────────────────────────────────────────
   ShimmerBox — YouTube-style sweep
───────────────────────────────────────── */
const ShimmerBox = ({ w, h, isDark, style }) => {
  const translateX = useRef(new Animated.Value(-SHIMMER_TRAVEL)).current;
  const base = isDark ? DARK.shimBase : LIGHT.shimBase;
  const shine = isDark ? DARK.shimShine : LIGHT.shimShine;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, { toValue: SHIMMER_TRAVEL, duration: 1100, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[{ width: w, height: h, backgroundColor: base, overflow: "hidden" }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[base, shine, shine, base]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_TRAVEL, height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────
   Skeleton — white bg, light grey blocks
───────────────────────────────────────── */
const ResidentSkeleton = ({ isDark }) => {
  const bg = isDark ? DARK.background : "#FFFFFF";
  const cardBg = isDark ? DARK.card : "#FFFFFF";
  const border = isDark ? DARK.border : "#F0F0F0";

  return (
    <View style={[styles.safeArea, { backgroundColor: bg }]}>
      <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
        <View style={[styles.profileCard, { backgroundColor: cardBg, borderWidth: 1, borderColor: border, paddingHorizontal: 12, paddingTop: 3, paddingBottom: 9 }]}>
          <ShimmerBox w="42%" h={11} isDark={isDark} style={{ borderRadius: 5, marginBottom: 18 }} />
          <View style={styles.profileRow}>
            <ShimmerBox w={70} h={70} isDark={isDark} style={{ borderRadius: 14, marginRight: 10 }} />
            <View style={[styles.profileDetails, { gap: 8 }]}>
              <ShimmerBox w="95%" h={16} isDark={isDark} style={{ borderRadius: 8 }} />
              <ShimmerBox w="78%" h={16} isDark={isDark} style={{ borderRadius: 8 }} />
              <ShimmerBox w="62%" h={16} isDark={isDark} style={{ borderRadius: 8 }} />
            </View>
          </View>
        </View>
        <View style={[styles.billCard, { flex: 1, backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.billHeader, { gap: 10 }]}>
            <ShimmerBox w="52%" h={9} isDark={isDark} style={{ borderRadius: 4 }} />
            <ShimmerBox w="82%" h={20} isDark={isDark} style={{ borderRadius: 5 }} />
          </View>
          <ShimmerBox w="100%" h={38} isDark={isDark} style={{ borderRadius: 0 }} />
        </View>
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────
   AnimatedDot — scroll-driven pill
───────────────────────────────────────── */
const AnimatedDot = ({ index, scrollX, activeColor, inactiveColor }) => {
  const range = [(index - 1) * PAGE_WIDTH, index * PAGE_WIDTH, (index + 1) * PAGE_WIDTH];
  return (
    <Animated.View
      style={{
        height: 6,
        borderRadius: 4,
        width: scrollX.interpolate({ inputRange: range, outputRange: [6, 22, 6], extrapolate: "clamp" }),
        opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: "clamp" }),
        backgroundColor: scrollX.interpolate({ inputRange: range, outputRange: [inactiveColor, activeColor, inactiveColor], extrapolate: "clamp" }),
        transform: [{ scaleY: scrollX.interpolate({ inputRange: range, outputRange: [0.8, 1.15, 0.8], extrapolate: "clamp" }) }],
      }}
    />
  );
};

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
const ResidentProfile = () => {
  const navigation = useNavigation();
  const { setFlatNo, permissions, nightMode } = usePermissions();
  const { t } = useTranslation();

  const isDark = !!nightMode;
  const C = isDark ? DARK : LIGHT;

  const canViewDashboard = permissions && hasPermission(permissions, "RESDSB", "R");
  const canPayBill = permissions && hasPermission(permissions, "PMTREQ", "R");

  const [userDetails, setUserDetails] = useState({});
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;

  const loadData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("userInfo");
      if (!storedUser) return;

      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(),
      ]);

      const data = detailsRes?.data || {};
      if (typeof data.id === "string") { try { data.id = JSON.parse(data.id); } catch (_) { } }
      setUserDetails(data);
      if (data?.flat_no) setFlatNo(data.flat_no);

      const allTypes = Array.from((typesRes?.data ?? typesRes ?? []).values());
      setOutstanding(
        (billRes?.data || []).map(bill => {
          const match = allTypes.find(ty => ty.id === bill.id);
          return { ...bill, realName: match ? match.name : t("Outstanding") };
        })
      );
    } catch (err) {
      console.log("Profile load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading || permissions === null) return <ResidentSkeleton isDark={isDark} />;
  if (!canViewDashboard) return null;

  /* Pages */
  const pages = [{ id: "page_0", type: "first_page", bill: outstanding[0] ?? null }];
  for (let i = 1; i < outstanding.length; i += 2) {
    pages.push({ id: `page_${i}`, type: "bill_page", bills: [outstanding[i], outstanding[i + 1] ?? null] });
  }

  /* Bill card */
  const renderBillCard = (billData, flexValue = 1) => {
    if (!billData) return <View style={{ flex: flexValue }} />;

    const rawAmount = parseFloat(billData?.data?.balance || "0");
    const amount = Math.abs(rawAmount).toLocaleString("en-IN");
    const drCr = rawAmount < 0 ? "DR" : "CR";
    const amountColor = rawAmount < 0 ? "#EF4444" : "#10B981";
    const label = billData?.realName || t("Outstanding");

    return (
      <View style={[styles.billCard, { backgroundColor: C.card, borderColor: C.border, flex: flexValue }]}>
        <View style={styles.billHeader}>
          <Text style={[styles.billLabel, { color: C.subText }]} numberOfLines={2}>{label}</Text>
        </View>

        {/* Amount — no currency symbol */}
        <Text style={[styles.billAmount, { color: C.text }]}>
          {amount}{" "}
          <Text style={{ color: amountColor, fontSize: 13, fontWeight: "600" }}>{drCr}</Text>
        </Text>

        <TouchableOpacity
          disabled={!canPayBill}
          onPress={() =>
            navigation.navigate("BillPaymentScreen", {
              billType: billData?.id,
              amount: parseFloat(billData?.data?.balance || "0"),
              outstanding,
            })
          }
          style={[styles.payButton, { backgroundColor: canPayBill ? C.accent : "#9CA3AF" }]}
        >
          <Text style={styles.payButtonText}>
            {canPayBill ? t("Pay/Recharge") : t("Not Permitted")}
          </Text>
          {canPayBill && <Ionicons name="arrow-forward" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    );
  };

  /* Render page */
  const renderItem = ({ item }) => {
    if (item.type === "first_page") {
      return (
        <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
          <LinearGradient
            colors={[C.primaryDark, C.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <Text style={styles.greeting} numberOfLines={1}>
              {t("Hii")}, {userDetails?.name || t("Resident")}
            </Text>
            <View style={styles.profileRow}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                activeOpacity={0.8}
                onPress={() => navigation.navigate("ResidentIdCard", { userDetails })}
              >
                <Image
                  source={{
                    uri:
                      userDetails?.image_src ||
                      "https://static.vecteezy.com/system/resources/previews/018/765/757/original/user-profile-icon-in-flat-style-member-avatar-illustration-on-isolated-background-human-permission-sign-business-concept-vector.jpg",
                  }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
              <View style={styles.profileDetails}>
                {[
                  { icon: "business", key: "Society",    val: userDetails?.society_name },
                  { icon: "home",     key: "Society ID", val: userDetails?.societyId },
                  { icon: "calendar", key: "Flat",       val: userDetails?.id?.flat_no },
                ].map(({ icon, key, val }) => (
                  <View style={styles.badge} key={key}>
                    <Ionicons name={icon} size={10} color="#fff" />
                    <Text style={styles.badgeText} numberOfLines={1}>
                      {t(key)}: {val || t("N/A")}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>

          {renderBillCard(item.bill, 1)}
        </View>
      );
    }

    return (
      <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
        {renderBillCard(item.bills[0], 1)}
        {renderBillCard(item.bills[1], 1)}
      </View>
    );
  };

  /* Dots */
  const Dots = () => {
    if (pages.length <= 1) return null;
    return (
      <View style={styles.dotsRow}>
        <View style={[styles.dotsPill, { backgroundColor: isDark ? "#1E293B" : "#ffff" }]}>
          {pages.map((_, i) => (
            <AnimatedDot
              key={i}
              index={i}
              scrollX={scrollX}
              activeColor={C.accent}
              inactiveColor={C.border}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: C.background }]}>
      <View>
        <Animated.FlatList
          data={pages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
        <Dots />
      </View>
    </View>
  );
};

export default ResidentProfile;

const styles = StyleSheet.create({
  safeArea: { marginHorizontal: 15, paddingBottom: 5 },
  pageContainer: { flexDirection: "row", gap: 12 },

  profileCard: {
    flex: 2, borderRadius: 20, elevation: 4, overflow: "hidden",
    paddingLeft: 10, paddingRight: 10, minHeight: 120,
  },
  greeting: { color: "#fff", fontSize: 14, fontWeight: "700", paddingTop: 10 },
  profileRow: { flexDirection: "row", marginTop: 10 },
  avatarWrapper: { marginRight: 10, borderRadius: 14, overflow: "hidden" },
  avatar: { width: 70, height: 70, borderRadius: 14, borderWidth: 2, borderColor: "#fff" },
  profileDetails: { flex: 1, justifyContent: "center", gap: 6, paddingBottom: 1 },
  badge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, width: "100%", paddingBottom: 3,
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "600", marginLeft: 6, paddingRight: 3, flexShrink: 1 },

  billCard: {
    borderRadius: 18, borderWidth: 1, overflow: "hidden",
    justifyContent: "space-between", minHeight: 120, elevation: 1,
  },
  billHeader: { paddingTop: 12, paddingHorizontal: 12 },
  billLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 4 },
  billAmount: { fontSize: 18, fontWeight: "800", paddingHorizontal: 12, marginTop: 6, flexShrink: 1 },
  payButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    width: "100%", padding: 12, borderBottomLeftRadius: 18, borderBottomRightRadius: 18,
  },
  payButtonText: { color: "#fff", fontSize: 10, fontWeight: "700", marginRight: 6 },

  dotsRow: { alignItems: "center", marginTop: 12, marginBottom: -7 },
  dotsPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingBottom: 10, borderRadius: 20 },
});