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
import AsyncStorage from "@react-native-async-storage/async-storage";

import AppHeader from "../components/AppHeader";
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";
import BRAND from "../config";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const getCacheKey = (userId) => `@my_events_cache_${userId}`;
const getReadCacheKey = (userId) =>
  `@my_events_read_cache_${userId}`;

const MyEventsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { nightMode } = usePermissions();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasUnreadEvents = events.some(
    (item) => !item?.is_read
  );

  const theme = {
    background: nightMode ? "#0F172A" : "#F3F4F6",
    card: nightMode ? "#1E293B" : "#FFFFFF",
    title: nightMode ? "#F1F5F9" : "#111827",
    preview: nightMode ? "#CBD5E1" : "#6B7280",
    category: BRAND.COLORS.primaryDark,
    calendarHeader: BRAND.COLORS.primary,
    calendarBody: nightMode ? "#334155" : "#FFFFFF",
    emptyText: nightMode ? "#F1F5F9" : "#111827",
    emptySubText: nightMode ? "#CBD5E1" : "#9CA3AF",
    skeletonBase: nightMode ? "#334155" : "#E5E7EB",
  };

  const stripHtml = (html) => {
    if (!html) return "";

    return html
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const fetchEvents = async () => {
    try {
      const userInfoRaw =
        await AsyncStorage.getItem("userInfo");

      const userInfo = userInfoRaw
        ? JSON.parse(userInfoRaw)
        : null;

      const userId =
        userInfo?.id ||
        userInfo?.user_id ||
        "default";

      const CACHE_KEY = getCacheKey(userId);
      const READ_CACHE_KEY =
        getReadCacheKey(userId);

      const cachedData =
        await AsyncStorage.getItem(CACHE_KEY);

      const cachedReadData =
        await AsyncStorage.getItem(
          READ_CACHE_KEY
        );

      const locallyReadIds = cachedReadData
        ? JSON.parse(cachedReadData)
        : [];

      if (cachedData) {
        const parsedCachedEvents = JSON.parse(
          cachedData
        ).map((event) => ({
          ...event,
          is_read:
            event.is_read ||
            locallyReadIds.includes(event.id),
        }));

        setEvents(parsedCachedEvents);
        setLoading(false);
      }

      const res = await otherServices.getMyNotices("EVENT");

      if (res?.status === "success") {
        const allEvents = res.data || [];

        const freshEvents = allEvents.map((event) => ({
          ...event,
          is_read:
            event.is_read ||
            locallyReadIds.includes(event.id),
        }));

        setEvents(freshEvents);

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify(freshEvents.slice(0, 50))
        );
      }
    } catch (error) {
      console.log("Failed to fetch events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const userInfoRaw =
        await AsyncStorage.getItem("userInfo");

      const userInfo = userInfoRaw
        ? JSON.parse(userInfoRaw)
        : null;

      const userId =
        userInfo?.id ||
        userInfo?.user_id ||
        "default";

      const READ_CACHE_KEY =
        getReadCacheKey(userId);

      const existingRead =
        await AsyncStorage.getItem(
          READ_CACHE_KEY
        );

      let existingReadIds = existingRead
        ? JSON.parse(existingRead)
        : [];

      const unreadIds = events
        .filter((item) => !item?.is_read)
        .map((item) => item.id);

      const mergedReadIds = [
        ...new Set([
          ...existingReadIds,
          ...unreadIds,
        ]),
      ];

      await AsyncStorage.setItem(
        READ_CACHE_KEY,
        JSON.stringify(mergedReadIds)
      );

      setEvents((prev) =>
        prev.map((event) => ({
          ...event,
          is_read: true,
        }))
      );
    } catch (e) {
      console.log("Mark all local cache error:", e);
    }
  };

  const renderItem = ({ item }) => {
    const preview = stripHtml(
      item.notice
    )?.slice(0, 100);

    let hasFiles = false;

    try {
      const parsedFiles = item?.file_urls
        ? JSON.parse(item.file_urls)
        : [];

      hasFiles =
        Array.isArray(parsedFiles) &&
        parsedFiles.length > 0;
    } catch (e) {
      hasFiles = false;
    }

    const dateObj = new Date(item.published_at);

    const currentLang =
      i18n.language === "km"
        ? "km-KH"
        : "en-US";

    const month = dateObj.toLocaleDateString(
      currentLang,
      { month: "short" }
    );

    const day = dateObj.getDate();

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            shadowColor: nightMode
              ? "#000"
              : "#999",
          },
        ]}
        activeOpacity={0.9}
        onPress={async () => {
          try {
            const userInfoRaw =
              await AsyncStorage.getItem(
                "userInfo"
              );

            const userInfo = userInfoRaw
              ? JSON.parse(userInfoRaw)
              : null;

            const userId =
              userInfo?.id ||
              userInfo?.user_id ||
              "default";

            const READ_CACHE_KEY =
              getReadCacheKey(userId);

            const existingRead =
              await AsyncStorage.getItem(
                READ_CACHE_KEY
              );

            let readIds = existingRead
              ? JSON.parse(existingRead)
              : [];

            if (!readIds.includes(item.id)) {
              readIds.push(item.id);

              await AsyncStorage.setItem(
                READ_CACHE_KEY,
                JSON.stringify(readIds)
              );
            }

            setEvents((prev) =>
              prev.map((event) =>
                event.id === item.id
                  ? {
                      ...event,
                      is_read: true,
                    }
                  : event
              )
            );
          } catch (e) {
            console.log(
              "Local read cache error:",
              e
            );
          }

       navigation.navigate(
  "NoticeDetailScreen",
  {
    notice: item,
    screenType: "event",
  }
);
        }}
      >
        <View style={styles.calendarContainer}>
          <View
            style={[
              styles.calendarHeader,
              {
                backgroundColor:
                  theme.calendarHeader,
              },
            ]}
          >
            <Text style={styles.calendarMonth}>
              {month}
            </Text>
          </View>

          <View
            style={[
              styles.calendarBody,
              {
                backgroundColor:
                  theme.calendarBody,
              },
            ]}
          >
            <Text
              style={[
                styles.calendarDay,
                {
                  color: theme.title,
                },
              ]}
            >
              {day}
            </Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.contentBlock}>
            <View
              style={
                styles.topRightIconsContainer
              }
            >
              {hasFiles ? (
                <Ionicons
                  name="attach-outline"
                  size={15}
                  color={theme.category}
                  style={styles.attachmentIcon}
                />
              ) : null}

              {!item?.is_read ? (
                <View
                  style={
                    styles.readStatusContainer
                  }
                >
                  <View
                    style={[
                      styles.readStatusDot,
                      {
                        backgroundColor:
                          "#3B82F6",
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            <Text
              style={[
                styles.title,
                { color: theme.title },
              ]}
              numberOfLines={2}
            >
              {item.subject}
            </Text>

            {preview ? (
              <Text
                style={[
                  styles.preview,
                  {
                    color: theme.preview,
                  },
                ]}
                numberOfLines={1}
              >
                {preview}
              </Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="calendar-outline"
        size={56}
        color={theme.preview}
      />

      <Text
        style={[
          styles.emptyTitle,
          { color: theme.emptyText },
        ]}
      >
        {t("No Events Found")}
      </Text>

      <Text
        style={[
          styles.emptySubtitle,
          {
            color: theme.emptySubText,
          },
        ]}
      >
        {t("No upcoming events right now 🎉")}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <AppHeader
        title={t("Events")}
        rightComponent={
          hasUnreadEvents ? (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={18}
                color="#fff"
              />

              <Text style={styles.markAllText}>
                {t("Read all")}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {loading ? (
        <View style={styles.loaderContainer}>
          <Text style={{ color: theme.title }}>
            {t("Loading Events...")}
          </Text>
        </View>
      ) : events.length === 0 ? (
        renderEmptyComponent()
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) =>
            item.id.toString()
          }
          renderItem={renderItem}
          contentContainerStyle={
            styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.category]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    marginTop: 12,
  },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    position: "relative",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  calendarContainer: {
    width: 50,
    height: 65,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
    marginRight: 14,
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    marginTop: 17,
  },

  calendarHeader: {
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },

  contentBlock: {
    marginBottom: 6,
    paddingTop: 18,
  },

  calendarMonth: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },

  calendarBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  calendarDay: {
    fontSize: 20,
    fontWeight: "800",
  },

  rightContent: {
    flex: 1,
  },

  topRightIconsContainer: {
    position: "absolute",
    top: -2,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    zIndex: 99,
  },

  attachmentIcon: {
    marginLeft: 2,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 20,
  },

  preview: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 6,
  },

  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
  },

  readStatusContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  readStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});