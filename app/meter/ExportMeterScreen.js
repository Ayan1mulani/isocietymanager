import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AppHeader from "../components/AppHeader";
import { ismServices } from "../../services/ismServices";

// ─── Quick range presets ─────────────────────────────────────────────────────
const PRESETS = [
  { label: "1W",  full: "1 Week",    days: 7   },
  { label: "1M",  full: "1 Month",   months: 1 },
  { label: "2M",  full: "2 Months",  months: 2 },
  { label: "3M",  full: "3 Months",  months: 3 },
];

const subtractFromToday = ({ days, months }) => {
  const to   = new Date();
  const from = new Date();
  if (days)   from.setDate(from.getDate() - days);
  if (months) from.setMonth(from.getMonth() - months);
  return { from, to };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toISO     = (d) => d.toISOString().split("T")[0];
const toDisplay = (d) =>
  d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// ─────────────────────────────────────────────────────────────────────────────
const ExportMeterScreen = ({ navigation }) => {
  const [fromDate,      setFromDate]      = useState(null);
  const [toDate,        setToDate]        = useState(null);
  const [activePreset,  setActivePreset]  = useState(null); // label of selected chip
  const [showFromPicker,setShowFromPicker]= useState(false);
  const [showToPicker,  setShowToPicker]  = useState(false);
  const [loading,       setLoading]       = useState(false);

  // ── Preset chip pressed ───────────────────────────────────────────────────
  const applyPreset = (preset) => {
    const { from, to } = subtractFromToday(preset);
    setFromDate(from);
    setToDate(to);
    setActivePreset(preset.label);
  };

  // ── Manual picker changes clear the active preset chip ───────────────────
  const onFromChange = (event, selected) => {
    setShowFromPicker(false);
    if (event.type === "dismissed" || !selected) return;
    setFromDate(selected);
    setActivePreset(null);          // custom range → no chip highlighted
    if (toDate && selected > toDate) setToDate(null);
  };

  const onToChange = (event, selected) => {
    setShowToPicker(false);
    if (event.type === "dismissed" || !selected) return;
    if (fromDate && selected < fromDate) {
      Alert.alert("Invalid Date", "End date cannot be before start date.");
      return;
    }
    setToDate(selected);
    setActivePreset(null);
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      if (!fromDate || !toDate) {
        Alert.alert("Error", "Please select a date range.");
        return;
      }
      setLoading(true);

      const url = await ismServices.exportMeterReadings(
        toISO(fromDate),
        toISO(toDate),
        null,
        "xls"
      );

      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error("Cannot open download link");
      await Linking.openURL(url);
    } catch (err) {
      console.log("Export Error:", err);
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const hasRange = fromDate && toDate;

  return (
    <View style={styles.container}>
      <AppHeader title="Export Meter Data" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Quick Presets ─────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>QUICK SELECT</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p) => {
            const isActive = activePreset === p.label;
            return (
              <TouchableOpacity
                key={p.label}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => applyPreset(p)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {p.label}
                </Text>
                <Text style={[styles.chipFull, isActive && styles.chipFullActive]}>
                  {p.full}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Divider ───────────────────────────────────────────────────── */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or custom range</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Manual Date Pickers ───────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>FROM DATE</Text>
        <TouchableOpacity
          style={[styles.dateBtn, fromDate && styles.dateBtnFilled]}
          onPress={() => setShowFromPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.dateBtnText, !fromDate && styles.placeholder]}>
            {fromDate ? toDisplay(fromDate) : "Select start date"}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>TO DATE</Text>
        <TouchableOpacity
          style={[styles.dateBtn, toDate && styles.dateBtnFilled]}
          onPress={() => setShowToPicker(true)}
          activeOpacity={0.75}
        >
          <Text style={[styles.dateBtnText, !toDate && styles.placeholder]}>
            {toDate ? toDisplay(toDate) : "Select end date"}
          </Text>
        </TouchableOpacity>

     

        {/* ── Download Button ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.exportBtn, (!hasRange || loading) && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={!hasRange || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.exportBtnText}>  Download Excel</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* ── Native Pickers ───────────────────────────────────────────────── */}
      {showFromPicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display="calendar"
          maximumDate={toDate || new Date()}
          onChange={onFromChange}
        />
      )}
      {showToPicker && (
        <DateTimePicker
          value={toDate || fromDate || new Date()}
          mode="date"
          display="calendar"
          minimumDate={fromDate || undefined}
          maximumDate={new Date()}
          onChange={onToChange}
        />
      )}
    </View>
  );
};

export default ExportMeterScreen;

// ─── Styles ──────────────────────────────────────────────────────────────────
const BLUE       = "#4369bb";
const BLUE_LIGHT = "#ffffff";
const BLUE_BORDER= "#bdd2ec";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fefefe" },
  scroll:    { padding: 18, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: "uppercase",
  },

  // ── Preset chips ──────────────────────────────────────────────────────────
  presetRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    elevation: 0.7,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
    elevation: 0.3,
    shadowColor: BLUE,
    shadowOpacity: 0.3,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 0.3,
  },
  chipLabelActive: { color: "#fff" },
  chipFull: {
    fontSize: 10,
    fontWeight: "500",
    color: "#94A3B8",
    marginTop: 2,
  },
  chipFullActive: { color: "#BFDBFE" },

  // ── Divider ───────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

  // ── Date buttons ──────────────────────────────────────────────────────────
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 0.3,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dateBtnFilled: { borderColor: BLUE, backgroundColor: BLUE_LIGHT },
  dateBtnIcon:   { fontSize: 18 },
  dateBtnText:   { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  placeholder:   { color: "#94A3B8", fontWeight: "400" },

  // ── Summary ───────────────────────────────────────────────────────────────
  summaryCard: {
    marginTop: 18,
    backgroundColor: BLUE_LIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BLUE_BORDER,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  summaryLabel: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  summaryRange:  { fontSize: 14, fontWeight: "700", color: BLUE },
  summaryBadge: {
    marginTop: 6,
    backgroundColor: BLUE,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  summaryBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  // ── Export button ─────────────────────────────────────────────────────────
  exportBtn: {
    marginTop: 24,
    backgroundColor: BLUE,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: BLUE,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  exportBtnDisabled: {
    backgroundColor: "#93C5FD",
    elevation: 0,
    shadowOpacity: 0,
  },
  exportBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },
});