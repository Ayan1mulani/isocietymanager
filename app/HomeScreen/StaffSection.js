import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { otherServices } from "../../services/otherServices";

const StaffSection = ({ refreshTrigger }) => {
  const navigation = useNavigation();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const res = await otherServices.getAllStaffs();

      if (res?.data) {
        setStaff(res.data);
      }
    } catch (e) {
      console.log("❌ Staff API error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, [refreshTrigger]);

  const renderItem = ({ item }) => {
    const isPresent = item.status?.toUpperCase() === "PRESENT" || item.status?.toUpperCase() !== "ABSENT";
    const statusText = isPresent ? "IN" : "OUT";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("MyStaffDetailScreen", { staff: item })}
      >
        {/* Left colored bar has been completely removed */}
        
        <View style={styles.content}>
          <View style={styles.avatar}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={24} color="#888" />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text
              style={styles.name}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {item.name?.trim() || "Unknown"}
            </Text>

            <Text style={styles.category} numberOfLines={1}>
              {item.designation || item.category?.toUpperCase() || "No Role"}
            </Text>

            {/* ── New Blue / Grey Status Badge ── */}
            <View style={[styles.badge, isPresent ? styles.badgeIn : styles.badgeOut]}>
              <Text style={[styles.badgeText, isPresent ? styles.badgeTextIn : styles.badgeTextOut]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ margin: 10 }} />;
  }

  return (
    <View>
      {/* ── Header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="people"
            size={20}
            color="#374151"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerText}>Staff</Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            navigation.navigate("StaffScreen", { tabIndex: 1 });
          }}
        >
          <Ionicons name="add" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={staff}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default StaffSection;

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Restored Proper Full-Bleed Spacing ──
  listContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 10,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginRight: 15, // Using marginRight so the scroll clips off-screen properly
    borderRadius: 12,
    elevation: 1,
    overflow: "hidden",
    width: 200,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#212529",
  },
  category: {
    fontSize: 12,
    color: "#6C757D",
    marginTop: 2,
  },

  // ── New Badge Styles ──
  badge: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start", // Keeps the badge from stretching across the whole card
  },
  badgeIn: {
    backgroundColor: "#E0F2FE", // Light blue background
  },
  badgeOut: {
    backgroundColor: "#F3F4F6", // Light grey background
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  badgeTextIn: {
    color: "#0284C7", // Solid blue text
  },
  badgeTextOut: {
    color: "#6B7280", // Solid grey text
  },
});