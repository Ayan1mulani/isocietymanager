import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from "../components/AppHeader";
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";
import BRAND from '../config';
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const getCacheKey = (userId) => `@my_notices_cache_${userId}`;

const MyNoticesScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { nightMode } = usePermissions();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const theme = {
    background: nightMode ? "#0F172A" : "#F3F4F6",
    card: nightMode ? "#1E293B" : "#FFFFFF",
    title: nightMode ? "#F1F5F9" : "#111827",
    preview: nightMode ? "#CBD5E1" : "#6B7280",
    category: BRAND.COLORS.primaryDark,
    date: "#9CA3AF",
    calendarHeader: BRAND.COLORS.primary,
    calendarBody: nightMode ? "#334155" : "#FFFFFF",
    emptyText: nightMode ? "#F1F5F9" : "#111827",
    emptySubText: nightMode ? "#CBD5E1" : "#9CA3AF",
    skeletonBase: nightMode ? "#334155" : "#E5E7EB", // Added for skeleton
  };

  const stripHtml = (html) => {
    if (!html) return "";
    return html
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchNotices = async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
      const userId = userInfo?.id || userInfo?.user_id || "default";
      const CACHE_KEY = getCacheKey(userId);

      // 1. INSTANT LOAD: Check cache first so the screen isn't empty
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setNotices(JSON.parse(cachedData));
        setLoading(false); // Turn off the loader instantly!
      }

      // 2. BACKGROUND FETCH: Get fresh data from the server
      const res = await otherServices.getMyNotices("");
      
      if (res?.status === "success") {
        const freshNotices = res.data || [];
        
        setNotices(freshNotices); // Update the UI with fresh data
        
        // 3. STORAGE PROTECTION: Only cache the latest 50 items to prevent bloat
        const noticesToCache = freshNotices.slice(0, 50);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(noticesToCache));
      } else if (!cachedData) {
        // If API fails and we have no cache, show empty
        setNotices([]); 
      }
    } catch (error) {
      console.error("Failed to fetch notices:", error);
      // If error occurs and we don't have cache, ensure it's empty
      if (notices.length === 0) setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotices();
  }, []);

  const renderItem = ({ item }) => {
    const preview = stripHtml(item.notice)?.slice(0, 100);
    const dateObj = new Date(item.published_at);
    
    const currentLang = i18n.language === 'km' ? 'km-KH' : 'en-US';
    const month = dateObj.toLocaleDateString(currentLang, { month: "short" });
    const day = dateObj.getDate();
    const fullDateString = dateObj.toLocaleDateString(currentLang, { 
        day: '2-digit', month: 'short', year: 'numeric' 
    });

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, shadowColor: nightMode ? "#000" : "#999" }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("NoticeDetailScreen", { notice: item })}
      >
        <View style={styles.calendarContainer}>
          <View style={[styles.calendarHeader, { backgroundColor: theme.calendarHeader }]}>
            <Text style={styles.calendarMonth}>{month}</Text>
          </View>
          <View style={[styles.calendarBody, { backgroundColor: theme.calendarBody }]}>
            <Text style={[styles.calendarDay, { color: theme.title }]}>{day}</Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.contentBlock}>
            {item.category ? (
              <View style={styles.topRow}>
                <Text style={[styles.category, { color: theme.category }]}>{t(item.category)}</Text>
                {item.published_at ? (
                  <Text style={[styles.date, { color: theme.date }]}>{fullDateString}</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={[styles.title, { color: theme.title }]} numberOfLines={2}>{item.subject}</Text>
            {preview ? (
              <Text style={[styles.preview, { color: theme.preview }]} numberOfLines={1}>{preview}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={56} color={theme.preview} />
      <Text style={[styles.emptyTitle, { color: theme.emptyText }]}>{t("No Notices Found")}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.emptySubText }]}>{t("You're all caught up 🎉")}</Text>
    </View>
  );

  // --- SKELETON LOADER UI ---
  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={[styles.card, { backgroundColor: theme.card, shadowColor: nightMode ? "#000" : "#999" }]}>
          {/* Calendar Skeleton (Left side) */}
          <View style={[styles.calendarContainer, { borderColor: 'transparent', backgroundColor: theme.skeletonBase }]} />
          
          {/* Content Skeleton (Right side) */}
          <View style={styles.rightContent}>
            <View style={[styles.topRow, { marginBottom: 8 }]}>
              <View style={{ width: 60, height: 12, backgroundColor: theme.skeletonBase, borderRadius: 4 }} />
              <View style={{ width: 80, height: 12, backgroundColor: theme.skeletonBase, borderRadius: 4 }} />
            </View>
            {/* Title Lines */}
            <View style={{ width: '90%', height: 16, backgroundColor: theme.skeletonBase, borderRadius: 4, marginBottom: 6 }} />
            <View style={{ width: '60%', height: 16, backgroundColor: theme.skeletonBase, borderRadius: 4, marginBottom: 12 }} />
            {/* Preview Line */}
            <View style={{ width: '100%', height: 12, backgroundColor: theme.skeletonBase, borderRadius: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title={t("My Notices")} />
      {loading ? (
        renderSkeleton()
      ) : notices.length === 0 ? (
        renderEmptyComponent()
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.category]} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default MyNoticesScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: { flexDirection: "row", borderRadius: 14, padding: 14, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  calendarContainer: {
    width: 50,
    height: 80,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 0.8,
    borderColor: '#E5E7EB',
  },
  calendarHeader: { height: 26, justifyContent: "center", alignItems: "center" },
  contentBlock: { marginBottom: 6 },
  calendarMonth: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  calendarBody: { flex: 1, justifyContent: "center", alignItems: "center" },
  calendarDay: { fontSize: 20, fontWeight: "800" },
  rightContent: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  category: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 4, lineHeight: 20 },
  preview: { fontSize: 13, marginBottom: 6, lineHeight: 18 },
  date: { fontSize: 12, fontWeight: "500", marginTop: 4, textAlign: "right" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 16, textAlign: "center" },
  emptySubtitle: { marginTop: 8, fontSize: 14, textAlign: "center" }
});