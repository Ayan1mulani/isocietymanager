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
import CalendarSelector from "../components/Calender";
import Ionicons from "react-native-vector-icons/Ionicons";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const setPresetDuration = (days) => {
  const today = new Date();
  const end = new Date();
  end.setDate(today.getDate() + days);

  setStartDate(today.toISOString().split("T")[0]);
  setEndDate(end.toISOString().split("T")[0]);
};
const GuestFrequentForm = ({ theme, navigation }) => {

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [entriesPerDay, setEntriesPerDay] = useState(1);
  const [durationType, setDurationType] = useState("1week");
  const [selectedParking, setSelectedParking] = useState(null); // ✅ added

  // ✅ FIXED — now inside component
  const setPresetDuration = (days) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + days);

    setStartDate(today.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSubmit = () => {
    if (!name || !phone || !startDate || !endDate) {
      Alert.alert("Missing Fields", "Please fill all required fields");
      return;
    }

    console.log({
      type: "guest",
      name,
      phone,
      startDate,
      endDate,
      selectedDays,
      entriesPerDay,
    });

    Alert.alert("Success", "Guest added successfully");
    navigation.goBack();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      
      {/* Name */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Visitor Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter Visitor name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, {
            backgroundColor: theme.inputBg,
            borderColor: theme.border,
            color: theme.text
          }]}
        />
      </View>

      {/* Phone */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Mobile Number <Text style={styles.required}>*</Text>
        </Text>

        <View style={styles.phoneRow}>
          <View style={[styles.countryCode, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text }}>+91</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter 10-digit number"
            placeholderTextColor={theme.textSecondary}
            style={[styles.phoneInput, {
              backgroundColor: theme.inputBg,
              borderColor: theme.border,
              color: theme.text
            }]}
          />
        </View>
      </View>

      {/* Duration */}
    {/* Duration */}
<View style={[styles.card, { backgroundColor: theme.cardBg }]}>
  <Text style={[styles.label, { color: theme.text }]}>
    Duration <Text style={styles.required}>*</Text>
  </Text>

  {/* Preset Buttons */}
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

  {/* Custom Dates (Same Row) */}
  {durationType === "custom" && (
    <View style={styles.dateRow}>
      <View style={styles.dateColumn}>
        <CalendarSelector
          selectedDate={startDate}
          onDateSelect={setStartDate}
          label="Start Date"
          required={true}
          nightMode={false}
        />
      </View>

      <View style={styles.dateColumn}>
        <CalendarSelector
          selectedDate={endDate}
          onDateSelect={setEndDate}
          label="End Date"
          required={true}
          nightMode={false}
        />
      </View>
    </View>
  )}
</View>

      {/* Active Days */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Active Days
        </Text>

        <View style={styles.daysRow}>
          {weekDays.map(day => {
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
                <Text style={{
                  color: active ? "#fff" : theme.text
                }}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
        {/* Parking Selection */}
            <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.label, { color: theme.text }]}>
                Need parking?
              </Text>
      
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                < Ionicons name="car" size={20} color={theme.primaryBlue} />
      
                <Text
                  style={[
                    styles.selectButtonText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {selectedParking ? "Parking Selected" : "Select Parking"}
                </Text>
      
                < Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
      

      {/* Entries Per Day */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>
          Entries Per Day
        </Text>

        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setEntriesPerDay(Math.max(1, entriesPerDay - 1))}
          >
            < Ionicons name="remove" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>

          <Text style={[styles.counterText, { color: theme.text }]}>
            {entriesPerDay}
          </Text>

          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setEntriesPerDay(entriesPerDay + 1)}
          >
            < Ionicons name="add" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>
     

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.primaryBlue }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitText}>Save Guest</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default GuestFrequentForm;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: -10
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

  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  dayBox: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
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
    borderColor: "#E5E7EB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  durationRow: {
  flexDirection: "row",
  gap: 10,
  marginBottom: 16,
},
selectButton: {
  flexDirection: "row",
  alignItems: "center",
  height: 50,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 16,
  justifyContent: "space-between",
},

selectButtonText: {
  flex: 1,
  fontSize: 14,
  fontWeight: "500",
  marginLeft: 8,
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
  color: "#1F2937",
},

dateRow: {
  flexDirection: "row",
  gap: 12,
},

dateColumn: {
  flex: 1,
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