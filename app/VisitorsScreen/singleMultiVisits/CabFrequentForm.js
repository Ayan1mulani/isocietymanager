import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import ProviderSelector from "../components/ProviderSelector";
import CalendarSelector from "../components/Calender";
import Ionicons from "react-native-vector-icons/Ionicons";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const FrequentCabForm = ({ theme }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [durationType, setDurationType] = useState("1week");
  const [selectedDays, setSelectedDays] = useState([]);
  const [entriesPerDay, setEntriesPerDay] = useState(1);
  const [vehicleNo, setVehicleNo] = useState("");

  /* 🔵 Preset Duration */
  const setPresetDuration = (days) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + days);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  /* 🔵 Toggle Days */
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleVehicleChange = (text) => {
    const numeric = text.replace(/[^0-9]/g, "");
    if (numeric.length <= 4) setVehicleNo(numeric);
  };

  const handleSubmit = () => {
    console.log({
      type: "cab-frequent",
      provider: selectedProvider,
      startDate,
      endDate,
      selectedDays,
      entriesPerDay,
      vehicleNo,
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* 🔵 Provider */}
      <ProviderSelector
        visitorType="cab"
        theme={theme}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        stylesFromParent={styles}
      />

      {/* 🔵 Duration */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Duration
        </Text>

        <View style={styles.durationRow}>

          <TouchableOpacity
            style={[
              styles.durationButton,
              durationType === "1week" && {
                backgroundColor: theme.primaryBlue,
                borderColor: theme.primaryBlue,
              },
            ]}
            onPress={() => {
              setDurationType("1week");
              setPresetDuration(7);
            }}
          >
            <Text style={[
              styles.durationText,
              durationType === "1week" && { color: "#fff" }
            ]}>
              1 Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.durationButton,
              durationType === "1month" && {
                backgroundColor: theme.primaryBlue,
                borderColor: theme.primaryBlue,
              },
            ]}
            onPress={() => {
              setDurationType("1month");
              setPresetDuration(30);
            }}
          >
            <Text style={[
              styles.durationText,
              durationType === "1month" && { color: "#fff" }
            ]}>
              1 Month
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.durationButton,
              durationType === "custom" && {
                backgroundColor: theme.primaryBlue,
                borderColor: theme.primaryBlue,
              },
            ]}
            onPress={() => {
              setDurationType("custom");
              setStartDate(null);
              setEndDate(null);
            }}
          >
            <Text style={[
              styles.durationText,
              durationType === "custom" && { color: "#fff" }
            ]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>

        {durationType === "custom" && (
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <CalendarSelector
                selectedDate={startDate}
                onDateSelect={setStartDate}
                label="Start Date"
                nightMode={false}
              />
            </View>

            <View style={{ flex: 1 }}>
              <CalendarSelector
                selectedDate={endDate}
                onDateSelect={setEndDate}
                label="End Date"
                nightMode={false}
              />
            </View>
          </View>
        )}
      </View>

      {/* 🔵 Active Days */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Active Days
        </Text>

        <View style={styles.daysRow}>
          {weekDays.map((day) => {
            const active = selectedDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayBox,
                  active && { backgroundColor: theme.primaryBlue }
                ]}
                onPress={() => toggleDay(day)}
              >
                <Text style={{ color: active ? "#fff" : theme.text }}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 🔵 Entries Per Day */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Entries Per Day
        </Text>

        <View style={styles.counterRow}>
          <TouchableOpacity
            style={[styles.counterBtn, { borderColor: theme.border }]}
            onPress={() =>
              setEntriesPerDay(Math.max(1, entriesPerDay - 1))
            }
          >
            < Ionicons name="remove" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>

          <Text style={[styles.counterText, { color: theme.text }]}>
            {entriesPerDay}
          </Text>

          <TouchableOpacity
            style={[styles.counterBtn, { borderColor: theme.border }]}
            onPress={() => setEntriesPerDay(entriesPerDay + 1)}
          >
            < Ionicons name="add" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔵 Vehicle (Optional) */}
       <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Vehicle Number
                </Text>
      
                <TextInput
                  value={vehicleNo}
                  onChangeText={handleVehicleChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="0000"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.vehicleInput,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
              </View>
     

      {/* 🔵 Save Button */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.primaryBlue }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Schedule Cab</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default FrequentCabForm;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },

  durationRow: {
    flexDirection: "row",
    gap: 10,
  },

  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },

  durationText: {
    fontSize: 13,
    fontWeight: "600",
  },

  dateRow: {
    flexDirection: "row",
    gap: 12,
  },

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dayBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  counterBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  counterText: {
    fontSize: 18,
    fontWeight: "600",
  },

  vehicleInput: {
    height: 45,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 26,
    letterSpacing: 15,
  },

  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  counterBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  counterText: {
    fontSize: 18,
    fontWeight: "600",
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },

  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },

  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

});