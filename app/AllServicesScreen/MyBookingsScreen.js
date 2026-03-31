import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";
import AppHeader from "../components/AppHeader";
import Ionicons from "react-native-vector-icons/Ionicons";
import BRAND from "../config";
import FloatingActionButton from "../VisitorsScreen/components/Fab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateOnly = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString.replace(" ", "T") + "Z");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTimeOnly = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString.replace(" ", "T") + "Z");
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const getDuration = (from, to) => {
  if (!from || !to) return null;
  const diffMs = new Date(to.replace(" ", "T") + "Z") - new Date(from.replace(" ", "T") + "Z");
  if (diffMs <= 0) return null;
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs && mins) return `${hrs}h ${mins}m`;
  if (hrs) return `${hrs}h`;
  return `${mins}m`;
};

// ─── Themes ───────────────────────────────────────────────────────────────────

const LIGHT = {
  bg: "#f9fbfd",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  text: "#0C1A2E",
  sub: "#7A8FA6",
  accent: BRAND.COLORS.primary,
  pill: "rgba(25,150,211,0.10)",
  pillText: BRAND.COLORS.primary,
  divider: "#EDF0F5",
  timeBg: "#F7F9FC",
  shadow: "#B8C8DC",
  dotGreen: "#22C55E",
  dotBg: "rgba(34,197,94,0.12)",
};

const DARK = {
  bg: "#080E1A",
  card: "#111827",
  border: "rgba(255,255,255,0.07)",
  text: "#E8F0FA",
  sub: "#4E6480",
  accent: BRAND.COLORS.primary,
  pill: "rgba(25,150,211,0.15)",
  pillText: "#5BB8EE",
  divider: "#1A2536",
  timeBg: "#0D1525",
  shadow: "#000000",
  dotGreen: "#22C55E",
  dotBg: "rgba(34,197,94,0.12)",
};

// ─── Booking Card ─────────────────────────────────────────────────────────────

const BookingCard = ({ item, t }) => {
  const duration = getDuration(item.booking_from, item.booking_to);
  const hasImage = !!item.location?.image?.[0];

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border, shadowColor: t.shadow }]}>

      {/* ── Header ── */}
      <View style={styles.cardHeader}>
        {hasImage ? (
          <Image source={{ uri: item.location.image[0] }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbFallback, { backgroundColor: t.pill }]}>
            <Ionicons name="business-outline" size={20} color={t.accent} />
          </View>
        )}

        <View style={styles.headerMid}>
          <Text style={[styles.amenityName, { color: t.text }]} numberOfLines={1}>
            {item.location?.name || "Unknown Amenity"}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={11} color={t.sub} />
            <Text style={[styles.metaText, { color: t.sub }]}>
              {" "}Booked {formatDateOnly(item.created_at)}
            </Text>
          </View>
        </View>

        <View style={[styles.chip, { backgroundColor: t.dotBg }]}>
          <View style={[styles.chipDot, { backgroundColor: t.dotGreen }]} />
          <Text style={[styles.chipLabel, { color: t.dotGreen }]}>Confirmed</Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={[styles.divider, { backgroundColor: t.divider }]} />

      {/* ── Time Strip ── */}
      <View style={[styles.timeStrip, { backgroundColor: t.timeBg }]}>
        {/* From */}
        <View style={styles.timeCol}>
          <Text style={[styles.timeCaption, { color: t.sub }]}>FROM</Text>
          <Text style={[styles.timeHero, { color: t.accent }]}>
            {formatTimeOnly(item.booking_from)}
          </Text>
          <Text style={[styles.timeDate, { color: t.text }]}>
            {formatDateOnly(item.booking_from)}
          </Text>
        </View>

        {/* Centre duration */}
        <View style={styles.timeCentre}>
          <View style={[styles.durationLine, { backgroundColor: t.divider }]} />
          {duration && (
            <View style={[styles.durationBubble, { backgroundColor: t.card, borderColor: t.border }]}>
              <Ionicons name="time-outline" size={10} color={t.sub} />
              <Text style={[styles.durationLabel, { color: t.sub }]}> {duration}</Text>
            </View>
          )}
          <View style={[styles.durationLine, { backgroundColor: t.divider }]} />
        </View>

        {/* To */}
        <View style={[styles.timeCol, { alignItems: "flex-end" }]}>
          <Text style={[styles.timeCaption, { color: t.sub }]}>TO</Text>
          <Text style={[styles.timeHero, { color: t.accent }]}>
            {formatTimeOnly(item.booking_to)}
          </Text>
          <Text style={[styles.timeDate, { color: t.text }]}>
            {formatDateOnly(item.booking_to)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const MyBookingsScreen = ({ navigation }) => {
  const { nightMode } = usePermissions();
  const t = nightMode ? DARK : LIGHT;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchBookings(); }, []);


  // SIMPLIFY fetchBookings
  const fetchBookings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await otherServices.getMyAmenityBookings();
      if (response?.status === "success") {
        setBookings(response.data || []);
      } else {
        setBookings([]);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };



  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(true);
  }, []);
  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
        <AppHeader title="My Bookings" />
        <View style={styles.centreBox}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loaderText, { color: t.sub }]}>Fetching your bookings…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookings.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
        <AppHeader title="My Bookings" />
        <View style={styles.centreBox}>
          <View style={[styles.emptyRing, { borderColor: t.divider, backgroundColor: t.card }]}>
            <Ionicons name="calendar-outline" size={36} color={t.sub} />
          </View>
          <Text style={[styles.emptyHeading, { color: t.text }]}>No Bookings Yet</Text>
          <Text style={[styles.emptyCopy, { color: t.sub }]}>
            Amenities you book will{"\n"}show up right here.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: t.bg }]}>
      <AppHeader title="My Bookings" />
      <FlatList
        data={bookings}
        keyExtractor={(item, i) => (item.id ? String(item.id) : String(i))}
        renderItem={({ item }) => <BookingCard item={item} t={t} />}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[t.accent]}
            tintColor={t.accent}
          />
        }
      />

      <FloatingActionButton
        onPress={() => navigation.navigate("AmenitiesListScreen")}
        icon="add"
        backgroundColor={t.accent}
        bottom={24}
        right={24}
      />
    </SafeAreaView>
  );
};

export default MyBookingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listPad: { padding: 16, paddingBottom: 100 },

  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 3 },
    }),
  },

  // Header
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 12 },
  thumb: { width: 46, height: 46, borderRadius: 13, marginRight: 12 },
  thumbFallback: { width: 46, height: 46, borderRadius: 13, marginRight: 12, justifyContent: "center", alignItems: "center" },
  headerMid: { flex: 1, paddingRight: 10 },
  amenityName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, fontWeight: "500" },

  // Chip
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  chipLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },

  // Divider
  divider: { height: 1 },

  // Time strip
  timeStrip: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  timeCol: { flex: 1 },
  timeCaption: { fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginBottom: 4 },
  timeHero: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5, marginBottom: 2 },
  timeDate: { fontSize: 11, fontWeight: "500" },

  timeCentre: { flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  durationLine: { flex: 1, height: 1 },
  durationBubble: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginHorizontal: 6 },
  durationLabel: { fontSize: 10, fontWeight: "600" },

  // Loading / Empty
  centreBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, fontWeight: "500" },
  emptyRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyHeading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  emptyCopy: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 6 },
  footerLoader: { paddingVertical: 20, alignItems: "center" },
});