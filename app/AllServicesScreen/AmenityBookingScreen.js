import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import StatusModal from "../../app/components/StatusModal";
import { usePermissions } from "../../Utils/ConetextApi";
import { otherServices } from "../../services/otherServices";
import Ionicons from "react-native-vector-icons/Ionicons";
import SubmitButton from "../components/SubmitButton";
import BRAND from "../config";

const { width } = Dimensions.get("window");

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AmenityBookingScreen = ({ route, navigation }) => {
  const { item: amenity, type } = route?.params || {};
  const { nightMode } = usePermissions();

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [allBookings, setAllBookings] = useState([]);       // used for calendar day-count checks
  const [dateBookings, setDateBookings] = useState([]);     // used for slot booked checks
  const [screenLoading, setScreenLoading] = useState(true);
  const [slotLoading, setSlotLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("loading");
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");

  const theme = {
    background: nightMode ? "#0F172A" : "#F9FAFB",
    card: nightMode ? "#1E293B" : "#FFFFFF",
    text: nightMode ? "#F1F5F9" : "#111827",
    subText: nightMode ? "#94A3B8" : "#6B7280",
    border: nightMode ? "#334155" : "#E5E7EB",
    primary: "#1996D3",
    success: "#10B981",
    danger: "#EF4444",
    disabled: "#9CA3AF",
  };

  // ─── EFFECTS ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBookings();
  }, [amenity?.id]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookingsForDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
  if (!selectedDate && calendarDays.length > 0 && !screenLoading) {
    const firstAvailable = findFirstAvailableDate();

    if (firstAvailable) {
      console.log("✅ Auto selecting date:", firstAvailable);
      setSelectedDate(firstAvailable);
    }
  }
}, [calendarDays, screenLoading]);

  // ─── API CALLS ───────────────────────────────────────────────────────────────

  const fetchBookings = async () => {
    try {
      if (!amenity?.id) return;
      const res = await otherServices.getAmenityBookingsById(amenity.id);
      setAllBookings(res?.data || []);
    } catch (err) {
      console.log("Booking fetch error:", err);
    } finally {
      setScreenLoading(false);
    }
  };

  const fetchBookingsForDate = async (date) => {
    try {
      setSlotLoading(true);
      const res = await otherServices.getAmenityBookingsByDate(amenity.id, date);
      setDateBookings(res?.data || []);
    } catch (err) {
      console.log("Date booking fetch error:", err);
    } finally {
      setSlotLoading(false);
    }
  };

  // ─── PARSED AMENITY DATA ─────────────────────────────────────────────────────

  const parsedSlot = useMemo(() => {
    try {
      return JSON.parse(amenity?.slot ?? "{}") ?? {};
    } catch {
      return {};
    }
  }, [amenity]);

  const rules = useMemo(() => {
    if (!amenity?.rules) return {};
    try {
      return JSON.parse(amenity.rules);
    } catch {
      return {};
    }
  }, [amenity]);

  const blockedDates = useMemo(() => {
    if (!amenity?.no_availability_days) return [];
    try {
      return JSON.parse(amenity.no_availability_days);
    } catch {
      return [];
    }
  }, [amenity]);

  // ─── DATE HELPERS ────────────────────────────────────────────────────────────

