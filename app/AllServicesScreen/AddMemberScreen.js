import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  PermissionsAndroid,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import Contacts from "react-native-contacts";
import AppHeader from "../components/AppHeader";
import { visitorServices } from "../../services/visitorServices";
import BRAND from '../config';
import SubmitButton from "../components/SubmitButton";
import StatusModal from "../components/StatusModal";
import { useTranslation } from 'react-i18next';

const AddMemberScreen = ({ route, navigation }) => {
  const { t } = useTranslation();

  const RELATION_OPTIONS = [
    t("Mother"),
    t("Father"),
    t("Son"),
    t("Daughter"),
    t("Husband"),
    t("Wife"),
    t("Other"),
  ];

  const member = route?.params?.member;
  const isEdit = !!member;

  const [name, setName] = useState(member?.name || "");
  const [contact, setContact] = useState(member?.phone_no || "");
  const [email, setEmail] = useState(member?.email || "");
  const [relation, setRelation] = useState(member?.relation || "");
  const [vehicleNumber, setVehicleNumber] = useState(member?.vehicle_no || "");

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: "loading",
    title: "",
    subtitle: "",
  });

  const [focusedInput, setFocusedInput] = useState(null);
  const [showRelationModal, setShowRelationModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Contact selector modal state ──
  const [contactFilled, setContactFilled] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [allContacts, setAllContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [loadingContacts, setLoadingContacts] = useState(false);

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
          const cName = `${c.givenName || ""} ${c.familyName || ""}`.toLowerCase();
          const phone = (c.phoneNumbers?.[0]?.number || "").replace(/\D/g, "");
          return cName.includes(q) || phone.includes(q);
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
            title: t("Contacts Permission"),
            message: t("Allow access to contacts to fill member details?"),
            buttonPositive: t("Allow"),
            buttonNegative: t("Deny"),
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(t("Permission Denied"), t("Contacts permission is required."));
          return;
        }
      }

      // ── iOS permission ──
      if (Platform.OS === "ios") {
        const permission = await Contacts.requestPermission();
        if (permission !== "authorized") {
          Alert.alert(
            t("Permission Denied"),
            t("Please allow contacts access in Settings.")
          );
          return;
        }
      }

      // ── Load contacts ──
      setLoadingContacts(true);
      setContactModalVisible(true);
      setContactSearch("");

      const contacts = await Contacts.getAll();

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
      Alert.alert(t("Error"), t("Could not load contacts. Please try again."));
    }
  };

  /* ===============================
     SELECT A CONTACT FROM MODAL
     =============================== */
  const handleSelectContact = (selectedContact) => {
    const formattedName =
      [selectedContact.givenName, selectedContact.familyName]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      selectedContact.displayName ||
      "";

    const phones = selectedContact.phoneNumbers || [];
    const mobileEntry =
      phones.find((p) =>
        ["mobile", "cell", "iphone"].includes((p.label || "").toLowerCase())
      ) || phones[0];

    let rawPhone = mobileEntry?.number || "";
    rawPhone = rawPhone.replace(/\D/g, "").slice(-10);

    if (!rawPhone) {
      Alert.alert(t("Invalid Number"), t("Could not extract a valid phone number."));
      return;
    }

    setName(formattedName);
    setContact(rawPhone);
    setContactFilled(true);
    setContactModalVisible(false);
  };

  const handleNameChange = (val) => {
    setName(val);
    if (contactFilled) setContactFilled(false);
  };

  const handleContactChange = (val) => {
    setContact(val);
    if (contactFilled) setContactFilled(false);
  };

  const handleRelationSelect = (value) => {
    setRelation(value);
    setShowRelationModal(false);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t("Validation"), t("Please enter name"));
      return;
    }

    if (!relation) {
      Alert.alert(t("Validation"), t("Please select relation"));
      return;
    }

    try {
      setIsSubmitting(true);

      setStatusModal({
        visible: true,
        type: "loading",
        title: isEdit ? t("Updating Member") : t("Adding Member"),
        subtitle: t("Please wait..."),
      });

      let res;

      if (isEdit) {
        res = await visitorServices.updateFamilyMember({
          id: member.id,
          name: name,
          phone_no: contact,
          email: email,
          relation: relation,
          vehicle_no: vehicleNumber,
          image_src: null,
        });
      } else {
        res = await visitorServices.addFamilyMember({
          name: name,
          phone_no: contact,
          email: email,
          relation: relation,
          vehicle_no: vehicleNumber,
          image_src: null,
        });
      }

      if (res?.status === "success") {
        setStatusModal({
          visible: true,
          type: "success",
          title: t("Success"),
          subtitle: isEdit
            ? t("Member updated successfully")
            : t("Member added successfully"),
        });

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      } else {
        setStatusModal({
          visible: true,
          type: "error",
          title: t("Error"),
          subtitle: res?.message || t("Operation failed"),
        });
      }
    } catch (error) {
      console.log(error);
      setStatusModal({
        visible: true,
        type: "error",
        title: t("Error"),
        subtitle: t("Something went wrong"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRelationOption = ({ item }) => (
    <TouchableOpacity
      style={styles.relationOption}
      onPress={() => handleRelationSelect(item)}
    >
      <Text style={styles.relationOptionText}>{item}</Text>
      {relation === item && (
        <Ionicons name="checkmark" size={20} color="#1565A9" />
      )}
    </TouchableOpacity>
  );

  /* ===============================
     CONTACT ROW RENDER
     =============================== */
  const renderContactItem = ({ item }) => {
    const cName =
      [item.givenName, item.familyName].filter(Boolean).join(" ").trim() ||
      item.displayName ||
      t("Unknown");
    const phone = item.phoneNumbers?.[0]?.number || "";
    const initials = cName
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
          <Text style={styles.contactName} numberOfLines={1}>{cName}</Text>
          <Text style={styles.contactPhone}>{phone}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={isEdit ? t("Edit Member") : t("Add Member")} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Form */}
            <View style={styles.formCard}>

              {/* Name */}
              <View style={styles.inputWrapper}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>
                    {t("Name")} <Text style={styles.required}>*</Text>
                  </Text>
                  {contactFilled && (
                    <View style={styles.filledBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.filledBadgeText}>{t("Filled from contacts")}</Text>
                    </View>
                  )}
                </View>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "name" && styles.inputContainerFocused,
                    contactFilled && styles.inputHighlight,
                  ]}
                >
                  <TextInput
                    placeholder={t("Enter full name")}
                    value={name}
                    placeholderTextColor="#9CA3AF"
                    onChangeText={handleNameChange}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Contact */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>{t("Contact Number")}</Text>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "contact" && styles.inputContainerFocused,
                    contactFilled && styles.inputHighlight,
                  ]}
                >
                  <TextInput
                    placeholder={t("Enter mobile number")}
                    value={contact}
                    keyboardType="phone-pad"
                    maxLength={10}
                    placeholderTextColor="#9CA3AF"
                    onChangeText={handleContactChange}
                    onFocus={() => setFocusedInput("contact")}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input}
                  />
                  <TouchableOpacity style={styles.inputIconBtn} onPress={handlePickContact}>
                    <Ionicons name="person-add-outline" size={20} color={BRAND.COLORS.primary || "#1565A9"} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>{t("Email")}</Text>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "email" && styles.inputContainerFocused,
                  ]}
                >
                  <TextInput
                    placeholder={t("Enter email")}
                    value={email}
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholderTextColor="#9CA3AF"
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Relation */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>
                  {t("Relation")} <Text style={styles.required}>*</Text>
                </Text>

                <TouchableOpacity
                  style={styles.dropdownContainer}
                  onPress={() => setShowRelationModal(true)}
                >
                  <View style={styles.dropdownContent}>
                    <Text
                      style={[
                        styles.dropdownText,
                        !relation && styles.dropdownPlaceholder,
                      ]}
                    >
                      {relation || t("Select relation")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={18} color={BRAND.COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Vehicle */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>{t("Vehicle Number")}</Text>

                <View style={styles.inputContainer}>
                  <TextInput
                    placeholder={t("Enter vehicle number")}
                    value={vehicleNumber}
                    onChangeText={setVehicleNumber}
                    style={styles.input}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Submit */}
            <SubmitButton
              title={isEdit ? t("UPDATE MEMBER") : t("ADD NEW MEMBER")}
              onPress={handleSubmit}
              loading={isSubmitting}
              icon={<Ionicons name="add-circle" size={18} color="#fff" />}
            />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Relation Modal */}
      <Modal
        visible={showRelationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRelationModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowRelationModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeaderRelation}>
                  <Text style={styles.modalTitle}>{t("Select Relation")}</Text>
                  <TouchableOpacity onPress={() => setShowRelationModal(false)}>
                    <Ionicons name="close" size={22} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={RELATION_OPTIONS}
                  renderItem={renderRelationOption}
                  keyExtractor={(item, index) => `${item}-${index}`}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Contact Selector Modal ── */}
      <Modal
        visible={contactModalVisible}
        animationType="slide"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("Select Contact")}</Text>
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
              placeholder={t("Search by name or number...")}
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
              {filteredContacts.length}{" "}
              {filteredContacts.length !== 1 ? t("contacts") : t("contact")}
            </Text>
          )}

          {/* List or loader */}
          {loadingContacts ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={BRAND.COLORS.primary || "#1996D3"} />
              <Text style={styles.loaderText}>{t("Loading contacts...")}</Text>
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
                  <Text style={styles.emptyText}>{t("No contacts found")}</Text>
                </View>
              }
            />
          )}
        </View>
      </Modal>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default AddMemberScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },

  /* Card */
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  required: {
    color: "#EF4444",
  },

  /* Inputs */
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E6E8EB",
  },
  inputContainerFocused: {
    borderColor: "#1565A9",
    backgroundColor: "#FFFFFF",
  },
  inputHighlight: {
    borderColor: "#10B981",
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  inputIconBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Badges */
  filledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  filledBadgeText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "500",
  },

  /* Dropdown */
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E6E8EB",
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownText: {
    fontSize: 14,
    color: "#111827",
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },

  /* Modals Common */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    paddingBottom: 10,
    maxHeight: "70%",
  },
  modalHeaderRelation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F4",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  relationOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F5F7",
  },
  relationOptionText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },

  // ── Contact Modal specific styles ──
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