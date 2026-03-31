import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { Svg, Path } from 'react-native-svg';

import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ismServices } from '../../services/ismServices';
import { usePermissions } from '../../Utils/ConetextApi';
import { RegisterAppOneSignal } from "../../services/oneSignalService";

import BRAND from '../config';

const { width } = Dimensions.get('window');

const Wave = () => (
  <View style={{ backgroundColor: 'transparent', height: 100 }}>
    <Svg height="100%" width="100%" viewBox={`0 0 ${width} 100`} preserveAspectRatio="none">
      <Path
        d={`M0,40 C${width * 0.3},120 ${width * 0.6},-20 ${width},60 L${width},100 L0,100 Z`}
        fill="white"
      />
    </Svg>
  </View>
);

const OtpVerifyScreen = () => {

  const navigation = useNavigation();
  const route = useRoute();

  const { otpData, identity, message } = route.params || {};

  const { loadPermissions } = usePermissions();

  const inputRef = useRef(null);

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const [statusMessage, setStatusMessage] = useState(message || "");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /* ===============================
        LOGIN WITH ACCOUNT

        Sends token in URL + full account
        object in body — server validates
        token and returns full user object.

        We fix id = unit_id before saving
        because logMeIn returns id as a
        JSON string instead of plain number
  =============================== */
  const loginWithAccount = async (account, token) => {

    try {

      const loginResponse = await ismServices.logMeIn(token, account);

      console.log("LOGMEIN RESPONSE:", JSON.stringify(loginResponse, null, 2));

      if (loginResponse.status !== "success") {
        setErrorMessage(loginResponse.message || "Login failed");
        return;
      }

      let userData = { ...loginResponse.data };

      // ✅ Fix id — logMeIn returns id as JSON string
      // e.g. "{\"user_id\":518162,\"unit_id\":367102,...}"
      // Normal login returns id as plain number
      if (typeof userData.id === "string" && userData.id.startsWith("{")) {
        try {
          const parsed = JSON.parse(userData.id);
          userData.id = parsed.unit_id;
        } catch (e) {
          console.log("Failed to parse id:", e);
        }
      }

      // ✅ Always keep id === unit_id
      // getMyBalance uses user.id → /getOutstandingBalance/${user.id}
      if (userData.unit_id && userData.id !== userData.unit_id) {
        userData.id = userData.unit_id;
      }

      console.log("Saving userInfo:", JSON.stringify(userData, null, 2));

      await AsyncStorage.setItem("userInfo", JSON.stringify(userData));

      await AsyncStorage.removeItem("permissions");

      await loadPermissions();

      await RegisterAppOneSignal();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "MainApp" }]
        })
      );

    } catch (error) {

      console.log("loginWithAccount error:", error);
      setErrorMessage("Login failed. Please try again.");

    }

  };

  /* ===============================
        VERIFY OTP
  =============================== */
  const handleVerifyOtp = async () => {
    if (loading) return;

    if (!otp || otp.length < 4) {
      setErrorMessage("Please enter valid OTP");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {

      const response = await ismServices.verifyOtp({
        id: otpData?.id,
        otp
      });

      console.log("VERIFY OTP RESPONSE:", JSON.stringify(response, null, 2));

      if (response.status === "success") {

        const token = response.data.token;

        const accountResponse = await ismServices.getMyAccounts(token);

        console.log("GET ACCOUNTS RESPONSE:", JSON.stringify(accountResponse, null, 2));

        if (accountResponse.status !== "success") {
          setErrorMessage("Unable to fetch account details");
          return;
        }

        const accounts = accountResponse.data || [];

        if (accounts.length === 0) {
          setErrorMessage("No account found for this user.");
          return;
        }

        const ALLOWED_ROLES = ["member", "resident", "tenant"];

        const validAccounts = accounts.filter(acc =>
          ALLOWED_ROLES.includes((acc.role || "").toLowerCase())
        );

        if (validAccounts.length === 0) {

          setErrorMessage(
            "Admin login is not allowed in this app. Please use the Admin Portal."
          );

          return;

        }

        await loginWithAccount(validAccounts[0], token);
      }

      else {

        setStatusMessage("");

        if (
          response?.message?.includes("OTP Related Authentication")
        ) {

          setErrorMessage("Time limit exceeded. Please login again.");

          setTimeout(() => {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Login" }]
              })
            );
          }, 1500);

        } else {

          setErrorMessage(response?.message || "Invalid OTP");

        }

      }

    }

    catch (error) {

      console.log("OTP VERIFY ERROR:", error);
      setErrorMessage("OTP verification failed. Please try again.");

    } finally {

      setLoading(false);

    }

  };


  const handleResendOtp = async () => {
    if (loading) return;


    try {

      setLoading(true);
      setStatusMessage("");
      setErrorMessage("");

      const response = await ismServices.resendOtp({
        id: otpData?.id
      });

      if (response?.status === "success") {

        setStatusMessage("OTP resent successfully");
        setErrorMessage("");

      } else {

        setErrorMessage(response?.message || "Failed to resend OTP");

      }

    } catch (error) {
      setErrorMessage("Unable to resend OTP");

    } finally {

      setLoading(false);

    }

  };

  return (

    <View style={styles.safeArea}>

      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >

        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>

            <View style={styles.headerContainer}>

              <View style={styles.logoContainer}>
                <Image
                  source={BRAND.LOGO}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.welcomeMessage}>
                Verify OTP
              </Text>

              <Text style={styles.subWelcomeMessage}>
                Enter OTP sent to {identity}
              </Text>

            </View>

            <View style={styles.formContainer}>

              <Wave />

              <View style={styles.formInputsWrapper}>

                <View style={styles.inputContainer}>

                  <View style={styles.icon}>
                    <Icon name="lock" size={20} color="#9e9e9e" />
                  </View>


                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Enter OTP"
                    placeholderTextColor="#9e9e9e"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      setStatusMessage("");
                      setErrorMessage("");
                    }}
                  />

                </View>
                <TouchableOpacity
                  style={styles.resendLink}
                  onPress={handleResendOtp}
                >
                  <Text style={styles.resendText}>
                    Resend OTP
                  </Text>
                </TouchableOpacity>

                {statusMessage !== "" && errorMessage === "" && (
                  <Text style={styles.successText}>
                    {statusMessage}
                  </Text>
                )}


                {errorMessage !== "" && (
                  <Text style={styles.errorText}>
                    {errorMessage}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={loading}
                  activeOpacity={loading ? 1 : 0.7}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Text>
                </TouchableOpacity>

                {errorMessage !== "" && (
                  <TouchableOpacity
                    style={styles.passwordLogin}
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text style={styles.passwordLoginText}>
                      Login with Email & Password
                    </Text>
                  </TouchableOpacity>
                )}

              </View>

            </View>

          </View>

        </ScrollView>

      </KeyboardAvoidingView>

    </View>

  );

};

