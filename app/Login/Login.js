import React, { useEffect, useState } from 'react';
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
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Svg, Path } from 'react-native-svg';
import { CommonActions, useNavigation } from '@react-navigation/native';
import NetInfo from "@react-native-community/netinfo";
import { usePermissions } from '../../Utils/ConetextApi';
import { LoginSrv } from '../../services/LoginSrv';
import AccountSelectorModal from './SelectUserMode';
import ErrorPopupModal from '../PopUps/MessagePop';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ismServices } from '../../services/ismServices';
import BRAND from '../config';
import { RegisterAppOneSignal } from "../../services/oneSignalService";
import { NativeModules } from "react-native";
import DeviceInfo from 'react-native-device-info';

const { VisitorModule } = NativeModules;
const version = DeviceInfo.getVersion();
const { width } = Dimensions.get('window');

const Wave = () => (
  <View style={{ backgroundColor: 'transparent', height: 100 }}>
    <Svg
      height="100%"
      width="100%"
      viewBox={`0 0 ${width} 100`}
      preserveAspectRatio="none"
    >
      <Path
        d={`M0,40 C${width * 0.3},120 ${width * 0.6},-20 ${width},60 L${width},100 L0,100 Z`}
        fill="white"
      />
    </Svg>
  </View>
);

const isValidIdentity = (val) => {
  const value = val.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9]{10}$/;

  return emailRegex.test(value) || phoneRegex.test(value);
};

const checkInternet = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};


const NewLoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const { loadPermissions } = usePermissions();


  const navigation = useNavigation();

  const [modalVisible, setModalVisible] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Login Failed');
  const [isLoading, setIsLoading] = useState(false);

  const getUserDetails = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) return;

      const parsed = JSON.parse(userInfo);
      if (!parsed?.api_token || !parsed?.id) return;

      // ✅ Restore native auth on every session restore
      await VisitorModule.saveAuthDetails({
        apiToken: parsed.api_token || "",
        userId: String(parsed.id || ""),
        societyId: String(parsed.societyId || parsed.society_id || ""),  // ← fallback
        roleId: String(parsed.role_id || parsed.group_id || ""),  // ← fallback
        unitId: String(parsed.unit_id || ""),
        flatNo: String(parsed.flat_no || ""),
      });
      const isConnected = await checkInternet();

      if (isConnected) {
        await ismServices.getUserDetails();
      } else {
        console.log("📴 Offline → skipping API, using stored session");
      }
      await loadPermissions();

      const updatedUserInfo = await AsyncStorage.getItem('userInfo');
      if (!updatedUserInfo) return;

      const updatedParsed = JSON.parse(updatedUserInfo);
      if (!updatedParsed?.token && !updatedParsed?.id) return;

      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainApp' }] }));

    } catch (error) {
      console.log('Session restore failed:', error);
      await AsyncStorage.removeItem('userInfo').catch(() => { });
    }
  };

  useEffect(() => {

    getUserDetails();



  }, []);

  const handleLogin = async (userid) => {


    const isConnected = await checkInternet();

    if (!isConnected) {
      setErrorTitle('No Internet');
      setErrorMessage('Please check your internet connection and try again.');
      setShowError(true);
      return;
    }

    setIsLoading(true);
    const payload = {
      identity: email.trim(),
      password,
      tenant: 0,
      user_id: userid?.user_id || null,
    };
    try {
      const response = await LoginSrv.login(payload);
      if (!response || !response.status) {
        setErrorTitle('Server Error');
        setErrorMessage('Received an unexpected response. Please try again.');
        setShowError(true);
        return;
      }
      if (response.status === 'multipleLogin') {
        setAccounts(response.data);
        setModalVisible(true);
      } else if (response.status === 'error') {
        setErrorTitle('Login Failed');
        setErrorMessage(response.message || 'Incorrect email or password. Please try again.');
        setShowError(true);
      }
      else if (response.status === 'success') {
        await AsyncStorage.setItem("loginIdentity", email.trim());


        const ALLOWED_ROLES = ["member", "resident", "tenant"];

        const userRole = (response?.data?.role || "").toLowerCase();

        if (!ALLOWED_ROLES.includes(userRole)) {
          setErrorTitle("Access Denied");
          setErrorMessage(`This app is not for ${userRole}`);
          setShowError(true);
          return;
        }

        let user = response.data;

        // 🔧 FIX: parse id if backend sends JSON string
        if (typeof user.id === "string" && user.id.includes("user_id")) {

          const parsed = JSON.parse(user.id);

          user = {
            ...user,
            id: parsed.user_id,
            unit_id: parsed.unit_id,
            role_id: parsed.group_id,
            flat_no: parsed.flat_no,
            societyId: parsed.society_id
          };
        }

        // ✅ Save cleaned user
        await AsyncStorage.setItem("userInfo", JSON.stringify(user));
        if (VisitorModule?.saveAuthDetails) {
          console.log("🔥 Saving auth to native:", {
            apiToken: user.api_token,
            userId: user.id,
            societyId: user.societyId,
          });

          await VisitorModule.saveAuthDetails({
            apiToken: user.api_token || "",
            userId: String(user.id || ""),
            societyId: String(user.societyId || user.society_id || ""),  // ← fallback
            roleId: String(user.role_id || user.group_id || ""),  // ← fallback
            unitId: String(user.unit_id || ""),
            flatNo: String(user.flat_no || ""),
          });
          console.log("✅ Auth saved to native", user.api_token);
        } else {
          console.log("❌ VisitorModule not available");
        }
        await AsyncStorage.removeItem("permissions");
        await loadPermissions();
        setTimeout(async () => {
          console.log("📡 Registering OneSignal...");
          await RegisterAppOneSignal();
        }, 800);
        setTimeout(() => {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "MainApp" }],
            })
          );
        }, 100);
      }



      else {
        console.warn('Unhandled login status:', response.status);
        setErrorTitle('Login Failed');
        setErrorMessage('Something went wrong. Please try again.');
        setShowError(true);
      }
    } catch (error) {
      console.error('Login failed:', error);
      setErrorTitle('Connection Error');
      setErrorMessage('Unable to connect to server. Please check your internet connection and try again.');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountSelect = (selectedUserId) => {
    setModalVisible(false);
    handleLogin(selectedUserId);
  };

  const validateInputs = () => {
    if (!email.trim()) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter your email address.');
      setShowError(true);
      return false;
    }
    if (!isValidIdentity(email)) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter a valid email or mobile number.');
      setShowError(true);
      return false;
    }
    if (!password.trim()) {
      setErrorTitle('Validation Error');
      setErrorMessage('Please enter your password.');
      setShowError(true);
      return false;
    }
    // ✅ Terms check
    if (!agreedToTerms) {
      setErrorTitle('Terms Required');
      setErrorMessage('Please agree to the Terms and Conditions to continue.');
      setShowError(true);
      return false;
    }
    return true;
  };

  const handleLoginPress = () => {
    if (validateInputs()) handleLogin();
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={5}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>

            {/* ── Header ── */}
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Image source={BRAND.LOGO} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.welcomeMessage}>Welcome Back</Text>
              <Text style={styles.subWelcomeMessage}>Please sign in to continue</Text>
            </View>

            {/* ── Form ── */}
            <View style={styles.formContainer}>
              <Wave />
              <View style={styles.formInputsWrapper}>

                {/* Email */}
                <View style={styles.inputContainer}>
                  <View style={styles.icon}>
                    <Icon name="email" size={20} color="#9e9e9e" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email or Mobile Number"
                    placeholderTextColor="#9e9e9e"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputContainer}>
                  <View style={styles.icon}>
                    <Icon name="lock" size={20} color="#9e9e9e" />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9e9e9e"
                    secureTextEntry={!showPassword}
                    value={password}
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={20}
                      color="#9e9e9e"
                    />
                  </TouchableOpacity>
                </View>

                {/* OTP Login */}
                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => navigation.navigate("OtpLogin")}
                >
                  <Text style={styles.forgotPasswordText}>OTP LOGIN</Text>
                </TouchableOpacity>
                {/* Sign In */}
                <TouchableOpacity
                  onPress={handleLoginPress}
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Text>
                </TouchableOpacity>

                {/* Sign Up */}
                {/* <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setErrorTitle('Coming Soon');
                      setErrorMessage('Sign up will be available soon.');
                      setShowError(true);
                    }}
                  >
                    <Text style={styles.signUpLink}>Sign up</Text>
                  </TouchableOpacity>
                </View> */}

                {/* ── Terms & Conditions ── */}
                <View style={styles.termsRow}>
                  <TouchableOpacity
                    onPress={() => setAgreedToTerms((prev) => !prev)}
                    activeOpacity={0.7}
                    style={styles.checkboxHit}
                  >
                    <Icon
                      name={agreedToTerms ? 'check-box' : 'check-box-outline-blank'}
                      size={20}
                      color={agreedToTerms ? BRAND.PRIMARY_COLOR : '#9e9e9e'}
                    />
                  </TouchableOpacity>

                <Text style={styles.termsText}>
                  I Agree and Accept the{' '}
                  <Text
                    style={styles.termsLink}
                    onPress={() =>
                      Linking.openURL('https://isocietymanager.com/terms-conditions.html')
                    }
                  >
                    Terms And Conditions
                  </Text>
                </Text>
                </View>

                {/* ── Powered By ── */}
                <Text style={styles.poweredBy}>
                  Powered By{' '}
                  <Text style={styles.poweredByBrand}>
                    Factech Automation Solutions Private Limited
                  </Text>
                </Text>
                <Text style={styles.versionText}>
                  v{version}
                </Text>


              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AccountSelectorModal
        visible={modalVisible}
        accounts={accounts}
        onSelect={handleAccountSelect}
        onClose={() => setModalVisible(false)}
      />

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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: BRAND.PRIMARY_COLOR },
  scrollViewContent: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: BRAND.PRIMARY_COLOR },

  headerContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 10 },
  logoContainer: { width: '60%', alignSelf: 'center', justifyContent: 'center' },
  logo: { width: 300, height: 60, alignSelf: 'center' },
  welcomeMessage: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subWelcomeMessage: { fontSize: 16, color: '#E8F4FD', textAlign: 'center', opacity: 0.9, fontWeight: '400' },

  formContainer: {},
  formInputsWrapper: { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingTop: 30, paddingBottom: 50 },

  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, marginBottom: 20, paddingHorizontal: 15, height: 60 },
  icon: { marginRight: 15 },
  eyeIcon: { paddingLeft: 10 },
  input: { flex: 1, height: 60, fontSize: 16, color: '#000' },

  forgotPasswordButton: { alignSelf: 'flex-end', marginBottom: 25 },
  forgotPasswordText: { color: '#074B7C', fontSize: 14, fontWeight: '600' },

  loginButton: { backgroundColor: BRAND.COLORS.button, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 25, height: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  loginButtonDisabled: { backgroundColor: '#B0B0B0', elevation: 0, shadowOpacity: 0 },
  loginButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 , lineHeight: 22,},

  signUpContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 13 },
  signUpText: { fontSize: 14, color: '#9e9e9e' },
  signUpLink: { fontSize: 14, color: '#074B7C', fontWeight: 'bold' },


  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },

  checkboxHit: {
    marginRight: 6,
    padding: 2,
  },

  termsText: {
    fontSize: 13,
    color: '#555',
 textAlign: 'center',
  },

  termsLink: {
    fontSize: 13,
    color: '#42aacf',
    fontWeight: '600',
    textDecorationLine: 'underline',
    flexShrink: 1,
  },
  // ── Powered By ──
  poweredBy: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 4,
    lineHeight: 18,
  },
  poweredByBrand: {
    color: BRAND.PRIMARY_COLOR,
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 6,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
});

export default NewLoginScreen;