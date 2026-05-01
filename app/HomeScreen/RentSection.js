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
              padding: 12,
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
  const scrollX = useRef(new Animated.Value(0)).current;

  // ✅ CORRECT: Check OUTSND permission for balance cards
  const canViewOutstandings = permissions && 
    typeof hasPermission === "function" && 
    (hasPermission(permissions, "OUTSND", "R") || hasPermission(permissions, "OUTSND", "READ"));

  // ✅ 1. The fixed calculation
  const canPayBill = permissions && 
    typeof hasPermission === "function" && 
    (hasPermission(permissions, "PMTREQ", "R") || hasPermission(permissions, "PMTREQ", "READ"));

  // ✅ 2. The console log to print it
  console.log('Can Pay Bill?:', canPayBill);

  useEffect(() => {
    if (permissions !== null && typeof onSetVisible === "function") {
      onSetVisible(!!canViewOutstandings);
    }
  }, [canViewOutstandings, permissions, onSetVisible]);

  const loadData = async () => {
    try {
      console.log('🔄 Loading ResidentProfile data...');
      
      const cached = await AsyncStorage.getItem("CACHED_OUTSTANDING");
      if (cached) {
        const cachedData = JSON.parse(cached);
        setOutstanding(cachedData);
        console.log('💾 Loaded cached outstanding:', cachedData.length, 'bills');
      }

      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(),
      ]);

      // ✅ CORRECT: Parse society configuration
      const societyRaw = JSON.parse(detailsRes?.data?.society?.data || '{}');
      const dashboardConfig = societyRaw?.resident_dashboard;
      
      console.log('🏠 Dashboard config:', dashboardConfig);
      
      // ✅ CORRECT: Handle show_outstanding configuration
      if (dashboardConfig && dashboardConfig.show_outstanding !== undefined) {
        const shouldShow = dashboardConfig.show_outstanding === 1 || 
                          dashboardConfig.show_outstanding === true || 
                          dashboardConfig.show_outstanding === "1" || 
                          String(dashboardConfig.show_outstanding).toLowerCase() === "true";
        
        console.log('🎯 show_outstanding value:', dashboardConfig.show_outstanding, '-> shouldShow:', shouldShow);
        
        if (!shouldShow && typeof onSetVisible === "function") {
          console.log('❌ Society config disables outstanding cards');
          onSetVisible(false);
          setLoading(false);
          return; // Stop everything, hide the card
        }
      }

      if (detailsRes?.data?.flat_no && typeof setFlatNo === "function") {
        setFlatNo(detailsRes.data.flat_no);
      }

      const rawTypes = typesRes?.data || [];
      const allTypes = Array.isArray(rawTypes) ? rawTypes : Object.values(rawTypes);
      setMasterBillTypes(allTypes);

      // ✅ CORRECT: Process all bills but mark which ones to hide balance for
      const allBills = billRes?.data || [];
      console.log('📊 Bills received:', allBills.length, 'total');

      const processedData = allBills.map((bill) => {
        const match = allTypes.find((ty) => ty.id === bill.id);
        return {
          ...bill,
          realName: match ? match.name : bill.name || t("Outstanding"),
          displayAmount: bill?.data?.amount ? Math.round(Math.abs(parseFloat(bill.data.amount))) : 0,
          // ✅ CORRECT: Keep all bills but track which ones should show balance
          shouldShowBalance: bill.show_bal === true || bill.show_bal === 1,
        };
      });

      setOutstanding(processedData);
      await AsyncStorage.setItem("CACHED_OUTSTANDING", JSON.stringify(processedData));
      
      console.log('✅ Final processed bills:', processedData.length);
      
      // ✅ CORRECT: Only hide component if NO bills at all (not based on show_bal)
      if (processedData.length === 0 && typeof onSetVisible === "function") {
        console.log('⚠️ No bills found, hiding component');
        onSetVisible(false);
      }
      
    } catch (err) {
      console.error("❌ Dashboard Card Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  if (permissions === null) return <ResidentSkeleton />;
  if (!canViewOutstandings) {
    console.log('❌ No OUTSND permission');
    return null;
  }
  if (loading && outstanding.length === 0) return <ResidentSkeleton />;
  // ✅ FIXED: Don't return null if we have bills (even with show_bal: false)
  // Only return null if truly no bills at all
  if (outstanding.length === 0) {
    console.log('❌ No outstanding bills to display');
    return null;
  }

  const pages = [];
  for (let i = 0; i < outstanding.length; i += 2) {
    pages.push({ id: `page_${i}`, bills: [outstanding[i], outstanding[i + 1] ?? null] });
  }

  /* ─── Bill Card ─────────────────────────────────────────────────────── */
  const renderBillCard = (billData, flexValue = 1) => {
    if (!billData) return <View style={{ flex: flexValue }} />;

    const label = billData?.realName || billData?.name;
    const shouldShowBalance = billData?.shouldShowBalance;
    const backendMessage = billData?.message || t("No balance data found.");
    const rawAmount = billData.displayAmount || 0;
    const navAmount = rawAmount === 0 ? 1 : rawAmount;
    
    // ✅ CORRECT: Can pay if has permission (regardless of show_bal)
    const isPayable = !!canPayBill;

    console.log('💳 Bill card:', {
      label,
      shouldShowBalance,
      rawAmount,
      message: backendMessage,
      isPayable
    });

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
            allBillTypes: masterBillTypes,
          })
        }
      >
        <View style={styles.topGroup}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
          {/* ✅ CORRECT: Show amount if shouldShowBalance is true, otherwise show dash */}
          {shouldShowBalance ? (
            <Text
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              ₹{rawAmount}
            </Text>
          ) : (
            <Text style={styles.amount} numberOfLines={1}>
             ₹ --
            </Text>
          )}
          {/* ✅ CORRECT: Show message below amount/dash */}
          {backendMessage && (
            <Text style={styles.backendMessage} numberOfLines={1}>
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
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  amount: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  backendMessage: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 8,
  },
  arrow: {
    position: "absolute",
    right: 12,
    bottom: 5,
    padding: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  dot: { height: 5, borderRadius: 4, marginHorizontal: 3 },
});