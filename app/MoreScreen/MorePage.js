import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import useAlert from "../components/UseAlert";
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UnRegisterOneSignal } from '../../services/oneSignalService';
import { OneSignal } from 'react-native-onesignal';
import { usePermissions } from '../../Utils/ConetextApi';
import { useNavigation } from '@react-navigation/native';
import AccountSelectorModal from '../Login/SelectUserMode'; // Ensure path is correct
import { LoginSrv } from '../../services/LoginSrv';
import { CommonActions } from '@react-navigation/native';
import { ismServices } from '../../services/ismServices';
import StatusModal from "../components/StatusModal";
import BRAND from '../config';
import { RegisterAppOneSignal } from '../../services/oneSignalService';
import * as ImagePicker from 'react-native-image-picker';
import { otherServices } from '../../services/otherServices'; // 👈 add this

const InfoRow = ({ label, value, theme }) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
    <Text style={[styles.infoLabel, { color: theme.textSub }]} numberOfLines={1}>
      {label}
    </Text>
    <Text style={[styles.infoValue, { color: theme.textMain }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} ellipsizeMode="tail">
      {value || 'N/A'}
    </Text>
  </View>
);

const ProfileScreen = () => {
  const { nightMode, loadPermissions } = usePermissions();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [unitOpen, setUnitOpen] = useState(true);
  const [meterOpen, setMeterOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const { showAlert, AlertComponent } = useAlert(nightMode);

  // Account Selection and Switch states
  const [modalVisible, setModalVisible] = useState(false); // List of accounts
  const [passwordModal, setPasswordModal] = useState(false); // Password prompt
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [password, setPassword] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  // Change Password states
  const [changePassModal, setChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [statusModal, setStatusModal] = useState({
    visible: false, type: 'loading', title: '', subtitle: '',
  });

  const navigation = useNavigation();

  const theme = useMemo(() => ({
    background: nightMode ? '#111827' : '#FFFFFF',
    textMain: nightMode ? '#F9FAFB' : '#111827',
    textSub: nightMode ? '#9CA3AF' : '#6B7280',
    divider: nightMode ? '#374151' : '#E5E7EB',
    cardBg: nightMode ? '#1F2937' : '#F9FAFB',
    danger: '#EF4444',
    primary: BRAND.COLORS.primary,
  }), [nightMode]);

  useEffect(() => { loadUserProfile(); }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (!storedUser) { setUserProfile(null); return; }

      const parsedUser = JSON.parse(storedUser);
      const ALLOWED = ['member', 'resident', 'tenant'];
      const userRole = (parsedUser?.role || '').toLowerCase();

      if (!ALLOWED.includes(userRole)) {
        showAlert({ title: 'Access Denied', message: `This app is not for ${parsedUser.role}`, buttons: [{ text: 'OK' }] });
        await AsyncStorage.clear();
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        return;
      }

      const detailsRes = await ismServices.getUserDetails();
      setUserProfile(detailsRes);
      await AsyncStorage.setItem('userDetails', JSON.stringify(detailsRes));
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };


  const handleChangeProfileImage = async () => {
    try {
      ImagePicker.launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.7,
          includeBase64: true,
        },
        async (response) => {
          if (response.didCancel) return;
          if (response.errorCode) {
            console.log("ImagePicker Error:", response.errorMessage);
            return;
          }

          const base64 = response.assets?.[0]?.base64;

          if (!base64) {
            showAlert({
              title: "Error",
              message: "Unable to read image",
              buttons: [{ text: "OK" }]
            });
            return;
          }

          const imageData = `data:image/jpeg;base64,${base64}`;

          setStatusModal({
            visible: true,
            type: 'loading',
            title: 'Uploading Image',
            subtitle: 'Please wait...',
          });

          const res = await otherServices.changeProfilePicture(imageData);

          if (res?.status === "success") {
            setStatusModal({
              visible: true,
              type: 'success',
              title: 'Success',
              subtitle: 'Profile picture updated',
            });

            await loadUserProfile(); // 🔥 refresh UI
          } else {
            setStatusModal({
              visible: true,
              type: 'error',
              title: 'Failed',
              subtitle: res?.message || 'Upload failed',
            });
          }
        }
      );
    } catch (e) {
      console.log("Upload Error:", e);
    }
  };

  const handleLogout = useCallback(() => {
    showAlert({
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout', style: 'destructive',
          onPress: async () => {
            try {
              OneSignal.User.pushSubscription.optOut();
              await UnRegisterOneSignal();
              await AsyncStorage.clear();
              navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
            } catch (e) { console.log('Logout error:', e); }
          },
        },
      ],
    });
  }, [showAlert, navigation]);

  const handleChangePassword = useCallback(async () => {
    if (!newPassword || !confirmPassword) {
      setStatusModal({ visible: true, type: 'error', title: 'Missing Fields', subtitle: 'Please fill all password fields.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusModal({ visible: true, type: 'error', title: 'Password Mismatch', subtitle: 'New password and confirm password must match.' });
      return;
    }
    try {
      setChangingPassword(true);
      setChangePassModal(false);
      setStatusModal({ visible: true, type: 'loading', title: 'Updating Password', subtitle: 'Please wait...' });

      const res = await ismServices.changePassword({ old_password: '', new_password: newPassword, cpassword: confirmPassword });
      const status = res?.status || res?.data?.status;

      if (status === 'success') {
        setStatusModal({ visible: true, type: 'success', title: 'Password Updated', subtitle: 'Your password was changed successfully.' });
        setNewPassword(''); setConfirmPassword('');
      } else {
        setStatusModal({ visible: true, type: 'error', title: 'Failed', subtitle: res?.message || 'Unable to change password.' });
      }
    } catch (e) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', subtitle: 'Something went wrong. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  // =========================================================================
  // SWITCH ACCOUNT LOGIC
  // =========================================================================

  // 1. Fetch Accounts (Uses empty password just like LoginScreen)
  const handleFetchAccounts = async () => {
    try {
      setIsSwitching(true);
      const userInfo = await AsyncStorage.getItem('userInfo');
      const parsedUser = userInfo ? JSON.parse(userInfo) : {};

      const identity = await AsyncStorage.getItem("loginIdentity");

      console.log("FETCH IDENTITY:", identity);

      if (!identity) {
        showAlert({
          title: 'Error',
          message: 'Session expired. Please login again.',
          buttons: [{ text: 'OK' }]
        });
        return;
      }

      const response = await LoginSrv.login({
        identity: identity.trim(),
        password: '',      // ✅ MUST BE EMPTY
        tenant: 0,         // ✅ MUST BE 0
        user_id: null,
      });

      console.log("FETCH RESPONSE:", response);

      if (response.status === 'multipleLogin') {
        // DIRECTLY set the accounts to the modal so nothing gets hidden!
        setAccounts(response.data);
        setModalVisible(true);
      } else {
        showAlert({ title: 'Notice', message: 'No other accounts linked to your details.', buttons: [{ text: 'OK' }] });
      }
    } catch (e) {
      console.log(e);
      showAlert({ title: 'Error', message: 'No accounts found!', buttons: [{ text: 'OK' }] });
    } finally {
      setIsSwitching(false);
    }
  };

  // 2. User selects an account -> Close list and open Password Modal
  const handleAccountSelect = (selectedUser) => {
    setModalVisible(false);
    setSelectedUserId(selectedUser.user_id);
    setPassword('');

    // Give modal time to close before opening the next one
    setTimeout(() => {
      setPasswordModal(true);
    }, 350);
  };

  // 3. Verify Password and Switch Login
  const confirmSwitchLogin = async () => {
    if (!password.trim()) {
      showAlert({ title: 'Validation Error', message: 'Please enter your password.', buttons: [{ text: 'OK' }] });
      return;
    }

    try {
      setIsSwitching(true);
      const userInfo = await AsyncStorage.getItem('userInfo');
      const parsedUser = JSON.parse(userInfo);
      const identity = await AsyncStorage.getItem("loginIdentity");
      console.log("Switching to user_id:", selectedUserId, "with identity:", identity);

      // Final Login Payload (exact copy of LoginScreen)
      const response = await LoginSrv.login({
        identity: identity.trim(),
        password: password,
        tenant: 0,
        user_id: selectedUserId,
      });

      if (response.status === 'success') {
        OneSignal.User.pushSubscription.optOut();
        await UnRegisterOneSignal();

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

        await AsyncStorage.setItem("userInfo", JSON.stringify(user));
        await AsyncStorage.removeItem("permissions");
        await loadPermissions();

        setTimeout(async () => {
          await RegisterAppOneSignal();
        });

        setPasswordModal(false);

        setTimeout(() => {
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "MainApp" }] }));
        }, 100);

      } else {
        showAlert({ title: 'Login Failed', message: response.message || 'Incorrect password.', buttons: [{ text: 'OK' }] });
      }
    } catch (error) {
      console.error('Switch login failed:', error);
      showAlert({ title: 'Connection Error', message: 'Unable to connect to server.', buttons: [{ text: 'OK' }] });
    } finally {
      setIsSwitching(false);
    }
  };

  // =========================================================================

  const avatarSource = useMemo(() => {
    if (userProfile?.image_src) return { uri: userProfile.image_src };
    const name = encodeURIComponent(userProfile?.name || 'User');
    return { uri: `https://ui-avatars.com/api/?name=${name}&background=3B82F6&color=fff&size=200` };
  }, [userProfile?.image_src, userProfile?.name]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!userProfile) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* ── Profile Header ─────────────────────────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg }]}>
  
  <View style={{ alignItems: 'center' }}>
    <View onPress={handleChangeProfileImage}>
      <Image source={avatarSource} style={styles.avatar} />
    </View>

    {/* 🔥 CHANGE BUTTON */}
    <TouchableOpacity onPress={handleChangeProfileImage}>
      <Text style={styles.changeText}>Change</Text>
    </TouchableOpacity>
  </View>

  <View style={styles.profileInfo}>
    <Text style={[styles.userName, { color: theme.textMain }]} numberOfLines={1}>
      {userProfile.name}
    </Text>
    <Text style={[styles.userSub, { color: theme.textSub }]} numberOfLines={1}>
      {userProfile.phone_no}
    </Text>
    <Text style={[styles.userSub, { color: theme.textSub }]} numberOfLines={1}>
      {userProfile.email}
    </Text>
  </View>

