import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, Switch,
  ScrollView, ActivityIndicator, Platform, TextInput, TouchableOpacity
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
import { PERMISSIONS, check } from 'react-native-permissions';

// ── Import useTranslation for i18n ──
import { useTranslation } from 'react-i18next';

import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";

import {
  loadCachedSettings,
  fetchAndCacheSettings,
  markSettingsSaved,
  wasSavedRecently,
  getCachedUser
} from '../../services/settingsCache';

const SettingsScreen = () => {
  const navigation = useNavigation();
  
  // ── Initialize i18n hooks ──
  const { t, i18n } = useTranslation();
  
  const { permissions } = usePermissions();
  const canToggleAway = permissions && hasPermission(permissions, 'RESHOMAWY', 'C');

  const [loading, setLoading] = useState(false);
  const [changingLang, setChangingLang] = useState(null); // 👈 Added loading state for language
  const [isAway, setIsAway] = useState(false);
  const [visitSound, setVisitSound] = useState(true);
  const [staffNotification, setStaffNotification] = useState(true);
  const [ivrEnabled, setIvrEnabled] = useState(false);
  const userRef = useRef(null);
  const [primaryNumber, setPrimaryNumber] = useState("");
  const [secondaryNumber, setSecondaryNumber] = useState("");
  const [initialPhones, setInitialPhones] = useState({ primary: "", secondary: "" });
  const [phoneChanged, setPhoneChanged] = useState(false);
  const [permissionWarning, setPermissionWarning] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const [statusModal, setStatusModal] = useState({
    visible: false, type: "success", title: "", subtitle: ""
  });

  // ── Available Languages List ──
  const availableLanguages = [
    { code: 'en', label: 'English' },
    { code: 'km', label: 'Khmer (ភាសាខ្មែរ)' },
    { code: 'zh', label: 'Chinese (中文)' }, 
    { code: 'vi', label: 'Vietnamese (Tiếng Việt)' }
  ];

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

  const loadSettings = async () => {
    const cached = await loadCachedSettings();
    if (cached) {
      applySettings(cached);
    } else {
      setLoading(true);
    }

    if (!wasSavedRecently()) {                  
      const fresh = await fetchAndCacheSettings();
      if (fresh && !wasSavedRecently()) {        
        applySettings(fresh);
      }
    }

    setLoading(false);
  };

  useEffect(() => { loadSettings(); }, []);

  useFocusEffect(
    useCallback(() => { checkPermissions(); }, [])
  );

  useEffect(() => {
    const changed =
      primaryNumber !== initialPhones.primary ||
      secondaryNumber !== initialPhones.secondary;
    setPhoneChanged(changed);
  }, [primaryNumber, secondaryNumber, initialPhones]);

  const checkPermissions = async () => {
    const notif = await checkNotificationPermission();
    const alarm = await checkAlarmPermission();
    if (!notif && !alarm) {
      setPermissionMessage(t("Notifications & alarms are OFF"));
      setPermissionWarning(true);
    } else if (!notif) {
      setPermissionMessage(t("Notifications are OFF"));
      setPermissionWarning(true);
    } else if (!alarm) {
      setPermissionMessage(t("Alarms & reminders are OFF"));
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
      const updated = { ...cache, ...updates };
      await AsyncStorage.setItem("cached_user_settings", JSON.stringify(updated));
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
    } catch { return true; }
  };

  const isValidPhone = (num) => {
    if (!num) return true;
    return /^[6-9]\d{9}$/.test(num);
  };

  const silentSaveUserSettings = async (overrides = {}) => {
    let user = userRef.current;
    if (!user?.id) {
      user = await getCachedUser();
    }
    if (!user?.id) {
      console.log("Silent save skipped: no user");
      return;
    }

    try {
      const raw = await AsyncStorage.getItem("cached_user_settings");
      const cache = raw ? JSON.parse(raw) : {};

      const payload = {
        id: user.id,
        name: user.name,
        phone_no: user.phone_no,
        email: user.email,
        flat_no: user.flat_no,
        display_unit_no: user.display_unit_no,
        tenant: user.tenant,
        home_away: cache.isAway ? 1 : 0,         
        ivr_enable: cache.ivrEnabled ? 1 : 0,     
        ivr_p: cache.primaryNumber || "",
        ivr_s: cache.secondaryNumber || "",
        ...overrides,                           
      };

      await otherServices.updateUserSettings(payload);
    } catch (err) {
      console.log("Silent save error:", err);
    }
  };

  const toggleAway = (value) => {
    markSettingsSaved();
    setIsAway(value);
    updateCache({ isAway: value });                        
    silentSaveUserSettings({ home_away: value ? 1 : 0 });   
  };

  const toggleIvr = (value) => {
    markSettingsSaved();
    setIvrEnabled(value);
    updateCache({ ivrEnabled: value });
    silentSaveUserSettings({ ivr_enable: value ? 1 : 0 });
  };

  const toggleVisitSound = async (value) => {
    markSettingsSaved();                             
    setVisitSound(value);
    updateCache({ visitSound: value });
    try {
      await DefaultPreference.set("NATIVE_SOUND_ENABLED", value ? "true" : "false");
      otherServices.setNotificationSound("VISIT", value);
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

  const toggleStaffSound = async (value) => {
    markSettingsSaved();                              
    setStaffNotification(value);
    updateCache({ staffNotification: value });
    try {
      otherServices.setNotificationSound("STAFF", value);
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

  const handleSave = async () => {
    if (primaryNumber && !isValidPhone(primaryNumber)) {
      setStatusModal({ visible: true, type: "error", title: t("Invalid Primary Number"), subtitle: t("Enter a valid 10-digit number starting with 6-9") });
      return;
    }
    if (secondaryNumber && !isValidPhone(secondaryNumber)) {
      setStatusModal({ visible: true, type: "error", title: t("Invalid Secondary Number"), subtitle: t("Enter a valid 10-digit number starting with 6-9") });
      return;
    }
    try {
      setStatusModal({ visible: true, type: "loading", title: t("Saving"), subtitle: t("Please wait...") });
      await silentSaveUserSettings({ ivr_p: primaryNumber, ivr_s: secondaryNumber });
      setStatusModal({ visible: true, type: "success", title: t("Saved"), subtitle: t("Phone numbers updated") });
      setInitialPhones({ primary: primaryNumber, secondary: secondaryNumber });
    } catch (err) {
      setStatusModal({ visible: true, type: "error", title: t("Save Failed"), subtitle: t("Unable to update numbers") });
    }
  };

  const handlePrimaryChange = (text) => setPrimaryNumber(text.replace(/[^0-9]/g, ''));
  const handleSecondaryChange = (text) => setSecondaryNumber(text.replace(/[^0-9]/g, ''));

  // ── Handle Language Switch ──
  // ── Handle Language Switch (Fixed for UI freezing) ──
  const handleLanguageChange = (langCode) => {
    if (i18n.language === langCode) return; 

    // 1. Turn on the spinner immediately
    setChangingLang(langCode); 
    
    // 2. Wait just 50ms so React has time to paint the spinner on the screen
    setTimeout(async () => {
      try {
        await i18n.changeLanguage(langCode); // 3. Now do the heavy language swap
      } catch (error) {
        console.log("Error changing language:", error);
      } finally {
        setChangingLang(null); // 4. Turn off the spinner
      }
    }, 50);
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t("Settings")} />
      <View style={{ flex: 1 }}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#1996D3" />
            <Text style={styles.loaderText}>{t("Loading settings...")}</Text>
          </View>
        )}
        {permissionWarning && (
          <View style={styles.permissionWarning}>
            <Text style={styles.permissionText}>
              {permissionMessage}. {t("Please enable them from system settings")} 🔔
            </Text>
          </View>
        )}
        <ScrollView showsVerticalScrollIndicator={false}>
          
          {canToggleAway && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={16} color="#6B7280" />
                <Text style={styles.sectionTitle}>{t("Personal")}</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.label}>{t("I am Away")}</Text>
                  
                  <Switch 
                    value={isAway} 
                    onValueChange={toggleAway}
                    trackColor={{ false: "#ddd", true: "#1996D3" }} 
                    thumbColor="#fff" 
                  />
                </View>
              </View>
            </>
          )}

          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>{t("Notifications")}</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("Visit Sound")}</Text>
              <Switch value={visitSound} onValueChange={toggleVisitSound}
                trackColor={{ false: "#ddd", true: "#1996D3" }} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t("Staff")}</Text>
              <Switch value={staffNotification} onValueChange={toggleStaffSound}
                trackColor={{ false: "#ddd", true: "#1996D3" }} />
            </View>
          </View>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>{t("IVR Settings")}</Text>
          </View>
          
          {/* Added a custom bottom margin to reduce space when IVR is enabled */}
          <View style={[styles.card, { marginBottom: ivrEnabled ? 4 : 10 }]}>
            <View style={styles.row}>
              <Text style={styles.label}>{t("Enable IVR")}</Text>
              <Switch value={ivrEnabled} onValueChange={toggleIvr}
                trackColor={{ false: "#ddd", true: "#1996D3" }} />
            </View>
            {ivrEnabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>{t("Primary Number")}</Text>
                  <TextInput
                    style={[styles.phoneInput, primaryNumber && !isValidPhone(primaryNumber) && styles.phoneInputError]}
                    placeholder={t("Enter 10-digit number")} keyboardType="phone-pad"
                    maxLength={10} placeholderTextColor="#9CA3AF"
                    value={primaryNumber} onChangeText={handlePrimaryChange} />
                  {primaryNumber && !isValidPhone(primaryNumber) && (
                    <Text style={styles.errorText}>{t("Must be 10 digits starting with 6-9")}</Text>
                  )}
                </View>
                <View style={styles.inputSection}>
                  <Text style={styles.inputLabel}>{t("Secondary Number")}</Text>
                  <TextInput
                    style={[styles.phoneInput, secondaryNumber && !isValidPhone(secondaryNumber) && styles.phoneInputError]}
                    placeholder={t("Enter 10-digit number (optional)")} maxLength={10}
                    keyboardType="phone-pad" placeholderTextColor="#9CA3AF"
                    value={secondaryNumber} onChangeText={handleSecondaryChange} />
                  {secondaryNumber && !isValidPhone(secondaryNumber) && (
                    <Text style={styles.errorText}>{t("Must be 10 digits starting with 6-9")}</Text>
                  )}
                </View>
                {phoneChanged && (
                  <View style={styles.saveButtonContainer}>
                    <SubmitButton title={t("Save Numbers")} onPress={handleSave}
                      disabled={
                        (primaryNumber && !isValidPhone(primaryNumber)) ||
                        (secondaryNumber && !isValidPhone(secondaryNumber))
                      } />
                  </View>
                )}
              </>
            )}
          </View>
          
          {ivrEnabled && (
            <View style={styles.noteOuterContainer}>
              <Text style={styles.noteTitle}>{t("Important Note")}</Text>
              <Text style={styles.noteSubtitle}>
                {t("You will receive a call for confirmation on arrival of your visitor/guest.")}
              </Text>
              <Text style={styles.noteText}>
                {t("By providing your contact details you have authorized iSocietyManager to contact you in future through calls/Email/SMS to share information from iSocietyManager.")}
              </Text>
            </View>
          )}

          {/* ── Language Preferences Section ── */}
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={16} color="#6B7280" />
            <Text style={styles.sectionTitle}>{t("Language")}</Text>
          </View>
          <View style={[styles.card, { marginBottom: 20 }]}>
            {availableLanguages.map((lang, index) => (
              <View key={lang.code}>
                <TouchableOpacity
                  style={styles.languageRow}
                  onPress={() => handleLanguageChange(lang.code)}
                  disabled={changingLang !== null} // Disable while changing
                >
                  <Text style={[styles.label, i18n.language === lang.code && styles.activeLanguageText]}>
                    {lang.label}
                  </Text>
                  
                  {/* Show loader if switching to this language, otherwise checkmark if active */}
                  {changingLang === lang.code ? (
                    <ActivityIndicator size="small" color="#1996D3" />
                  ) : i18n.language === lang.code ? (
                    <Ionicons name="checkmark" size={20} color="#1996D3" />
                  ) : null}

                </TouchableOpacity>
                {index < availableLanguages.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
      <StatusModal
        visible={statusModal.visible} type={statusModal.type}
        title={statusModal.title} subtitle={statusModal.subtitle}
        onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))} />
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
  
  // ── FIX: Adjusted Spacing to pull the Note up tightly under the IVR box ──
  noteOuterContainer: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 15, marginTop: 0 },
  noteTitle: { fontSize: 14, fontWeight: "600", color: "#111827", lineHeight: 20, textAlign: "center" },
  noteSubtitle: { fontSize: 13, fontWeight: "500", color: "#4B5563", lineHeight: 18, textAlign: "center", marginTop: 6 },
  noteText: { marginTop: 8, fontSize: 13, color: "#9CA3AF", lineHeight: 18, textAlign: "center" },
  
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  activeLanguageText: {
    color: "#1996D3",
    fontWeight: "700",
  }
});