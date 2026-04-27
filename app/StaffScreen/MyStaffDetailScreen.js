import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { otherServices } from "../../services/otherServices";
import AppHeader from "../components/AppHeader";
import BRAND from "../config";
import StatusModal from "../components/StatusModal";
import useAlert from "../components/UseAlert"; // adjust path

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const COLORS = {
  primary: BRAND.COLORS.primary,
  background: "#F4F6F9",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
  danger: "#FF5A3C",
  success: "#16A34A",
};

// FIX: handles both string JSON and real arrays from backend
const parseJSONArray = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const MyStaffDetailScreen = ({ route }) => {
  const { staff } = route.params;
  const navigation = useNavigation();
  const { t } = useTranslation(); // 👈 Init translation

  const staffId = staff.staff_id || staff.id;
  const [staffNotification, setStaffNotification] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const { showAlert, AlertComponent } = useAlert();

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  // FIX: separate loading states for release and rating submit
  const [releasing, setReleasing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [fetchingRating, setFetchingRating] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // FIX: uses parseJSONArray so arrays from backend work too
  const houseCount = parseJSONArray(staff.work_location).length;

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "loading",
    title: "",
    subtitle: "",
  });

  const closeModal = useCallback(() => {
    setStatusModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const showModal = useCallback((type, title, subtitle) => {
    setStatusModal({
      visible: true,
      type,
      title,
      subtitle,
    });
  }, []);

  useEffect(() => {
    fetchExistingRating();
  }, []);

  const fetchExistingRating = useCallback(async () => {
    try {
      setFetchingRating(true);
      const res = await otherServices.getStaffRatingById(staffId);

      if (res?.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
        const data = res.data[0];
        setExistingRating(data);
        setRating(parseFloat(data.rating) || 0);
        setReview(data.remarks || "");
      } else {
        setExistingRating(null);
      }
    } catch (error) {
      console.error("[MyStaffDetailScreen] fetch rating error:", error);
      setExistingRating(null);
    } finally {
      setFetchingRating(false);
    }
  }, [staffId]);

  // FIX: canOpenURL check + try/catch before opening dialer
  const handleCall = useCallback(async (number) => {
    if (!number) return;
    const url = `tel:${number}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("Error"), t("Cannot make calls on this device"));
      }
    } catch (e) {
      console.error("[MyStaffDetailScreen] Call error:", e);
      showAlert({
        title: t("Error"),
        message: t("Cannot make calls on this device"),
        buttons: [{ text: t("OK") }],
      });
    }
  }, [t, showAlert]);

  const handleRelease = useCallback(() => {
    showAlert({
      title: t("Release Staff"),
      message: t("Are you sure you want to release this staff?"),
      buttons: [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Yes"),
          style: "destructive",
          onPress: async () => {
            try {
              setReleasing(true);
              showModal("loading", t("Releasing Staff"), t("Please wait..."));

              const res = await otherServices.unassignStaff(staffId);

              if (res?.status === "success") {
                showModal("success", t("Released"), t("Staff has been released"));

                setTimeout(() => {
                  closeModal();
                  navigation.goBack();
                }, 2000);
              } else {
                showModal("error", t("Error"), res?.message || t("Unable to release staff"));
              }
            } catch (error) {
              console.error("[Release error]:", error);
              showModal("error", t("Error"), t("Failed to release staff"));
            } finally {
              setReleasing(false);
            }
          },
        },
      ],
    });
  }, [staffId, navigation, showModal, closeModal, t, showAlert]);

  const handleSubmitRating = useCallback(async () => {
    if (!rating) {
      showAlert({
        title: t("Validation"),
        message: t("Please select a rating before submitting"),
        buttons: [{ text: t("OK") }],
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await otherServices.addOrUpdateRating(staffId, rating, review);

      if (res?.status === "success") {
        showAlert({
          title: t("Success"),
          message: isEditing ? t("Rating updated!") : t("Rating submitted!"),
          buttons: [{ text: t("OK") }],
        });
        setIsEditing(false);
        fetchExistingRating();
      } else {
        showAlert({
          title: t("Error"),
          message: res?.message || t("Failed to submit rating"),
          buttons: [{ text: t("OK") }],
        });
      }
    } catch (error) {
      console.error("[MyStaffDetailScreen] rating submit error:", error);
      Alert.alert(t("Error"), t("Failed to submit rating"));
    } finally {
      setSubmitting(false);
    }
  }, [staffId, rating, review, isEditing, fetchExistingRating, t, showAlert]);

  const renderInteractiveStars = () =>
    [1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => setRating(star)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        < Ionicons
          name={star <= rating ? "star" : "star-outline"}
          size={34}
          color={star <= rating ? "#F59E0B" : "#D1D5DB"}
          style={{ marginHorizontal: 4 }}
        />
      </TouchableOpacity>
    ));

  const renderDisplayStars = (value) => {
    const rounded = Math.round(parseFloat(value) || 0);
    return [1, 2, 3, 4, 5].map((star) => (
      < Ionicons
        key={star}
        name={star <= rounded ? "star" : "star-outline"}
        size={22}
        color={star <= rounded ? "#F59E0B" : "#D1D5DB"}
        style={{ marginHorizontal: 2 }}
      />
    ));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <AppHeader title={t("Staff Details")} onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ── PROFILE ── */}
   {/* ── PROFILE ── */}
        <View style={styles.profileContainer}>
          <View style={styles.avatar}>
            {staff.image && staff.image.startsWith("http") ? (
              <Image source={{ uri: staff.image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.initials}>
                {/* SAFE: Force string, grab first char, then uppercase */}
                {String(staff.name || "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name}>
            {/* SAFE: Force string before uppercase */}
            {String(staff.name || "").toUpperCase()}
          </Text>
          <Text style={styles.subInfo}>
            {t(staff.address || "Pune")} · {t(staff.category || "—")} · {staff.mobile || "N/A"}
          </Text>
        </View>

        {/* ── INFO ROW ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber} numberOfLines={1}>
              {staff.code || staff.id || "—"}
            </Text>
            <Text style={styles.infoLabel}>{t("Emp ID")}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text
              style={[
                styles.infoNumber,
                { 
                  // SAFE: Check status safely
                  color: String(staff.status || "").toUpperCase() === "PRESENT" 
                    ? COLORS.success 
                    : COLORS.danger 
                },
              ]}
            >
              {/* SAFE: Check status safely */}
              {String(staff.status || "").toUpperCase() === "PRESENT" ? t("IN") : t("OUT")}
            </Text>
            <Text style={styles.infoLabel}>{t("Status")}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoNumber} numberOfLines={1}>
              {t(staff.designation || "—")}
            </Text>
            <Text style={styles.infoLabel}>{t("Role")}</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>{houseCount}</Text>
            <Text style={styles.infoLabel}>{t("Houses")}</Text>
          </View>
        </View>

      
        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.attendanceBtn}
            onPress={() => navigation.navigate("MyStaffAttendanceScreen", { staff })}
          >
            <Text style={styles.attendanceText}>{t("Attendance")}</Text>
          </TouchableOpacity>

          {staff.mobile ? (
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => handleCall(staff.mobile)}
            >
              < Ionicons name="call" size={16} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.callText}>{t("Call")}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.releaseBtn, { opacity: releasing ? 0.6 : 1 }]}
            onPress={handleRelease}
            disabled={releasing}
          >
            {releasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.releaseText}>{t("Release")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── RATING SECTION ── */}
        <View style={styles.rateSection}>
          {fetchingRating ? (
            <View style={styles.ratingLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={[styles.ratingLoaderText, { color: COLORS.subText }]}>
                {t("Loading rating...")}
              </Text>
            </View>
          ) : existingRating && !isEditing ? (
            /* ── Display existing rating ── */
            <View style={styles.ratingCard}>
              <View style={styles.ratingCardHeader}>
                <Text style={styles.rateTitle}>{t("Your Rating")}</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => setIsEditing(true)}
                >
                  < Ionicons name="pencil" size={13} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.editBtnText}>{t("Edit")}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.displayStarsRow}>
                {renderDisplayStars(existingRating.rating)}
                <Text style={styles.ratingNumeric}>
                  {parseFloat(existingRating.rating).toFixed(1)}
                </Text>
              </View>

              {existingRating.remarks ? (
                <View style={styles.reviewBubble}>
                  < Ionicons name="chatbubble-outline" size={13} color={COLORS.subText} style={{ marginRight: 6 }} />
                  <Text style={styles.reviewDisplay}>
                    {existingRating.remarks}
                  </Text>
                </View>
              ) : (
                <Text style={styles.noReviewText}>{t("No review written")}</Text>
              )}
            </View>
          ) : (
            /* ── Submit / Edit rating form ── */
            <View style={styles.ratingCard}>
              <View style={styles.ratingCardHeader}>
                <Text style={styles.rateTitle}>
                  {isEditing ? t("Edit Rating") : t("Rate This Staff")}
                </Text>
                {isEditing && (
                  <TouchableOpacity onPress={() => setIsEditing(false)}>
                    <Text style={styles.cancelText}>{t("Cancel")}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.interactiveStarsRow}>
                {renderInteractiveStars()}
              </View>

              {rating > 0 && (
                <Text style={styles.ratingLabel}>
                  {t(["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating])}
                </Text>
              )}

              <TextInput
                placeholder={t("Write your review (optional)")}
                placeholderTextColor={COLORS.subText}
                value={review}
                onChangeText={setReview}
                multiline
                style={styles.reviewInput}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
                onPress={handleSubmitRating}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isEditing ? t("Update Rating") : t("Submit Rating")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={closeModal}
      />
      <AlertComponent />
    </SafeAreaView>
  );
};

export default MyStaffDetailScreen;

const styles = StyleSheet.create({
  /* ── Profile ── */
  profileContainer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  subInfo: {
    marginTop: 6,
    color: COLORS.subText,
    fontSize: 13,
    textAlign: "center",
  },

  /* ── Info Row ── */
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },
  initials: {
    fontSize: 34,
    fontWeight: "700",
    color: "#6B7280",
  },
  infoNumber: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.subText,
    marginTop: 4,
    textAlign: "center",
  },
  infoDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },

  /* ── Action Row ── */
  actionRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
  },
  attendanceBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    marginRight: 8,
  },
  attendanceText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  callBtn: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  callText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  releaseBtn: {
    flex: 1,
    backgroundColor: COLORS.danger,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  releaseText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  /* ── Rating Section ── */
  rateSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  ratingLoader: {
    alignItems: "center",
    paddingVertical: 24,
  },
  ratingLoaderText: {
    marginTop: 8,
    fontSize: 13,
  },
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  rateTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  cancelText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: "600",
  },

  /* Display rating */
  displayStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingNumeric: {
    fontSize: 18,
    fontWeight: "700",
    color: "#B45309",
    marginLeft: 10,
  },
  reviewBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 10,
  },
  reviewDisplay: {
    flex: 1,
    fontSize: 14,
    color: COLORS.subText,
    fontStyle: "italic",
    lineHeight: 20,
  },
  noReviewText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  /* Interactive rating form */
  interactiveStarsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingLabel: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
    color: "#B45309",
    marginBottom: 12,
  },
  reviewInput: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    height: 110,
    marginTop: 4,
    fontSize: 14,
    color: COLORS.text,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});