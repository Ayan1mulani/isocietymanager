import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import Contacts from "react-native-contacts";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import CalendarSelector from "../components/Calender";
import { visitorServices } from "../../../services/visitorServices";
import StatusModal from "../../components/StatusModal";
import SubmitButton from "../../components/SubmitButton";
import BRAND from "../../config";
import { usePermissions } from "../../../Utils/ConetextApi";
import { hasPermission } from "../../../Utils/PermissionHelper";

const SingleVisitorForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const onGoBack = route.params?.onGoBack;

  const theme = {
    cardBg: "#FFFFFF",
    text: "#1F2937",
    textSecondary: "#6B7280",
    inputBg: "#F9FAFB",
    border: "#E5E7EB",
    primaryBlue: "#1996D3",
  };

  const [visitorName, setVisitorName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [visitDate, setVisitDate] = useState(null);
  const [vehicleNo, setVehicleNo] = useState("");
  const [selectedParking, setSelectedParking] = useState(null);
  const [contactFilled, setContactFilled] = useState(false);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: null,
    title: "",
    subtitle: "",
  });

  // ── Contact selector modal state ──
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);

  const { permissions } = usePermissions();
  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canAddVehicle = permissionsLoaded && hasPermission(permissions, "VHCLNO", "C");
  const canUseGuestParking = permissionsLoaded && hasPermission(permissions, "GSTPRK", "C");

  /* ===============================
     RECEIVE PARKING SLOT
     =============================== */
  useEffect(() => {
    if (route.params?.selectedParking) {
      setSelectedParking(route.params.selectedParking);
      navigation.setParams({ selectedParking: undefined });
    }
  }, [route.params?.selectedParking]);

  /* ===============================
     FILTER CONTACTS ON SEARCH
     =============================== */
  useEffect(() => {
    if (!contactSearch.trim()) {
      setFilteredContacts(allContacts);
    } else {
      const q = contactSearch.toLowerCase();
      setFilteredContacts(
        allContacts.filter((c) => {
          const name = `${c.givenName || ""} ${c.familyName || ""}`.toLowerCase();
          const phone = (c.phoneNumbers?.[0]?.number || "").replace(/\D/g, "");
          return name.includes(q) || phone.includes(q);
        })
      );
    }
  }, [contactSearch, allContacts]);

  /* ===============================
     CONTACT PICKER
     =============================== */
  const handlePickContact = async () => {
    try {
      // ── Android permission ──
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: "Contacts Permission",
            message: "Allow access to contacts to fill visitor details?",
            buttonPositive: "Allow",
            buttonNegative: "Deny",
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Contacts permission is required.");
          return;
        }
      }

      // ── iOS permission ──
      if (Platform.OS === "ios") {
        const permission = await Contacts.requestPermission();
        if (permission !== "authorized") {
          Alert.alert(
            "Permission Denied",
            "Please allow contacts access in Settings."
          );
          return;
        }
      }

      // ── Load contacts ──
      setLoadingContacts(true);
      setContactModalVisible(true);
      setContactSearch("");

      const contacts = await Contacts.getAll();

      // Keep only contacts that have at least one phone number
      const withPhone = contacts
        .filter((c) => c.phoneNumbers && c.phoneNumbers.length > 0)
        .sort((a, b) => {
          const nameA = `${a.givenName || ""} ${a.familyName || ""}`.trim().toLowerCase();
          const nameB = `${b.givenName || ""} ${b.familyName || ""}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });

      setAllContacts(withPhone);
      setFilteredContacts(withPhone);
      setLoadingContacts(false);
    } catch (err) {
      setLoadingContacts(false);
      setContactModalVisible(false);
      console.log("Contact load error:", err);
      Alert.alert("Error", "Could not load contacts. Please try again.");
    }
  };

  /* ===============================
     SELECT A CONTACT FROM MODAL
     =============================== */
  const handleSelectContact = (contact) => {
    const name =
      [contact.givenName, contact.familyName].filter(Boolean).join(" ").trim() ||
      contact.displayName ||
      "";

    const phones = contact.phoneNumbers || [];
    const mobileEntry =
      phones.find((p) =>
        ["mobile", "cell", "iphone"].includes((p.label || "").toLowerCase())
      ) || phones[0];

    let rawPhone = mobileEntry?.number || "";
    rawPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!rawPhone) {
      Alert.alert("Invalid Number", "Could not extract a valid phone number.");
      return;
    }

    setVisitorName(name);
    setMobileNumber(rawPhone);
    setContactFilled(true);
    setContactModalVisible(false);
  };

  const handleNameChange = (val) => {
    setVisitorName(val);
    if (contactFilled) setContactFilled(false);
  };

  const handleMobileChange = (val) => {
    setMobileNumber(val);
    if (contactFilled) setContactFilled(false);
  };

  /* ===============================
     FORMAT PARKING DATE RANGE
     =============================== */
  const formatParkingDateRange = (from, to) => {
    if (!from || !to) return "";
    const start = new Date(from);
    const end = new Date(to);
    const today = new Date();
    const isSameDay = start.toDateString() === end.toDateString();
    const isToday =
      start.toDateString() === today.toDateString() &&
      end.toDateString() === today.toDateString();
    const formatDate = (d) =>
      d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    if (isToday) return "Today";
    if (isSameDay) return formatDate(start);
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  /* ===============================
     SUBMIT
     =============================== */
  const handleSubmit = async () => {
    if (!visitorName || !mobileNumber || !visitDate) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setModalConfig({
        visible: true,
        type: "loading",
        title: "Adding Visitor",
        subtitle: "Please wait...",
      });

      const formattedDate =
        visitDate instanceof Date
          ? visitDate.toISOString().split("T")[0]
          : visitDate;

      const visitorRes = await visitorServices.addMyVisitor({
        name: visitorName,
        mobile: mobileNumber,
        date_time: formattedDate,
        vehicle_no: vehicleNo || null,
        type: "guest",
      });

      if (visitorRes?.status !== "success") {
        throw new Error(visitorRes?.message || "Visitor creation failed");
      }

      const visitorId = visitorRes?.data?.id;

      if (visitorId && selectedParking) {
        try {
          await visitorServices.bookParking({
            visitor_id: visitorId,
            slot: selectedParking.slot,
            booking_from: selectedParking.booking_from,
            booking_to: selectedParking.booking_to,
          });
        } catch (parkingError) {
          console.log("Parking booking failed:", parkingError);
        }
      }

      setModalConfig({
        visible: true,
        type: "success",
        title: "Success!",
        subtitle: "Visitor added successfully.",
      });

      setTimeout(() => {
        setModalConfig((prev) => ({ ...prev, visible: false }));
        if (onGoBack) onGoBack();
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setModalConfig({
        visible: true,
        type: "error",
        title: "Failed to add",
        subtitle: err?.message || "Something went wrong. Please try again.",
      });
    }
  };

  /* ===============================
     CONTACT ROW RENDER
     =============================== */
  const renderContactItem = ({ item }) => {
    const name =
      [item.givenName, item.familyName].filter(Boolean).join(" ").trim() ||
      item.displayName ||
      "Unknown";
    const phone = item.phoneNumbers?.[0]?.number || "";
    const initials = name
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    return (
      <TouchableOpacity
        style={styles.contactRow}
        onPress={() => handleSelectContact(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contactAvatar}>
          <Text style={styles.contactAvatarText}>{initials}</Text>
        </View>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName} numberOfLines={1}>{name}</Text>
          <Text style={styles.contactPhone}>{phone}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* ── Visitor Name ── */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>Visitor Name *</Text>

        {contactFilled && (
          <View style={styles.filledBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#10B981" />
            <Text style={styles.filledBadgeText}>Filled from contacts</Text>
          </View>
        )}

        <TextInput
          value={visitorName}
          onChangeText={handleNameChange}
          placeholder="Enter visitor name"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { backgroundColor: theme.inputBg, borderColor: theme.border },
            contactFilled && styles.inputHighlight,
          ]}
        />
      </View>

      {/* ── Mobile with contact icon inside ── */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.label, { color: theme.text }]}>Mobile Number *</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            value={mobileNumber}
            onChangeText={handleMobileChange}
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="Enter 10-digit mobile"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              styles.inputWithIcon,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
              contactFilled && styles.inputHighlight,
            ]}
          />
          <TouchableOpacity style={styles.inputIconBtn} onPress={handlePickContact}>
            <Ionicons name="person-add-outline" size={18} color={theme.primaryBlue} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date ── */}
      <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
        <CalendarSelector
          selectedDate={visitDate}
          onDateSelect={setVisitDate}
          label="Scheduled Date"
          required
          nightMode={false}
        />
      </View>

      {/* ── Vehicle ── */}
      {canAddVehicle && (
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.label, { color: theme.text }]}>
            Vehicle Number (Last 4 Digits - Optional)
          </Text>
          <TextInput
            value={vehicleNo}
            onChangeText={setVehicleNo}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="0000"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
            ]}
          />
        </View>
      )}

      {/* ── Parking ── */}
      {canUseGuestParking && (
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.label, { color: theme.text }]}>Need parking?</Text>
          <TouchableOpacity
            style={[
              styles.selectButton,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
            ]}
            onPress={() => {
              if (!visitDate) {
                alert("Please select visit date first");
                return;
              }
              navigation.navigate("AmenitiesListScreen", {
                type: "PARKING",
                title: "Parking",
                onParkingSelected: (parking) => setSelectedParking(parking),
              });
            }}
          >
            <Ionicons name="car" size={20} color={BRAND.COLORS.icon} />
            <Text style={[styles.selectButtonText, { color: theme.textSecondary }]}>
              {selectedParking?.booking_from
                ? `${formatParkingDateRange(
                    selectedParking.booking_from,
                    selectedParking.booking_to
                  )} • ${selectedParking.slot}`
                : "Select Parking"}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Submit ── */}
      <SubmitButton
        title="Add Visitor"
        onPress={handleSubmit}
        loading={modalConfig.type === "loading"}
      />

      <StatusModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        onClose={() => setModalConfig((prev) => ({ ...prev, visible: false }))}
      />

      {/* ── Contact Selector Modal ── */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalContainer}>

          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Contact</Text>
            <TouchableOpacity onPress={() => setContactModalVisible(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              value={contactSearch}
              onChangeText={setContactSearch}
              placeholder="Search by name or number..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoFocus
            />
            {contactSearch.length > 0 && (
              <TouchableOpacity onPress={() => setContactSearch("")}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Contact count */}
          {!loadingContacts && (
            <Text style={styles.contactCount}>
              {filteredContacts.length} contact{filteredContacts.length !== 1 ? "s" : ""}
            </Text>
          )}

          {/* List or loader */}
          {loadingContacts ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color="#1996D3" />
              <Text style={styles.loaderText}>Loading contacts...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredContacts}
              keyExtractor={(item, index) => item.recordID || String(index)}
              renderItem={renderContactItem}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="person-outline" size={40} color="#D1D5DB" />
                  <Text style={styles.emptyText}>No contacts found</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>
    </>
  );
};

export default SingleVisitorForm;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: -10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  filledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  filledBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    letterSpacing: 1,
  },
  inputHighlight: {
    borderColor: "#10B981",
    borderWidth: 1.5,
  },
  inputWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  inputIconBtn: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  selectButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Contact Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    height: 44,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
  contactCount: {
    fontSize: 12,
    color: "#9CA3AF",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EBF5FB",
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1996D3",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  contactPhone: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 70,
  },
  loaderBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
});