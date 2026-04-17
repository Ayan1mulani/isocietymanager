import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Utils/ConetextApi";
import { ismServices } from "../../services/ismServices";
import { otherServices } from "../../services/otherServices";
import { hasPermission } from "../../Utils/PermissionHelper";
import BRAND from "../config";
import { useNavigation } from "@react-navigation/native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PAGE_WIDTH = SCREEN_WIDTH - 30; // Accounts for 10px padding on left/right

const ResidentProfile = () => {
  const navigation = useNavigation();
  const { setFlatNo, permissions } = usePermissions();
  const canViewDashboard =
    permissions && hasPermission(permissions, "RESDSB", "R");

  const COLORS = BRAND.COLORS;

  const [userDetails, setUserDetails] = useState({});
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const colors = {
    card: COLORS.card,
    text: COLORS.text,
    subText: COLORS.secondaryText,
    primary: COLORS.primary,
    primaryDark: COLORS.primaryDark,
    online: COLORS.success,
    border: COLORS.border,
  };

  const loadData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("userInfo");
      if (!storedUser) return;

      // 1. Fetch User Data, Bills, AND Bill Types all at once
      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(), // <-- Added this API call
      ]);

      setUserDetails(detailsRes?.data || {});

      if (detailsRes?.data?.flat_no) {
        setFlatNo(detailsRes?.data?.flat_no);
      }

      // 2. Map the real names from Bill Types to your Outstandings
      const rawOutstandings = billRes?.data || [];
      const allTypes = Array.from((typesRes?.data ?? typesRes ?? []).values());

      const outstandingsWithNames = rawOutstandings.map(bill => {
        // Find the matching bill type by ID
        const matchingType = allTypes.find(type => type.id === bill.id);
        return {
          ...bill,
          // Attach the real name, fallback to generic if not found
          realName: matchingType ? matchingType.name : "Outstanding"
        };
      });

      // 3. Save the updated list to state
      setOutstanding(outstandingsWithNames);

    } catch (err) {
      console.log("Profile load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || permissions === null) {
    return (
      <View style={[styles.safeArea, { backgroundColor: colors.background }]} />
    );
  }

  if (!canViewDashboard) {
    return null;
  }



  // ─── 1. GROUP DATA INTO "PAGES" ──────────────────────────────────────────
  const pages = [];

  // PAGE 1: Profile Card + First Bill (or empty space if no bills)
  pages.push({
    id: "page_0",
    type: "first_page",
    bill: outstanding.length > 0 ? outstanding[0] : null,
  });

  // SUBSEQUENT PAGES: 2 Bills per page
  for (let i = 1; i < outstanding.length; i += 2) {
    pages.push({
      id: `page_${i}`,
      type: "bill_page",
      bills: [
        outstanding[i],
        outstanding[i + 1] || null, // null if there's an odd number of bills
      ],
    });
  }

  // ─── 2. REUSABLE BILL CARD COMPONENT ──────────────────────────────────────
  const renderBillCard = (billData, flexValue = 1) => {
    // If no bill data exists (e.g., odd number of bills on last page), 
    // render an invisible placeholder to keep the flex layout perfect.
    if (!billData) {
      return <View style={{ flex: flexValue }} />;
    }

    const rawAmount = parseFloat(billData?.data?.balance || "0");

    const amount = Math.abs(rawAmount).toLocaleString("en-IN");

    const type = rawAmount < 0 ? "DR" : "CR";
    const amountColor = rawAmount < 0 ? "#EF4444" : "#10B981";
    const label = billData?.realName || "Outstanding";
    return (
      <View
        style={[
          styles.billCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flex: flexValue,
          },
        ]}
      >
        <View style={styles.billHeader}>
          <Text
            style={[styles.billLabel, { color: colors.subText }]}
            numberOfLines={2}
          >
            {label}
          </Text>
        </View>
        <Text style={[styles.billAmount, { color: colors.text }]}>
          ₹{amount}{" "}
          <Text style={{ color: rawAmount < 0 ? "#EF4444" : "#10B981", fontSize: 14, fontWeight: "600" }}>
            {type}
          </Text>
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("BillPaymentScreen", {
              billType: billData?.id,
              amount: parseFloat(billData?.data?.balance || "0"),
              outstanding: outstanding, // pass only this bill
            })
          }
          style={[styles.payButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.payButtonText}>Pay/Recharge</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  const Dots = () => {
    if (pages.length <= 1) return null; // Don't show dots if there's only 1 page

    return (
      <View style={styles.dotsRow}>
        {pages.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex ? colors.primary : colors.border,
                width: i === activeIndex ? 14 : 6,
              },
            ]}
          />
        ))}
      </View>
    );
  };
  // ─── 3. RENDER EACH PAGE ──────────────────────────────────────────────────
  const renderItem = ({ item }) => {

    // RENDER PAGE 1 (Profile + 1 Bill)
    if (item.type === "first_page") {
      return (
        <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
          {/* Profile Card gets flex: 2 */}
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <Text style={styles.greeting} numberOfLines={1}>
              Hi, {userDetails?.name || "Resident"}
            </Text>

            <View style={styles.profileRow}>
              <TouchableOpacity
                style={styles.avatarWrapper}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate("ResidentIdCard", { userDetails })
                }
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
                <View style={styles.badge}>
                  <Ionicons name="business" size={10} color="#fff" />
                  <Text style={styles.badgeText}>
                    Unit: {userDetails?.unit_id || "N/A"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Ionicons name="home" size={10} color="#fff" />
                  <Text style={styles.badgeText}>
                    Block: {userDetails?.societyId || "N/A"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Ionicons name="calendar" size={10} color="#fff" />
                  <Text style={styles.badgeText}>
                    Flat: {userDetails?.flat_no || "N/A"}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* First Bill Card gets flex: 1 */}
          {renderBillCard(item.bill, 1)}
        </View>
      );
    }

    // RENDER SUBSEQUENT PAGES (2 Bills split 50/50)
    return (
      <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
        {renderBillCard(item.bills[0], 1)}
        {renderBillCard(item.bills[1], 1)}
      </View>
    );
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View>
        <FlatList
          data={pages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          // ADD THIS FUNCTION:
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
            setActiveIndex(index);
          }}
        />
        {/* ADD THE DOTS HERE */}
        <Dots />
      </View>
    </View>
  );
};

export default ResidentProfile;

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: 10,
  },

  // Controls the layout of the cards within a single page
  pageContainer: {
    flexDirection: "row",
    gap: 12, // The gap between cards on the same page
  },

  // ── Profile Card Styles ──
  profileCard: {
    flex: 2,
    borderRadius: 20,
    elevation: 6,
    overflow: "hidden",
    paddingLeft: 10,
    minHeight: 120, // Keeps height strictly uniform
  },
  greeting: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingTop: 10,
  },
  profileRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  avatarWrapper: {
    marginRight: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
    paddingBottom: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    width: "90%",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "600",
    marginLeft: 6,
    paddingRight: 3,
  },

  // ── Bill Card Styles ──
  billCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "space-between",
    minHeight: 120, // Keeps height strictly uniform
  },
  // ── Dot Indicators ──
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 12, // Space between cards and dots
    marginBottom: -7,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  billHeader: {
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  billLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  billAmount: {
    fontSize: 18,
    fontWeight: "800",
    paddingHorizontal: 12,
    marginTop: 6,
    flexShrink: 1,
  },
  payButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: 12,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  payButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginRight: 6,
  },
});