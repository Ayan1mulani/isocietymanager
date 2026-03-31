import React, { useState } from "react";
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
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../components/AppHeader";
import { visitorServices } from "../../services/visitorServices";
import BRAND from '../config'
import SubmitButton from "../components/SubmitButton";
import StatusModal from "../components/StatusModal";

const RELATION_OPTIONS = [
  "Mother",
  "Father",
  "Son",
  "Daughter",
  "Husband",
  "Wife",
  "Other",
];

const AddMemberScreen = ({ route, navigation }) => {

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

  const handleRelationSelect = (value) => {
    setRelation(value);
    setShowRelationModal(false);
  };

  const handleSubmit = async () => {

    if (!name.trim()) {
      Alert.alert("Validation", "Please enter name");
      return;
    }

    if (!relation) {
      Alert.alert("Validation", "Please select relation");
      return;
    }

    try {

      setIsSubmitting(true);

      // show loading modal
      setStatusModal({
        visible: true,
        type: "loading",
        title: isEdit ? "Updating Member" : "Adding Member",
        subtitle: "Please wait...",
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
          image_src: null
        });

      } else {

        res = await visitorServices.addFamilyMember({
          name: name,
          phone_no: contact,
          email: email,
          relation: relation,
          vehicle_no: vehicleNumber,
          image_src: null
        });

      }

      if (res?.status === "success") {

        setStatusModal({
          visible: true,
          type: "success",
          title: "Success",
          subtitle: isEdit
            ? "Member updated successfully"
            : "Member added successfully",
        });

        setTimeout(() => {
          navigation.goBack();
        }, 1500);

      } else {

        setStatusModal({
          visible: true,
          type: "error",
          title: "Error",
          subtitle: res?.message || "Operation failed",
        });

      }

    } catch (error) {

      console.log(error);

      setStatusModal({
        visible: true,
        type: "error",
        title: "Error",
        subtitle: "Something went wrong",
      });

    } finally {
      setIsSubmitting(false);
    }

  };

  const renderRelationOption = ({ item, index }) => (
    <TouchableOpacity
      style={styles.relationOption}
      onPress={() => handleRelationSelect(item)}
    >
      <Text style={styles.relationOptionText}>{item}</Text>

      {relation === item && (
        < Ionicons name="checkmark" size={20} color="#1565A9" />
      )}
    </TouchableOpacity>
  );

  return (

    <SafeAreaView style={styles.container}>
      <AppHeader title={isEdit ? "Edit Member" : "Add Member"} />

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

            {/* Profile */}
            {/* <View style={styles.imageSection}>
              <View style={styles.profileCircle}>
                < Ionicons name="person" size={42} color="#9CA3AF" />
              </View>

              <TouchableOpacity style={styles.changeButton}>
                < Ionicons name="camera" size={14} color="#fff" />
                <Text style={styles.changeText}>Add Photo</Text>
              </TouchableOpacity>
            </View> */}

            {/* Form */}
            <View style={styles.formCard}>

              {/* Name */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>
                  Name <Text style={styles.required}>*</Text>
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "name" && styles.inputContainerFocused,
                  ]}
                >

                  <TextInput
                    placeholder="Enter full name"
                    value={name}
                    placeholderTextColor="#9CA3AF"

                    onChangeText={setName}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input}

                  />
                </View>
              </View>

              {/* Contact */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Contact Number</Text>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "contact" && styles.inputContainerFocused,
                  ]}
                >

                  <TextInput
                    placeholder="Enter mobile number"
                    value={contact}
                    keyboardType="phone-pad"
                    placeholderTextColor="#9CA3AF"

                    onChangeText={setContact}
                    onFocus={() => setFocusedInput("contact")}
                    onBlur={() => setFocusedInput(null)}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Email</Text>

                <View
                  style={[
                    styles.inputContainer,
                    focusedInput === "email" && styles.inputContainerFocused,
                  ]}
                >

                  <TextInput
                    placeholder="Enter email"
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
                  Relation <Text style={styles.required}>*</Text>
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
                      {relation || "Select relation"}
                    </Text>
                  </View>

                  < Ionicons name="chevron-down" size={18} color={BRAND.COLORS.primary} />
                </TouchableOpacity>
              </View>

              {/* Vehicle */}
              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Vehicle Number</Text>

                <View style={styles.inputContainer}>

                  <TextInput
                    placeholder="Enter vehicle number"
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
              title={isEdit ? "UPDATE MEMBER" : "ADD NEW MEMBER"}
              onPress={handleSubmit}
              loading={isSubmitting}
              icon={< Ionicons name="add-circle" size={18} color="#fff" />}
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

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Relation</Text>

                  <TouchableOpacity
                    onPress={() => setShowRelationModal(false)}
                  >
                    < Ionicons name="close" size={22} />
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
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={() =>
          setStatusModal(prev => ({ ...prev, visible: false }))
        }
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

  /* Profile */
  imageSection: {
    alignItems: "center",
    marginBottom: 14,
  },

  profileCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EEF2F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E4E7EB",
  },

  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 10,
  },

  changeText: {
    color: "#fff",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
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

  input: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    color: "#111827",

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
    marginLeft: 8,
    color: "#111827",
  },

  dropdownPlaceholder: {
    color: "#9CA3AF",
  },

  /* Button */
  button: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1565A9",
    paddingVertical: 14,
    borderRadius: 10,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 6,
  },

  /* Modal */
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

  modalHeader: {
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
});