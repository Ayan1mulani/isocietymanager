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
// ── Fixed Width for 20px margins ──
const PAGE_WIDTH = SCREEN_WIDTH - 40;

const ResidentProfile = () => {
  const navigation = useNavigation();
  const { setFlatNo, permissions } = usePermissions();

  const canViewDashboard = permissions && hasPermission(permissions, "RESDSB", "R");

  // ── NEW: Check Payment Permission ──
  const canPayBill = permissions && hasPermission(permissions, "PMTREQ", "R");

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

      const [detailsRes, billRes, typesRes] = await Promise.all([
        ismServices.getUserProfileData(),
        otherServices.getOutStandings(),
        ismServices.getBillTypes(),
      ]);

      setUserDetails(detailsRes?.data || {});

      if (detailsRes?.data?.flat_no) {
        setFlatNo(detailsRes?.data?.flat_no);
      }

      const data = detailsRes?.data || {};

      if (typeof data.id === "string") {
        try {
          data.id = JSON.parse(data.id);
        } catch (e) {
          console.log("ID parse error", e);
        }
      }

      setUserDetails(data);

      const rawOutstandings = billRes?.data || [];
      const allTypes = Array.from((typesRes?.data ?? typesRes ?? []).values());

      const outstandingsWithNames = rawOutstandings.map(bill => {
        const matchingType = allTypes.find(type => type.id === bill.id);
        return {
          ...bill,
          realName: matchingType ? matchingType.name : "Outstanding"
        };
      });

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

  const pages = [];

  pages.push({
    id: "page_0",
    type: "first_page",
    bill: outstanding.length > 0 ? outstanding[0] : null,
  });

  for (let i = 1; i < outstanding.length; i += 2) {
    pages.push({
      id: `page_${i}`,
      type: "bill_page",
      bills: [
        outstanding[i],
        outstanding[i + 1] || null,
      ],
    });
  }

  const renderBillCard = (billData, flexValue = 1) => {
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
          <Text style={{ color: amountColor, fontSize: 13, fontWeight: "600" }}>
            {type}
          </Text>
        </Text>

        {/* ── Updated Pay Button Logic ── */}
        <TouchableOpacity
          disabled={!canPayBill}
          onPress={() =>
            navigation.navigate("BillPaymentScreen", {
              billType: billData?.id,
              amount: parseFloat(billData?.data?.balance || "0"),
              outstanding: outstanding,
            })
          }
          style={[
            styles.payButton,
            { backgroundColor: canPayBill ? colors.primary : "#9CA3AF" }
          ]}
        >
          <Text style={styles.payButtonText}>
            {canPayBill ? "Pay/Recharge" : "Not Permitted"}
          </Text>
          {canPayBill && <Ionicons name="arrow-forward" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    );
  };

  const Dots = () => {
    if (pages.length <= 1) return null;

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

  const renderItem = ({ item }) => {
    if (item.type === "first_page") {
      return (
        <View style={[styles.pageContainer, { width: PAGE_WIDTH }]}>
          <LinearGradient
            colors={[colors.primaryDark, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <Text style={styles.greeting} numberOfLines={1}>
              Hii, {userDetails?.name || "Resident"}
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
                  <Text style={styles.badgeText} numberOfLines={1}>
                    Society:  {userDetails?.society_name || "N/A"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Ionicons name="home" size={10} color="#fff" />
                  <Text style={styles.badgeText} numberOfLines={1}>
                    Society id: {userDetails?.societyId || "N/A"}
                  </Text>
                </View>

                <View style={styles.badge}>
                  <Ionicons name="calendar" size={10} color="#fff" />
                  <Text style={styles.badgeText} numberOfLines={1}>
                    Flat: {userDetails?.id?.flat_no || "N/A"}
                  </Text>
                </View>
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
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / PAGE_WIDTH);
            setActiveIndex(index);
          }}
        />
        <Dots />
      </View>
    </View>
  );
};

export default ResidentProfile;

const styles = StyleSheet.create({
  safeArea: {
    marginHorizontal: 15,
    paddingBottom: 5,
  },

  pageContainer: {
    flexDirection: "row",
    gap: 12,
  },

  profileCard: {
    flex: 2,
    borderRadius: 20,
    elevation: 4,
    overflow: "hidden",
    paddingLeft: 10,
    paddingRight: 10,
    minHeight: 120,
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
    width: "100%", // Updated width
  },
  badgeText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "600",
    marginLeft: 6,
    paddingRight: 3,
    flexShrink: 1, // Added flexShrink
  },

  billCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "space-between",
    minHeight: 120,
    elevation: 1,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
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