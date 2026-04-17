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
  Linking,
  Animated,
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

  // ── Inline field-level errors ──────────────────────────────────────────────
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  // General (non-field) error still uses the modal
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Login Failed');
  // ──────────────────────────────────────────────────────────────────────────

  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // ── Splash animation ───────────────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.88,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  // Clear field errors as soon as the user starts re-typing
  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const getUserDetails = async () => {
    try {
      const pendingDataStr = await AsyncStorage.getItem('pendingRegistration');
      if (pendingDataStr) {
        const pendingData = JSON.parse(pendingDataStr);
        navigation.replace('PendingStatus', pendingData);
        return;
      }

      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) {
        setIsCheckingSession(false);
        return;
      }

      const parsed = JSON.parse(userInfo);
      if (!parsed?.api_token || !parsed?.id) {
        setIsCheckingSession(false);
        return;
      }

      await VisitorModule.saveAuthDetails({
        apiToken: parsed.api_token || "",
        userId: String(parsed.id || ""),
        societyId: String(parsed.societyId || parsed.society_id || ""),
        roleId: String(parsed.role_id || parsed.group_id || ""),
        unitId: String(parsed.unit_id || ""),
        flatNo: String(parsed.flat_no || ""),
      });

      const isConnected = await checkInternet();
      if (isConnected) {
        await ismServices.getUserDetails();
      }

      await loadPermissions();
      navigation.replace('MainApp');

    } catch (error) {
      console.log('Session restore failed:', error);
      await AsyncStorage.removeItem('userInfo').catch(() => { });
      setIsCheckingSession(false);
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
        // ── Show inline errors instead of a modal ──────────────────────────
        const msg = response.message || '';
        const lowerMsg = msg.toLowerCase();

        if (lowerMsg.includes('password')) {
          setPasswordError(msg || 'Incorrect password. Please try again.');
        } else if (
          lowerMsg.includes('email') ||
          lowerMsg.includes('mobile') ||
          lowerMsg.includes('user') ||
          lowerMsg.includes('not found') ||
          lowerMsg.includes('invalid')
        ) {
          setEmailError(msg || 'No account found for this email / mobile number.');
        } else {
          // Fallback: show under password field
          setPasswordError(msg || 'Incorrect email or password. Please try again.');
        }
        // ──────────────────────────────────────────────────────────────────
      } else if (response.status === 'success') {
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
        await AsyncStorage.setItem("isTenant", String(user?.tenant || 0));
        await AsyncStorage.setItem("userInfo", JSON.stringify(user));
        if (VisitorModule?.saveAuthDetails) {
          await VisitorModule.saveAuthDetails({
            apiToken: user.api_token || "",
            userId: String(user.id || ""),
            societyId: String(user.societyId || user.society_id || ""),
            roleId: String(user.role_id || user.group_id || ""),
            unitId: String(user.unit_id || ""),
            flatNo: String(user.flat_no || ""),
          });
        }
        await AsyncStorage.removeItem("permissions");
        await loadPermissions();
        setTimeout(async () => {
          await RegisterAppOneSignal();
        }, 800);
        setTimeout(() => {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "MainApp" }] }));
        }, 100);
      } else {
        setErrorTitle('Login Failed');
        setErrorMessage('Something went wrong. Please try again.');
        setShowError(true);
      }
    } catch (error) {
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
    let valid = true;

    if (!email.trim()) {
      setEmailError('Please enter your email address.');
      valid = false;
    } else if (!isValidIdentity(email)) {
      setEmailError('Please enter a valid email or mobile number.');
      valid = false;
    }

    if (!password.trim()) {
      setPasswordError('Please enter your password.');
      valid = false;
    }

    if (!agreedToTerms) {
      setErrorTitle('Terms Required');
      setErrorMessage('Please agree to the Terms and Conditions to continue.');
      setShowError(true);
      valid = false;
    }

    return valid;
  };

  // ── Logo splash while session is being checked ─────────────────────────────
  if (isCheckingSession) {
    return (
      <View style={[styles.safeArea, styles.splashContainer]}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND.PRIMARY_COLOR} />
        <Animated.Image
          source={BRAND.LOGO}
          style={[
            styles.splashLogo,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }
  // ──────────────────────────────────────────────────────────────────────────

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
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Image source={BRAND.LOGO} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.welcomeMessage}>Welcome Back</Text>
              <Text style={styles.subWelcomeMessage}>Please sign in to continue</Text>
            </View>

            <View style={styles.formContainer}>
              <Wave />
              <View style={styles.formInputsWrapper}>

                {/* ── Email / Mobile field ── */}
                <View
                  style={[
                    styles.inputContainer,
                    emailError ? styles.inputContainerError : null,
                  ]}
                >
                  <View style={styles.icon}>
                    <Icon name="email" size={20} color={emailError ? '#e53935' : '#9e9e9e'} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Email or Mobile Number"
                    placeholderTextColor="#9e9e9e"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={handleEmailChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
                {emailError ? (
                  <Text style={styles.fieldError}>{emailError}</Text>
                ) : null}

                {/* ── Password field ── */}
                <View
                  style={[
                    styles.inputContainer,
                    passwordError ? styles.inputContainerError : null,
                  ]}
                >
                  <View style={styles.icon}>
                    <Icon name="lock" size={20} color={passwordError ? '#e53935' : '#9e9e9e'} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9e9e9e"
                    secureTextEntry={!showPassword}
                    value={password}
                    autoCapitalize="none"
                    onChangeText={handlePasswordChange}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeIcon}>
                    <Icon name={showPassword ? 'visibility' : 'visibility-off'} size={20} color="#9e9e9e" />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}

                <View style={styles.rowBetween}>
                  <TouchableOpacity onPress={() => navigation.navigate("OtpLogin")}>
                    <Text style={styles.otpText}>OTP LOGIN</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => { if (validateInputs()) handleLogin(); }}
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  disabled={isLoading}
                >
                  <Text style={styles.loginButtonText}>{isLoading ? 'Signing in...' : 'Sign in'}</Text>
                </TouchableOpacity>

                <View style={styles.signUpContainer}>
                  <Text style={styles.signUpText}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
                    <Text style={styles.signUpLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.poweredBy}>
                  Powered By{' '}
                  <Text style={styles.poweredByBrand}>Factech Automation Solutions Private Limited</Text>
                </Text>
                <Text style={styles.versionText}>v{version}</Text>
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

  // ── Splash / session-check screen ──────────────────────────────────────────
  splashContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: {
    width: width * 0.65,
    height: 80,
  },
  // ──────────────────────────────────────────────────────────────────────────

  scrollViewContent: { flexGrow: 1 },
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: BRAND.PRIMARY_COLOR },
  headerContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingBottom: 10 },
  logoContainer: { width: '60%', alignSelf: 'center', justifyContent: 'center' },
  logo: { width: 300, height: 60, alignSelf: 'center' },
  welcomeMessage: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subWelcomeMessage: { fontSize: 16, color: '#E8F4FD', textAlign: 'center', opacity: 0.9, fontWeight: '400' },
  formContainer: {},
  formInputsWrapper: { backgroundColor: '#FFFFFF', paddingHorizontal: 25, paddingTop: 30, paddingBottom: 50 },

  // ── Input containers ───────────────────────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 4,          // reduced — error text sits right below
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1.5,
    borderColor: 'transparent', // invisible by default
  },
  inputContainerError: {
    borderColor: '#e53935',   // red border on error
    backgroundColor: '#fff5f5',
  },
  // ──────────────────────────────────────────────────────────────────────────

  // ── Inline field error text ────────────────────────────────────────────────
  fieldError: {
    color: '#e53935',
    fontSize: 12,
    marginBottom: 14,
    marginLeft: 4,
  },
  // ──────────────────────────────────────────────────────────────────────────

  icon: { marginRight: 15 },
  eyeIcon: { paddingLeft: 10 },
  input: { flex: 1, height: 60, fontSize: 16, color: '#000' },
  loginButton: { backgroundColor: BRAND.COLORS.button, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 25, height: 60, elevation: 5 },
  loginButtonDisabled: { backgroundColor: '#B0B0B0', elevation: 0 },
  loginButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18 },
  signUpContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 13 },
  signUpText: { fontSize: 14, color: '#9e9e9e' },
  signUpLink: { fontSize: 14, color: '#074B7C', fontWeight: 'bold' },
  poweredBy: { textAlign: 'center', fontSize: 12, color: '#9e9e9e', marginTop: 4 },
  poweredByBrand: { color: BRAND.PRIMARY_COLOR, fontWeight: '500' },
  versionText: { textAlign: 'center', fontSize: 12, color: '#9e9e9e', marginTop: 6 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
  },
  otpText: {
    color: '#074B7C',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NewLoginScreen;