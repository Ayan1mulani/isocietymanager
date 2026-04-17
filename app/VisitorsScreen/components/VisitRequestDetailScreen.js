import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  AppState
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AppHeader from "../../components/AppHeader";
import { usePermissions } from "../../../Utils/ConetextApi";
import { SafeAreaView } from "react-native-safe-area-context";
import { visitorServices } from "../../../services/visitorServices";
import { cancelVisitorNotification } from "../../../Utils/VisitorNotification";

const VisitDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { nightMode } = usePermissions();

  const visit = route.params?.visit;
  const onGoBack = route.params?.onGoBack;

  const [allowLoading, setAllowLoading] = useState(false);
  const [denyLoading, setDenyLoading] = useState(false);
  const [extendingHour, setExtendingHour] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  const [modal, setModal] = useState({
    visible: false,
    message: "",
    success: true
  });

  const [allowStatus, setAllowStatus] = useState(visit?.allow ?? null);
  const [attendedStatus, setAttendedStatus] = useState(visit?.attended ?? null);

  const theme = {
    bg: nightMode ? "#121212" : "#F3F4F6",
    card: nightMode ? "#1E1E1E" : "#FFFFFF",
    text: nightMode ? "#FFFFFF" : "#111827",
    sub: nightMode ? "#9CA3AF" : "#6B7280",
    border: nightMode ? "#2C2C2C" : "#E5E7EB",
    success: "#10B981",
    danger: "#EF4444",
    grey: "#6B7280",
    primary: "#2E8BC0"
  };

  const isPending = allowStatus === null;
  const isDenied = allowStatus === 0;
  const isAllowed = allowStatus === 1 && attendedStatus === null;
  const isCompleted = allowStatus === 1 && attendedStatus !== null;

  const getStatus = () => {
    // Priority 1: If local state shows expired and still pending
    if (isExpired && isPending) return { text: "EXPIRED", color: theme.danger };
    // Priority 2: Standard statuses
    if (isDenied) return { text: "REJECTED", color: theme.grey };
    if (isCompleted && attendedStatus === 1) return { text: "ATTENDED", color: theme.success };
    if (isCompleted && attendedStatus === 0) return { text: "NOT VISITED", color: theme.grey };
    if (isAllowed) return { text: "APPROVED", color: theme.primary };
    return { text: "PENDING", color: theme.danger };
  };

  const status = getStatus();

  // ─── UI-ONLY Expiry Logic ──────────────────────────────────────────────
  useEffect(() => {
    let timeoutId;

    const checkExpiry = () => {
      if (allowStatus !== null) return;

      const requestTimeStr = visit?.created_at || visit?.start_time;
      if (!requestTimeStr) return;

      const parsed = new Date(requestTimeStr.replace(" ", "T"));
      if (isNaN(parsed.getTime())) return;

      const requestTime = parsed.getTime();
      const now = Date.now();
      const TEN_MINUTES_MS = 10 * 60 * 1000;

      if (now - requestTime >= TEN_MINUTES_MS) {
        setIsExpired(true);
      } else {
        const remainingMs = TEN_MINUTES_MS - (now - requestTime);
        timeoutId = setTimeout(() => {
          setIsExpired(true);
        }, remainingMs);
      }
    };

    checkExpiry();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") checkExpiry();
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      subscription.remove();
    };
  }, [allowStatus, visit]);

  const formatDateTime = (date) => {
    if (!date || date === "0000-00-00 00:00:00") return "Not Available";
    const d = new Date(date.replace(" ", "T"));
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  const getFlatNo = () => {
    try {
      const parsed = typeof visit?.whom_to_meet === "string" ? JSON.parse(visit.whom_to_meet) : visit?.whom_to_meet;
      return parsed?.[0]?.flat_no ?? "—";
    } catch { return "—"; }
  };

  const formatTimeNice = (decimalHours) => {
    const num = parseFloat(decimalHours);
    if (isNaN(num)) return "—";
    const totalMinutes = Math.round(num * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours} Hr ${minutes} Mins`;
    if (hours > 0) return `${hours} Hour${hours > 1 ? "s" : ""}`;
    return `${minutes} Mins`;
  };

  const getAllowTime = () => formatTimeNice(visit?.allowed_time ?? 0.25);

  const closeModal = () => setModal(prev => ({ ...prev, visible: false }));

  const allowVisitor = async () => {
    try {
      setAllowLoading(true);
      await visitorServices.acceptVisitor(visit.id, getFlatNo());
      try { await cancelVisitorNotification(); } catch { }
      setAllowStatus(1);
      setModal({ visible: true, message: "Visitor Approved", success: true });
      setTimeout(() => {
        closeModal();
        if (onGoBack) onGoBack();
        navigation.goBack();
      }, 1200);
    } catch (e) {
      setModal({ visible: true, message: "Failed to approve", success: false });
      setTimeout(closeModal, 1500);
    } finally { setAllowLoading(false); }
  };

  const denyVisitor = async () => {
    try {
      setDenyLoading(true);
      await visitorServices.denyVisitor(visit.id);
      try { await cancelVisitorNotification(); } catch { }
      setAllowStatus(0);
      setModal({ visible: true, message: "Visitor Denied", success: true });
      setTimeout(() => {
        closeModal();
        if (onGoBack) onGoBack();
        navigation.goBack();
      }, 1200);
    } catch (e) {
      setModal({ visible: true, message: "Failed to deny", success: false });
      setTimeout(closeModal, 1500);
    } finally { setDenyLoading(false); }
  };

  const handleExtendTime = async (hr) => {
    try {
      setExtendingHour(hr);
      const res = await visitorServices.extendVisitTime(visit.id, hr);
      setModal({ visible: true, message: res?.message || "Extended", success: res?.status === "success" });
    } catch (error) {
      setModal({ visible: true, message: "Error extending time", success: false });
    } finally { setExtendingHour(null); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader title="Visit Detail" nightMode={nightMode} showBack onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.text}</Text>
        </View>

        <Image source={{ uri: visit?.image || "https://via.placeholder.com/400" }} style={styles.image} />

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.name, { color: theme.text }]}>{visit?.name}</Text>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color={theme.sub} />
            <Text style={[styles.subText, { color: theme.sub }]}>{visit?.mobile}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: theme.sub }]}>Purpose</Text>
            <Text style={[styles.value, { color: theme.text }]}>{visit?.purpose ?? "—"}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: theme.sub }]}>Flat No</Text>
            <Text style={[styles.value, { color: theme.text }]}>{getFlatNo()}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: theme.sub }]}>Extra Visitors</Text>
            <Text style={[styles.value, { color: theme.text }]}>{visit?.extra_visitors ?? 0}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: theme.sub }]}>Entry Time</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formatDateTime(visit?.start_time)}</Text>
          </View>

          {/* RESTORED: Exit Time Row */}
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: theme.sub }]}>Exit Time</Text>
            <Text style={[styles.value, { color: theme.text }]}>{formatDateTime(visit?.end_time)}</Text>
          </View>

        </View>

        {/* RESTORED: Original Allowed Time UI Structure */}
        {allowStatus === 1 && (
          <View style={[styles.allowTimeRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="time-outline" size={15} color={theme.sub} />
            <Text style={[styles.allowTimeLabel, { color: theme.sub }]}>Allow Time:</Text>
            <Text style={[styles.allowTimeValue, { color: theme.text }]}>{getAllowTime()}</Text>
          </View>
        )}

        {/* Buttons are disabled if Expired */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            disabled={!isPending || isExpired || allowLoading || denyLoading}
            onPress={allowVisitor}
            style={[styles.button, { backgroundColor: theme.success, opacity: (isPending && !isExpired && !denyLoading) ? 1 : 0.3 }]}
          >
            {allowLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Allow</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!isPending || isExpired || allowLoading || denyLoading}
            onPress={denyVisitor}
            style={[styles.button, { backgroundColor: theme.danger, opacity: (isPending && !isExpired && !allowLoading) ? 1 : 0.3 }]}
          >
            {denyLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Deny</Text>}
          </TouchableOpacity>
        </View>

        {allowStatus === 1 && (
          <View style={[styles.extendSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.extendHeading, { color: theme.text }]}>Extend Visit Time</Text>
            <View style={styles.hourGrid}>
              {[0.5, 1, 2].map((hr) => {
                const isThisButtonLoading = extendingHour === hr;
                const isAnyButtonLoading  = extendingHour !== null;

                let buttonLabel = `+${formatTimeNice(hr)}`;
                buttonLabel = buttonLabel.replace(" Hour", " Hr").replace("s", "");

                return (
                  <TouchableOpacity
                    key={hr}
                    disabled={isAnyButtonLoading}
                    style={[
                      styles.hourBtn,
                      {
                        borderColor: theme.primary,
                        backgroundColor: theme.bg,
                        opacity: isAnyButtonLoading && !isThisButtonLoading ? 0.4 : 1
                      }
                    ]}
                    onPress={() => handleExtendTime(hr)}
                  >
                    {isThisButtonLoading ? (
                      <ActivityIndicator color={theme.primary} size="small" />
                    ) : (
                      <Text style={[styles.hourBtnText, { color: theme.primary }]}>{buttonLabel}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal transparent visible={modal.visible} animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtnNew}><Ionicons name="close" size={22} color="#6B7280" /></TouchableOpacity>
            <View style={[styles.iconWrapper, { backgroundColor: modal.success ? "#DCFCE7" : "#FEE2E2" }]}>
              <Ionicons name={modal.success ? "checkmark" : "close"} size={32} color={modal.success ? "#16A34A" : "#DC2626"} />
            </View>
            <Text style={styles.modalTitle}>{modal.success ? "Success" : "Error"}</Text>
            <Text style={styles.modalMessage}>{modal.message}</Text>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: modal.success ? "#10B981" : "#EF4444" }]} onPress={closeModal}>
              <Text style={styles.modalBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  image: { width: "100%", height: 180, borderRadius: 12, marginVertical: 12 },
  card: { padding: 14, borderRadius: 12, marginBottom: 20, elevation: 0.3 },
  name: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  subText: { fontSize: 14 },
  divider: { height: 1, marginVertical: 10 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: "600" },
  buttonRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 4 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  allowTimeRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12 },
  allowTimeLabel: { fontSize: 13 },
  allowTimeValue: { fontSize: 13, fontWeight: "700" },
  extendSection: { borderRadius: 12, borderWidth: 1, padding: 14 },
  extendHeading: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  hourGrid: { flexDirection: "row", gap: 8 },
  hourBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, alignItems: "center" },
  hourBtnText: { fontWeight: "600", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { width: "85%", backgroundColor: "#fff", borderRadius: 20, padding: 25, alignItems: "center" },
  closeBtnNew: { position: "absolute", top: 12, right: 12 },
  iconWrapper: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 5 },
  modalMessage: { fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 20 },
  modalBtn: { width: "100%", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "600" }
});

export default VisitDetailScreen;