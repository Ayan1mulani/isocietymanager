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
import BRAND from '../config';

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
        style={styles.fullImage}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.avatarPlaceholderFull}>
      <Text style={styles.avatarTextFull}>
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
  const contactNumbers = item.contact
    ? item.contact
        .split(',')
        .map((num) => num.trim())
        .filter(Boolean)
    : [];

  return (
    <View style={styles.card}>
      {/* Left Column: Image/Avatar takes exactly the bounds of its wrapper */}
      <View style={styles.imageSection}>
        <Avatar urls={fileUrls} label={noticeText} />
      </View>

      {/* Right Column: Content */}
      <View style={styles.contentSection}>
        <View>
          {/* Top Row: Category (Left) */}
          <View style={styles.contentHeader}>
            <Text style={styles.category}>{item.group || "NOTICE"}</Text>
          </View>

          {/* Title & Description */}
          <Text style={styles.title} numberOfLines={2}>
            {noticeText}
          </Text>
          {item.subject && (
            <Text style={styles.description} numberOfLines={2}>
              {item.subject}
            </Text>
          )}
        </View>

        {/* Footer: Phone Number (Bottom Left) */}
        {contactNumbers.length > 0 && (
          <View style={styles.footer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.contactList}
            >
              {contactNumbers.map((number, index) => (
                <TouchableOpacity
                  key={`${number}-${index}`}
                  style={styles.contactChip}
                  onPress={(e) => {
                    e.stopPropagation();
                    Linking.openURL(`tel:${number}`);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.contactText}>{number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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
            scrollEnabled={true}
            nestedScrollEnabled={true}
            directionalLockEnabled={true}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            overScrollMode="never"
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
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
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
  primary: BRAND?.COLORS?.primary || "#1F78D1",
  primaryLight: "#E8F2FD",
  text: "#0F172A",
  textSecondary: "#475569", // slightly darker for better readability
  textTertiary: "#94A3B8",
  background: "#ffffff",
  cardBackground: "#FFFFFF",
  border: "#E2E8F0",
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 100,
  },

  /* ─── Card (Horizontal Layout) ─── */
  card: {
    flexDirection: "row",
    marginHorizontal: 4,
    marginVertical: 5,
    borderRadius: 12, // Reduced slightly
    overflow: "hidden",
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 110, // Decreased size of card overall
  },

  /* ─── Left Column (Image) ─── */
  imageSection: {
    width: "28%", // Taking ~30% width
    backgroundColor: COLORS.primaryLight,
  },
  fullImage: {
    // Absolute positioning guarantees it fills exactly the imageSection wrapper height
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  avatarPlaceholderFull: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextFull: {
    fontSize: 30, // scaled down slightly
    fontWeight: "700",
    color: COLORS.primary,
    opacity: 0.8,
  },

  /* ─── Right Column (Content) ─── */
  contentSection: {
    flex: 1,
    padding: 12, // Reduced padding
    justifyContent: "space-between", 
  },
  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between", // Pushes category left, date right
    alignItems: "center",
    marginBottom: 4,
  },
  category: {
    fontSize: 10, // Smaller category tag
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  date: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "500",
  },
  title: {
    fontSize: 14, // Slightly smaller
    fontWeight: "700",
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  description: {
    fontSize: 12, // Slightly smaller
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },

  /* ─── Footer (Phone) ─── */
  footer: {
    marginTop: 'auto',
    paddingTop: 6,
  },

  contactList: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  contactChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  contactText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
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