</View>

        {/* ── Virtual ID Card ─────────────────────────────────────────────── */}
        <TouchableOpacity style={[styles.virtualIdCard, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('ResidentIdCard')} activeOpacity={0.8}>
          <View style={styles.virtualIdLeft}>
            <View style={[styles.virtualIdIcon, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="card-outline" size={22} color={theme.primary} />
            </View>
            <View style={styles.virtualIdText}>
              <Text style={[styles.virtualIdTitle, { color: theme.textMain }]} numberOfLines={1}>Virtual ID Card</Text>
              <Text style={[styles.virtualIdSub, { color: theme.textSub }]} numberOfLines={1}>View your resident identity card</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        {/* ── Unit Details ────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity style={styles.dropdownHeader} onPress={() => setUnitOpen(p => !p)}>
            <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Unit Details</Text>
            <Ionicons name={unitOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={theme.textSub} />
          </TouchableOpacity>
          {unitOpen && (
            <View style={styles.dropdownContent}>
              <InfoRow label="Tower" value={userProfile.tower} theme={theme} />
              <InfoRow label="Flat No" value={userProfile.flat_no} theme={theme} />
              <InfoRow label="Area (Sq Ft)" value={userProfile.size_sf} theme={theme} />
              <InfoRow label="Category" value={userProfile.fc_name} theme={theme} />
            </View>
          )}
        </View>

        {/* ── Meter Details ───────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity style={styles.dropdownHeader} onPress={() => setMeterOpen(p => !p)}>
            <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Meter Details</Text>
            <Ionicons name={meterOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={20} color={theme.textSub} />
          </TouchableOpacity>
          {meterOpen && (
            <View style={styles.dropdownContent}>
              <InfoRow label="Grid Meter No" value={userProfile.grid_meter_no} theme={theme} />
              <InfoRow label="Grid Demand Load" value={userProfile.grid_demand_load} theme={theme} />
              <InfoRow label="DG Meter No" value={userProfile.dg_meter_no} theme={theme} />
              <InfoRow label="DG Demand Load" value={userProfile.dg_demand_load} theme={theme} />
              <InfoRow label="Meter Seal No" value={userProfile.meter_seal_no} theme={theme} />
            </View>
          )}
        </View>

        {/* ── Settings ────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>Settings</Text>

          <TouchableOpacity style={styles.actionRow} onPress={() => setChangePassModal(true)}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textMain} />
            <Text style={[styles.actionText, { color: theme.textMain }]} numberOfLines={1}>
              Change Password
            </Text>
          </TouchableOpacity>

          {/* Trigger Account Fetch */}
          <TouchableOpacity style={styles.actionRow} onPress={handleFetchAccounts} disabled={isSwitching && !passwordModal}>
            {isSwitching && !passwordModal ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="swap-horizontal-outline" size={20} color={theme.textMain} />
            )}
            <Text style={[styles.actionText, { color: theme.textMain }]} numberOfLines={1}>
              {isSwitching && !passwordModal ? 'Fetching Accounts...' : 'Switch Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.danger} />
            <Text style={[styles.actionText, { color: theme.danger }]} numberOfLines={1}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Change Password Modal ── */}
      <Modal visible={changePassModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput placeholder="New Password" secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholderTextColor="#9CA3AF" style={styles.passwordInput} />
            <TextInput placeholder="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholderTextColor="#9CA3AF" style={styles.passwordInput} />
            <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]} onPress={handleChangePassword} disabled={changingPassword}>
              <Text style={styles.modalPrimaryBtnText}>{changingPassword ? 'Updating...' : 'Update Password'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setChangePassModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Account Selector Modal ── */}
      <AccountSelectorModal
        visible={modalVisible}
        accounts={accounts}
        onSelect={handleAccountSelect}
        onClose={() => setModalVisible(false)}
      />

      {/* ── Switch Account Password Verification Modal ── */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verify Account</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 15 }}>Please enter your password to switch to this account.</Text>

            <TextInput
              placeholder="Password"
              secureTextEntry
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
            />

            <TouchableOpacity
              style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]}
              onPress={confirmSwitchLogin}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.modalPrimaryBtnText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPasswordModal(false)} disabled={isSwitching}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        subtitle={statusModal.subtitle}
        onClose={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      />

      <AlertComponent />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },

  // ── Profile card ─────────────────────────────────────────────────────────
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
  },
  avatar: { width: 70, height: 70, borderRadius: 35, flexShrink: 0 },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    overflow: 'hidden',
  },
  userName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  userSub: { fontSize: 13, marginTop: 3 },

  // ── Virtual ID ───────────────────────────────────────────────────────────
  virtualIdCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  virtualIdLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 8 },
  virtualIdIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  virtualIdText: { flex: 1, overflow: 'hidden' },
  virtualIdTitle: { fontSize: 15, fontWeight: '600' },
  virtualIdSub: { fontSize: 12, marginTop: 2 },

  // ── Info card ────────────────────────────────────────────────────────────
  card: { borderRadius: 18, padding: 18, marginBottom: 16 },

  sectionTitle: { fontSize: 16, fontWeight: '700' },

  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownContent: { marginTop: 10 },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  infoLabel: {
    fontSize: 14,
    flex: 5,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 6,
    textAlign: 'right',
  },
  changeText: {
  marginTop: 6,
  fontSize: 13,
  fontWeight: '600',
  color: BRAND.COLORS.primary,
},

  // ── Settings rows ────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  actionText: { fontSize: 15, flex: 1 },

  // ── Modals ───────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    width: '85%',
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  passwordInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
    color: '#111827',
  },
  modalPrimaryBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalCancelBtn: { marginTop: 15, alignItems: 'center' },
  modalCancelText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },
});