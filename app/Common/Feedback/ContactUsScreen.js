import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Linking,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import AppHeader from "../../components/AppHeader";
import StatusModal from "../../components/StatusModal";
import { otherServices } from "../../../services/otherServices";
import SubmitButton from "../../components/SubmitButton";

const ContactUsScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);

  // ✅ Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState("loading");
  const [modalTitle, setModalTitle] = useState("");
  const [modalSubtitle, setModalSubtitle] = useState("");

  const handleEmailPress = () => {
    Linking.openURL("mailto:support@isocietymanager.com");
  };

  const handleRaiseRequest = () => {
    navigation.navigate("SubCategorySelection");
  };

  const handleSubmit = async () => {
    // ✅ Basic validation
    if (!subject.trim() || !message.trim()) {
      setModalType("error");
      setModalTitle("Missing Fields");
      setModalSubtitle("Please enter subject and message.");
      setModalVisible(true);

      setTimeout(() => setModalVisible(false), 1800);
      return;
    }

    try {
      // ✅ Show loading modal
      setModalType("loading");
      setModalTitle("Sending...");
      setModalSubtitle("Please wait");
      setModalVisible(true);

      const res = await otherServices.sendFeedback(
        subject.trim(),
        message.trim()
      );

      console.log("SendFeedback Response:", res);

      // ✅ Check backend response properly
      if (res && (res.status === "success" || res.success === true)) {
        setModalType("success");
        setModalTitle("Message Sent!");
        setModalSubtitle("We’ll get back to you soon.");

        // Clear inputs
        setSubject("");
        setMessage("");

        setTimeout(() => {
          setModalVisible(false);
        }, 2000);
      } else {
        setModalType("error");
        setModalTitle("Failed");
        setModalSubtitle(res?.message || "Unable to send feedback.");

        setTimeout(() => setModalVisible(false), 2000);
      }
    } catch (error) {
      console.log("SendFeedback Error:", error);

      setModalType("error");
      setModalTitle("Error");
      setModalSubtitle("Something went wrong.");

      setTimeout(() => setModalVisible(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <AppHeader title={"Contact Us"} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 110 : 50}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[
              styles.scrollContent,
              { flexGrow: 1 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ======= YOUR DESIGN BELOW (UNCHANGED) ======= */}

            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>We're Here to Help</Text>
              <Text style={styles.heroSubtitle}>
                Got questions? We'd love to hear from you.
              </Text>
            </View>

            <View style={styles.contactCardsContainer}>
              <TouchableOpacity
                style={styles.quickContactCard}
                onPress={handleEmailPress}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EFF6FF" }]}>
                  < Ionicons name="mail-sharp" size={24} color="#1565A9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickLabel}>Email Support</Text>
                  <Text style={styles.quickValue}>
                    support@isocietymanager.com
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.quickContactCard, styles.lastCard]}>
                <View style={[styles.iconBox, { backgroundColor: "#F0FDF4" }]}>
                  < Ionicons name="location-sharp" size={24} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.quickLabel}>Office Location</Text>
                  <Text style={styles.quickValue1}>
                    Factech Automations Solutions Private Limited,
                    91Springboard, C2, Sector 1, Noida, Uttar Pradesh 201301
                  </Text>
                </View>
              </View>
            </View>

            {/* <View style={styles.facilitySection}>
              <View style={styles.facilityHeader}>
                <Text style={styles.facilityTitle}>
                  Facility Related Concern?
                </Text>
                <TouchableOpacity onPress={handleRaiseRequest}>
                  <Text style={styles.raiseRequestLink}>
                    Raise Request
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.facilitySubtitle}>
                Share your feedback and concern to your facility manager
              </Text>
            </View> */}

            <View style={styles.formSection}>
              <Text style={styles.formTitle}>Send us a Message</Text>
              <Text style={styles.formSubtitle}>
                Fill out the form and we'll get back to you shortly.
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Subject *</Text>
                <TextInput
                  placeholder="What's this about?"
                  placeholderTextColor="#9CA3AF"
                  value={subject}
                  onChangeText={setSubject}
                  multiline
                  style={[
                    styles.input,
                    focusedInput === "subject" && styles.inputFocused,
                  ]}
                  onFocus={() => setFocusedInput("subject")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Message *</Text>
                <TextInput
                  placeholder="Tell us what's on your mind..."
                  placeholderTextColor="#9CA3AF"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={5}
                  style={[
                    styles.textArea,
                    focusedInput === "message" && styles.inputFocused,
                  ]}
                  onFocus={() => setFocusedInput("message")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
              <SubmitButton
                title="Send Message"
                onPress={handleSubmit}
                
              />
            </View>

            {/* ======= END DESIGN ======= */}
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <StatusModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        subtitle={modalSubtitle}
      />
    </SafeAreaView>
  );
};


export default ContactUsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  // Hero Section
  heroSection: {
    alignItems: "flex-start",
    marginBottom: 5,
    paddingVertical: 12,
  },


  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },

  heroSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },

  // Quick Contact Cards
  contactCardsContainer: {
    marginBottom: 16,
    borderRadius: 12,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 0.3,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },

  quickContactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 0,
    padding: 14,
    marginBottom: 0,
  },



  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },

  quickValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#2c61d3",
    lineHeight: 18,
    textDecorationLine: "underline",
  },

  quickValue1: {
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
    lineHeight: 16,

  },

  // Facility Related Concern Section
  facilitySection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    elevation: 0.1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },

  facilityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  facilityTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },

  raiseRequestLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1565A9",
    textDecorationLine: "underline",
  },

  facilitySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // Form Section - Clean, no shadows
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 0.4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },

  formSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },

  inputWrapper: {
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  textArea: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    textAlignVertical: "top",
  },

  inputFocused: {
    borderColor: "#1565A9",
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#1565A9",
        shadowOpacity: 0.15,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 3,
      },
    }),
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 0,
    backgroundColor: "#1565A9",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#1565A9",
        shadowOpacity: 0.25,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 5,
      },
    }),
  },

  submitText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});