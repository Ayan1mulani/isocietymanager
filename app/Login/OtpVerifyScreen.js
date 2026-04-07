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
  NativeModules,
} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialIcons';
import { Svg, Path } from 'react-native-svg';
import AccountSelectorModal from './SelectUserMode';

import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { ismServices } from '../../services/ismServices';
import { usePermissions } from '../../Utils/ConetextApi';
import { RegisterAppOneSignal } from "../../services/oneSignalService";

import BRAND from '../config';

const { VisitorModule } = NativeModules;
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
  const [modalVisible, setModalVisible] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [otpToken, setOtpToken] = useState(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAccountSelect = (account) => {
    setModalVisible(false);
    loginWithAccount(account, otpToken);
  };

  /* ===============================
        LOGIN WITH ACCOUNT
  =============================== */
  const loginWithAccount = async (account, token) => {
    try {

      // ✅ Role check at selection time
      const ALLOWED_ROLES = ["member", "resident", "tenant"];
      const userRole = (account.role || "").toLowerCase();
      if (!ALLOWED_ROLES.includes(userRole)) {
        setErrorMessage(
          `Access denied. This app is not for ${account.role || "this role"}.`
        );
        return;
      }

      const loginResponse = await ismServices.logMeIn(token, account);

      console.log("LOGMEIN RESPONSE:", JSON.stringify(loginResponse, null, 2));

      if (loginResponse.status !== "success") {
        setErrorMessage(loginResponse.message || "Login failed");
        return;
      }

      let userData = { ...loginResponse.data };

      // Fix id — logMeIn returns id as JSON string
      // e.g. "{\"user_id\":518162,\"unit_id\":367102,...}"
      if (typeof userData.id === "string" && userData.id.startsWith("{")) {
        try {
          const parsed = JSON.parse(userData.id);
        userData = {
  ...userData,
  id: parsed.user_id,
  unit_id: parsed.unit_id,
  role_id: parsed.group_id,
  flat_no: parsed.flat_no,
  societyId: parsed.society_id
};
        } catch (e) {
          console.log("Failed to parse id:", e);
        }
      }

      // Always keep id === unit_id
      // getMyBalance uses user.id → /getOutstandingBalance/${user.id}
     

      console.log("Saving userInfo:", JSON.stringify(userData, null, 2));

      // ✅ Save identity
      await AsyncStorage.setItem("loginIdentity", identity || "");

      // ✅ Save user info
      await AsyncStorage.setItem("userInfo", JSON.stringify(userData));

      // ✅ Save to native
      if (VisitorModule?.saveAuthDetails) {
        await VisitorModule.saveAuthDetails({
          apiToken: userData.api_token || "",
          userId: String(userData.id || ""),
          societyId: String(userData.societyId || userData.society_id || ""),
          roleId: String(userData.role_id || userData.group_id || ""),
          unitId: String(userData.unit_id || ""),
          flatNo: String(userData.flat_no || ""),
        });
        console.log("✅ Auth saved to native via OTP flow");
      } else {
        console.log("❌ VisitorModule not available");
      }

      await AsyncStorage.removeItem("permissions");
      await loadPermissions();

      // ✅ Match regular login timing
      setTimeout(async () => {
        console.log("📡 Registering OneSignal...");
        await RegisterAppOneSignal();
      }, 800);

      setTimeout(() => {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "MainApp" }]
          })
        );
      }, 100);

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

        const fetchedAccounts = accountResponse.data || [];

        console.log("RAW ACCOUNTS:", JSON.stringify(fetchedAccounts, null, 2));

        if (fetchedAccounts.length === 0) {
          setErrorMessage("No account found for this user.");
          return;
        }

        // ✅ Show ALL accounts in modal — role check happens on selection
        setOtpToken(token);
        setAccounts(fetchedAccounts);
        setModalVisible(true);

      } else {

        setStatusMessage("");

        if (response?.message?.includes("OTP Related Authentication")) {
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

    } catch (error) {
      console.log("OTP VERIFY ERROR:", error);
      setErrorMessage("OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
        RESEND OTP
  =============================== */
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
              <Text style={styles.welcomeMessage}>Verify OTP</Text>
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
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>

                {statusMessage !== "" && errorMessage === "" && (
                  <Text style={styles.successText}>{statusMessage}</Text>
                )}

                {errorMessage !== "" && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
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

      {/* ✅ Outside ScrollView — renders as proper full-screen overlay */}
      <AccountSelectorModal
        visible={modalVisible}
        accounts={accounts}
        onSelect={handleAccountSelect}
        onClose={() => setModalVisible(false)}
      />

    </View>
  );
};

export default OtpVerifyScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: BRAND.PRIMARY_COLOR },
  scrollViewContent: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: BRAND.PRIMARY_COLOR },

  headerContainer: { alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  logoContainer: { width: '100%', alignItems: 'center' },
  logo: { width: 200, height: 60, resizeMode: 'contain' },

  welcomeMessage: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subWelcomeMessage: { fontSize: 16, color: '#E8F4FD' },

  formContainer: {},
  formInputsWrapper: { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingTop: 30, paddingBottom: 50 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 10, paddingHorizontal: 15, height: 60 },
  icon: { marginRight: 15 },
  input: { flex: 1, height: 60, fontSize: 16, color: '#000' },

  resendLink: { alignSelf: "flex-end", marginTop: 6, marginBottom: 10 },
  resendText: { color: BRAND.PRIMARY_COLOR, fontSize: 13, fontWeight: "600" },

  successText: { color: '#16A34A', textAlign: 'center', marginBottom: 5, fontWeight: '600' },
  infoText: { color: '#6B7280', textAlign: 'center', marginBottom: 15 },
  errorText: { color: '#DC2626', textAlign: 'center', marginBottom: 15 },

  loginButton: { backgroundColor: BRAND.COLORS.button, paddingVertical: 18, borderRadius: 12, alignItems: 'center', height: 60 },
  loginButtonDisabled: { backgroundColor: '#B0B0B0' },
  loginButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },

  passwordLogin: { marginTop: 20, alignItems: "center" },
  passwordLoginText: { color: BRAND.PRIMARY_COLOR, fontWeight: "600" },
});