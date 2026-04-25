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
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";

const StaffSection = ({ refreshTrigger }) => {
  const navigation = useNavigation();
  const { nightMode } = usePermissions();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── Professional Theme Palette ──
  const theme = {
    background: nightMode ? "#111827" : "#FFFFFF",
    cardBg: nightMode ? "#1F2937" : "#FFFFFF",
    cardBorder: nightMode ? "#374151" : "#F3F4F6",
    textMain: nightMode ? "#F9FAFB" : "#1F2937",
    textSub: nightMode ? "#9CA3AF" : "#6B7280",
    iconBtnBg: nightMode ? "#374151" : "#F3F4F6",

    // Classic Enterprise Colors: Blue and Grey
  inColor: "#10B981" ,  // Green (IN)
  outColor: "#8B5CF6"  // Purple (OUT)
  };

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
    const statusColor = isPresent ? theme.inColor : theme.outColor;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("MyStaffDetailScreen", { staff: item })}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, { backgroundColor: nightMode ? "#374151" : "#F9FAFB" }]}>
            {item.image ? (
              <Image
                source={{ uri: item.image }}
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons name="person" size={22} color={theme.textSub} />
            )}
          </View>

          {/* Professional Cutout Badge */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: statusColor,
                borderColor: theme.cardBg
              }
            ]}
          >
            <Text style={styles.badgeText}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text
            style={[styles.name, { color: theme.textMain }]}
            numberOfLines={2}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.85}
          >
            {item.name?.trim() || "Unknown"}
          </Text>

          <Text style={[styles.category, { color: theme.textSub }]} numberOfLines={1}>
            {item.designation || item.category?.toUpperCase() || "No Role"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ margin: 10, marginTop: 20 }} color="#2563EB" />;
  }

  if (staff.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="people"
            size={20}
            color={theme.textMain}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.headerText, { color: theme.textMain }]}>Staff</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.iconBtnBg }]}
          onPress={() => {
            navigation.navigate("StaffScreen", { tabIndex: 1 });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={theme.textMain} />
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
  container: {
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  listContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingBottom: 12,
  },

  /* ── Clean, Professional Card ── */
  card: {
    width: 110,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",

    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  /* ── Avatar ── */
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  /* ── Cutout Badge ── */
  badge: {
    position: 'absolute',
    bottom: -15,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    minWidth: 36,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  /* ── Typography ── */
  textContainer: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  category: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});