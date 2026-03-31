import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput
} from "react-native";
import DefaultPreference from 'react-native-default-preference';


import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { checkNotifications, requestNotifications } from 'react-native-permissions';
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import SubmitButton from "../components/SubmitButton";
import StatusModal from "../../app/components/StatusModal";

import { otherServices } from "../../services/otherServices";
import { ismServices } from "../../services/ismServices";
import { PERMISSIONS, check } from 'react-native-permissions';

const SettingsScreen = () => {

  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);

  const [isAway, setIsAway] = useState(false);
  const [visitSound, setVisitSound] = useState(true);
  const [staffNotification, setStaffNotification] = useState(true);
  const [ivrEnabled, setIvrEnabled] = useState(false);
  const [user, setUser] = useState(null);

  const [primaryNumber, setPrimaryNumber] = useState("");
  const [secondaryNumber, setSecondaryNumber] = useState("");

  const [initialData, setInitialData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [permissionWarning, setPermissionWarning] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");


  const checkPermissions = async () => {
    const notif = await checkNotificationPermission();
    const alarm = await checkAlarmPermission();

    if (!notif && !alarm) {
      setPermissionMessage("Notifications & alarms are OFF");
      setPermissionWarning(true);
    } else if (!notif) {
      setPermissionMessage("Notifications are OFF");
      setPermissionWarning(true);
    } else if (!alarm) {
      setPermissionMessage("Alarms & reminders are OFF");
      setPermissionWarning(true);
    } else {
      setPermissionWarning(false);
    }
  };

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "success",
    title: "",
    subtitle: ""
  });

  /* ------------------------------
      VALIDATION
  ------------------------------ */
  const isValidPhone = (num) => {
    if (!num) return true;
    return /^[6-9]\d{9}$/.test(num);
  };

  /* ------------------------------
      LOAD USER SETTINGS
  ------------------------------ */

  const handleTestNotification = async () => {
    try {

      setStatusModal({
        visible: true,
        type: "loading",
        title: "Sending Notification",
        subtitle: "Please wait..."
      });

      const res = await otherServices.sendTestNotificationSound();

      if (res?.status === "success") {
        setStatusModal({
          visible: true,
          type: "success",
          title: "Notification Sent",
          subtitle: "Check your phone 🔔"
        });
      } else {
        throw new Error("Failed");
      }

    } catch (error) {

      setStatusModal({
        visible: true,
        type: "error",
        title: "Failed",
        subtitle: "Unable to send notification"
      });

      console.log("Test Notification Error:", error);
    }
  };


  const loadUserSettings = async () => {
    try {
      setLoading(true);

      const res = await ismServices.getUserDetails()

      const user = res?.data || res;
      console.log(user, "get User Details")
      setUser(user);


      if (user) {

        const away = user.home_away === 1;
        const ivr = user.ivr_enable === 1;
        const p = user.ivr_p || "";
        const s = user.ivr_s || "";

        setIsAway(away);
        setIvrEnabled(ivr);
        setPrimaryNumber(p);
        setSecondaryNumber(s);

        // ✅ store initial
        setInitialData({
          isAway: away,
          ivrEnabled: ivr,
          primaryNumber: p,
          secondaryNumber: s
        });
      }

      const soundRes = await otherServices.getNotificationSound();

      if (soundRes?.data) {

        // ✅ Save to local storage
        await AsyncStorage.setItem(
          "notificationSoundSettings",
          JSON.stringify(soundRes.data)
        );

        soundRes.data.forEach(item => {
          if (item.name === "VISIT") setVisitSound(item.switch === 1);
          if (item.name === "STAFF") setStaffNotification(item.switch === 1);
        });
      }

    } catch (error) {
      console.log("User detail error:", error);
    } finally {
      setLoading(false); // 👈 STOP LOADER
    }
  };
  const checkNotificationPermission = async () => {
    const { status } = await checkNotifications();

    if (status !== "granted") {
      return false;
    }

    return true;
  };
  const checkAlarmPermission = async () => {
    try {
      if (Platform.OS === "android") {

        const permission = PERMISSIONS.ANDROID.SCHEDULE_EXACT_ALARM;

        // ❌ if undefined → skip
        if (!permission) return true;

        const status = await check(permission);

        return status === "granted";
      }

      return true;
    } catch (e) {
      console.log("Alarm permission error:", e);
      return true; // don't crash UI
    }
  };

  useEffect(() => {
    loadUserSettings();

  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [])
  );

  /* ------------------------------
      CHECK FOR UNSAVED CHANGES
  ------------------------------ */
  useEffect(() => {
    const changed =
      initialData.isAway !== isAway ||
      initialData.ivrEnabled !== ivrEnabled ||
      initialData.primaryNumber !== primaryNumber ||
      initialData.secondaryNumber !== secondaryNumber;

    setHasUnsavedChanges(changed);
  }, [isAway, ivrEnabled, primaryNumber, secondaryNumber, initialData]);

  /* ------------------------------
      SAVE IVR + AWAY SETTINGS
  ------------------------------ */

  const handleSave = async () => {
    try {

      // ❌ VALIDATION - Only validate phone numbers if IVR is enabled AND numbers are entered
      if (ivrEnabled) {
        if (primaryNumber && !isValidPhone(primaryNumber)) {
          setStatusModal({
            visible: true,
            type: "error",
            title: "Invalid Primary Number",
            subtitle: "Enter a valid 10-digit primary number starting with 6-9"
          });
          return;
        }

        if (secondaryNumber && !isValidPhone(secondaryNumber)) {
          setStatusModal({
            visible: true,
            type: "error",
            title: "Invalid Secondary Number",
            subtitle: "Enter a valid 10-digit secondary number starting with 6-9"
          });
          return;
        }
      }

      // ❌ NO CHANGE CHECK
      if (!hasUnsavedChanges) {
        setStatusModal({
          visible: true,
          type: "info",
          title: "No Changes",
          subtitle: "Nothing to update"
        });
        return;
      }

      // ⏳ LOADING
      setStatusModal({
        visible: true,
        type: "loading",
        title: "Saving Settings",
        subtitle: "Please wait..."
      });

      const payload = {
        id: user.id,
        name: user.name,
        phone_no: user.phone_no,
        email: user.email,
        flat_no: user.flat_no,
        display_unit_no: user.display_unit_no,
        tenant: user.tenant,

        home_away: isAway ? 1 : 0,
        ivr_enable: ivrEnabled ? 1 : 0,
        ivr_p: primaryNumber,  // Always send current value, don't delete
        ivr_s: secondaryNumber  // Always send current value, don't delete
      };


      const res = await otherServices.updateUserSettings(payload);

      console.log("Settings saved:", res);

      // ✅ SUCCESS
      setStatusModal({
        visible: true,
        type: "success",
        title: "Saved Successfully",
        subtitle: "Your settings have been updated"
      });

      await loadUserSettings();

    } catch (err) {
      console.log("Save error:", err);

      setStatusModal({
        visible: true,
        type: "error",
        title: "Save Failed",
        subtitle: "Unable to update settings"
      });
    }
  };

  /* ------------------------------
      TOGGLES
  ------------------------------ */

  const toggleVisitSound = async (value) => {
    setVisitSound(value);

    try {
      // 1. Tell your backend database
      await otherServices.setNotificationSound("VISIT", value);

      // 2. ✅ NEW: Tell the Native Android Lock Screen!
      // This saves "true" or "false" to the shared memory Android can read
      await DefaultPreference.set("NATIVE_SOUND_ENABLED", value ? "true" : "false");

      // 3. Update local React Native storage
      const stored = await AsyncStorage.getItem("notificationSoundSettings");
      let data = stored ? JSON.parse(stored) : [
        { name: "VISIT", switch: value ? 1 : 0 },
        { name: "STAFF", switch: 1 }
      ];

      const updated = data.some(item => item.name === "VISIT")
        ? data.map(item =>
          item.name === "VISIT"
            ? { ...item, switch: value ? 1 : 0 }
            : item
        )
        : [...data, { name: "VISIT", switch: value ? 1 : 0 }];

      await AsyncStorage.setItem(
        "notificationSoundSettings",
        JSON.stringify(updated)
      );

    } catch (e) {
      console.log("Visit sound error:", e);
    }
  };
  const toggleStaffSound = async (value) => {
    setStaffNotification(value);

    try {
      await otherServices.setNotificationSound("STAFF", value);

      const stored = await AsyncStorage.getItem("notificationSoundSettings");
      let data = [];

      try {
        data = stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.log("Storage parse error", e);
      }

      const updated = data.map(item =>
        item.name === "STAFF"
          ? { ...item, switch: value ? 1 : 0 }
          : item
      );

      if (JSON.stringify(data) !== JSON.stringify(updated)) {
        await AsyncStorage.setItem("notificationSoundSettings", JSON.stringify(updated));
      }

    } catch (e) {
      console.log("Staff sound error:", e);
    }
  };

  /* ------------------------------
      HANDLE PHONE NUMBER INPUT
  ------------------------------ */
  const handlePrimaryNumberChange = (text) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setPrimaryNumber(cleaned);
  };

  const handleSecondaryNumberChange = (text) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setSecondaryNumber(cleaned);
  };


 return (
    <SafeAreaView style={styles.container}>

      <AppHeader title="Settings" />

      {/* 👉 NEW: Wrap everything below the header in this flex: 1 container */}
      <View style={{ flex: 1 }}>
        
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#1996D3" />
            <Text style={styles.loaderText}>Loading settings...</Text>
          </View>
        )}

        {permissionWarning && (
          <View style={{
            margin: 15,
            padding: 12,
            borderRadius: 10,
            backgroundColor: "#FEF3C7",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Text style={{ color: "#92400E", flex: 1 }}>
              {permissionMessage}. Please enable them from system settings 🔔
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>

          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Personal</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>I am Away</Text>
              <Switch
                value={isAway}
                onValueChange={setIsAway}
                trackColor={{ false: "#ddd", true: "#1996D3" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Visit Sound</Text>
              <Switch
                value={visitSound}
                onValueChange={toggleVisitSound}
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.label}>Staff</Text>
              <Switch
                value={staffNotification}
                onValueChange={toggleStaffSound}
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>IVR Settings</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Enable IVR</Text>
              <Switch
                value={ivrEnabled}
                onValueChange={setIvrEnabled}
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>

            {ivrEnabled && (
              <>
                <View style={styles.divider} />

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Primary Number</Text>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      primaryNumber && !isValidPhone(primaryNumber) && styles.phoneInputError
                    ]}
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor="#9CA3AF"
                    value={primaryNumber}
                    onChangeText={handlePrimaryNumberChange}
                  />
                  {primaryNumber && !isValidPhone(primaryNumber) && (
                    <Text style={styles.errorText}>
                      Must be 10 digits starting with 6-9
                    </Text>
                  )}
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Secondary Number</Text>
                  <TextInput
                    style={[
                      styles.phoneInput,
                      secondaryNumber && !isValidPhone(secondaryNumber) && styles.phoneInputError
                    ]}
                    placeholder="Enter 10-digit number (optional)"
                    maxLength={10}
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                    value={secondaryNumber}
                    onChangeText={handleSecondaryNumberChange}
                  />
                  {secondaryNumber && !isValidPhone(secondaryNumber) && (
                    <Text style={styles.errorText}>
                      Must be 10 digits starting with 6-9
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>

          {hasUnsavedChanges && (
            <Text style={styles.unsavedNote}>
              You have unsaved changes
            </Text>
          )}

          {hasUnsavedChanges && (
            <View style={styles.saveButtonContainer}>
              <SubmitButton
                title="Save Settings"
                onPress={handleSave}
                disabled={
                  ivrEnabled && (
                    (primaryNumber && !isValidPhone(primaryNumber)) ||
                    (secondaryNumber && !isValidPhone(secondaryNumber))
                  )
                }
              />
            </View>
          )}

          {ivrEnabled && (
            <View style={styles.noteOuterContainer}>
              <Text style={styles.noteTitle}>Important Note</Text>
              <Text style={styles.noteSubtitle}>
                You will receive a call for confirmation on arrival of your visitor/guest.
              </Text>
              <Text style={styles.noteText}>
                By providing your contact details you have authorized Factech Automation Solutions Private Limited to contact you in future through calls/Email/SMS to share information from iSocietyManager.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View> 
      {/* 👆 Close the new flex wrapper here */}

      {/* ✅ MODAL */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      />

    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#7eabe645",
    marginBottom: 10
  },

  testBtn: {
    flexDirection: "row",   // 🔥 ADD THIS
    justifyContent: "center",
    alignItems: "center",
    gap: 6,                // spacing between icon & text
    marginTop: 20,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 10,
  },

  testBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === "ios" ? 10 : 0,
    minHeight: Platform.OS === "ios" ? 50 : 40,
  },

  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginHorizontal: 18,
  },

  inputSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },

  phoneInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },

  phoneInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },

  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },

  saveButtonContainer: {
    marginTop: -20,
    padding: 15,
  },

  unsavedNote: {
    textAlign: "center",
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 10,
    marginHorizontal: 20,
  },
  loaderOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgb(255, 255, 255)", // 👈 blur effect
  zIndex: 10
},

loaderText: {
  marginTop: 10,
  color: "#6B7280",
  fontSize: 14
},

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    paddingLeft: 20,
    marginBottom: 20
  },

  optionText: {
    fontSize: 15,
    color: "#374151",
  },

  testBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: "#111",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },

  testBtnText: {
    color: "#fff",
    fontWeight: "600"
  },

  noteOuterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: 15,
  },

  noteTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",   // 🔥 Dark (primary)
    lineHeight: 20,
    textAlign: "center",
  },

  noteSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#4B5563",   // 👈 Medium faint
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },

  noteText: {
    marginTop: 8,
    fontSize: 13,
    color: "#9CA3AF",   // 👈 More faint
    lineHeight: 18,
    textAlign: "center",
  },

  smallNote: {
    paddingHorizontal: 20,
    marginTop: 6,
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center"
  },
});