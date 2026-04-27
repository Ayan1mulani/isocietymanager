import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { ismServices } from "../../services/ismServices";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "./AppHeader";
import BRAND from '../config'

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const PRIMARY = BRAND.COLORS.icon;

/* ───────── Helpers ───────── */

const extractUrl = (raw) => {
  if (!raw) return null;
  const hrefMatch = raw.match(/<a\b[^>]*href="([^"]*)"[^>]*>/i);
  if (hrefMatch) return hrefMatch[1];
  const urlMatch = raw.match(
    /(https?:\/\/[^\s,<]+|app\.factech\.co\.in\/[^\s,<]+)/i
  );
  return urlMatch ? urlMatch[1] : null;
};

const extractOtp = (raw) => {
  const m = raw?.match(/\bOTP[:\s]+(\d{4,6})\b/i);
  return m ? m[1] : null;
};

const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\b[^>]*>.*?<\/a>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
};

/* 🔥 Only modify booking timing coloring */
const humanizeMessage = (raw) => {
  if (!raw)
    return { before: "", date: null, time: null, rest: "" };

  let text = stripHtml(raw);

  // 🔥 Remove OTP from main text
  text = text.replace(/\bOTP[:\s]+\d{4,6}\b/i, "");

  const match = text.match(
    /(.*?BOOKED\s+Timing\s+)(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})\s+(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})/i
  );

  if (match) {
    return {
      before: match[1],
      date: match[2],
      time: `${match[3]} - ${match[5]}`,
      rest: "",
    };
  }

  return { before: text.trim(), date: null, time: null, rest: "" };
};

const formatDateTime = (dateString, t) => {
  if (!dateString) return "";

  // Treat backend time as UTC
  const date = new Date(dateString.replace(" ", "T") + "Z");

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const time = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `${t("Today")} • ${time}`;
  if (isYesterday) return `${t("Yesterday")} • ${time}`;

  const formattedDate = date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

  return `${formattedDate} • ${time}`;
};

/* ───────── Notification Card ───────── */

const NotificationCard = ({ item }) => {
  const { t } = useTranslation(); // 👈 Init translation
  
  const formatted = humanizeMessage(item.message);
  const url = extractUrl(item.message);
  const otp = extractOtp(item.message);
  const formattedOtp = otp?.split("").join(" ");

  return (
    <View style={styles.card}>
      <View style={styles.iconWrapper}>
        < Ionicons
          name="notifications-outline"
          size={20}
          color={PRIMARY}
        />
      </View>

      <View style={styles.cardBody}>
        {/* We do not use TranslatedText for formatted.before because it is dynamic API text */}
        <Text style={styles.message}>
          {formatted.before}

          {formatted.date && (
            <Text style={styles.inlineDate}>
              {" "}{formatted.date}
            </Text>
          )}

          {formatted.time && (
            <Text style={styles.inlineTime}>
              {" "}{formatted.time}
            </Text>
          )}

          {otp && (
            <Text style={styles.inlineOtp}>
              {"  "} {formattedOtp}
            </Text>
          )}
        </Text>

        <View style={styles.footerRow}>
          {url ? (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() =>
                Linking.openURL(
                  url.startsWith("http") ? url : `https://${url}`
                )
              }
            >
              < Ionicons
                name="open-outline"
                size={12}
                color={PRIMARY}
              />
              <Text style={styles.linkText}>{t("Open Link")}</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <Text style={styles.dateText}>
            {formatDateTime(item.created_at, t)}
          </Text>
        </View>
      </View>
    </View>
  );
};

/* ───────── Main Screen ───────── */

const NotificationsScreen = () => {
  const { t } = useTranslation(); // 👈 Init translation
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await ismServices.getMyNotifications();
      setNotifications(res?.data || []);
    } catch (error) {
      console.log("Notification Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t("Notifications")} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <NotificationCard item={item} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={fetchNotifications}
              colors={[PRIMARY]}
              tintColor={PRIMARY}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 8 }} />
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;

/* ───────── Styles ───────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  list: {
    padding: 16,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: BRAND.COLORS.iconbg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  cardBody: {
    flex: 1,
  },

  message: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 21,
  },

  /* 🔥 Only these are new */
  inlineDate: {
    color: "#475569",
    fontWeight: "500",
  },

  inlineTime: {
    color: BRAND.COLORS.primaryDark,
    fontWeight: "700",
  },

  inlineOtp: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C2410C",
    letterSpacing: 4,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },

  dateText: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF8FD",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  linkText: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: "600",
    marginLeft: 6,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});