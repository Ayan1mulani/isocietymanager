import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import ProviderSelector from "../components/ProviderSelector";
import CalendarSelector from "../components/Calender";
import Ionicons from "react-native-vector-icons/Ionicons";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DeliveryFrequentForm = ({ theme, navigation }) => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [deliveryPerson, setDeliveryPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [entriesPerDay, setEntriesPerDay] = useState(1);
  const [durationType, setDurationType] = useState("1week");

  /* Duration Preset */
  const setPresetDuration = (days) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + days);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = () => {
    if (!selectedProvider || !deliveryPerson || !mobile || !startDate || !endDate) {
      Alert.alert("Missing Fields", "Please complete all required fields");
      return;
    }

    console.log({
      type: "delivery",
      provider: selectedProvider,
      deliveryPerson,
      mobile,
      startDate,
      endDate,
      selectedDays,
      entriesPerDay,
    });

    Alert.alert("Success", "Delivery access saved");
    navigation?.goBack();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>

      {/* 🔵 Provider Selector */}
      <ProviderSelector
        visitorType="delivery"
        theme={theme}
        selectedProvider={selectedProvider}
        setSelectedProvider={setSelectedProvider}
        stylesFromParent={styles}
      />

      {/* 🔵 Delivery Person Name */}
    


      {/* 🔵 Duration */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Duration <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.durationRow}>
          {[
            { key: "1week", label: "1 Week", days: 7 },
            { key: "1month", label: "1 Month", days: 30 },
            { key: "custom", label: "Custom" },
          ].map((item) => {
            const active = durationType === item.key;

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.durationButton,
                  {
                    borderColor: active ? theme.primaryBlue : theme.border,
                    backgroundColor: active
                      ? theme.primaryBlue
                      : theme.inputBg,
                  },
                ]}
                onPress={() => {
                  setDurationType(item.key);
                  if (item.days) {
                    setPresetDuration(item.days);
                  } else {
                    setStartDate(null);
                    setEndDate(null);
                  }
                }}
              >
                <Text style={{ color: active ? "#fff" : theme.text }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {durationType === "custom" && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.dateRow}>
              <View style={styles.dateColumn}>
                <CalendarSelector
                  selectedDate={startDate}
                  onDateSelect={setStartDate}
                  label="Start Date"
                  required
                  nightMode={false}
                />
              </View>

              <View style={styles.dateColumn}>
                <CalendarSelector
                  selectedDate={endDate}
                  onDateSelect={setEndDate}
                  label="End Date"
                  required
                  nightMode={false}
                />
              </View>
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
                  {
                    backgroundColor: active
                      ? theme.primaryBlue
                      : theme.inputBg,
                    borderColor: theme.border,
                  },
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
            onPress={() =>
              setEntriesPerDay(entriesPerDay + 1)
            }
          >
            < Ionicons name="add" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔵 Save */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.primaryBlue }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Schedule Delivery</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default DeliveryFrequentForm;

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
  required: {
    color: "#EF4444",
  },
  
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 8,
  },
  countryCode: {
    width: 60,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  durationRow: {
    flexDirection: "row",
    gap: 10,
  },
  durationButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateColumn: {
    flex: 1,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayBox: {
    borderWidth: 1,
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
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});