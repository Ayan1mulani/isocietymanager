import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
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

const getOutstandingCacheKey = (userId) => `@outstanding_cache_${userId}`;

const HTML_THEME = {
  background: "#F27B22",
  card: "#ffff",
  cardBorder: "rgb(255, 255, 255)",
  text: "#000000",
  subText: "rgba(0, 0, 0, 0.6)",
  accent: "#2563EB",
  shimBase: "rgba(255, 255, 255, 0.05)",
  shimShine: "rgba(255, 255, 255, 0.15)",
  inactiveDot: "rgba(255, 255, 255, 0.3)",
};

const formatDate = (dateString) => {
  if (!dateString) return "--";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate();
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${day} ${monthNames[d.getMonth()]}`;
};

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
    <View
      style={[
        {
          width: w,
          height: h,
          backgroundColor: HTML_THEME.shimBase,
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}
      >
        <LinearGradient
          colors={[
            HTML_THEME.shimBase,
            HTML_THEME.shimShine,
            HTML_THEME.shimShine,
            HTML_THEME.shimBase,
          ]}
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
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.refreshLoading, { opacity }]}>•••</Animated.Text>
  );
};

const ResidentSkeleton = () => (
  <View style={[styles.safeArea, { backgroundColor: HTML_THEME.background }]}>
    <View style={[styles.pageContainer, { width: PAGE_WIDTH, marginLeft: 15 }]}>
      {[1, 2].map((key) => (
        <View
          key={key}
          style={[
            styles.cardOuter,
            {
              flex: 1,
              backgroundColor: HTML_THEME.card,
              borderColor: HTML_THEME.cardBorder,
            },
          ]}
        >
          <ShimmerBox w="60%" h={10} style={{ marginBottom: 8 }} />
          <ShimmerBox w="40%" h={24} style={{ borderRadius: 4, marginBottom: 8 }} />
          <ShimmerBox w="30%" h={14} style={{ borderRadius: 12 }} />
        </View>
      ))}
    </View>
    <View style={styles.dotsRow}>
      <View
        style={{
          height: 5,
          width: 18,
          borderRadius: 4,
          marginHorizontal: 3,
          backgroundColor: HTML_THEME.inactiveDot,
        }}
      />
      <View
        style={{
          height: 5,
          width: 5,
          borderRadius: 4,
          marginHorizontal: 3,
          backgroundColor: HTML_THEME.inactiveDot,
        }}
      />
    </View>
  </View>
);

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

  // ✅ Strictly check if there is only 1 bill overall
  const isOnlyOneTotal = outstanding.length === 1;

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
    (hasPermission(permissions, "OUTSND", "R") ||
      hasPermission(permissions, "OUTSND", "READ"));

  const canPayBill =
    permissions &&
    typeof hasPermission === "function" &&
    (hasPermission(permissions, "PMTREQ", "R") ||
      hasPermission(permissions, "PMTREQ", "READ"));

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
      if (cached) {
        setOutstanding(JSON.parse(cached));
      }

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
          displayAmount: bill?.data?.amount
            ? Math.round(Math.abs(parseFloat(bill.data.amount)))
            : 0,
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

  // ✅ Updated to cleanly swap between single centered item vs multiple left-aligned items
  const renderBillCard = (billData, isSingleItem = false) => {
    if (!billData) return null;

    const exactCardWidth = PAGE_WIDTH * 0.48;

    const label = billData?.realName || billData?.name;
    const shouldShowBalance = billData?.shouldShowBalance;
    const rawBackendMessage = billData?.message || t("No balance data found.");
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
                  displayAmount: Math.round(
                    Math.abs(parseFloat(freshBalance?.amount || 0))
                  ),
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
            flex: isSingleItem ? 1 : 0,
            width: isSingleItem ? '100%' : exactCardWidth,
            maxWidth: isSingleItem ? '100%' : exactCardWidth,
            alignSelf: isSingleItem ? 'center' : 'auto',
            // If single item, ensure card is fully white (as requested)
            backgroundColor: isSingleItem ? "#FFFFFF" : HTML_THEME.card,
            opacity: isPayable ? 1 : 0.85,
            justifyContent: isSingleItem ? "center" : "space-between",
            shadowColor: isSingleItem ? '#000' : 'transparent',
            shadowOffset: isSingleItem ? { width: 0, height: 3 } : { width: 0, height: 0 },
            shadowOpacity: isSingleItem ? 0.12 : 0,
            shadowRadius: isSingleItem ? 8 : 0,
            elevation: isSingleItem ? 0.7 : 0,
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
        {isSingleItem ? (
          // ✅ CENTERED LAYOUT FOR SINGLE ITEM
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRefresh}
              style={styles.refreshBtnAbsolute}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="refresh-outline" size={15} color="#000000" />
            </TouchableOpacity>

            <View style={styles.centeredDetailsGroup}>
              <Text style={styles.billDateCentered} numberOfLines={1}>
                {displayDate}
              </Text>
              <Text style={styles.labelCentered} numberOfLines={1}>
                {label}
              </Text>
              <View style={styles.amountRowCentered}>
                {isRefreshing ? (
                  <AnimatedDots />
                ) : shouldShowBalance ? (
                  <Text style={styles.amountCentered} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    ₹{rawAmount}
                  </Text>
                ) : (
                  <Text style={styles.amountCentered} numberOfLines={1}>₹ 0</Text>
                )}
                <View style={styles.arrowInlineCentered}>
                  <Ionicons name={isPayable ? "arrow-forward" : "lock-closed"} size={14} color="#000" />
                </View>
              </View>
            </View>
          </>
        ) : (
          // ✅ ORIGINAL LEFT-ALIGNED LAYOUT FOR MULTIPLE ITEMS
          <View style={styles.topGroup}>
            <View style={styles.topRow}>
              <Text style={styles.billDate} numberOfLines={1}>
                {displayDate}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleRefresh}
                style={styles.refreshBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="refresh-outline" size={15} color="#000000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            <View style={styles.amountRow}>
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
                <Ionicons name={isPayable ? "arrow-forward" : "lock-closed"} size={14} color="#000" />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    // ✅ Safe Area background strictly becomes white only when it is a single item
    <View style={[styles.safeArea, { backgroundColor: isOnlyOneTotal ? "#FFFFFF" : HTML_THEME.background }]}>
      <Animated.FlatList
        data={pages}
        keyExtractor={(item) => item.id}
        horizontal
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
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
                  width: PAGE_WIDTH,
                  justifyContent: isOnlyOneTotal ? "center" : "flex-start",
                  paddingHorizontal: isOnlyOneTotal ? 16 : 0,
                },
              ]}
            >
              {renderBillCard(item.bills[0], isOnlyOneTotal)}

              {/* Render second card normally */}
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
            const range = [
              (i - 1) * SNAP_INTERVAL,
              i * SNAP_INTERVAL,
              (i + 1) * SNAP_INTERVAL,
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
                      outputRange: [
                        HTML_THEME.inactiveDot,
                        HTML_THEME.accent,
                        HTML_THEME.inactiveDot,
                      ],
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

const styles = StyleSheet.create({
  safeArea: { paddingBottom: 45, paddingTop: 10 },
  pageContainer: { flexDirection: "row", gap: 10 },
  cardOuter: {
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    minHeight: 70,
    position: "relative",
  },

  // ORIGINAL LAYOUT STYLES
  topGroup: { width: "100%" },
  refreshBtn: {
    width: 27,
    height: 27,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginTop: -5,
    marginRight: -2,
  },
  topRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  billDate: { color: "rgba(0, 0, 0, 0.7)", fontSize: 10, flex: 1, marginRight: 8 },
  label: { color: "#F27B22", fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 0 },
  amount: { color: "#000000", fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  arrowInline: { marginLeft: 8, justifyContent: "center", alignItems: "center" },

  // CENTERED LAYOUT STYLES (Used when single item)
  refreshBtnAbsolute: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 27,
    height: 27,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    zIndex: 10,
  },
  centeredDetailsGroup: { width: "100%", alignItems: "center", justifyContent: "center" },
  billDateCentered: { color: "rgba(0, 0, 0, 0.7)", fontSize: 10, textAlign: "center", marginBottom: 4 },
  labelCentered: { color: "#F27B22", fontSize: 9.5, letterSpacing: 0.8, textTransform: "uppercase", textAlign: "center", marginBottom: 2 },
  amountRowCentered: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 2 },
  amountCentered: { color: "#000000", fontSize: 20, fontWeight: "700", letterSpacing: -0.5, textAlign: "center" },
  arrowInlineCentered: { marginLeft: 8, justifyContent: "center", alignItems: "center" },

  // GLOBAL STYLES
  refreshLoading: { color: "#000000", fontSize: 20, fontWeight: "700", letterSpacing: 3 },
  dotsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10 },
  dot: { height: 5, borderRadius: 4, marginHorizontal: 3 },
});