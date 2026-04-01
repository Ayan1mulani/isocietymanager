import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import useAlert from "../../components/UseAlert";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { complaintService } from "../../../services/complaintService";
import { usePermissions } from "../../../Utils/ConetextApi";
import AppHeader from "../../components/AppHeader";
import StatusModal from "../../components/StatusModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { otherServices } from "../../../services/otherServices";

const BRAND_BLUE = "#1996D3";
const KAV_OFFSET = Platform.OS === "ios" ? 90 : 30;

// 1. Define ONLY the statuses that mean a ticket is completely finished
const TERMINAL_STATUSES = ["closed", "resolved", "completed", "cancelled", "rejected", "withdrawn"];
const REOPEN_STATUSES = ["reopen", "reopened"];

// 2. Dynamic Status Configurator
const getStatusConfig = (rawStatus) => {
  const status = (rawStatus || "Unknown").trim();
  const key = status.toLowerCase();

  // Standard predefined brand colors
  const predefined = {
    open: { color: BRAND_BLUE, bg: "#CCE7FF", icon: "radio-button-on" },
    wip: { color: "#E67E00", bg: "#FFF3CD", icon: "sync" },
    "in progress": { color: "#E67E00", bg: "#FFF3CD", icon: "sync" },
    pending: { color: "#F59E0B", bg: "#FEF3C7", icon: "time-outline" },
    closed: { color: "#28A745", bg: "#D4EDDA", icon: "checkmark-circle" },
    resolved: { color: "#28A745", bg: "#D4EDDA", icon: "checkmark-circle" },
    completed: { color: "#28A745", bg: "#D4EDDA", icon: "checkmark-circle" },
    reopen: { color: "#9333EA", bg: "#F3E8FF", icon: "refresh-circle" },
    reopened: { color: "#9333EA", bg: "#F3E8FF", icon: "refresh-circle" },
  };

  const formattedLabel = status.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (predefined[key]) {
    return { label: formattedLabel, ...predefined[key] };
  }

  // Dynamic colors for ANY custom backend status (Hold, Review, etc.)
  const dynamicPalette = [
    { color: "#EF4444", bg: "#FEE2E2", icon: "ellipse" }, // Red
    { color: "#8B5CF6", bg: "#EDE9FE", icon: "ellipse" }, // Purple
    { color: "#06B6D4", bg: "#CFFAFE", icon: "ellipse" }, // Cyan
    { color: "#F97316", bg: "#FFEDD5", icon: "ellipse" }, // Orange
    { color: "#14B8A6", bg: "#CCFBF1", icon: "ellipse" }, // Teal
  ];

  const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const theme = dynamicPalette[hash % dynamicPalette.length];

  return { label: formattedLabel, color: theme.color, bg: theme.bg, icon: theme.icon };
};

const formatDate = (ts) => {
  if (!ts) return "";
  const d = new Date(ts.replace(" ", "T") + "Z");
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

const formatJustDate = (dateString) => {
  if (!dateString) return null;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return dateString; }
};

// Formats HH:MM:SS to HH:MM AM/PM, or passes through already formatted strings
const formatJustTime = (timeString) => {
  if (!timeString) return null;

  try {
    // 1. Clean up weird backend characters (\u202f is a narrow no-break space)
    let cleanedString = timeString.replace(/\u202F/g, ' ');

    // 2. If the backend already added "AM" or "PM" (like "9:00 AM to 12:00 PM"),
    // it is already formatted! Return it directly so we don't break the range.
    if (/am|pm/i.test(cleanedString)) {
      return cleanedString;
    }

    // 3. Fallback: ONLY do the math if it's a raw 24-hour string like "14:30:00"
    const parts = cleanedString.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parts[1].substring(0, 2); // Safely grab just 2 digits for minutes
      if (isNaN(h)) return cleanedString;

      const ampm = (h >= 12 && h < 24) ? 'PM' : 'AM';
      const h12 = h % 12 || 12;

      return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
    }

    return cleanedString;
  } catch {
    return timeString;
  }
};

const InfoRow = ({ label, value, theme }) => {
  if (!value || value === "-") return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.sub }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
};

const ServiceRequestDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const onGoBack = route.params?.onGoBack;
  const [areas, setAreas] = useState([]);

  const { nightMode } = usePermissions();
  const complaint = route.params?.complaint || {};
  const { showAlert, AlertComponent } = useAlert(nightMode);

  const [societySettings, setSocietySettings] = useState(null);
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");
  const [ratingModal, setRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [modalState, setModalState] = useState({
    visible: false, type: "loading", title: "", subtitle: "",
  });

  const scrollRef = useRef(null);
  const hasChanges = useRef(false);

  const theme = nightMode
    ? { bg: "#0F0F14", card: "#18181F", text: "#fff", sub: "#9CA3AF", border: "#2C2C2C", inputBg: "#252525" }
    : { bg: "#F4F6FA", card: "#fff", text: "#111", sub: "#6B7280", border: "#E5E7EB", inputBg: "#F3F4F6" };

  const normalizedStatus = (complaint.status || "").toLowerCase().trim();

  // 3. Updated Logic: Default to Active
  const isClosed = TERMINAL_STATUSES.includes(normalizedStatus);
  const isReopen = REOPEN_STATUSES.includes(normalizedStatus);
  const isOpen = !isClosed && !isReopen;

  const canReopen = isClosed && societySettings?.data?.reopen_complaint === "1";
  const hasRating = complaint.rating !== null && complaint.rating !== undefined && parseFloat(complaint.rating) > 0;
  const statusConfig = getStatusConfig(normalizedStatus);

  const parsedData = (() => {
    try { return JSON.parse(complaint.data || "{}"); } catch { return {}; }
  })();

  const statusHistory = parsedData?.status_history || [];
  const otp = parsedData?.otp;

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => { loadComments(); }, []);

  const loadConfig = async () => {
    try {
      const data = await AsyncStorage.getItem("SOCIETY_CONFIG");
      if (data) setSocietySettings(JSON.parse(data));
    } catch (e) { console.log("Config load error:", e); }
  };

  const loadComments = async () => {
    try {
      const res = await complaintService.getComplaintComments(complaint.id);
      if (Array.isArray(res?.data)) setComments(res.data);
      else if (Array.isArray(res)) setComments(res);
      else setComments([]);
    } catch (e) { setComments([]); }
  };

  const sendComment = async () => {
    if (!message.trim()) return;
    try {
      await complaintService.addComment(complaint.id, message);
      setMessage("");
      loadComments();
      hasChanges.current = true;
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (e) { console.log(e); }
  };

  const submitRating = async () => {
    if (!rating) {
      showAlert({ title: "Rating Required", message: "Please select a star rating before submitting.", buttons: [{ text: "OK" }] });
      return;
    }
    setRatingModal(false);
    setModalState({ visible: true, type: "loading", title: "Updating...", subtitle: "Saving your feedback." });

    try {
      const res = await complaintService.updateComplaintStatus({
        id: complaint.id, status: "Closed", description: complaint.description,
        complaint_type: complaint.complaint_type, sub_category: complaint.sub_category,
        sub_category_id: complaint.sub_category_id, severity: complaint.severity,
        rating, resident_remarks: feedback,
      });

      if (res?.status === "error") {
        setModalState({ visible: true, type: "error", title: "Cannot Close", subtitle: res?.message || "Something went wrong." });
        return;
      }
      hasChanges.current = true;
      setModalState({ visible: true, type: "success", title: res?.message || "Success", subtitle: "Complaint closed successfully." });
    } catch (e) {
      setModalState({ visible: true, type: "error", title: "Failed", subtitle: "Something went wrong." });
    }
  };

  const handleReopenRequest = () => {
    showAlert({
      title: "Reopen Request", message: "Are you sure you want to reopen this service request?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reopen",
          onPress: async () => {
            setModalState({ visible: true, type: "loading", title: "Reopening...", subtitle: "Processing your request." });
            try {
              const res = await complaintService.updateComplaintStatus({
                id: complaint.id, status: "Reopen", description: complaint.description,
                complaint_type: complaint.complaint_type, sub_category: complaint.sub_category,
                sub_category_id: complaint.sub_category_id, severity: complaint.severity,
              });

              if (res?.status === "error") {
                setModalState({ visible: true, type: "error", title: "Cannot Reopen", subtitle: res?.message || "Something went wrong." });
                return;
              }
              hasChanges.current = true;
              setModalState({ visible: true, type: "success", title: res?.message || "Reopened", subtitle: "Request reopened successfully." });
            } catch (e) {
              setModalState({ visible: true, type: "error", title: "Failed to Reopen", subtitle: "Something went wrong." });
            }
          },
        },
      ],
    });
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const res = await otherServices.getCommonAreas();
      const list = res?.data || res || [];
      setAreas(list);
    } catch (e) {
      console.log("Areas error:", e);
    }
  };
  const areaId =
    complaint?.constant_society_id ??   // 🔥 THIS IS THE REAL FIELD
    complaint?.area_id ??
    complaint?.location_id ??
    parsedData?.area_id ??
    parsedData?.location_id;

  const selectedArea = areas.find(
    a => String(a.id) === String(areaId)
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["bottom"]}>
      <AppHeader title={complaint.complaint_type_name || "Service Request"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={KAV_OFFSET}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!!complaint.img_src && (
            <View style={[styles.mainImageContainer, { backgroundColor: theme.card }]}>
              <Image source={{ uri: complaint.img_src }} style={styles.mainImage} resizeMode="contain" />
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              {/* LEFT SIDE */}
              <View style={{ flex: 1 }}>
                <Text style={[styles.requestNo, { color: BRAND_BLUE }]}>
                  #{complaint.com_no || complaint.id}
                </Text>

                {selectedArea && (
                  <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }}>
                    📍 {selectedArea.name}
                  </Text>
                )}
              </View>

              {/* RIGHT SIDE */}
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Ionicons
                  name={statusConfig.icon}
                  size={13}
                  color={statusConfig.color}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.subCategory, { color: theme.sub }]}>{complaint.sub_category}</Text>
            <Text style={[styles.description, { color: theme.text }]}>{complaint.description || "No description provided."}</Text>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <InfoRow label="Added By" value={complaint.createdBy} theme={theme} />
            <InfoRow label="Block" value={complaint.block} theme={theme} />
            <InfoRow label="Unit" value={complaint.display_unit_no} theme={theme} />
            <InfoRow label="Severity" value={complaint.severity} theme={theme} />

            <InfoRow
              label="Assigned Staff"
              value={complaint.staff_name || "Not Assigned"}
              theme={theme}
            />
            <InfoRow label="Schedule Date" value={formatJustDate(complaint.schedule_date || parsedData?.schedule_date)} theme={theme} />
            <InfoRow label="Probable Date" value={formatJustDate(complaint.probable_date || parsedData?.probable_date)} theme={theme} />
            <InfoRow label="Probable Time" value={formatJustTime(complaint.probable_time || parsedData?.probable_time)} theme={theme} />
            {!!otp && (
              <View style={styles.otpRow}>
                <Text style={[styles.infoLabel, { color: theme.sub }]}>Service OTP</Text>
                <Text style={styles.otpValue}>{otp}</Text>
              </View>
            )}
            {!!complaint.remarks && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <Text style={[styles.remarksLabel, { color: theme.sub }]}>Staff Remarks</Text>
                <Text style={[styles.remarksText, { color: theme.text }]}>{complaint.remarks}</Text>
              </>
            )}
          </View>

          {isClosed && hasRating && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Rating</Text>
              <View style={{ flexDirection: "row", marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name={s <= parseFloat(complaint.rating) ? "star" : "star-outline"} size={24} color="#F59E0B" style={{ marginRight: 4 }} />
                ))}
              </View>
              {!!complaint.resident_remarks && <Text style={[styles.remarksText, { color: theme.sub }]}>"{complaint.resident_remarks}"</Text>}
            </View>
          )}

          {(isOpen || isReopen) && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#22C55E" }]} onPress={() => setRatingModal(true)}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Mark as Closed</Text>
            </TouchableOpacity>
          )}

          {isClosed && (
            <View style={{ gap: 10 }}>
              {canReopen && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#9333EA" }]} onPress={handleReopenRequest}>
                  <Ionicons name="refresh-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Reopen Request</Text>
                </TouchableOpacity>
              )}
              {!hasRating && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#F59E0B" }]} onPress={() => setRatingModal(true)}>
                  <Ionicons name="star-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Rate this Service</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {statusHistory.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Status History</Text>
              {statusHistory.map((item, index) => {
                const sc = getStatusConfig(item.status);
                return (
                  <View key={index} style={styles.historyRow}>
                    <View style={[styles.historyDot, { backgroundColor: sc.color }]} />
                    <Text style={[styles.historyStatus, { color: sc.color }]}>{sc.label}</Text>
                    <Text style={[styles.historyTime, { color: theme.sub }]}>{formatDate(item.timestamp)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Activities {comments.length > 0 ? `(${comments.length})` : ""}</Text>
            {comments.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.sub }]}>No comments yet.</Text>
            ) : (
              comments.map((item) => (
                <View key={item.id} style={styles.commentRow}>
                  <View style={styles.avatar}><Ionicons name="person" size={16} color="#fff" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commentName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={[styles.commentText, { color: theme.sub }]}>{item.remarks}</Text>
                    {!!item.img_src && <Image source={{ uri: item.img_src }} style={styles.commentImage} resizeMode="cover" />}
                    <Text style={styles.timeText}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.commentBox, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            placeholder="Add a comment..." placeholderTextColor={theme.sub} value={message} onChangeText={setMessage}
            style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]} onSubmitEditing={sendComment} blurOnSubmit={false}
          />
          <TouchableOpacity style={[styles.sendBtn, { backgroundColor: message.trim() ? BRAND_BLUE : theme.border }]} onPress={sendComment} disabled={!message.trim()}>
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={ratingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{isClosed ? "Rate the Service" : "Close & Rate"}</Text>
            <Text style={styles.modalSubtitle}>Please provide your feedback.</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => setRating(s)} style={{ padding: 4 }}>
                  <Ionicons name={s <= rating ? "star" : "star-outline"} size={36} color="#F59E0B" />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Write your feedback..." value={feedback} onChangeText={setFeedback}
              placeholderTextColor="#afbdda" style={[styles.feedbackInput, { borderColor: "#E5E7EB" }]} multiline numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#E5E7EB" }]} onPress={() => setRatingModal(false)}>
                <Text style={{ color: "#374151" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#22C55E" }]} onPress={submitRating}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AlertComponent />
      <StatusModal
        visible={modalState.visible} type={modalState.type} title={modalState.title} subtitle={modalState.subtitle}
        onClose={() => {
          setModalState((prev) => ({ ...prev, visible: false }));
          if (modalState.type === "success") {
            if (hasChanges.current && onGoBack) onGoBack();
            navigation.goBack();
          }
        }}
      />
    </SafeAreaView>
  );
};

export default ServiceRequestDetailScreen;

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  requestNo: { fontSize: 15, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  subCategory: { fontSize: 13, marginBottom: 6, textTransform: "capitalize" },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  divider: { height: 1, marginVertical: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5 },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: "600", maxWidth: "60%", textAlign: "right" },
  remarksLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4 },
  remarksText: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  actionBtn: { flexDirection: "row", padding: 14, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  historyRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  historyDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  historyStatus: { fontSize: 13, fontWeight: "600", marginRight: 8, flex: 1 },
  historyTime: { fontSize: 12 },
  emptyText: { fontSize: 13, textAlign: "center", paddingVertical: 8 },
  commentRow: { flexDirection: "row", marginBottom: 14 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND_BLUE, justifyContent: "center", alignItems: "center", marginRight: 10 },
  commentName: { fontWeight: "600", fontSize: 13, marginBottom: 2 },
  commentText: { fontSize: 13, lineHeight: 18 },
  timeText: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  commentBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, fontSize: 14 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCard: { backgroundColor: "#fff", width: "88%", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  modalSubtitle: { fontSize: 13, color: "#6B7280", textAlign: "center", marginTop: 4 },
  feedbackInput: { borderWidth: 1, borderRadius: 8, padding: 10, height: 50, fontSize: 14, marginTop: 10 },
  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: "center" },
  otpRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  otpValue: { fontSize: 18, fontWeight: "800", letterSpacing: 4, color: "#16A34A" },
  mainImageContainer: { width: "100%", height: 250, borderRadius: 12, marginBottom: 12, overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB" },
  mainImage: { width: "100%", height: "100%" },
  commentImage: { width: 120, height: 120, borderRadius: 8, marginTop: 8 }
});