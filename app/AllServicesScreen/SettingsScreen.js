import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, Switch,
  ScrollView, ActivityIndicator, Platform, TextInput
} from "react-native";
import DefaultPreference from 'react-native-default-preference';
import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import { checkNotifications } from 'react-native-permissions';
import AppHeader from "../components/AppHeader";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from "react-native-safe-area-context";
import SubmitButton from "../components/SubmitButton";
import StatusModal from "../../app/components/StatusModal";
import { otherServices } from "../../services/otherServices";
import { ismServices } from "../../services/ismServices";
import { PERMISSIONS, check } from 'react-native-permissions';
import { loadCachedSettings, fetchAndCacheSettings } from '../../services/settingsCache';

const SettingsScreen = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);

  const [isAway, setIsAway] = useState(false);
  const [visitSound, setVisitSound] = useState(true);
  const [staffNotification, setStaffNotification] = useState(true);
  const [ivrEnabled, setIvrEnabled] = useState(false);

  // 👇 user ref — never triggers re-render, always available in callbacks
  const userRef = useRef(null);

  const [primaryNumber, setPrimaryNumber] = useState("");
  const [secondaryNumber, setSecondaryNumber] = useState("");

  // Only track phone number changes for Save button
  const [initialPhones, setInitialPhones] = useState({ primary: "", secondary: "" });
  const [phoneChanged, setPhoneChanged] = useState(false);

  const [permissionWarning, setPermissionWarning] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");

  const [statusModal, setStatusModal] = useState({
    visible: false, type: "success", title: "", subtitle: ""
  });

  /* ------------------------------
      APPLY SETTINGS
  ------------------------------ */
  const applySettings = (cache) => {
    if (!cache) return;
    userRef.current = cache.user;
    setIsAway(cache.isAway);
    setIvrEnabled(cache.ivrEnabled);
    setPrimaryNumber(cache.primaryNumber);
    setSecondaryNumber(cache.secondaryNumber);
    setVisitSound(cache.visitSound);
    setStaffNotification(cache.staffNotification);
    setInitialPhones({
      primary: cache.primaryNumber,
      secondary: cache.secondaryNumber
    });
  };

  /* ------------------------------
      LOAD: CACHE FIRST → BACKGROUND REFRESH
  ------------------------------ */
  const loadSettings = async () => {
    const cached = await loadCachedSettings();

    if (cached) {
      applySettings(cached);
    } else {
      setLoading(true); // only on very first ever open
    }

    // Silent background refresh — user sees nothing
    const fresh = await fetchAndCacheSettings();
    if (fresh) applySettings(fresh);

    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [])
  );

  /* ------------------------------
      PHONE NUMBER CHANGE DETECTION
  ------------------------------ */
  useEffect(() => {
    const changed =
      primaryNumber !== initialPhones.primary ||
      secondaryNumber !== initialPhones.secondary;
    setPhoneChanged(changed);
  }, [primaryNumber, secondaryNumber, initialPhones]);

  /* ------------------------------
      PERMISSIONS
  ------------------------------ */
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

  const checkNotificationPermission = async () => {
    const { status } = await checkNotifications();
    return status === "granted";
  };

  const updateCache = async (updates) => {
  try {
    const raw = await AsyncStorage.getItem("cached_user_settings");
    const cache = raw ? JSON.parse(raw) : {};

    const updated = {
      ...cache,
      ...updates
    };

    await AsyncStorage.setItem(
      "cached_user_settings",
      JSON.stringify(updated)
    );
  } catch (e) {
    console.log("Cache update error:", e);
  }
};

  const checkAlarmPermission = async () => {
    try {
      if (Platform.OS === "android") {
        const permission = PERMISSIONS.ANDROID.SCHEDULE_EXACT_ALARM;
        if (!permission) return true;
        return (await check(permission)) === "granted";
      }
      return true;
    } catch {
      return true;
    }
  };

  /* ------------------------------
      VALIDATION
  ------------------------------ */
  const isValidPhone = (num) => {
    if (!num) return true;
    return /^[6-9]\d{9}$/.test(num);
  };

  /* ------------------------------
      SILENT SAVE HELPER (for toggles)
      — no modals, no feedback, fully invisible
  ------------------------------ */
  const silentSaveUserSettings = async (overrides = {}) => {
    const user = userRef.current;
    if (!user?.id) return;

    try {
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
        ivr_p: primaryNumber,
        ivr_s: secondaryNumber,
        ...overrides // 👈 pass the latest toggled value directly
      };

      await otherServices.updateUserSettings(payload);
      fetchAndCacheSettings(); // refresh cache silently
    } catch (err) {
      console.log("Silent save error:", err);
    }
  };

  /* ------------------------------
      TOGGLE: I AM AWAY
      — optimistic UI + silent save
  ------------------------------ */
