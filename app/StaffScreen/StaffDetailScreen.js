import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image, Linking
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { otherServices } from "../../services/otherServices";
import AppHeader from "../components/AppHeader";
import StatusModal from "../components/StatusModal";
import BRAND from "../config";

const COLORS = {
  primary: BRAND.COLORS.primary,
  background: "#F4F6F9",
  text: "#111827",
  subText: "#6B7280",
  border: "#E5E7EB",
  danger: "#FF5A3C",
  success: "#16A34A",
};

// FIX (Issue 4): handles both string JSON and real arrays from backend
const parseWorkLocations = (raw) => {
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

const StaffDetailScreen = ({ route, navigation }) => {
  const { staff } = route.params;

  // FIX (Issue 1): use staff_id || id consistently
  const staffId = staff.staff_id || staff.id;

  const [reviews, setReviews] = useState([]);
  // FIX (Issue 2): store as number, not string
  const [averageRating, setAverageRating] = useState(0);
  const [loadingRating, setLoadingRating] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "success",
    title: "",
    subtitle: "",
  });

  // FIX (Issue 3): safe modal close using functional updater
  const closeModal = useCallback(() => {
    setStatusModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const showModal = useCallback((type, title, subtitle) => {
    setStatusModal({ visible: true, type, title, subtitle });
  }, []);

  useEffect(() => {
    fetchRating();
  }, []);

  const fetchRating = useCallback(async () => {
    try {
      setLoadingRating(true);

      // FIX (Issue 1): use staffId not staff.id directly
      const res = await otherServices.getStaffRatingById(staffId);

      if (res?.status === "success") {
        const reviewData = Array.isArray(res.data) ? res.data : [];
        setReviews(reviewData);

        if (reviewData.length > 0) {
          const total = reviewData.reduce(
            (sum, item) => sum + (parseFloat(item.rating) || 0),
            0
          );
          // FIX (Issue 2): store as number, display with toFixed() only in JSX
          setAverageRating(total / reviewData.length);
        } else {
          setAverageRating(0);
        }
      }
    } catch (error) {
      console.error("[StaffDetailScreen] rating fetch error:", error);
    } finally {
      setLoadingRating(false);
    }
  }, [staffId]);

  const handleAssociate = useCallback(async () => {
    try {
      setAssigning(true);
      showModal("loading", "Associating", "Please wait...");


      // FIX (Issue 1): use staffId
      const res = await otherServices.assignStaff(staffId);

      if (res?.status === "success") {
        showModal("success", "Associated!", `${String(staff.name || "")} has been added`);

        setTimeout(() => {
          closeModal();
          navigation.navigate("StaffScreen", { tabIndex: 0 });
        }, 2000);
      } else {
        showModal("error", "Failed", res?.message || "Something went wrong");
        // FIX (Issue 3): functional updater — no stale statusModal reference
        setTimeout(() => closeModal(), 2000);
      }
    } catch (error) {
      console.error("[StaffDetailScreen] associate error:", error);
      showModal("error", "Error", "Association failed");
      setTimeout(() => closeModal(), 2000);
    } finally {
      setAssigning(false);
    }
  }, [staffId, staff.name, navigation, showModal, closeModal]);

  const workLocations = parseWorkLocations(staff.work_location);

  // Render star icons for a given numeric rating
  const renderStars = (value) => {
    const rounded = Math.round(parseFloat(value) || 0);
    return [1, 2, 3, 4, 5].map((star) => (
      < Ionicons
        key={star}
        name={star <= rounded ? "star" : "star-outline"}
        size={15}
        color={star <= rounded ? "#F59E0B" : "#D1D5DB"}
        style={{ marginRight: 1 }}
      />
    ));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <AppHeader title="Staff Detail" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile ── */}
        <View style={styles.profileContainer}>
          <View style={styles.avatar}>
            {staff.image && staff.image.startsWith("http") ? (
              <Image
                source={{ uri: staff.image }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.initials}>
                {staff.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </View>

          {/* FIX (Issue 5): safe toUpperCase */}
          <Text style={styles.name}>
            {String(staff.name || "").toUpperCase()}
          </Text>

          {/* Average rating shown below name as a pill */}
          {!loadingRating && averageRating > 0 && (
            <View style={styles.ratingPill}>
              < Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={styles.ratingPillText}>
                {averageRating.toFixed(1)}
              </Text>
            </View>
          )}

          <Text style={styles.subInfo}>
            {staff.address || "—"} · {staff.category || "—"} · {staff.mobile || "N/A"}
          </Text>
        </View>

        {/* ── Info Row ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber} numberOfLines={1}>
              {staffId || "—"}
            </Text>
            <Text style={styles.infoLabel}>ID</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>{workLocations.length}</Text>
            <Text style={styles.infoLabel}>Houses</Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoNumber} numberOfLines={1}>
              {staff.access_card_number || "—"}
            </Text>
            <Text style={styles.infoLabel}>Access No.</Text>
          </View>
        </View>

        {/* ── Associate Button ── */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.associateButton,
              assigning && { opacity: 0.7 },
            ]}
            onPress={handleAssociate}
            disabled={assigning}
          >
            {assigning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.associateText}>Associate</Text>
            )}
          </TouchableOpacity>

          {assigning && (
            <Text style={styles.loadingLabel}>Associating...</Text>
          )}
        </View>

        {/* ── Reviews Section ── */}
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewTitle}>Reviews</Text>
            {reviews.length > 0 && (
              <Text style={styles.reviewCount}>{reviews.length} review{reviews.length > 1 ? "s" : ""}</Text>
            )}
          </View>

          {loadingRating ? (
            <View style={styles.reviewLoader}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
          ) : reviews.length > 0 ? (
            reviews.map((item, index) => (
              <View
                key={item.id ?? index}
                style={[
                  styles.reviewItem,
                  index < reviews.length - 1 && styles.reviewItemBorder,
                ]}
              >
                {/* Stars */}
                <View style={styles.reviewStarsRow}>
                  {renderStars(item.rating)}
                  <Text style={styles.reviewRatingNum}>
                    {parseFloat(item.rating).toFixed(1)}
                  </Text>
                </View>

                {/* Reviewer + date */}
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewerName}>
                    {item.display_name || "Anonymous"}
                  </Text>
                  {item.created_at && (
                    <Text style={styles.reviewDate}>
                      {item.created_at.split(" ")[0]}
                    </Text>
                  )}
                </View>

                {/* Remark */}
                {item.remarks ? (
                  <Text style={styles.reviewRemark}>{item.remarks}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.noReviewContainer}>
              < Ionicons name="chatbubble-outline" size={32} color={COLORS.border} />
              <Text style={styles.noReviewText}>No reviews yet</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
};

export default StaffDetailScreen;

const styles = StyleSheet.create({

  /* ── Profile ── */
  profileContainer: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 16,
    color: COLORS.text,
    textAlign: "center",
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  subInfo: {
    marginTop: 8,
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  infoNumber: {
    fontSize: 15,
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

  /* ── Associate Button ── */
  buttonContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 65,
  },

  initials: {
    fontSize: 36,
    fontWeight: "700",
    color: "#6B7280",
  },
  associateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 10,
    elevation: 3,
    minWidth: 160,
    alignItems: "center",
  },
  associateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingLabel: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.subText,
    fontWeight: "500",
  },

  /* ── Reviews ── */
  reviewCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.subText,
    fontWeight: "500",
  },
  reviewLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  reviewItem: {
    paddingVertical: 12,
  },
  reviewItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewRatingNum: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
    marginLeft: 6,
  },
  reviewMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  reviewDate: {
    fontSize: 11,
    color: COLORS.subText,
  },
  reviewRemark: {
    fontSize: 13,
    color: COLORS.subText,
    lineHeight: 18,
    fontStyle: "italic",
  },
  noReviewContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noReviewText: {
    color: COLORS.subText,
    marginTop: 8,
    fontSize: 14,
  },
});