export default OtpVerifyScreen;

const styles = StyleSheet.create({

  flex: { flex: 1 },

  safeArea: {
    flex: 1,
    backgroundColor: BRAND.PRIMARY_COLOR
  },

  scrollViewContent: { flexGrow: 1 },

  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: BRAND.PRIMARY_COLOR
  },

  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40
  },

  logoContainer: {
    width: '100%',
    alignItems: 'center'
  },

  logo: {
    width: 200,
    height: 60,
    resizeMode: 'contain'
  },
  resendLink: {
    alignSelf: "flex-end",
    marginTop: 6,
    marginBottom: 10
  },

  resendText: {
    color: BRAND.PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: "600"
  },

  welcomeMessage: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8
  },

  subWelcomeMessage: {
    fontSize: 16,
    color: '#E8F4FD'
  },

  formContainer: {},

  formInputsWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 50
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 15,
    height: 60
  },

  icon: { marginRight: 15 },

  input: {
    flex: 1,
    height: 60,
    fontSize: 16,
    color: '#000'
  },

  successText: {
    color: '#16A34A',
    textAlign: 'center',
    marginBottom: 5,
    fontWeight: '600'
  },

  infoText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 15
  },

  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 15
  },

  loginButton: {
    backgroundColor: BRAND.COLORS.button,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    height: 60
  },

  loginButtonDisabled: {
    backgroundColor: '#B0B0B0'
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18
  },

  passwordLogin: {
    marginTop: 20,
    alignItems: "center"
  },

  passwordLoginText: {
    color: BRAND.PRIMARY_COLOR,
    fontWeight: "600"
  }

});