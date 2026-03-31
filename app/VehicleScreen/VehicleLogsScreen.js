// VehicleLogsScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import { otherServices } from "../../services/otherServices";
import { SafeAreaView } from "react-native-safe-area-context";

const VehicleLogsScreen = ({ route, navigation }) => {
  const { vehicle } = route.params;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const getStatusLabel = (status) => {
    return status === 1 ? "IN" : "OUT";
  };

  const getStatusColor = (status) => {
    return status === 1 ? "#16A34A" : "#DC2626";
  };

const formatDate = (date) => {
  if (!date) return "-";

  // Force UTC parsing
  const d = new Date(date.replace(" ", "T") + "Z");

  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
  const fetchLogs = async (date) => {
    try {
      setLoading(true);

      const response = await otherServices.getVehicleLogs({
        vehicleId: vehicle.id,
        from: date,
        to: date,
        getAll: 1,
      });

      setLogs(response?.data || []);
    } catch (error) {
      console.log("Log fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toLocaleDateString("en-CA");
    setSelectedDate(today);
    fetchLogs(today);
  }, []);

  const handleDateSelect = (day) => {
    setSelectedDate(day.dateString);
    setShowCalendar(false);
    fetchLogs(day.dateString);
  };

  const renderItem = ({ item }) => (
    <View style={styles.logCard}>
      <Text
        style={[
          styles.logStatus,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      >
        {getStatusLabel(item.status)}
      </Text>

      <Text style={styles.logTime}>
        {formatDate(item.date_time)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        < Ionicons
          name="arrow-back"
          size={22}
          color="#fff"
          onPress={() => navigation.goBack()}
        />
        <Text style={styles.headerTitle}>Vehicle Logs</Text>
      </View>

      {/* Selected Date Label */}
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setShowCalendar(!showCalendar)}
      >
        <Text style={styles.dateText}>
          Logs for {selectedDate}
        </Text>
        < Ionicons name="calendar-outline" size={18} />
      </TouchableOpacity>

      {showCalendar && (
        <Calendar
          onDayPress={handleDateSelect}
          markedDates={{
            [selectedDate]: {
              selected: true,
              selectedColor: "#1668A5",
            },
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#1668A5"
          style={{ marginTop: 30 }}
        />
      ) : logs.length === 0 ? (
        <View style={styles.empty}>
          <Text>No logs found for this date.</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
};

export default VehicleLogsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    height: 60,
    backgroundColor: "#1668A5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 16,
  },

  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },

  dateText: {
    fontSize: 15,
    fontWeight: "500",
  },

  logCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },

  logStatus: {
    color: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "600",
    alignSelf: "flex-start",
  },

  logTime: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },

  empty: {
    alignItems: "center",
    marginTop: 40,
  },
});