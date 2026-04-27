import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";
import AppHeader from "../components/AppHeader";
import Ionicons from "react-native-vector-icons/Ionicons";
import BRAND from "../config";
import FloatingActionButton from "../VisitorsScreen/components/Fab";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

// ─── Theme Constants ──────────────────────────────────────────────────────────

const LIGHT = {
  bg: "#f9fbfd",
  card: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
  text: "#0C1A2E",
  sub: "#7A8FA6",
  accent: BRAND.COLORS.primary,
  pill: "rgba(25,150,211,0.10)",
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
  divider: "#1A2536",
  timeBg: "#0D1525",
  shadow: "#000000",
  dotGreen: "#22C55E",
  dotBg: "rgba(34,197,94,0.12)",
};

const MyBookingsScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const { nightMode } = usePermissions();
  const theme = nightMode ? DARK : LIGHT;

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Localization Helpers ──────────────────────────────────────────────────
  
  const currentLocale = i18n.language === 'km' ? 'km-KH' : 'en-IN';

  const formatDateOnly = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString.replace(" ", "T") + "Z");
    return d.toLocaleDateString(currentLocale, { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTimeOnly = (dateString) => {
    if (!dateString) return "—";
    const d = new Date(dateString.replace(" ", "T") + "Z");
    return d.toLocaleTimeString(currentLocale, { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const getDuration = (from, to) => {
    if (!from || !to) return null;
    const diffMs = new Date(to.replace(" ", "T") + "Z") - new Date(from.replace(" ", "T") + "Z");
    if (diffMs <= 0) return null;
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}${t('h')}`);
    if (mins > 0) parts.push(`${mins}${t('m')}`);
    return parts.join(' ');
  };

  const fetchBookings = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const response = await otherServices.getMyAmenityBookings();
      if (response?.status === "success") {
        setBookings(response.data || []);
      } else {
        setBookings([]);
      }
    } catch (error) {
      console.log("Fetch Error:", error);
      setBookings([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(true);
  }, []);

  const renderItem = ({ item }) => {
    const duration = getDuration(item.booking_from, item.booking_to);
    const hasImage = !!item.location?.image?.[0];

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.cardHeader}>
          {hasImage ? (
            <Image source={{ uri: item.location.image[0] }} style={styles.thumb} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbFallback, { backgroundColor: theme.pill }]}>
              <Ionicons name="business-outline" size={20} color={theme.accent} />
            </View>
          )}

          <View style={styles.headerMid}>
            <Text style={[styles.amenityName, { color: theme.text }]} numberOfLines={1}>
              {t(item.location?.name) || t("Unknown Amenity")}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={11} color={theme.sub} />
              <Text style={[styles.metaText, { color: theme.sub }]}>
                {" "}{t("Booked")} {formatDateOnly(item.created_at)}
              </Text>
            </View>
          </View>

          <View style={[styles.chip, { backgroundColor: theme.dotBg }]}>
            <View style={[styles.chipDot, { backgroundColor: theme.dotGreen }]} />
            <Text style={[styles.chipLabel, { color: theme.dotGreen }]}>{t("Confirmed")}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={[styles.timeStrip, { backgroundColor: theme.timeBg }]}>
          <View style={styles.timeCol}>
            <Text style={[styles.timeCaption, { color: theme.sub }]}>{t("FROM")}</Text>
            <Text style={[styles.timeHero, { color: theme.accent }]}>{formatTimeOnly(item.booking_from)}</Text>
            <Text style={[styles.timeDate, { color: theme.text }]}>{formatDateOnly(item.booking_from)}</Text>
          </View>

          <View style={styles.timeCentre}>
            <View style={[styles.durationLine, { backgroundColor: theme.divider }]} />
            {duration && (
              <View style={[styles.durationBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={10} color={theme.sub} />
                <Text style={[styles.durationLabel, { color: theme.sub }]}> {duration}</Text>
              </View>
            )}
            <View style={[styles.durationLine, { backgroundColor: theme.divider }]} />
          </View>

          <View style={[styles.timeCol, { alignItems: "flex-end" }]}>
            <Text style={[styles.timeCaption, { color: theme.sub }]}>{t("TO")}</Text>
            <Text style={[styles.timeHero, { color: theme.accent }]}>{formatTimeOnly(item.booking_to)}</Text>
            <Text style={[styles.timeDate, { color: theme.text }]}>{formatDateOnly(item.booking_to)}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AppHeader title={t("My Bookings")} />
        <View style={styles.centreBox}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loaderText, { color: theme.sub }]}>{t("Fetching your bookings...")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (bookings.length === 0) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <AppHeader title={t("My Bookings")} />
        <View style={styles.centreBox}>
          <View style={[styles.emptyRing, { borderColor: theme.divider, backgroundColor: theme.card }]}>
            <Ionicons name="calendar-outline" size={36} color={theme.sub} />
          </View>
          <Text style={[styles.emptyHeading, { color: theme.text }]}>{t("No Bookings Yet")}</Text>
          <Text style={[styles.emptyCopy, { color: theme.sub }]}>
            {t("Amenities you book will show up right here.")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <AppHeader title={t("My Bookings")} />
      <FlatList
        data={bookings}
        keyExtractor={(item, i) => (item.id ? String(item.id) : String(i))}
        renderItem={renderItem}
        contentContainerStyle={styles.listPad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
          />
        }
      />
      <FloatingActionButton
        onPress={() => navigation.navigate("AmenitiesListScreen")}
        icon="add"
        backgroundColor={theme.accent}
        bottom={24}
        right={24}
      />
    </SafeAreaView>
  );
};

export default MyBookingsScreen;

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
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 12 },
  thumb: { width: 46, height: 46, borderRadius: 13, marginRight: 12 },
  thumbFallback: { width: 46, height: 46, borderRadius: 13, marginRight: 12, justifyContent: "center", alignItems: "center" },
  headerMid: { flex: 1, paddingRight: 10 },
  amenityName: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 11, fontWeight: "500" },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  chipDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  chipLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
  divider: { height: 1 },
  timeStrip: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  timeCol: { flex: 1 },
  timeCaption: { fontSize: 9, fontWeight: "700", letterSpacing: 1.4, marginBottom: 4 },
  timeHero: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5, marginBottom: 2 },
  timeDate: { fontSize: 11, fontWeight: "500" },
  timeCentre: { flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: 8 },
  durationLine: { flex: 1, height: 1 },
  durationBubble: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginHorizontal: 6 },
  durationLabel: { fontSize: 10, fontWeight: "600" },
  centreBox: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, fontWeight: "500" },
  emptyRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyHeading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  emptyCopy: { fontSize: 13, textAlign: "center", lineHeight: 20, marginTop: 6 },
});