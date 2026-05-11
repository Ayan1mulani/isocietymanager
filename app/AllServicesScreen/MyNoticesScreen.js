import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
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
const getReadCacheKey = (userId) => `@my_notices_read_cache_${userId}`;

const MyNoticesScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { nightMode } = usePermissions();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasUnreadNotices = notices.some((item) => !item?.is_read);

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

  const fetchNotices = async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;

      const userId = userInfo?.id || userInfo?.user_id || "default";

      const CACHE_KEY = getCacheKey(userId);
      const READ_CACHE_KEY = getReadCacheKey(userId);

      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      const cachedReadData = await AsyncStorage.getItem(READ_CACHE_KEY);

      const locallyReadIds = cachedReadData
        ? JSON.parse(cachedReadData)
        : [];

      if (cachedData) {
        const parsedCachedNotices = JSON.parse(cachedData).map((notice) => ({
          ...notice,
          is_read:
            notice.is_read || locallyReadIds.includes(notice.id),
        }));

        setNotices(parsedCachedNotices);
        setLoading(false);
      }

      const res = await otherServices.getMyNotices("");

      if (res?.status === "success") {
        const allNotices = res.data || [];

        const freshNotices = allNotices
          .filter((item) => {
            const category = String(item?.category || '')
              .trim()
              .toLowerCase();

            return category === 'notice' || category === 'ticker';
          })
          .map((notice) => ({
            ...notice,
            is_read:
              notice.is_read || locallyReadIds.includes(notice.id),
          }));

        setNotices(freshNotices);

        const noticesToCache = freshNotices.slice(0, 50);

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify(noticesToCache)
        );
      }

    } catch (error) {
      console.error("Failed to fetch notices:", error);

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

  const handleMarkAllAsRead = async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");

      const userInfo = userInfoRaw
        ? JSON.parse(userInfoRaw)
        : null;

      const userId =
        userInfo?.id ||
        userInfo?.user_id ||
        "default";

      const READ_CACHE_KEY = getReadCacheKey(userId);

      const existingRead = await AsyncStorage.getItem(
        READ_CACHE_KEY
      );

      let existingReadIds = existingRead
        ? JSON.parse(existingRead)
        : [];

      const unreadIds = notices
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

      setNotices((prev) =>
        prev.map((notice) => ({
          ...notice,
          is_read: true,
        }))
      );

      otherServices.markAllNoticesAsRead().catch((err) => {
        console.log("Mark all notices failed:", err);
      });

    } catch (e) {
      console.log("Mark all local cache error:", e);
    }
  };

  const renderItem = ({ item }) => {
    const preview = stripHtml(item.notice)?.slice(0, 100);

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
      i18n.language === 'km'
        ? 'km-KH'
        : 'en-US';

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
            shadowColor: nightMode ? "#000" : "#999"
          }
        ]}
        activeOpacity={0.9}
        onPress={async () => {
          try {
            const userInfoRaw = await AsyncStorage.getItem("userInfo");

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

            setNotices((prev) =>
              prev.map((notice) =>
                notice.id === item.id
                  ? { ...notice, is_read: true }
                  : notice
              )
            );

            otherServices
              .markNoticeAsRead(item.id)
              .catch((err) => {
                console.log(
                  "Mark notice read failed:",
                  err
                );
              });

          } catch (e) {
            console.log(
              "Local read cache error:",
              e
            );
          }

          navigation.navigate(
            "NoticeDetailScreen",
            { notice: item }
          );
        }}
      >
        <View style={styles.calendarContainer}>
          <View
            style={[
              styles.calendarHeader,
              {
                backgroundColor:
                  theme.calendarHeader
              }
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
                  theme.calendarBody
              }
            ]}
          >
            <Text
              style={[
                styles.calendarDay,
                { color: theme.title }
              ]}
            >
              {day}
            </Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <View style={styles.contentBlock}>

            <View style={styles.topRightIconsContainer}>
              {hasFiles ? (
                <Ionicons
                  name="attach-outline"
                  size={15}
                  color={theme.category}
                  style={styles.attachmentIcon}
                />
              ) : null}

              {!item?.is_read ? (
                <View style={styles.readStatusContainer}>
                  <View
                    style={[
                      styles.readStatusDot,
                      {
                        backgroundColor: '#3B82F6',
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            <Text
              style={[
                styles.title,
                { color: theme.title }
              ]}
              numberOfLines={2}
            >
              {item.subject}
            </Text>

            {preview ? (
              <Text
                style={[
                  styles.preview,
                  { color: theme.preview }
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
        name="document-outline"
        size={56}
        color={theme.preview}
      />

      <Text
        style={[
          styles.emptyTitle,
          { color: theme.emptyText }
        ]}
      >
        {t("No Notices Found")}
      </Text>

      <Text
        style={[
          styles.emptySubtitle,
          { color: theme.emptySubText }
        ]}
      >
        {t("You're all caught up 🎉")}
      </Text>
    </View>
  );

  const renderSkeleton = () => (
    <View style={styles.listContent}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View
          key={key}
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              shadowColor:
                nightMode ? "#000" : "#999"
            }
          ]}
        >
          <View
            style={[
              styles.calendarContainer,
              {
                borderColor: 'transparent',
                backgroundColor:
                  theme.skeletonBase
              }
            ]}
          />

          <View style={styles.rightContent}>
            <View
              style={[
                styles.topRow,
                { marginBottom: 8 }
              ]}
            >
              <View
                style={{
                  width: 60,
                  height: 12,
                  backgroundColor: theme.skeletonBase,
                  borderRadius: 4
                }}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: theme.skeletonBase,
                  }}
                />

                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: 'theme.skeletonBase'
                  }}
                />
              </View>
            </View>

            <View
              style={{
                width: '90%',
                height: 16,
                backgroundColor:
                  theme.skeletonBase,
                borderRadius: 4,
                marginBottom: 6
              }}
            />

            <View
              style={{
                width: '60%',
                height: 16,
                backgroundColor:
                  theme.skeletonBase,
                borderRadius: 4,
                marginBottom: 12
              }}
            />

            <View
              style={{
                width: '100%',
                height: 12,
                backgroundColor:
                  theme.skeletonBase,
                borderRadius: 4
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background
        }
      ]}
    >

      <AppHeader
        title={t("My Notices")}
        rightComponent={
          hasUnreadNotices ? (
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
        renderSkeleton()
      ) : notices.length === 0 ? (
        renderEmptyComponent()
      ) : (
        <FlatList
          data={notices}
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

export default MyNoticesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    marginTop: 12
  },

  card: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    position: "relative",
    shadowOffset: {
      width: 0,
      height: 2
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
    overflow: 'hidden',
    marginRight: 14,
    borderWidth: 0.8,
    borderColor: '#E5E7EB',
    marginTop:17
  },

  calendarHeader: {
    height: 26,
    justifyContent: "center",
    alignItems: "center"
  },

contentBlock: {
  marginBottom: 6,
  paddingTop: 18,
},

  calendarMonth: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700"
  },

  topRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
  calendarBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  calendarDay: {
    fontSize: 20,
    fontWeight: "800"
  },

  rightContent: {
    flex: 1
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
    lineHeight: 20
  },

  preview: {
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center"
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center"
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
});