import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import BRAND from '../../config'

const CalendarSelector = ({
  selectedDate,
  onDateSelect,
  label = "Arrival Date",
  required = true,
  nightMode = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const THEME = {
    primary: BRAND.COLORS.primary,
    textPrimary: nightMode ? "#FFFFFF" : "#1F2937",
    textSecondary: nightMode ? "#9CA3AF" : "#6B7280",
    border: nightMode ? "#374151" : "#E5E7EB",
    background: nightMode ? "#1A1A1A" : "#FFFFFF",
    modalBg: nightMode ? "#1A1A1A" : "#FFFFFF",
  };

const getTodayDate = () => {
  const today = new Date();
  return today.toLocaleDateString("en-CA");
};
  // Set today default
  useEffect(() => {
    if (!selectedDate) {
      onDateSelect(getTodayDate());
    }
  }, []);

  const formatDisplayDate = (dateString) => {
    if (!dateString) return "Select Date";

    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();

    tomorrow.setDate(today.getDate() + 1);

    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === tomorrow.getTime()) return "Tomorrow";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDateSelect = (day) => {
    onDateSelect(day.dateString);
    setShowCalendar(false);
  };

  return (
    <View>
      {/* Heading */}
      <Text style={[styles.heading, { color: THEME.textSecondary }]}>
        {label.toUpperCase()}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      {/* Dropdown */}
      <TouchableOpacity
        style={[
          styles.dropdown,
          {
            backgroundColor: THEME.background,
            borderColor: THEME.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => setShowCalendar(true)}
      >
        <Text
          style={[
            styles.dropdownText,
            {
              color: selectedDate
                ? THEME.textPrimary
                : THEME.textSecondary,
            },
          ]}
        >
          {formatDisplayDate(selectedDate)}
        </Text>

        < Ionicons
          name="chevron-down"
          size={18}
          color={THEME.textSecondary}
        />
      </TouchableOpacity>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Background Click */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          />

          <View
            style={[
              styles.calendarContainer,
              { backgroundColor: THEME.modalBg },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: THEME.textPrimary,
                }}
              >
                Select Date
              </Text>

              <TouchableOpacity
                onPress={() => setShowCalendar(false)}
              >
                < Ionicons
                  name="close"
                  size={24}
                  color={THEME.textPrimary}
                />
              </TouchableOpacity>
            </View>

          <Calendar
  current={selectedDate || getTodayDate()}
  minDate={getTodayDate()}
  onDayPress={handleDateSelect}

  renderArrow={(direction) => (
    <Ionicons
      name={direction === "left" ? "chevron-back" : "chevron-forward"}
      size={22}
      color={THEME.textPrimary}
    />
  )}

  markedDates={{
    [selectedDate]: {
      selected: true,
      selectedColor: THEME.primary,
    },
  }}

  theme={{
    calendarBackground: THEME.modalBg,
    selectedDayBackgroundColor: THEME.primary,
    selectedDayTextColor: "#fff",
    todayTextColor: "#10B981",
    dayTextColor: THEME.textPrimary,
    monthTextColor: THEME.textPrimary,
  }}
/>
            <View style={styles.quickRow}>
  <TouchableOpacity
    style={[styles.quickBtn, { backgroundColor: THEME.primary }]}
    onPress={() => {
      onDateSelect(getTodayDate());
      setShowCalendar(false);
    }}
  >
    <Text style={styles.quickText}>Today</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.quickBtn, { backgroundColor: THEME.primary }]}
    onPress={() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      onDateSelect(tomorrow.toISOString().split("T")[0]);
      setShowCalendar(false);
    }}
  >
    <Text style={styles.quickText}>Tomorrow</Text>
  </TouchableOpacity>
</View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CalendarSelector;

const styles = StyleSheet.create({
  heading: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.5,
  },

  required: {
    color: "#EF4444",
  },

  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },

  dropdownText: {
    fontSize: 15,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  

  calendarContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  quickRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 15,
},

quickBtn: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 12,
  alignItems: "center",
  marginHorizontal: 5,
},

quickText: {
  color: "#FFFFFF",
  fontWeight: "600",
  fontSize: 14,
},
});