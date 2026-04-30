import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
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
const PAGE_WIDTH = SCREEN_WIDTH * 0.85;
const SPACING = 12;
const SNAP_INTERVAL = PAGE_WIDTH + SPACING;
const SHIMMER_TRAVEL = PAGE_WIDTH * 2;

const HTML_THEME = {
  background: "#1a2540f7",
  card: "rgba(255, 255, 255, 0.1)",
  cardBorder: "rgb(255, 255, 255)",
  text: "#FFFFFF",
  subText: "rgba(255, 255, 255, 0.6)",
  accent: "#0ea98a",
  shimBase: "rgba(255, 255, 255, 0.05)",
  shimShine: "rgba(255, 255, 255, 0.15)",
  inactiveDot: "rgba(255, 255, 255, 0.3)",
};

/* ─────────────────────────────────────────
   Helper: Shimmer Animation Component
───────────────────────────────────────── */
const ShimmerBox = ({ w, h, style }) => {
  const translateX = useRef(new Animated.Value(-SHIMMER_TRAVEL)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(translateX, {
        toValue: SHIMMER_TRAVEL,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[{
      width: w,
      height: h,
      backgroundColor: HTML_THEME.shimBase,
      overflow: "hidden",
      borderRadius: 4,
    }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={[HTML_THEME.shimBase, HTML_THEME.shimShine, HTML_THEME.shimShine, HTML_THEME.shimBase]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: SHIMMER_TRAVEL, height: "120%" }}
        />
      </Animated.View>
    </View>
  );
};

/* ─────────────────────────────────────────
   Helper: Skeleton Loader UI
   FIX: Added dots row at the bottom (matched Doc 1)
───────────────────────────────────────── */
const ResidentSkeleton = () => (
  <View style={[styles.safeArea, { backgroundColor: HTML_THEME.background }]}>
    <View style={[styles.pageContainer, { width: PAGE_WIDTH, marginLeft: 15 }]}>
      {[1, 2].map((key) => (
        <View
          key={key}
          style={[styles.cardOuter, { flex: 1, backgroundColor: HTML_THEME.card, borderColor: HTML_THEME.cardBorder, padding: 12 }]}
        >
          <ShimmerBox w="60%" h={10} style={{ marginBottom: 8 }} />
          <ShimmerBox w="40%" h={24} style={{ borderRadius: 4, marginBottom: 8 }} />
          <ShimmerBox w="30%" h={14} style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
    {/* FIX: Skeleton dots row — matches Doc 1 */}
    <View style={styles.dotsRow}>
      <View style={{ height: 5, width: 18, borderRadius: 4, marginHorizontal: 3, backgroundColor: HTML_THEME.inactiveDot }} />
      <View style={{ height: 5, width: 5, borderRadius: 4, marginHorizontal: 3, backgroundColor: HTML_THEME.inactiveDot }} />
    </View>
  </View>
);

/* ─────────────────────────────────────────
   Main Component: ResidentProfile
───────────────────────────────────────── */
const ResidentProfile = ({ refreshTrigger, onSetVisible }) => {
  const navigation = useNavigation();
  const { setFlatNo, permissions } = usePermissions();
  const { t } = useTranslation();

  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollX = useRef(new Animated.Value(0)).current;

  const canViewDashboard = permissions && typeof hasPermission === "function" && hasPermission(permissions, "RESDSB", "R");
  const canPayBill = permissions && typeof hasPermission === "function" && hasPermission(permissions, "PMTREQ", "R");

  useEffect(() => {
    if (permissions !== null && typeof onSetVisible === "function") {
      onSetVisible(!!canViewDashboard);
    }
  }, [canViewDashboard, permissions, onSetVisible]);

  const loadData = async () => {
    try {
      const cached = await AsyncStorage.getItem("CACHED_OUTSTANDING");
      if (cached) setOutstanding(JSON.parse(cached));

      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(),
      ]);

      if (detailsRes?.data?.flat_no && typeof setFlatNo === "function") {
        setFlatNo(detailsRes.data.flat_no);
      }

      const rawTypes = typesRes?.data || [];
      const allTypes = Array.isArray(rawTypes) ? rawTypes : Object.values(rawTypes);

      const processedData = (billRes?.data || []).map((bill) => {
        const match = allTypes.find((ty) => ty.id === bill.id);
        return {
          ...bill,
          realName: match ? match.name : bill.name || t("Outstanding"),
        };
      });

      setOutstanding(processedData);
      await AsyncStorage.setItem("CACHED_OUTSTANDING", JSON.stringify(processedData));
    } catch (err) {
      console.log("Dashboard Card Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  if (permissions === null) return <ResidentSkeleton />;
  if (!canViewDashboard) return null;
  if (loading && outstanding.length === 0) return <ResidentSkeleton />;

  const pages = [];
  for (let i = 0; i < outstanding.length; i += 2) {
    pages.push({ id: `page_${i}`, bills: [outstanding[i], outstanding[i + 1] ?? null] });
  }

  /* ─── Empty State ─────────────────────────────────────────────────────
     FIX: Added PAY/RECHARGE badge button (matched Doc 1)
  ───────────────────────────────────────────────────────────────────── */
  const renderEmptyState = () => (
    <View style={[styles.pageContainer, { width: PAGE_WIDTH, paddingHorizontal: 15 }]}>
      <TouchableOpacity
        activeOpacity={0.7}
        style={{ flex: 1 }}
        onPress={() => navigation.navigate("BillPaymentScreen", { amount: 1 })}
      >
        <View style={[styles.cardOuter, { alignItems: "center", justifyContent: "center", paddingVertical: 24 }]}>
          <Ionicons name="checkmark-circle" size={32} color="#10B981" style={{ marginBottom: 8 }} />
          <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "600" }}>
            {t("NO_BALANCE_FOUND") || "No balance data found!"}
          </Text>
          {/* FIX: PAY/RECHARGE pill badge — from Doc 1 */}
          <View style={{
            marginTop: 12,
            backgroundColor: "rgba(255, 255, 255, 0.15)",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 12 }}>
              {t("PAY_RECHARGE") || "PAY/RECHARGE"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  /* ─── Bill Card ───────────────────────────────────────────────────────
     FIX 1: amount Text — added adjustsFontSizeToFit + minimumFontScale={0.6}
     FIX 2: backendMessage — added fontWeight "500" (via style)
     FIX 3: navAmount fallback guard kept from Doc 2
  ───────────────────────────────────────────────────────────────────── */
  const renderBillCard = (billData, flexValue = 1) => {
    if (!billData) return <View style={{ flex: flexValue }} />;

    const label = billData?.realName || billData?.name;
    const showBal = billData?.show_bal;
    const backendMessage = billData?.message || t("No balance data found.");

    const rawAmount = showBal && billData?.data?.balance
      ? Math.round(Math.abs(parseFloat(billData.data.balance)))
      : 0;

    const navAmount = rawAmount === 0 || !showBal ? 1 : rawAmount;
    const isPayable = !!canPayBill;

    return (
      <TouchableOpacity
        activeOpacity={isPayable ? 0.7 : 1}
        disabled={!isPayable}
        style={[styles.cardOuter, { flex: flexValue, opacity: isPayable ? 1 : 0.6 }]}
        onPress={() =>
          navigation.navigate("BillPaymentScreen", {
            billType: billData?.id,
            amount: navAmount,
            billDate: billData?.data?.date || billData?.data?.bill_date || null,
            outstanding,
          })
        }
      >
        <View style={styles.topGroup}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>

          {showBal ? (
            /* FIX: adjustsFontSizeToFit + minimumFontScale added (Doc 1) */
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              ₹{rawAmount}
            </Text>
          ) : (
            <Text style={styles.backendMessage} numberOfLines={2}>
              {backendMessage}
            </Text>
          )}
        </View>

        <View style={styles.arrow}>
          <Ionicons
            name={isPayable ? "arrow-forward" : "lock-closed"}
            size={16}
            color="#FFF"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: HTML_THEME.background }]}>
      {outstanding.length === 0 && !loading ? (
        renderEmptyState()
      ) : (
        <>
          <Animated.FlatList
            data={pages}
            keyExtractor={(item) => item.id}
            horizontal
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 15 }}
            /* FIX: ItemSeparatorComponent added (matched Doc 1) */
            ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            renderItem={({ item }) => (
              <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
                {renderBillCard(item.bills[0])}
                {renderBillCard(item.bills[1])}
              </View>
            )}
          />

          {pages.length > 1 && (
            <View style={styles.dotsRow}>
              {pages.map((_, i) => {
                const range = [
                  (i - 1) * SNAP_INTERVAL,
                  i * SNAP_INTERVAL,
                  (i + 1) * SNAP_INTERVAL,
                ];
                return (
                  <Animated.View
                    key={i}
                    style={[styles.dot, {
                      width: scrollX.interpolate({
                        inputRange: range,
                        outputRange: [6, 18, 6],
                        extrapolate: "clamp",
                      }),
                      backgroundColor: scrollX.interpolate({
                        inputRange: range,
                        outputRange: [HTML_THEME.inactiveDot, HTML_THEME.accent, HTML_THEME.inactiveDot],
                        extrapolate: "clamp",
                      }),
                    }]}
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
};

export default ResidentProfile;

const styles = StyleSheet.create({
  safeArea: { paddingBottom: 50, paddingTop: 18 },
  pageContainer: { flexDirection: "row", gap: 10 },
  cardOuter: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "space-between",
    minHeight: 85,
  },
  topGroup: { alignItems: "flex-start" },
  label: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.8,           // FIX: was missing in Doc 2
    textTransform: "uppercase",
    marginBottom: 2,
  },
  amount: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,          // FIX: was missing in Doc 2
  },
  backendMessage: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "500",            // FIX: was missing in Doc 2
    marginTop: 8,
  },
  arrow: {
    position: "absolute",
    right: 12,
    bottom: 0,
    padding: 6,
    borderRadius: 12,             // FIX: was missing in Doc 2
    justifyContent: "center",     // FIX: was missing in Doc 2
    alignItems: "center",         // FIX: was missing in Doc 2
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  dot: { height: 5, borderRadius: 4, marginHorizontal: 3 },
});