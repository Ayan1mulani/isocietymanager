import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Added caching
import { ismServices } from "../../services/ismServices";

// ✅ 1. Replaced native Text with your TranslatedText component
import Text from '../components/TranslatedText'; 

const getCacheKey = (userId) => `@forms_screen_cache_${userId}`;

const stripHtml = (html = "") =>
    html.replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

const SkeletonCard = () => {
  const opacity = new Animated.Value(0.3);

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}> 
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonButton} />
    </Animated.View>
  );
};

const FormsScreen = () => {
  const navigation = useNavigation();

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ✅ 2. Added robust fetching with Instant Cache Load
  const fetchForms = useCallback(async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
      const userId = userInfo?.id || userInfo?.user_id || "default";
      const CACHE_KEY = getCacheKey(userId);

      setError(null);
      
      // INSTANT LOAD: Check cache first
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setForms(JSON.parse(cachedData));
        setLoading(false); // Turn off the loader immediately
      }

      // BACKGROUND FETCH: Get fresh data from the server
      const response = await ismServices.getMyNotices("FORMS");
      const freshData = response?.data || [];
      
      setForms(freshData);
      
      // STORAGE PROTECTION: Cache the latest 50 items
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(freshData.slice(0, 50)));

    } catch (err) {
      console.log("Forms Error:", err?.message);
      // Only show the error screen if we also have no cached data to show
      setForms((prevForms) => {
        if (prevForms.length === 0) {
          setError("Failed to load forms");
        }
        return prevForms;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchForms();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.listContainer}>
          {[1, 2, 3, 4].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to Load Forms</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={fetchForms}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={forms}
        keyExtractor={(item, index) =>
          item?.id ? String(item.id) : String(index)
        }
        renderItem={({ item }) => {
          const title = stripHtml(item.notice || "");
          const noticeText = stripHtml(item.notice || "");

          let fileUrls = [];

          try {
            if (item.file_urls) {
              fileUrls =
                typeof item.file_urls === 'string'
                  ? JSON.parse(item.file_urls)
                  : item.file_urls;
            }
          } catch (e) {
            console.log('File URL Parse Error:', e);
            fileUrls = [];
          }

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("NoticeDetailScreen", {
                  notice: item,
                  noticeText,
                  fileUrls,
                  headerTitle: "Forms",
                })
              }
            >
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {title || item.subject || 'Untitled Form'}
                </Text>

                {Array.isArray(fileUrls) && fileUrls.length > 0 ? (
                  <Ionicons
                    name="attach-outline"
                    size={18}
                    color="#1F78D1"
                    style={styles.attachIcon}
                  />
                ) : null}
              </View>

              {!!item.subject && item.subject !== title && (
                <Text style={styles.subject} numberOfLines={2}>
                  {item.subject}
                </Text>
              )}

              <Text style={styles.viewText}>
                View Form →
              </Text>
            </TouchableOpacity>
          );
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1F78D1"]}
          />
        }
        contentContainerStyle={[
          styles.listContainer,
          {
            flexGrow: 1,
            justifyContent:
              forms.length === 0
                ? "center"
                : "flex-start",
          },
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>
              No Forms Available
            </Text>
            <Text style={styles.emptyText}>
              There are no forms uploaded yet.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={true}
      />
    </View>
  );
};

export default FormsScreen;

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  listContainer: {
    padding: 16,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 0.7,
  },

titleRow: {
    flexDirection: "row",
    justifyContent: "flex-start", 
    alignItems: "flex-start",
    position: "relative", // Needed so the absolute icon stays inside this row
  },

  title: {
    flex: 1, 
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    paddingRight: 24, // Extra padding ensures long text never overlaps the corner icon
  },

  attachIcon: {
    position: "absolute",
    top: -8,   // Pushes the icon up into the card's top padding space
    right: -8, // Pushes the icon right into the card's right padding space
  },
  subject: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 8,
  },

  viewText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F78D1",
  },

   emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },

 emptyIcon: {
  fontSize: 48,
  marginTop: -90,
  marginBottom: 10,
},

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },

  emptyText: {
    fontSize: 13,
    color: "#64748B",
  },

  skeletonCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  skeletonTitle: {
    height: 18,
    width: '75%',
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 12,
  },

  skeletonLine: {
    height: 14,
    width: '55%',
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 18,
  },

  skeletonButton: {
    height: 14,
    width: 90,
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },

  errorMessage: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 20,
  },

  retryBtn: {
    backgroundColor: "#1F78D1",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },

  retryText: {
    color: "#fff",
    fontWeight: "700",
  },
});