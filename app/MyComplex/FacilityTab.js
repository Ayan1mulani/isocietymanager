import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import { ismServices } from "../../services/ismServices";
import BRAND from '../config'

/* ─── Helpers ─── */

const stripHtml = (html = "") =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
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

const parseFileUrls = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
};

/* ─── Avatar ─── */

const Avatar = ({ urls, label }) => {
  const [imgError, setImgError] = useState(false);
  const firstUrl = urls[0];

  if (firstUrl && !imgError) {
    return (
      <Image
        source={{ uri: firstUrl }}
        style={styles.thumbnail}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarText}>
        {(label || "?")[0]?.toUpperCase()}
      </Text>
    </View>
  );
};

/* ─── Notice Card ─── */

const NoticeCard = ({ item, onPress }) => {
  const fileUrls = parseFileUrls(item.file_urls);
  const noticeText = stripHtml(item.notice || "");
  const hasContact = !!item.contact;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.6}
      onPress={onPress}
    >
      <View style={styles.cardContent}>
        <View style={styles.header}>
          <Avatar urls={fileUrls} label={noticeText} />
          <View style={styles.headerInfo}>
            <Text style={styles.title} numberOfLines={2}>
              {noticeText}
            </Text>
            {item.group && (
              <Text style={styles.category}>{item.group}</Text>
            )}
          </View>
          {!item.is_read && <View style={styles.unreadIndicator} />}
        </View>

        {item.subject && (
          <Text style={styles.description} numberOfLines={2}>
            {item.subject}
          </Text>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          {hasContact && (
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={(e) => {
                e.stopPropagation();
                Linking.openURL(`tel:${item.contact}`);
              }}
            >
              <Text style={styles.contactText}>{item.contact}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ─── Filter Chip ─── */

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

/* ─── Main Component ─── */

const MGTFacilityTeamTab = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeGroup, setActiveGroup] = useState("All");

  const groups = useMemo(() => {
    const unique = [...new Set(notices.map((n) => n.group?.trim()).filter(Boolean))];
    return ["All", ...unique];
  }, [notices]);

  const filteredNotices = useMemo(() => {
    if (activeGroup === "All") return notices;
    return notices.filter(
      (n) => n.group?.trim().toLowerCase() === activeGroup.toLowerCase()
    );
  }, [notices, activeGroup]);

  const fetchNotices = useCallback(async () => {
    try {
      setError(null);
      const response = await ismServices.getMyNotices("MEMBER");
      setNotices(response?.data || []);
    } catch (err) {
      console.log("Notice Error:", err?.message);
      setError("Failed to load notices");
      setNotices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotices();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotices();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1F78D1" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchNotices}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      {groups.length > 1 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsList}
            scrollEnabled={groups.length > 3}
          >
            {groups.map((group) => (
              <FilterChip
                key={group}
                label={group}
                active={activeGroup === group}
                onPress={() => setActiveGroup(group)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Notices List */}
      <FlatList
        data={filteredNotices}
        keyExtractor={(item, index) =>
          item?.id ? String(item.id) : String(index)
        }
        renderItem={({ item }) => (
          <NoticeCard
            item={item}
            onPress={() => {
              // Handle card press if needed
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1F78D1"
            colors={["#1F78D1"]}
          />
        }
        contentContainerStyle={
          filteredNotices.length === 0
            ? styles.emptyListContainer
            : styles.listContainer
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📬</Text>
            <Text style={styles.emptyStateTitle}>No Notices</Text>
            <Text style={styles.emptyStateText}>
              Check back later for updates
            </Text>
          </View>
        }
        scrollEnabled={true}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default MGTFacilityTeamTab;

/* ─── Styles ─── */

const COLORS = {
  primary: BRAND.COLORS.primary,
  primaryLight: "#E8F2FD",
  text: "#0F172A",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",
  background: "#F8FAFC",
  cardBackground: "#FFFFFF",
  border: "#E2E8F0",
  success: "#10B981",
  unread: "#EF4444",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* ─── Filter Section ─── */
  filterSection: {
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chipsList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 32,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  chipLabelActive: {
    color: "#FFFFFF",
  },

  /* ─── List ─── */
  listContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },

  /* ─── Card ─── */
  card: {
    marginHorizontal: 8,
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 0.1,
  },
  cardContent: {
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  category: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  /* ─── Avatar ─── */
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },

  /* ─── Unread Indicator ─── */
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.unread,
    marginTop: 4,
  },

  /* ─── Description ─── */
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },

  /* ─── Footer ─── */
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  contactBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactText: {
    fontSize: 14,
    color:'#5293e8',
  },

  /* ─── Empty State ─── */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },

  /* ─── Loading & Error ─── */
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});