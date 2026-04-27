import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { ismServices } from "../../services/ismServices";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

/* ─── helpers ─── */
const stripHtml = (html = "") =>
  html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const HomeNoticeSection = () => {
  const { t } = useTranslation();
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

  const dataToShow = notices.slice(0, 3);
  const listData = dataToShow.length > 0 ? [...dataToShow, { id: "more" }] : [];

  const renderItem = ({ item }) => {
    if (item.id === "more") {
      return (
        <TouchableOpacity
          style={[styles.card, styles.moreCard]}
          onPress={() => navigation.navigate("Notices")}
        >
          <Text style={styles.moreText}>{t("More")}</Text>
          <Ionicons name="arrow-forward" size={14} color="#0f0101"
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
        <View style={styles.cardTitleRow}>
          <Ionicons 
            name="link-outline" 
            size={14} 
            color="#6782e4" 
            style={{ marginRight: 6 }} 
          />
          <Text numberOfLines={1} style={styles.title}>
            {item.subject}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.subtitle}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator style={{ margin: 10 }} />;
  }

  if (notices.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="reader"
            size={20}
            color="#374151"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.headerText}>{t("Important Information")}</Text>
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
    marginHorizontal: 20, 
    marginTop: 10,
    marginBottom:15,
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
    paddingLeft: 20,  
    paddingRight: 20, 
    paddingBottom: 10, 
  },

  card: {
    width: 200,
    paddingHorizontal: 15,
    paddingVertical: 10, 
    marginRight: 15,     
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    elevation: 0.6,
    borderColor: "#b1d0c610", 
    justifyContent: "center",
  },

  // ── NEW: Row to hold the icon and title together ──
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f0101",
    flex: 1, // Ensures the text shrinks and shows "..." instead of pushing outside the card
  },

  subtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4, // Added a tiny bit more space between title and subtitle
  },

  moreCard: {
    flexDirection: "row",
    width: 80,
    alignItems: "center",
    justifyContent: "center", 
    borderColor: "#b1d0c610",
  },

  moreText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f0101",
  },
});