import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { otherServices } from "../../services/otherServices";
import BRAND from "../config";
import AppHeader from "../components/AppHeader";

const COLORS = {
  primary: BRAND.COLORS.primary,
  present: "#22C55E",
  absent: "#DC2626",
  background: "#F8FAFC",
  card: "#FFFFFF",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
};

// FIX 1: Unique keys for day headers to avoid React key warnings
const DAYS = [
  { label: "S", key: "sun" },
  { label: "M", key: "mon" },
  { label: "T", key: "tue" },
  { label: "W", key: "wed" },
  { label: "T", key: "thu" },
  { label: "F", key: "fri" },
  { label: "S", key: "sat" },
];

const AttendanceCalendar = ({
  year,
  month,
  presentDates,
  absentDates,
  selectedDate,
  onDayPress,
}) => {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  const cells = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let i = 1; i <= totalDays; i++) arr.push(i);
    return arr;
  }, [firstDay, totalDays]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <View>
      {/* FIX 2: Use unique key for day headers */}
      <View style={styles.dayRow}>
        {DAYS.map((d) => (
          <Text key={d.key} style={styles.dayHeader}>
            {d.label}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.dayCell} />;

          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;

          const isSelected = selectedDate === dateStr;
          const isFuture = dateStr > todayStr;

          let dotColor = null;

          if (!isFuture) {
            if (presentDates.has(dateStr)) dotColor = COLORS.present;
            else if (absentDates.has(dateStr)) dotColor = COLORS.absent;
          }

          return (
            <TouchableOpacity
              key={dateStr}
              style={styles.dayCell}
              onPress={() => !isFuture && onDayPress(dateStr)}
              activeOpacity={isFuture ? 1 : 0.7}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && { backgroundColor: '#70b0cb' },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: isSelected ? "#fff" : isFuture ? COLORS.subText : COLORS.text },
                  ]}
                >
                  {day}
                </Text>

                {dotColor && (
                  <View
                    style={[styles.statusDot, { backgroundColor: dotColor }]}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FIX 3: Legend added inside calendar card */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.present }]} />
          <Text style={styles.legendText}>Present</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.absent }]} />
          <Text style={styles.legendText}>Absent</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#70b0cb" }]} />
          <Text style={styles.legendText}>Selected</Text>
        </View>
      </View>
    </View>
  );
};

const StaffAttendanceScreen = ({ route, navigation }) => {
  const { staff } = route.params;
  const staffId = staff.staff_id || staff.id;

  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [attendanceData, setAttendanceData] = useState([]);
  const [metadata, setMetadata] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedDate(null);

      const res = await otherServices.getStaffAttendance(staffId, month, year);

      if (res?.status === "success") {
        setAttendanceData(Array.isArray(res.data) ? res.data : []);
        setMetadata(res.metadata || {});
      } else {
        setAttendanceData([]);
        setMetadata({});
      }
    } catch (e) {
      console.log("Attendance error:", e);
      setAttendanceData([]);
      setMetadata({});
    } finally {
      setLoading(false);
    }
  }, [staffId, month, year]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const presentDates = useMemo(() => {
    const s = new Set();
    attendanceData.forEach((i) => {
      const d = i.start_time?.split(" ")[0];
      if (d) s.add(d);
    });
    return s;
  }, [attendanceData]);

  // FIX 4: Absent dates should NOT include future dates
  const absentDates = useMemo(() => {
    const s = new Set();
    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(
      todayDate.getMonth() + 1
    ).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

    const days = new Date(year, month, 0).getDate();

    for (let i = 1; i <= days; i++) {
      const d = `${year}-${String(month).padStart(2, "0")}-${String(i).padStart(
        2,
        "0"
      )}`;
      // Only mark as absent if the date is today or in the past
      if (d <= todayStr && !presentDates.has(d)) {
        s.add(d);
      }
    }

    return s;
  }, [presentDates, year, month]);

  const selectedRecord = useMemo(() => {
    if (!selectedDate) return null;
    return attendanceData.find((i) => i.start_time?.startsWith(selectedDate));
  }, [selectedDate, attendanceData]);

  const present = parseInt(metadata?.present ?? 0);
  const absent = parseInt(metadata?.absent ?? 0);
  const total = parseInt(metadata?.total ?? 0);

  const isNextMonthDisabled =
    month === today.getMonth() + 1 && year === today.getFullYear();

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (isNextMonthDisabled) return;
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
  });

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={`${staff.name}`} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* MONTH NAV */}
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            < Ionicons name="chevron-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          {/* FIX 5: Show month name instead of just number */}
          <Text style={styles.monthText}>
            {monthName} {year}
          </Text>

          <TouchableOpacity
            onPress={nextMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            < Ionicons
              name="chevron-forward"
              size={22}
              color={isNextMonthDisabled ? COLORS.border : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.present }]}>
              {present}
            </Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.absent }]}>
              {absent}
            </Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, { color: COLORS.primary }]}>
              {total}
            </Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* CALENDAR */}
        <View style={styles.calendarCard}>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ paddingVertical: 40 }} />
          ) : (
            <AttendanceCalendar
              year={year}
              month={month}
              presentDates={presentDates}
              absentDates={absentDates}
              selectedDate={selectedDate}
              onDayPress={setSelectedDate}
            />
          )}
        </View>

        {/* DETAIL */}
        {selectedDate && (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>{selectedDate}</Text>

            <Text
              style={{
                color: selectedRecord ? COLORS.present : COLORS.absent,
                fontWeight: "600",
                marginBottom: selectedRecord ? 8 : 0,
              }}
            >
              {selectedRecord ? "Present" : "Absent"}
            </Text>

            {/* FIX 6: timeRow now has flexDirection row so Entry & Exit appear side by side */}
            {selectedRecord && (
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  Entry: {selectedRecord.start_time?.split(" ")[1] || "--"}
                </Text>
                <Text style={styles.timeText}>
                 Exit: {selectedRecord.end_time?.split(" ")[1] || "--"}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default StaffAttendanceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    margin: 16,
    alignItems: "center",
  },

  monthText: { fontSize: 18, fontWeight: "700", color: COLORS.text },

  summaryRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10 },

  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginHorizontal: 4,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  summaryNumber: { fontSize: 20, fontWeight: "700" },

  summaryLabel: { fontSize: 11, color: COLORS.subText, marginTop: 2 },

  calendarCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  dayRow: { flexDirection: "row", marginBottom: 6 },

  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: "600",
  },

  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },

  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  dayText: { fontSize: 12, fontWeight: "600" },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    bottom: 2,
  },

  // Legend styles
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 16,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  legendText: {
    fontSize: 12,
    color: COLORS.subText,
  },

  detailCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 10,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  detailTitle: {
    fontWeight: "700",
    marginBottom: 6,
    fontSize: 15,
    color: COLORS.text,
  },

  // FIX 6: Row layout for Entry/Exit times
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  timeText: { fontSize: 13, color: COLORS.subText },
});