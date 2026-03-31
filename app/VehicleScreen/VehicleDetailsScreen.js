// VehicleDetailScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect } from "react";
import { otherServices } from "../../services/otherServices";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";

const VehicleDetailScreen = ({ route, navigation }) => {
  const { vehicle } = route.params;

  const [notificationEnabled, setNotificationEnabled] = useState(
    vehicle.is_subscribed === 1
  );
  const [accessEnabled, setAccessEnabled] = useState(
    vehicle.tag_lock === true
  );
  const [accessLoading, setAccessLoading] = useState(false);


  const [lastLog, setLastLog] = useState(null);
  const [loadingLog, setLoadingLog] = useState(true);

  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "N/A"}</Text>
    </View>
  );
  useEffect(() => {
    fetchLatestLog();
  }, []);

 const fetchLatestLog = async () => {
  try {
    setLoadingLog(true);

    const today = new Date().toLocaleDateString("en-CA");

    const res = await otherServices.getVehicleLogs({
      vehicleId: vehicle.id,
      from: "2000-01-01",   // get all history
      to: today,
      getAll: 1,
    });

    const logs = res?.data || [];

    if (logs.length > 0) {
      const latest = logs.sort(
        (a, b) =>
          new Date(b.date_time.replace(" ", "T")) -
          new Date(a.date_time.replace(" ", "T"))
      )[0];

      setLastLog(latest);
    }
  } catch (error) {
    console.log("Log error:", error);
  } finally {
    setLoadingLog(false);
  }
};
  const formatDateTime = (date) => {
    return new Date(date.replace(" ", "T") + "Z").toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };
  return (

    <SafeAreaView style={styles.container}>
      <AppHeader title={"Vehicle Details"}/>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusContainer}>

          {/* Vehicle Number */}
          <Text style={styles.vehicleNumber}>
            {vehicle.vehicle_no}
          </Text>

          {/* Approval Status */}
          <Text
            style={[
              styles.statusValue,
              {
                color: vehicle.is_approved ? "green" : "#f59e0b",
              },
            ]}
          >
            {vehicle.is_approved ? "Approved" : "Pending"}
          </Text>
        </View>


        {/* Notification & Access */}
        <View style={styles.switchRow}>
          <Text style={styles.label}>Notification</Text>
          <Switch
            value={notificationEnabled}
            onValueChange={async (value) => {
              try {
                setNotificationEnabled(value); // optimistic update

                await otherServices.toggleVehicleSubscription(
                  vehicle.id,
                  value ? 1 : 0
                );

              } catch (error) {
                // revert if failed
                setNotificationEnabled(!value);
                console.log("Notification update failed");
              }
            }}
          />
        </View>

        <View style={styles.accessContainer}>
  <Text style={styles.label}>Access Status</Text>

  <View style={styles.accessInnerRow}>
    <Text
      style={[
        styles.accessStatus,
        {
          color: accessEnabled ? "#16A34A" : "#DC2626",
        },
      ]}
    >
      {accessEnabled ? "ENABLED" : "DISABLED"}
    </Text>

    <TouchableOpacity
      style={[
        styles.smallAccessButton,
        {
          backgroundColor: accessEnabled ? "#DC2626" : "#16A34A",
        },
      ]}
      onPress={async () => {
        if (accessLoading) return;

        try {
          setAccessLoading(true);

          const newValue = !accessEnabled;
          setAccessEnabled(newValue);

          await otherServices.toggleVehicleAccess(vehicle.id, {
            ...vehicle,
            tag_lock: newValue,
          });

        } catch (error) {
          setAccessEnabled(prev => !prev);
        } finally {
          setAccessLoading(false);
        }
      }}
    >
      <Text style={styles.smallAccessButtonText}>
        {accessEnabled ? "Disable" : "Enable"}
      </Text>
    </TouchableOpacity>
  </View>
</View>
        <View style={styles.divider} />

        {/* Last Activity */}
        <Text style={styles.sectionTitle}>Last Activity</Text>

        {loadingLog ? (
          <Text>Loading...</Text>
        ) : lastLog ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Last Status</Text>
              <Text
                style={[
                  styles.value,
                  {
                    color:
                      lastLog.status === 1
                        ? "#16A34A" // GREEN for IN
                        : "#DC2626", // RED for OUT
                    fontWeight: "700",
                  },
                ]}
              >
                {lastLog.status === 1 ? "IN" : "OUT"}
              </Text>
            </View>

            <Row
              label="Last Logged Time"
              value={formatDateTime(lastLog.date_time)}
            />
          </>
        ) : (
          <Text style={{ color: "#6B7280" }}>
            No activity found
          </Text>
        )}

        <View style={styles.divider} />

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Row label="Owner" value={vehicle.owner} />
        <Row label="Model" value={vehicle.model} />
        <Row label="Type" value={vehicle.type} />
        <Row label="Sticker No" value={vehicle.stk_no} />
        <Row label="Insurance No" value={vehicle.ins_no} />
        <Row label="Insurance Expiry" value={vehicle.ins_exp_date} />
 



        {/* Logs */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() =>
            navigation.navigate("VehicleLogsScreen", { vehicle })
          }
        >
          <Text style={styles.optionText}>Logs</Text>
          < Ionicons name="chevron-forward" size={18} />
        </TouchableOpacity>

        {/* Tag Setup */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() =>
            navigation.navigate("VehicleTagScreen", { vehicle })
          }
        >
          <Text style={styles.optionText}>Tag Setup</Text>
          < Ionicons name="chevron-forward" size={18} />
        </TouchableOpacity>

        {/* Edit Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate("AddVehicleScreen", { vehicle })

          }
        >
          <Text style={styles.buttonText}>Update Vehicle Details</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

export default VehicleDetailScreen;

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

  content: { padding: 20 },

  vehicleNumber: {
    fontSize: 22,
    fontWeight: "700"
  },

  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  statusLabel: {
    fontSize: 15,
    color: "#6B7280",
  },

  statusValue: {
    fontSize: 15,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  accessInnerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},



smallAccessButton: {
  paddingHorizontal: 18,
  paddingVertical: 8,
  borderRadius: 6,
  minWidth: 90,
  alignItems: "center",
  alignSelf: "flex-start",
  marginTop: -10,
},

  label: {
    fontSize: 15,
    color: "#6B7280",
  },

  value: {
    fontSize: 15,
    fontWeight: "500",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderWidth:1,
    borderColor:"#E5E7EB",
    borderRadius: 8,
    marginBottom: 14,
    paddingHorizontal: 12,

  },

  optionText: {
    fontSize: 16,
  },

  button: {
    marginTop: 30,
    backgroundColor: "#1668A5",
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  accessContainer: {
    marginTop: 10,
    marginBottom: 20,
  },

  accessStatus: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },

  accessButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "flex-start",
  },

  accessButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});