import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

import { Common } from "../../services/Common";
import { Util } from "../../services/Util";
import { ApiCommon } from "../../services/ApiCommon";
import { API_URL2 } from "../config/env";
import SubmitButton from "../components/SubmitButton";
import StatusModal from "../components/StatusModal";
import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";
import AppHeader from "../components/AppHeader";

/* ---------- VEHICLE TYPES ---------- */

const VEHICLE_TYPES = [
  { key: "vehicle.car", value: "Car" },
  { key: "vehicle.bike", value: "Bike" },
  { key: "vehicle.two_wheeler", value: "2 Wheeler" },
  { key: "vehicle.other", value: "Other" },
];

const getKeyFromValue = (value) => {
  return VEHICLE_TYPES.find((v) => v.value === value)?.key || "";
};

const getValueFromKey = (key) => {
  return VEHICLE_TYPES.find((v) => v.key === key)?.value || "";
};

/* ---------- INPUT ---------- */

const Input = ({ label, value, onChangeText, placeholder }) => (
  <View style={styles.inputBlock}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      placeholder={placeholder}
      onChangeText={onChangeText}
      placeholderTextColor="#9CA3AF"
    />
  </View>
);

/* ---------- MAIN ---------- */

const AddVehicleScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { permissions } = usePermissions();

  const vehicle = route?.params?.vehicle;
  const isEdit = !!vehicle;

  const permissionsLoaded = permissions !== null && permissions !== undefined;

  const canCreateVehicle =
    permissionsLoaded && hasPermission(permissions, "VEH", "C");

  const canUpdateVehicle =
    permissionsLoaded && hasPermission(permissions, "VEH", "U");

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "loading",
    title: "",
    subtitle: "",
  });

  const [loading, setLoading] = useState(false);

  const [vehicleNo, setVehicleNo] = useState(vehicle?.vehicle_no || "");
  const [owner, setOwner] = useState(vehicle?.owner || "");
  const [type, setType] = useState(
    vehicle?.type ? getKeyFromValue(vehicle.type) : ""
  );
  const [model, setModel] = useState(vehicle?.model || "");
  const [stkNo, setStkNo] = useState(vehicle?.stk_no || "");
  const [insNo, setInsNo] = useState(vehicle?.ins_no || "");
  const [insExpDate, setInsExpDate] =
    useState(vehicle?.ins_exp_date || "");

  const [showTypeModal, setShowTypeModal] = useState(false);

  /* ---------- LOADING ---------- */

  if (!permissionsLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 10 }}>
            {t("Loading permissions...")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- NO PERMISSION ---------- */

  if ((!isEdit && !canCreateVehicle) || (isEdit && !canUpdateVehicle)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={60} color="#9CA3AF" />
          <Text style={{ marginTop: 10 }}>
            {t("You don't have permission to perform this action")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- SUBMIT ---------- */

  const handleSubmit = async () => {
    if (loading) return;

    if (!vehicleNo.trim() || !owner.trim() || !type) {
      setStatusModal({
        visible: true,
        type: "error",
        title: t("Validation"),
        subtitle: t("Vehicle No, Owner & Type are required"),
      });
      return;
    }

    try {
      setLoading(true);

      setStatusModal({
        visible: true,
        type: "loading",
        title: isEdit ? t("Updating Vehicle") : t("Adding Vehicle"),
        subtitle: t("Please wait..."),
      });

      const user = await Common.getLoggedInUser();

      const headers = await Util.getCommonAuth();

      const payload = {
        vehicle_no: vehicleNo,
        owner,
        type: getValueFromKey(type), // ✅ important
        model,
        stk_no: stkNo,
        ins_no: insNo,
        ins_exp_date: insExpDate,
      };

      let response;

      if (isEdit) {
        response = await ApiCommon.postReq(
          `${API_URL2}/my/vehicle/${vehicle.id}`,
          payload,
          headers
        );
      } else {
        response = await ApiCommon.putReq(
          `${API_URL2}/my/vehicle`,
          payload,
          headers
        );
      }

      if (response.status === "success") {
        setStatusModal({
          visible: true,
          type: "success",
          title: t("Success"),
          subtitle: isEdit
            ? t("Vehicle updated successfully")
            : t("Vehicle added successfully"),
        });

        setTimeout(() => {
          navigation.navigate("MyVehiclesScreen", { refresh: true });
        }, 1500);
      } else {
        throw new Error();
      }
    } catch {
      setStatusModal({
        visible: true,
        type: "error",
        title: t("Error"),
        subtitle: t("Something went wrong"),
      });
    } finally {
      setLoading(false);
    }
  };

  /* ---------- UI ---------- */

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t(isEdit ? "Edit Vehicle" : "Add Vehicle")} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Input
            label={t("Vehicle Number")}
            value={vehicleNo}
            onChangeText={(text) => setVehicleNo(text.toUpperCase())}
            placeholder={t("Enter vehicle number")}
          />

          <Input
            label={t("Owner")}
            value={owner}
            onChangeText={setOwner}
            placeholder={t("Enter owner name")}
          />

          <Text style={styles.label}>{t("Vehicle Type")}</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTypeModal(true)}
          >
            <Text style={{ color: type ? "#111" : "#9CA3AF" }}>
              {type ? t(type) : t("Select Vehicle Type")}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>

          <Input label={t("Model")} placeholder={t("Enter vehicle model")} />
          <Input label={t("Sticker Number")} placeholder={t("Enter sticker number")} />
          <Input label={t("Insurance Number")} placeholder={t("Enter insurance number")} />
          <Input label={t("Insurance Expiry")} placeholder={t("Enter insurance expiry date")} />
        </View>

        <SubmitButton
          title={t(isEdit ? "Update Vehicle" : "Add Vehicle")}
          onPress={handleSubmit}
          loading={loading}
        />
      </ScrollView>

      {/* MODAL */}
      <Modal transparent visible={showTypeModal} animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowTypeModal(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {t("Select Vehicle Type")}
            </Text>

            {VEHICLE_TYPES.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.sheetItem}
                onPress={() => {
                  setType(item.key);
                  setShowTypeModal(false);
                }}
              >
                <Text style={styles.sheetText}>{t(item.key)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <StatusModal {...statusModal} />
    </SafeAreaView>
  );
};

export default AddVehicleScreen;

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputBlock: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
  },
  dropdown: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  sheetItem: { paddingVertical: 14 },
  sheetText: { fontSize: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});