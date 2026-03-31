import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { otherServices } from "../../services/otherServices";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import AppCard from "../components/AppCard";
import AppSearchBar from "../components/AppSearchBar";
import BRAND from '../config'
import EmptyState from "../components/EmptyState";

const COLORS = {
  primary: BRAND.COLORS.primary,
  light: {
    background: "#FFFFFF",
    surface: "#ffffff",
    text: "#212529",
    textSecondary: "#6C757D",
    border: "#DEE2E6",
  },
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#9E9E9E",
    border: "#2C2C2C",
  },
};

const MyStaffScreen = ({ nightMode }) => {
  const navigation = useNavigation();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const theme = nightMode ? COLORS.dark : COLORS.light;
  const styles = useMemo(() => createStyles(theme), [theme]);

  useFocusEffect(
    useCallback(() => {
      fetchStaff();
    }, [])
  );

  const fetchStaff = async () => {
    try {
      setLoading(true);

      const res = await otherServices.getAllStaffs();

      if (res?.status === "success") {
        const staffData = res.data.map((staff) => {
          let avgRating = null;

          try {
            let parsed = staff.avg_rating;

            if (typeof parsed === "string") {
              parsed = JSON.parse(parsed);
            }

            if (Array.isArray(parsed)) {
              avgRating = parsed?.[0]?.average_rating
                ? parseFloat(parsed[0].average_rating)
                : null;
            }
          } catch {
            avgRating = null;
          }

          return { ...staff, avgRating };
        });

        setStaffList(staffData);
      } else {
        setStaffList([]);
      }
    } catch (error) {
      console.error("[MyStaffScreen] fetch error:", error);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase().trim();

    const result = staffList.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.designation?.toLowerCase().includes(q) ||
        s.category?.toLowerCase().includes(q) ||
        String(s.code || "").includes(q)
    );

    // PRESENT (IN) always on top
    return result.sort((a, b) => {
      const aPresent = a.status?.toUpperCase() === "PRESENT";
      const bPresent = b.status?.toUpperCase() === "PRESENT";

      if (aPresent && !bPresent) return -1;
      if (!aPresent && bPresent) return 1;

      return a.name.localeCompare(b.name); // secondary sort
    });
  }, [search, staffList]);

  const renderStars = (rating) => {
    const rounded = Math.round(rating);

    return [1, 2, 3, 4, 5].map((star) => (
      < Ionicons
        key={star}
        name={star <= rounded ? "star" : "star-outline"}
        size={12}
        color={star <= rounded ? "#FACC15" : theme.textSecondary}
      />
    ));
  };

  const renderItem = ({ item }) => {
    const isPresent = item.status?.toUpperCase() === "PRESENT";

    return (
      <AppCard theme={theme}>
        <TouchableOpacity
          style={styles.cardContent}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("MyStaffDetailScreen", { staff: item })
          }
        >
          {/* ── Left: avatar + info ── */}
          <View style={styles.leftRow}>
            <View style={styles.avatar}>
              {item.image ? (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: "100%", height: "100%", borderRadius: 22 }}
                />
              ) : (
                <Ionicons name="person" size={22} color={theme.textSecondary} />
              )}
            </View>

            {/* FIX: flexShrink:1 prevents long names from pushing rightCol off screen */}
            <View style={{ flex: 1, flexShrink: 1 }}>
              <View style={styles.nameRow}>
                {/* FIX: null fallback for item.name */}
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: theme.text, flex: 1 }]}
                >
                  {item.name?.trim() || "Unknown"}
                </Text>
              </View>

              <Text
                style={[styles.role, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.designation || item.category || "No Role"}
              </Text>

              {item.avgRating !== null && (
                <View style={styles.starsRow}>
                  {renderStars(item.avgRating)}
                </View>
              )}
            </View>
          </View>

          {/* ── Right: IN/OUT badge on top, emp code below ── */}
          <View style={{
            backgroundColor: isPresent ? "#ECFDF5" : "#FEF2F2",
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 6,
          }}>
            <Text style={{
              color: isPresent ? "#10B981" : "#5e5858",
              fontSize: 11,
              fontWeight: "700",
            }}>
              {isPresent ? "IN" : "OUT"}
            </Text>
          </View>
        </TouchableOpacity>
      </AppCard>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <AppSearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, role or ID..."
        theme={theme}
      />

      <FlatList
        data={filteredStaff}
        keyExtractor={(item, index) =>
          item.id ? item.id.toString() : index.toString()
        }
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={() => (
          <EmptyState
            icon="people-outline"
            title={search ? "No Results Found" : "No Staff Found"}
            subtitle={
              search
                ? `No staff matches "${search}"`
                : "Add staff to manage them here"
            }
            theme={theme}
          />
        )}
      />
    </View>
  );
};

export default MyStaffScreen;

const createStyles = (theme) =>
  StyleSheet.create({
    cardContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    leftRow: {
      flexDirection: "row",
      alignItems: "center",
      // FIX: flex:1 so leftRow takes remaining space but doesn't crush rightCol
      flex: 1,
      marginRight: 12,
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      // Prevent avatar from shrinking
      flexShrink: 0,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
    },

    name: {
      fontSize: 15,
      fontWeight: "600",
    },

    role: {
      fontSize: 12,
      marginTop: 3,
    },

    starsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
    },

    rightCol: {
      alignItems: "flex-end",
      justifyContent: "flex-start",
      alignSelf: "stretch",
      paddingTop: 2,
      // Prevent rightCol from shrinking
      flexShrink: 0,
    },

    empCode: {
      fontSize: 11,
      fontWeight: "600",
    },

    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: 60,
    },


  });