const findFirstAvailableDate = () => {
  let tempMonth = new Date(calendarMonth);

  for (let i = 0; i < 6; i++) { // check next 6 months max
    const year = tempMonth.getFullYear();
    const month = tempMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      if (isDateSelectable(date)) {
        // 🔥 also update calendar to that month
        setCalendarMonth(new Date(year, month, 1));
        return date;
      }
    }

    // move to next month
    tempMonth.setMonth(tempMonth.getMonth() + 1);
  }

  return null;
};

  // Always uses local time — avoids UTC midnight shift in UTC+ and UTC- timezones
  const formatDate = (dateObj) => dateObj.toLocaleDateString("en-CA");

  // Fix 4: Defensive time extraction — handles "YYYY-MM-DD HH:mm:ss",
  // "YYYY-MM-DDTHH:mm:ss" and any unknown future format gracefully
  const extractTime = (datetimeStr) => {
    if (!datetimeStr) return null;
    const normalized = datetimeStr.replace("T", " ");
    const parts = normalized.split(" ");
    return parts[1] ?? null; // returns "HH:mm:ss" or null if malformed
  };

  // Fix 2 & 3: Precompute booking count per date once using useMemo —
  // avoids re-filtering the full array on every calendar cell render
  const bookingCountMap = useMemo(() => {
    const map = {};
    allBookings.forEach((b) => {
      const dateKey = b.booking_from?.replace("T", " ").split(" ")[0];
      if (dateKey) {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    });
    return map;
  }, [allBookings]);

  const getDayBookingCount = (date) => bookingCountMap[date] || 0;

  const isDateSelectable = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Force local midnight to avoid UTC day-shift bug
    const selected = new Date(`${date}T00:00:00`);
    if (selected < today) return false;

    if (rules.no_of_future_days) {
      const future = new Date();
      future.setDate(future.getDate() + rules.no_of_future_days);
      if (selected > future) return false;
    }

    // Support both {d: "YYYY-MM-DD"} object format and plain "YYYY-MM-DD" string format
    if (blockedDates.some((d) => d === date || d?.d === date)) return false;

    const dayIndex = selected.getDay();
    if (!parsedSlot?.[dayIndex] || parsedSlot[dayIndex]?.avl !== true) return false;

    const max = rules?.max_per_day || 0;
    if (max && getDayBookingCount(date) >= max) return false;

    return true;
  };

  // ─── SLOT HELPERS ────────────────────────────────────────────────────────────

  const isSlotBooked = (slot) => {
    if (!selectedDate) return false;
    return dateBookings.some((b) => {
      // Fix 1: null-safe — skip malformed booking entries instead of crashing
      const bookingStart = extractTime(b.booking_from);
      const bookingEnd = extractTime(b.booking_to);
      if (!bookingStart || !bookingEnd) return false;
      return (
        bookingStart === `${slot.from}:00` &&
        bookingEnd === `${slot.to}:00`
      );
    });
  };

  const isSlotPassed = (slot) => {
    if (!selectedDate) return false;
    const now = new Date();
    const today = formatDate(now); // local date string e.g. "2024-01-15"
    // Only mark as passed if the selected date IS today — future dates are never "passed"
    if (selectedDate !== today) return false;
    // T separator forces local time parsing — avoids UTC offset bug
    const slotStart = new Date(`${selectedDate}T${slot.from}:00`);
    return slotStart <= now;
  };

  // ─── CALENDAR ────────────────────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
    return cells;
  }, [calendarMonth]);

  const goToPrevMonth = () => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() - 1);
    setCalendarMonth(d);
    // Fix 5: Clear stale selection when month changes to avoid confusing UI state
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const goToNextMonth = () => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + 1);
    setCalendarMonth(d);
    // Fix 5: Clear stale selection when month changes to avoid confusing UI state
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  // ─── SLOTS ───────────────────────────────────────────────────────────────────

  const availableSlots = useMemo(() => {
    if (!selectedDate || !parsedSlot) return [];
    // T00:00:00 forces local time parsing — fixes wrong getDay() in UTC+/- timezones
    const dayIndex = new Date(`${selectedDate}T00:00:00`).getDay();
    const dayData = parsedSlot?.[dayIndex];
    if (!dayData || dayData?.avl !== true) return [];
    return dayData?.hrs || [];
  }, [selectedDate, parsedSlot]);

  // ─── BOOKING HANDLERS ────────────────────────────────────────────────────────

  const handleSlotSelect = async (slot) => {
    // Include :00 seconds to match the format handleBooking sends to the backend
    const from = `${selectedDate} ${slot.from}:00`;
    const to = `${selectedDate} ${slot.to}:00`;
    try {
      setSlotLoading(true); // Fix 6: slotLoading=true disables ALL slot buttons during check
      const res = await otherServices.checkSlotAvailability(amenity.id, from, to);
      if (res?.data?.length > 0) {
        setModalType("error");
        setModalTitle("Slot Already Booked");
        setModalSubtitle("Please select another slot");
        setModalVisible(true);
        return;
      }
      setSelectedSlot(slot);
    } catch (err) {
      // Fix 7: Show modal on network failure instead of silently swallowing the error
      console.log("Slot check error:", err);
      setModalType("error");
      setModalTitle("Availability Check Failed");
      setModalSubtitle("Could not verify slot. Please check your connection and try again.");
      setModalVisible(true);
    } finally {
      setSlotLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!selectedDate || !selectedSlot) {
      setModalType("error");
      setModalTitle("Select Date & Slot");
      setModalSubtitle("Please choose a valid slot");
      setModalVisible(true);
      return;
    }

    const bookingFrom = `${selectedDate} ${selectedSlot.from}:00`;
    const bookingTo = `${selectedDate} ${selectedSlot.to}:00`;

    if (type === "PARKING") {
  const onParkingSelected = route.params?.onParkingSelected;

  if (onParkingSelected) {
    onParkingSelected({
      location_id: amenity.id,
      booking_from: bookingFrom,
      booking_to: bookingTo,
      slot: `${selectedSlot.from} - ${selectedSlot.to}`,
    });
    navigation.pop(2); // ✅ pops AmenityBooking + AmenitiesListScreen, returns to form
  } else {
    // fallback for other entry points
    navigation.navigate("AddVisitor", {
      selectedParking: {
        location_id: amenity.id,
        booking_from: bookingFrom,
        booking_to: bookingTo,
        slot: `${selectedSlot.from} - ${selectedSlot.to}`,
      },
    });
  }
  return;
}
    // AMENITY FLOW
    try {
      setModalType("loading");
      setModalTitle("Processing...");
      setModalVisible(true);

      const res = await otherServices.bookAmenity(
        amenity.id,
        bookingFrom,
        bookingTo,
        type
      );

      if (res?.status === "success") {
        setModalType("success");
        setModalTitle("Booking Confirmed");
        setModalSubtitle(`${selectedDate}\n${selectedSlot.from} - ${selectedSlot.to}`);
        setTimeout(() => navigation.goBack(), 2000);
      } else {
        setModalType("error");
        setModalTitle("Booking Failed");
        setModalSubtitle(
          res?.message || res?.data?.message || "Unable to complete booking"
        );
      }
    } catch (err) {
      console.log("Booking Error:", err);
      setModalType("error");
      setModalTitle("Network Error");
      setModalSubtitle("Please check your internet connection");
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────

  const cellSize = Math.floor((width - 32 - 32) / 7);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title={`Book ${amenity?.name || ""}`} />

      {screenLoading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* ── CALENDAR ── */}
          <View style={[styles.calendarCard, { backgroundColor: theme.card, borderColor: theme.border }]}>

            {/* Month Nav */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
                < Ionicons name="chevron-back" size={20} color={BRAND.COLORS.icon} />
              </TouchableOpacity>
              <Text style={[styles.monthTitle, { color: theme.text }]}>
                {MONTHS[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </Text>
              <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
                < Ionicons name="chevron-forward" size={20} color={BRAND.COLORS.icon} />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.weekRow}>
              {DAYS_OF_WEEK.map((d) => (
                <Text key={d} style={[styles.weekDay, { color: theme.subText, width: cellSize }]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Date Grid */}
            <View style={styles.grid}>
              {calendarDays.map((date, i) => {
                if (!date) {
                  return <View key={`empty-${i}`} style={{ width: cellSize, height: cellSize }} />;
                }

                const selectable = isDateSelectable(date);
                const isSelected = selectedDate === date;
                const dayNum = parseInt(date.split("-")[2], 10);
                const isToday = date === formatDate(new Date());

                return (
                  <TouchableOpacity
                    key={date}
                    disabled={!selectable}
                    onPress={() => {
                      setSelectedDate(date);
                      setSelectedSlot(null);
                    }}
                    style={[
                      styles.dayCell,
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRadius: cellSize / 2,
                        backgroundColor: isSelected
                          ? theme.primary
                          : isToday
                            ? `${theme.primary}22`
                            : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected || isToday ? "700" : "400",
                        color: isSelected
                          ? "#fff"
                          : !selectable
                            ? theme.disabled
                            : theme.text,
                      }}
                    >
                      {dayNum}
                    </Text>
                    {selectable && !isSelected && (
                      <View style={[styles.availDot, { backgroundColor: theme.success }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.success }]} />
                <Text style={[styles.legendText, { color: theme.subText }]}>Available</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                <Text style={[styles.legendText, { color: theme.subText }]}>Selected</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.disabled }]} />
                <Text style={[styles.legendText, { color: theme.subText }]}>Unavailable</Text>
              </View>
            </View>
          </View>

          {/* ── TIME SLOTS ── */}
          {selectedDate && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Time Slots —{" "}
                <Text style={{ color: theme.primary }}>
                  {/* T00:00:00 prevents UTC day-shift in display */}
                  {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </Text>

              {slotLoading ? (
                <ActivityIndicator size="small" color={BRAND.COLORS.icon} style={{ marginTop: 20 }} />
              ) : availableSlots.length === 0 ? (
                <View style={[styles.emptySlots, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  < Ionicons name="time-outline" size={28} color={theme.subText} />
                  <Text style={[styles.emptyText, { color: theme.subText }]}>No slots available</Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map((slot, i) => {
                    const booked = isSlotBooked(slot);
                    const passed = isSlotPassed(slot);
                    const isSelected =
                      selectedSlot?.from === slot.from &&
                      selectedSlot?.to === slot.to;

                    return (
                      <TouchableOpacity
                        key={i}
                        // Fix 6: Disable during slotLoading to prevent double-tap race conditions
                        disabled={booked || passed || slotLoading}
                        onPress={() => handleSlotSelect(slot)}
                        style={[
                          styles.slotChip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.card,
                            borderColor: theme.border,
                            opacity: booked || passed ? 0.5 : 1,
                          },
                        ]}
                      >
                        < Ionicons
                          name="time-outline"
                          size={13}
                          color={
                            isSelected ? "#fff" :
                            booked || passed ? theme.subText :
                            theme.primary
                          }
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            marginLeft: 4,
                            color: isSelected ? "#fff" :
                                   booked || passed ? theme.subText :
                                   theme.text,
                          }}
                        >
                          {slot.from} - {slot.to}
                        </Text>
                        {booked && (
                          <Text style={{ fontSize: 10, color: theme.danger, marginLeft: 4 }}>
                            Booked
                          </Text>
                        )}
                        {passed && !booked && (
                          <Text style={{ fontSize: 10, color: theme.danger, marginLeft: 4 }}>
                            Passed
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* CONFIRM BUTTON */}
          <SubmitButton
            title="Confirm Booking"
            onPress={handleBooking}
            loading={false}
            disabled={!selectedSlot}
          />
        </ScrollView>
      )}

      <StatusModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        subtitle={modalSubtitle}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default AmenityBookingScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },

  content: {
    padding: 16,
    paddingBottom: 50,
  },

  calendarCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
  },

  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  navBtn: {
    padding: 4,
  },

  monthTitle: {
    fontSize: 14,
    fontWeight: "700",
  },

  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },

  weekDay: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayCell: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  availDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    position: "absolute",
    bottom: 4,
  },

  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    fontSize: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },

  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },

  emptySlots: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },

  bookBtn: {
    marginTop: 28,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },

  bookText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});