import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { useNavigation } from "@react-navigation/native";
import { ismServices } from "../../services/ismServices";

/* ─── helpers ─── */
const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const HomeNoticeSection = () => {
  const navigation = useNavigation();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      const res = await ismServices.getMyNotices("COMMON");

      if (res?.status === "success") {
        setNotices(res.data || []);
      }
    } catch (e) {
      console.log("❌ Home Notices Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  // Only show "More" button if there are actually notices
  const dataToShow = notices.slice(0, 3);
  const listData = dataToShow.length > 0 ? [...dataToShow, { id: "more" }] : [];

  const renderItem = ({ item }) => {
    if (item.id === "more") {
      return (
        <TouchableOpacity
          style={[styles.card, styles.moreCard]}
          onPress={() => navigation.navigate("MyNoticesScreen")}
        >
          <Text style={styles.moreText}>More</Text>
          <Ionicons name="arrow-forward" size={14} color="#468a3f"
            style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      );
    }

    const text = stripHtml(item.notice || item.subject);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("NoticeDetail", { notice: item })}
      >
        <Text numberOfLines={1} style={styles.title}>
          {item.subject}
        </Text>

        <Text numberOfLines={1} style={styles.subtitle}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ margin: 10 }} />;
  }

  // Don't render the section at all if there are no notices to show
  if (notices.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ── Updated Header aligned with StaffSection ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="reader"
            size={20}
            color="#374151"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerText}>Important Information</Text>
        </View>
      </View>

      <FlatList
        data={listData}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

export default HomeNoticeSection;

/* ─── styles ─── */
const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20, // Matched StaffSection
    marginTop: 25,        // Matched StaffSection
    marginBottom: 10,      // Matched StaffSection
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

  listContainer: {
    paddingRight: 20, // Added right padding so the last item doesn't stick to the edge
    paddingBottom: 5,
  },

  card: {
    width: 200,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 20, // Replaced padding on container with marginLeft to perfectly align with the header
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    elevation: 0.5,
    borderColor: "#b1d0c610",
    justifyContent: "center",
  },

  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#468a3f",
  },

  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },

  moreCard: {
    flexDirection: "row",
    width: 80,
    alignItems: "center",
    borderColor: "#b1d0c610",

  },

  moreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#468a3f",
  },
});
