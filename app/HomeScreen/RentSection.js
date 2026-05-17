import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

// ─── 1. GLOBAL CONSTANTS ───
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 👇 Dynamic widths
const NORMAL_PAGE_WIDTH = SCREEN_WIDTH - 58; // Allows 3rd card to peek
const SINGLE_PAGE_WIDTH = SCREEN_WIDTH - 30; // Takes full width for a single card
const SPACING = 12;
const SHIMMER_TRAVEL = SCREEN_WIDTH * 2;

const getOutstandingCacheKey = (userId) => `@outstanding_cache_${userId}`;

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

const formatDate = (dateString) => {
  if (!dateString) return "--";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${monthNames[d.getMonth()]}`;
};

// ─── 2. SUB-COMPONENTS ───
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
    <View style={[{ width: w, height: h, backgroundColor: HTML_THEME.shimBase, overflow: "hidden", borderRadius: 4 }, style]}>
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

const AnimatedDots = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.Text style={[styles.refreshLoading, { opacity }]}>•••</Animated.Text>;
};

const ResidentSkeleton = () => (
  <View style={[styles.safeArea, { backgroundColor: HTML_THEME.background }]}>
    {/* Skeleton defaults to NORMAL_PAGE_WIDTH */}
    <View style={[styles.pageContainer, { width: NORMAL_PAGE_WIDTH, marginLeft: 15 }]}>
      {[1, 2].map((key) => (
        <View key={key} style={[styles.cardOuter, { flex: 1, backgroundColor: HTML_THEME.card, borderColor: HTML_THEME.cardBorder }]}>
          <ShimmerBox w="60%" h={10} style={{ marginBottom: 8 }} />
          <ShimmerBox w="40%" h={24} style={{ borderRadius: 4, marginBottom: 8 }} />
          <ShimmerBox w="30%" h={14} style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
    <View style={styles.dotsRow}>
      <View style={{ height: 5, width: 18, borderRadius: 4, marginHorizontal: 3, backgroundColor: HTML_THEME.inactiveDot }} />
      <View style={{ height: 5, width: 5, borderRadius: 4, marginHorizontal: 3, backgroundColor: HTML_THEME.inactiveDot }} />
    </View>
  </View>
);

// ─── 3. MAIN COMPONENT ───
const ResidentProfile = ({ refreshTrigger, onSetVisible }) => {
  const navigation = useNavigation();
  const { setFlatNo, permissions } = usePermissions();
  const { t } = useTranslation();
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterBillTypes, setMasterBillTypes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [refreshingCardId, setRefreshingCardId] = useState(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // 👇 DYNAMIC CALCULATIONS BASED ON DATA
  const isOnlyOneTotal = outstanding.length === 1;
  const PAGE_WIDTH = isOnlyOneTotal ? SINGLE_PAGE_WIDTH : NORMAL_PAGE_WIDTH;
  const SNAP_INTERVAL_DYNAMIC = PAGE_WIDTH + SPACING;

  useEffect(() => {
    const loadUser = async () => {
      const raw = await AsyncStorage.getItem("userInfo");
      const user = raw ? JSON.parse(raw) : null;
      setUserId(user?.id || user?.user_id || "default");
    };
    loadUser();
  }, []);

  const canViewOutstandings =
    permissions &&
    typeof hasPermission === "function" &&
    (hasPermission(permissions, "OUTSND", "R") || hasPermission(permissions, "OUTSND", "READ"));

  const canPayBill =
    permissions &&
    typeof hasPermission === "function" &&
    (hasPermission(permissions, "PMTREQ", "R") || hasPermission(permissions, "PMTREQ", "READ"));

  useEffect(() => {
    if (permissions !== null && typeof onSetVisible === "function") {
      onSetVisible(!!canViewOutstandings);
    }
  }, [canViewOutstandings, permissions, onSetVisible]);

  const loadData = async () => {
    if (!userId) return;
    const CACHE_KEY = getOutstandingCacheKey(userId);
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) setOutstanding(JSON.parse(cached));

      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(),
      ]);

      const societyRaw = JSON.parse(detailsRes?.data?.society?.data || "{}");
      const dashboardConfig = societyRaw?.resident_dashboard;

      if (dashboardConfig && dashboardConfig.show_outstanding !== undefined) {
        const shouldShow =
          dashboardConfig.show_outstanding === 1 ||
          dashboardConfig.show_outstanding === true ||
          dashboardConfig.show_outstanding === "1" ||
          String(dashboardConfig.show_outstanding).toLowerCase() === "true";

        if (!shouldShow && typeof onSetVisible === "function") {
          onSetVisible(false);
          setLoading(false);
          return;
        }
      }

      if (detailsRes?.data?.flat_no && typeof setFlatNo === "function") {
        setFlatNo(detailsRes.data.flat_no);
      }

      const rawTypes = typesRes?.data || [];
      const allTypes = Array.isArray(rawTypes) ? rawTypes : Object.values(rawTypes);
      setMasterBillTypes(allTypes);

      const allBills = billRes?.data || [];
      const processedData = allBills.map((bill) => {
        const match = allTypes.find((ty) => ty.id === bill.id);
        return {
          ...bill,
          realName: match ? match.name : bill.name || t("Outstanding"),
          displayAmount: bill?.data?.amount ? Math.round(Math.abs(parseFloat(bill.data.amount))) : 0,
          shouldShowBalance: bill.show_bal === true || bill.show_bal === 1,
        };
      });

      setOutstanding(processedData);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(processedData));

      if (processedData.length === 0 && typeof onSetVisible === "function") {
        onSetVisible(false);
      }
    } catch (err) {
      console.error("❌ Dashboard Card Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) loadData();
  }, [refreshTrigger, userId]);

  if (permissions === null) return <ResidentSkeleton />;
  if (!canViewOutstandings) return null;
  if (loading && outstanding.length === 0) return <ResidentSkeleton />;
  if (outstanding.length === 0) return null;

  const pages = [];
  for (let i = 0; i < outstanding.length; i += 2) {
    pages.push({ id: `page_${i}`, bills: [outstanding[i], outstanding[i + 1] ?? null] });
  }

  const renderBillCard = (billData, centerCard = false) => {
    if (!billData) return null;

    const label = billData?.realName || billData?.name;
    const shouldShowBalance = billData?.shouldShowBalance;
    const rawAmount = billData.displayAmount || 0;
    const navAmount = rawAmount === 0 ? 1 : rawAmount;
    const isPayable = !!canPayBill;
    const isRefreshing = refreshingCardId === billData?.id;
    const displayDate = formatDate(billData?.data?.bill_date || billData?.data?.date);

    const handleRefresh = async () => {
      try {
        setRefreshingCardId(billData?.id);
        const freshRes = await ismServices.getRentBalance(billData?.id);

        if (
          freshRes?.status === "success" &&
          freshRes?.data &&
          freshRes?.data?.bill_type &&
          Number(freshRes.data.bill_type) === Number(billData?.id)
        ) {
          const freshBalance = freshRes.data;
          setOutstanding((prev) =>
            prev.map((item) => {
              if (Number(item.id) === Number(freshBalance.bill_type)) {
                return {
                  ...item,
                  data: freshBalance,
                  displayAmount: Math.round(Math.abs(parseFloat(freshBalance?.amount || 0))),
                  message: freshRes?.message || item.message,
                  shouldShowBalance: true,
                };
              }
              return item;
            })
          );
        }
      } catch (e) {
        console.log("Refresh rent balance error:", e);
      } finally {
        setRefreshingCardId(null);
      }
    };

    return (
      <TouchableOpacity
        activeOpacity={isPayable ? 0.7 : 1}
        disabled={!isPayable}
        style={[
          styles.cardOuter,
          {
            flex: 1,
            width: centerCard ? PAGE_WIDTH - 10 : undefined,
            maxWidth: centerCard ? PAGE_WIDTH - 10 : undefined,
            opacity: isPayable ? 1 : 0.6,
            alignSelf: centerCard ? 'center' : 'auto',
          }
        ]}
        onPress={() =>
          navigation.navigate("BillPaymentScreen", {
            billType: billData?.id,
            amount: navAmount,
            billDate: billData?.data?.date || billData?.data?.bill_date || null,
            outstanding,
            allBillTypes: masterBillTypes,
          })
        }
      >
        <View style={[styles.topGroup, centerCard && styles.singleCardContent]}>
          <View style={styles.topRow}>
            <Text style={styles.billDate} numberOfLines={1}>{displayDate}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRefresh}
              style={styles.refreshBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, centerCard && styles.singleCardLabel]} numberOfLines={1}>
            {label}
          </Text>

          <View style={[styles.amountRow, centerCard && styles.singleAmountRow]}>
            {isRefreshing ? (
              <AnimatedDots />
            ) : shouldShowBalance ? (
              <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                ₹{rawAmount}
              </Text>
            ) : (
              <Text style={styles.amount} numberOfLines={1}>₹ 0</Text>
            )}

            <View style={styles.arrowInline}>
              <Ionicons name={isPayable ? "arrow-forward" : "lock-closed"} size={15} color="#FFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: HTML_THEME.background }]}>
      <Animated.FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={SNAP_INTERVAL_DYNAMIC} // 👇 Updated to use the dynamic interval
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
        alwaysBounceHorizontal={true} 
        overScrollMode="always"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => {
          const hasSecondCard = !!item.bills[1];

          return (
            <View
              style={[
                styles.pageContainer,
                {
                  width: PAGE_WIDTH, // 👇 Dynamically uses normal or single width
                  justifyContent: isOnlyOneTotal ? "center" : "flex-start",
                  alignItems: isOnlyOneTotal ? 'center' : 'stretch',
                },
              ]}
            >
              {renderBillCard(item.bills[0], isOnlyOneTotal)}

              {hasSecondCard ? (
                renderBillCard(item.bills[1], false)
              ) : (
                !isOnlyOneTotal && <View style={{ flex: 1 }} />
              )}
            </View>
          );
        }}
      />
      {pages.length > 1 && (
        <View style={styles.dotsRow}>
          {pages.map((_, i) => {
            // 👇 Pagination dot animation now perfectly respects dynamic interval 
            const range = [
              (i - 1) * SNAP_INTERVAL_DYNAMIC,
              i * SNAP_INTERVAL_DYNAMIC,
              (i + 1) * SNAP_INTERVAL_DYNAMIC,
            ];
            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
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
                  },
                ]}
              />
            );
          })}
        </View>
      )}
    </View>
  );
};

export default ResidentProfile;

// ─── 4. STYLES ───
const styles = StyleSheet.create({
  safeArea: { paddingBottom: 45, paddingTop: 10 },
  pageContainer: { flexDirection: "row", gap: 10 },
  cardOuter: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    justifyContent: "space-between",
    minHeight: 50,
  },
  topGroup: { width: "100%" },
  singleCardContent: { alignItems: 'center', justifyContent: 'center' },
  refreshBtn: {
    width: 24,
    height: 24,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginTop:0,
    marginRight: -2,
  },
  topRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  billDate: { color: "rgba(255, 255, 255, 0.86)", fontSize: 10, flex: 1, marginRight: 8 },
  label: { color: "rgba(255, 255, 255, 0.86)", fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 0 },
  singleCardLabel: { textAlign: 'center', fontSize: 10, marginTop: 4, marginBottom: 2, lineHeight: 12 },
  amount: { color: "#FFFFFF", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  refreshLoading: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", letterSpacing: 3 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    position: 'relative',
    marginTop: 2,
  },
  singleAmountRow: { justifyContent: 'center' },
  arrowInline: {
    position: 'absolute',
    right: 3,
    bottom:0,
    alignSelf: 'center',
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 },
  dot: { height: 5, borderRadius: 4, marginHorizontal: 3 },
});