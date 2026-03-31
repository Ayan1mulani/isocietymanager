// VehicleTagScreen.js

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { otherServices } from "../../services/otherServices";
import { SafeAreaView } from "react-native-safe-area-context";

const VehicleTagScreen = ({ route, navigation }) => {
  const { vehicle } = route.params;

  const tagExists = vehicle.rf_id && vehicle.secret_code;

  const [provider, setProvider] = useState(vehicle.provider || "");
  const [rfid, setRfid] = useState(vehicle.rf_id || "");
  const [secret, setSecret] = useState(vehicle.secret_code || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
  if (!rfid || !secret) {
    Alert.alert("Validation", "RFID and Secret are required");
    return;
  }

  try {
    setLoading(true);

    const payload = {
      provider,
      rf_id: rfid,
      secret_code: secret,
    };

    const res = await otherServices.createOrUpdateVehicleTag(
      vehicle.id,
      payload
    );

    if (res?.status === "success") {
      Alert.alert(
        "Success",
        tagExists ? "Tag updated successfully" : "Tag created successfully"
      );

      navigation.replace("VehicleDetailScreen", {
        vehicle: res.data,
      });
    } else {
      Alert.alert("Error", res?.message || "Something went wrong");
    }

  } catch (error) {
    Alert.alert("Error", "Failed to save tag");
  } finally {
    setLoading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          < Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {tagExists ? "Update Tag" : "Create Tag"}
        </Text>
      </View>

      <View style={styles.content}>
        
        {/* Provider */}
        <Text style={styles.label}>Provider</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Provider"
          value={provider}
          onChangeText={setProvider}
        />

        {/* RFID */}
        <Text style={styles.label}>RFID</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter RFID"
          value={rfid}
          onChangeText={setRfid}
        />

        {/* Secret */}
        <Text style={styles.label}>Secret</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Secret"
          value={secret}
          onChangeText={setSecret}
        />

        <View style={styles.divider} />

        {/* Lock Status */}
        <Text style={styles.label}>Tag Lock Status</Text>
        <Text
          style={[
            styles.lockStatus,
            {
              color: vehicle.tag_lock ? "#16A34A" : "#DC2626",
            },
          ]}
        >
          {vehicle.tag_lock ? "LOCKED" : "UNLOCKED"}
        </Text>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {tagExists ? "UPDATE TAG" : "CREATE TAG"}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

export default VehicleTagScreen;

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

  content: {
    padding: 20,
  },

  sectionTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
  },

  value: {
    fontSize: 16,
    fontWeight: "500",
  },

  bigValue: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },

  lockStatus: {
    fontSize: 16,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 15,
  },
  label: {
  fontSize: 14,
  marginTop: 15,
},

input: {
  borderBottomWidth: 1,
  borderColor: "#ccc",
  paddingVertical: 8,
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
});