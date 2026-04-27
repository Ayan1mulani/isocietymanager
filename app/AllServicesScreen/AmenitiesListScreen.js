import React, { useEffect, useState, useCallback } from "react";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { usePermissions } from "../../Utils/ConetextApi";
import { SafeAreaView } from "react-native-safe-area-context";
import { otherServices } from "../../services/otherServices";
import { visitorServices } from "../../services/visitorServices";
import AppHeader from "../components/AppHeader";
import SubmitButton from "../components/SubmitButton";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const { width } = Dimensions.get("window");

const AmenitiesListScreen = () => {
  const { t, i18n } = useTranslation();
  const route = useRoute();
  const { type, title } = route.params || {};

  const { nightMode } = usePermissions();
  const navigation = useNavigation();

  const [todayBookings, setTodayBookings] = useState({});
  const [loading, setLoading] = useState(true);
  const [amenities, setAmenities] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState({});

  const theme = {
    background: nightMode ? "#0F172A" : "#F3F4F6",
    card: nightMode ? "#1E293B" : "#FFFFFF",
    text: nightMode ? "#F1F5F9" : "#111827",
    subText: nightMode ? "#CBD5E1" : "#6B7280",
    border: nightMode ? "#334155" : "#E5E7EB",
    primary: "#1996D3",
    success: "#10B981",
  };

  useFocusEffect(
    useCallback(() => {
      fetchFacilities();
    }, [type])
  );

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      let data = [];
      if (type === "PARKING") {
        const res = await visitorServices.getParkingLocations();
        data = res?.data || [];
      } else {
        data = await otherServices.getAmenities();
      }
      setAmenities(data);
      fetchTodayBookings(data);
    } catch (err) {
      console.log("Facility error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayBookings = async (amenityList) => {
    // Keep ISO format for API filtering
    const today = new Date().toISOString().split('T')[0];
    const counts = {};

    await Promise.all(
      amenityList.map(async (item) => {
        try {
          const res = await otherServices.getAmenityBookingsById(item.id);
          const bookings = res?.data || [];
          const todayCount = bookings.filter((b) =>
            b.booking_from?.startsWith(today)
          ).length;
          counts[item.id] = todayCount;
        } catch {
          counts[item.id] = 0;
        }
      })
    );
    setTodayBookings(counts);
  };

  const onImageScroll = (event, itemId) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / (width - 32));
    setCurrentImageIndex((prev) => ({ ...prev, [itemId]: index }));
  };

  const renderAmenity = ({ item }) => {
    const imageIndex = currentImageIndex[item.id] || 0;
    const hasImages = item.image && item.image.length > 0;
    const isActive = item.is_booking === 1;

    let rules = {};
    try { rules = JSON.parse(item.rules || "{}"); } catch { rules = {}; }

    let parsedSlot = {};
    try {
      const temp = JSON.parse(item.slot || "{}");
      parsedSlot = temp && typeof temp === "object" ? temp : {};
    } catch { parsedSlot = {}; }

    let rate = null;
    let rateMethod = "";
    try {
      const parsedData = JSON.parse(item.data || "{}");
      rate = parsedData?.rates?.rate;
      rateMethod = parsedData?.rates?.method;
    } catch { rate = null; }

    const maxPerDay = rules?.max_per_day || 0;
    const todayCount = todayBookings[item.id] || 0;
    const isFull = todayCount >= maxPerDay;

    // Localized Weekdays
    const weekDays = [t("S"), t("M"), t("T"), t("W"), t("T"), t("F"), t("S")];

    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.imageWrapper}>
          {hasImages ? (
            <>
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                onScroll={(e) => onImageScroll(e, item.id)} scrollEventThrottle={16}>
                {item.image.map((img, index) => (
                  <Image key={index} source={{ uri: img }} style={styles.image} />
                ))}
              </ScrollView>
              {item.image.length > 1 && (
                <View style={styles.indicators}>
                  {item.image.map((_, index) => (
                    <View key={index} style={[styles.indicator, { backgroundColor: index === imageIndex ? theme.primary : theme.border }]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.noImageContainer, { backgroundColor: theme.border }]}>
              <Ionicons name="image-outline" size={36} color={theme.subText} />
              <Text style={[styles.noImageText, { color: theme.subText }]}>{t("No images available")}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>{t(item.name)}</Text>

          {rate && (
            <Text style={{ fontSize: 13, fontWeight: "600", color: '#6769e6', marginTop: 2 }}>
              {i18n.language === 'km' ? '៛' : '₹'}{rate} {rateMethod === "per_slot" ? t("/ slot") : ""}
            </Text>
          )}

          <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: isFull ? "#EF4444" : "#10B981" }}>
              {t("TODAY")} {todayCount} / {maxPerDay}
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: isActive ? "#10B981" : "#6B7280" }]}>
            <Text style={styles.badgeText}>{isActive ? t("Open") : t("Closed")}</Text>
          </View>

          {item.description && (
            <View style={{ marginTop: 4 }}>
              <Text numberOfLines={2} style={[styles.description, { color: theme.subText }]}>
                {t(item.description)}
              </Text>
            </View>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.daysRow}>
              {weekDays.map((day, index) => {
                const isAvailable = parsedSlot[index]?.avl === true;
                return (
                  <Text key={index} style={[styles.dayLabel, { color: isAvailable ? "#10B981" : theme.subText }]}>
                    {day}
                  </Text>
                );
              })}
            </View>

            {isActive && (
              <SubmitButton
                title={type === "PARKING" ? t("Book Parking") : t("Book Now")}
                style={{ minWidth: 110 }}
                onPress={() =>
                  navigation.navigate("AmenityBooking", {
                    item: item,
                    type: type,
                    onParkingSelected: route.params?.onParkingSelected,
                  })
                }
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title={title ? t(title) : t("Amenities")} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={amenities}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderAmenity}
          contentContainerStyle={[styles.listContent, amenities.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color={theme.subText} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{t("No amenities available")}</Text>
              <Text style={[styles.emptySub, { color: theme.subText }]}>
                {t("Currently there are no amenities to display.")}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default AmenitiesListScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  listContent: {
    padding: 12,
    paddingBottom: 30,
    gap: 12,
  },

  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },

  imageWrapper: {
    position: "relative",
  },

  image: {
    width: width - 24,
    height: 180,
    resizeMode: "cover",
  },

  noImageContainer: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 30,
},

emptyTitle: {
  fontSize: 18,
  fontWeight: "700",
  marginTop: 12,
},

emptySub: {
  fontSize: 13,
  marginTop: 4,
  textAlign: "center",
},

  noImageText: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: "500",
  },

  indicators: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },

  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  content: {
    padding: 12,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },

  description: {
    fontSize: 13,
    lineHeight: 19,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  daysRow: {
    flexDirection: "row",
    gap: 5,
  },

  dayLabel: {
    fontSize: 11,
    fontWeight: "700",
  },

  bookBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  bookText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});