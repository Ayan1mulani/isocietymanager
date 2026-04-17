import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from "react-native";

import { Svg, Path } from "react-native-svg";
import { useNavigation } from "@react-navigation/native";
import ErrorPopupModal from "../PopUps/MessagePop";
import { ismServices } from "../../services/ismServices";
import BRAND from "../config";

const { width } = Dimensions.get("window");

const Wave = () => (
  <View style={{ backgroundColor: "transparent", height: 100 }}>
    <Svg height="100%" width="100%" viewBox={`0 0 ${width} 100`} preserveAspectRatio="none">
      <Path
        d={`M0,40 C${width * 0.3},120 ${width * 0.6},-20 ${width},60 L${width},100 L0,100 Z`}
        fill="white"
      />
    </Svg>
  </View>
);

const OtpPhoneScreen = () => {

  const navigation = useNavigation();

  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const [inputError, setInputError] = useState("");

  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendOtp = async () => {

    if (!inputValue) {
      setInputError("Enter mobile number or email");
      return;
    }

    const isPhone = /^[0-9]{10}$/.test(inputValue);
    const isEmail = isValidEmail(inputValue);

    if (!isPhone && !isEmail) {
      setInputError("Enter valid mobile number or email");
      return;
    }

    setInputError("");

    Keyboard.dismiss();
    setLoading(true);

    try {

      const response = await ismServices.generateOtp(inputValue);

      if (response?.status === "success") {

        navigation.navigate("OtpVerify", {
          otpData: response.data,
          identity: inputValue,
          message: response.message
        });

      } else {

        setErrorTitle("OTP Failed");
        setErrorMessage(response?.message || "Failed to send OTP");
        setShowError(true);

      }

    } catch (error) {

      setErrorTitle("Error");
      setErrorMessage("Something went wrong");
      setShowError(true);

    } finally {

      setLoading(false);

    }

  };

  return (

    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >

        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>

            {/* HEADER */}
            <View style={styles.headerContainer}>

              <Image
                source={BRAND.LOGO}
                style={styles.logo}
                resizeMode="contain"
              />

              <Text style={styles.welcomeMessage}>
                OTP Login
              </Text>

              <Text style={styles.subWelcomeMessage}>
                Enter mobile number or email
              </Text>

            </View>

            {/* FORM */}
            <View style={styles.formContainer}>

              <Wave />

              <View style={styles.formInputsWrapper}>

                <View style={[
                  styles.inputContainer,
                  inputError && styles.inputErrorBorder
                ]}>

                  <TextInput
                    style={styles.input}
                    placeholder="Mobile Number or Email"
                    placeholderTextColor="#9e9e9e"
                    value={inputValue}
                    onChangeText={(text) => {
                      setInputValue(text);
                      setInputError("");
                    }}
                    editable={!loading}
                    autoFocus={true}
                  />

                </View>

                {inputError ? (
                  <Text style={styles.errorText}>
                    {inputError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  onPress={handleSendOtp}
                  style={[
                    styles.loginButton,
                    loading && styles.loginButtonDisabled
                  ]}
                  disabled={loading}
                >

                  <Text style={styles.loginButtonText}>
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </Text>

                </TouchableOpacity>

              </View>

            </View>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

      {/* ONLY for API errors */}
      <ErrorPopupModal
        visible={showError}
        onClose={() => setShowError(false)}
        title={errorTitle}
        message={errorMessage}
        type="error"
        buttonText="OK"
      />

    </View>

  );

};

export default OtpPhoneScreen;

const styles = StyleSheet.create({

  flex: { flex: 1 },

  safeArea: {
    flex: 1,
    backgroundColor: BRAND.PRIMARY_COLOR
  },

  scrollViewContent: {
    flexGrow: 1
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: BRAND.PRIMARY_COLOR
  },

  headerContainer: {
    alignItems: "center",
    paddingBottom: 40
  },

  logo: {
    width: 240,
    height: 60,
    marginBottom: 20
  },

  welcomeMessage: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6
  },

  subWelcomeMessage: {
    fontSize: 14,
    color: "#E8F4FD"
  },

  formContainer: {},

  formInputsWrapper: {
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 50
  },

  inputContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 60,
    justifyContent: "center"
  },

  input: {
    fontSize: 16,
    color: "#000"
  },

  inputErrorBorder: {
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2"
  },

  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 10,
    marginLeft: 4
  },

  loginButton: {
    backgroundColor: BRAND.COLORS.button,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    height: 60
  },

  loginButtonDisabled: {
    backgroundColor: "#B0B0B0"
  },

  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18
  }

});