const toggleAway = (value) => {
  setIsAway(value);

  updateCache({ isAway: value });

  silentSaveUserSettings({ home_away: value ? 1 : 0 });
};
  /* ------------------------------
      TOGGLE: IVR ENABLE
      — optimistic UI + silent save
  ------------------------------ */
const toggleIvr = (value) => {
  setIvrEnabled(value);

  updateCache({ ivrEnabled: value });

  silentSaveUserSettings({ ivr_enable: value ? 1 : 0 });
};

  /* ------------------------------
      TOGGLE: VISIT SOUND
  ------------------------------ */
  const toggleVisitSound = async (value) => {
  setVisitSound(value);

  // ✅ update cache immediately
  updateCache({ visitSound: value });

  try {
    await DefaultPreference.set("NATIVE_SOUND_ENABLED", value ? "true" : "false");

    otherServices.setNotificationSound("VISIT", value); // 🔄 background

    const stored = await AsyncStorage.getItem("notificationSoundSettings");
    let data = stored ? JSON.parse(stored) : [];

    const updated = data.some(i => i.name === "VISIT")
      ? data.map(i => i.name === "VISIT" ? { ...i, switch: value ? 1 : 0 } : i)
      : [...data, { name: "VISIT", switch: value ? 1 : 0 }];

    await AsyncStorage.setItem("notificationSoundSettings", JSON.stringify(updated));

  } catch (e) {
    console.log("Visit sound error:", e);
  }
};
  /* ------------------------------
      TOGGLE: STAFF SOUND
  ------------------------------ */
 const toggleStaffSound = async (value) => {
  setStaffNotification(value);

  // ✅ update cache immediately
  updateCache({ staffNotification: value });

  try {
    otherServices.setNotificationSound("STAFF", value); // 🔄 background

    const stored = await AsyncStorage.getItem("notificationSoundSettings");
    let data = stored ? JSON.parse(stored) : [];

    const updated = data.map(i =>
      i.name === "STAFF" ? { ...i, switch: value ? 1 : 0 } : i
    );

    await AsyncStorage.setItem("notificationSoundSettings", JSON.stringify(updated));

  } catch (e) {
    console.log("Staff sound error:", e);
  }
};

  /* ------------------------------
      SAVE — only for phone numbers
  ------------------------------ */
  const handleSave = async () => {
    if (primaryNumber && !isValidPhone(primaryNumber)) {
      setStatusModal({ visible: true, type: "error", title: "Invalid Primary Number", subtitle: "Enter a valid 10-digit number starting with 6-9" });
      return;
    }
    if (secondaryNumber && !isValidPhone(secondaryNumber)) {
      setStatusModal({ visible: true, type: "error", title: "Invalid Secondary Number", subtitle: "Enter a valid 10-digit number starting with 6-9" });
      return;
    }

    try {
      setStatusModal({ visible: true, type: "loading", title: "Saving", subtitle: "Please wait..." });

      await silentSaveUserSettings({
        ivr_p: primaryNumber,
        ivr_s: secondaryNumber
      });

      setStatusModal({ visible: true, type: "success", title: "Saved", subtitle: "Phone numbers updated" });

      // Reset so Save button disappears
      setInitialPhones({ primary: primaryNumber, secondary: secondaryNumber });

    } catch (err) {
      setStatusModal({ visible: true, type: "error", title: "Save Failed", subtitle: "Unable to update numbers" });
    }
  };

  const handlePrimaryChange = (text) => setPrimaryNumber(text.replace(/[^0-9]/g, ''));
  const handleSecondaryChange = (text) => setSecondaryNumber(text.replace(/[^0-9]/g, ''));

  /* ------------------------------
      RENDER
  ------------------------------ */
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Settings" />

      <View style={{ flex: 1 }}>

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#1996D3" />
            <Text style={styles.loaderText}>Loading settings...</Text>
          </View>
        )}

        {permissionWarning && (
          <View style={styles.permissionWarning}>
            <Text style={styles.permissionText}>
              {permissionMessage}. Please enable them from system settings 🔔
            </Text>
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false}>

          {/* PERSONAL */}
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Personal</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>I am Away</Text>
              <Switch
                value={isAway}
                onValueChange={toggleAway}   // ✅ auto-saves
                trackColor={{ false: "#ddd", true: "#1996D3" }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* NOTIFICATIONS */}
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Visit Sound</Text>
              <Switch
                value={visitSound}
                onValueChange={toggleVisitSound}  // ✅ auto-saves
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>Staff</Text>
              <Switch
                value={staffNotification}
                onValueChange={toggleStaffSound}  // ✅ auto-saves
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>
          </View>

          {/* IVR */}
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>IVR Settings</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Enable IVR</Text>
              <Switch
                value={ivrEnabled}
                onValueChange={toggleIvr}   // ✅ auto-saves
                trackColor={{ false: "#ddd", true: "#1996D3" }}
              />
            </View>

            {ivrEnabled && (
              <>
                <View style={styles.divider} />

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Primary Number</Text>
                  <TextInput
                    style={[styles.phoneInput, primaryNumber && !isValidPhone(primaryNumber) && styles.phoneInputError]}
                    placeholder="Enter 10-digit number"
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor="#9CA3AF"
                    value={primaryNumber}
                    onChangeText={handlePrimaryChange}
                  />
                  {primaryNumber && !isValidPhone(primaryNumber) && (
                    <Text style={styles.errorText}>Must be 10 digits starting with 6-9</Text>
                  )}
                </View>

                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>Secondary Number</Text>
                  <TextInput
                    style={[styles.phoneInput, secondaryNumber && !isValidPhone(secondaryNumber) && styles.phoneInputError]}
                    placeholder="Enter 10-digit number (optional)"
                    maxLength={10}
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"
                    value={secondaryNumber}
                    onChangeText={handleSecondaryChange}
                  />
                  {secondaryNumber && !isValidPhone(secondaryNumber) && (
                    <Text style={styles.errorText}>Must be 10 digits starting with 6-9</Text>
                  )}
                </View>

                {/* ✅ Save button ONLY when phone numbers changed */}
                {phoneChanged && (
                  <View style={styles.saveButtonContainer}>
                    <SubmitButton
                      title="Save Numbers"
                      onPress={handleSave}
                      disabled={
                        (primaryNumber && !isValidPhone(primaryNumber)) ||
                        (secondaryNumber && !isValidPhone(secondaryNumber))
                      }
                    />
                  </View>
                )}
              </>
            )}
          </View>

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
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.8 },
  card: { backgroundColor: "#fff", marginHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: "#7eabe645", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: Platform.OS === "ios" ? 10 : 0, minHeight: Platform.OS === "ios" ? 50 : 40 },
  label: { fontSize: 14, fontWeight: "500", color: "#111827" },
  divider: { height: 1, backgroundColor: "#eee", marginHorizontal: 18 },
  inputSection: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 10 },
  inputLabel: { fontSize: 14, fontWeight: "500", color: "#374151", marginBottom: 8 },
  phoneInput: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, height: 44, paddingHorizontal: 12, fontSize: 15, color: "#111827", backgroundColor: "#F9FAFB" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  phoneInputError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },
  saveButtonContainer: { marginHorizontal: 15, marginTop: 5, marginBottom: 15 },
  loaderOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", zIndex: 10 },
  loaderText: { marginTop: 10, color: "#6B7280", fontSize: 14 },
  permissionWarning: { margin: 15, padding: 12, borderRadius: 10, backgroundColor: "#FEF3C7", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  permissionText: { color: "#92400E", flex: 1 },
  noteOuterContainer: { paddingHorizontal: 20, paddingVertical: 15, marginTop: 15 },
  noteTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20, textAlign: "center" },
  noteSubtitle: { fontSize: 13, fontWeight: "500", color: "#4B5563", lineHeight: 18, textAlign: "center", marginTop: 6 },
  noteText: { marginTop: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 18, textAlign: "center" },
});