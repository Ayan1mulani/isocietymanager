import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from 'react-native-linear-gradient'
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePermissions } from "../../Utils/ConetextApi";
import { ismServices } from "../../services/ismServices";
import { otherServices } from "../../services/otherServices";
import { hasPermission } from "../../Utils/PermissionHelper";
import BRAND from "../config";
import { useNavigation } from "@react-navigation/native";

const ResidentProfile = () => {
  const navigation = useNavigation();
  const {setFlatNo, permissions } = usePermissions();
  const canViewDashboard =
    permissions && hasPermission(permissions, "RESDSB", "R");
  console.log("Permissions:", permissions);
  console.log("Can View Dashboard:", canViewDashboard);
  const COLORS = BRAND.COLORS;

  const [userDetails, setUserDetails] = useState({});
  const [outstanding, setOutstanding] = useState([]);
  const [loading, setLoading] = useState(true);
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

      const [detailsRes, billRes] = await Promise.all([
        ismServices.getUserDetails(),
        otherServices.getOutStandings()
      ]);

      setUserDetails(detailsRes || {});

      if (detailsRes?.flat_no) {
        setFlatNo(detailsRes.flat_no);
      }

      setOutstanding(billRes?.data || []);

    } catch (err) {

      console.log("Profile load error", err);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Wait to render the actual component until BOTH the APIs are done AND permissions are loaded
  if (loading || permissions === null) {
    return <View style={[styles.safeArea, { backgroundColor: colors.background }]} />;
  }

  const totalOutstanding = outstanding.reduce(
    (sum, item) => sum + parseFloat(item?.data?.balance || '0'),
    0
  );
  if (!canViewDashboard) {
    return null;
  }

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>

        {/* PROFILE CARD */}
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
                navigation.navigate("ResidentIdCard", {
                  userDetails, // pass full data if needed
                })
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
                < Ionicons name="business" size={10} color="#fff" />
                <Text style={styles.badgeText} numberOfLines={1}>
                  {userDetails?.tower || "N/A"}
                </Text>
              </View>

              <View style={styles.badge}>
                < Ionicons name="home" size={10} color="#fff" />
                <Text style={styles.badgeText} numberOfLines={1}>
                  {userDetails?.flat_no || "N/A"}
                </Text>
              </View>

              <View style={styles.badge}>
                < Ionicons name="calendar" size={10} color="#fff" />
                <Text style={styles.badgeText} numberOfLines={1}>
                  {userDetails?.fc_name || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* BILL CARD */}
        <View
          style={[
            styles.billCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.billHeader}>
            <Text
              style={[styles.billLabel, { color: colors.subText }]}
              numberOfLines={2}
            >
              Total Outstanding
            </Text>
          </View>

          <Text
            style={[styles.billAmount, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ₹{totalOutstanding.toLocaleString("en-IN")}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate("BillPaymentScreen")}
            style={[styles.payButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.payButtonText}>Pay Now</Text>
            < Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );
};

export default ResidentProfile;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 5,
    marginTop: 5,

  },

  container: {
    flexDirection: "row",
    gap: 12,

  },

  profileCard: {
    flex: 2,
    borderRadius: 20,
    elevation: 6,
    overflow: "hidden",
    paddingLeft: 10,
  },

  greeting: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingTop: 10

  },

  profileRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  avatarWrapper: {
    marginRight: 10,
  },

  avatar: {
    width: 70,
    height: 70,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarWrapper: {
  marginRight: 10,
  borderRadius: 14,
  overflow: "hidden",
},

  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#fff",
  },

  profileDetails: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
    paddingBottom: 10
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    width: "90%"

  },

  badgeText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "600",
    marginLeft: 6,
    paddingRight: 3

  },

  billCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "space-between",
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
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
});