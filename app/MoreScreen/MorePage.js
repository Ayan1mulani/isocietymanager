import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
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
import { useNavigation, CommonActions } from '@react-navigation/native';
import AccountSelectorModal from '../Login/SelectUserMode';
import { LoginSrv } from '../../services/LoginSrv';
import { ismServices } from '../../services/ismServices';
import StatusModal from "../components/StatusModal";
import BRAND from '../config';
import { RegisterAppOneSignal } from '../../services/oneSignalService';
import * as ImagePicker from 'react-native-image-picker';
import { otherServices } from '../../services/otherServices';
import { NativeModules } from "react-native";
import DeviceInfo from 'react-native-device-info';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const { VisitorModule } = NativeModules;
const version = DeviceInfo.getVersion();
const buildNumber = DeviceInfo.getBuildNumber();

const PROFILE_CACHE_KEY = '@user_profile_cache';
const DETAILS_CACHE_KEY = '@user_details_cache';

// ── Skeleton Placeholder Component ──
const SkeletonText = ({ width = 80, height = 14, theme }) => (
  <View style={{ width, height, backgroundColor: theme.skeleton, borderRadius: 4 }} />
);

const InfoRow = ({ label, value, theme, loading }) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.divider }]}>
    <Text style={[styles.infoLabel, { color: theme.textSub }]} numberOfLines={1}>
      {label}
    </Text>
    <View style={{ flex: 6, alignItems: 'flex-end' }}>
      {loading ? (
        <SkeletonText width={100} theme={theme} />
      ) : (
        <Text style={[styles.infoValue, { color: theme.textMain }]} numberOfLines={1}>
          {value || 'N/A'}
        </Text>
      )}
    </View>
  </View>
);

const ProfileScreen = () => {
  const { t } = useTranslation();
  const { nightMode, loadPermissions } = usePermissions();
  const [userProfile, setUserProfile] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const [ownerOpen, setOwnerOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(true);
  const [meterOpen, setMeterOpen] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSwitchPassword, setShowSwitchPassword] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const { showAlert, AlertComponent } = useAlert(nightMode);

  const [modalVisible, setModalVisible] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [password, setPassword] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const [changePassModal, setChangePassModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passError, setPassError] = useState('');
  const [switchPassError, setSwitchPassError] = useState('');

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
    skeleton: nightMode ? '#374151' : '#E5E7EB',
  }), [nightMode]);

  useEffect(() => { loadUserProfile(); }, []);

  const loadUserProfile = async () => {
    try {
      const cachedProfile = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      const cachedDetails = await AsyncStorage.getItem(DETAILS_CACHE_KEY);
      
      if (cachedProfile) setUserProfile(JSON.parse(cachedProfile));
      if (cachedDetails) setUserDetails(JSON.parse(cachedDetails));
      if (cachedProfile) setLoading(false);

      const [res, res2] = await Promise.all([
        ismServices.getUserProfileData(),
        ismServices.getUserDetails()
      ]);

      if (res?.status === 'success') {
        setUserProfile(res.data);
        await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(res.data));
      }
      if (res2) {
        setUserDetails(res2);
        await AsyncStorage.setItem(DETAILS_CACHE_KEY, JSON.stringify(res2));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeProfileImage = async () => {
    try {
      ImagePicker.launchImageLibrary(
        { mediaType: 'photo', quality: 0.7, includeBase64: true },
        async (response) => {
          if (response.didCancel || !response.assets?.[0]?.base64) return;

          setStatusModal({ visible: true, type: 'loading', title: t('Uploading'), subtitle: t('Please wait...') });
          const res = await otherServices.changeProfilePicture(`data:image/jpeg;base64,${response.assets[0].base64}`);

          if (res?.status === "success") {
            setStatusModal({ visible: true, type: 'success', title: t('Success'), subtitle: t('Updated successfully') });
            await loadUserProfile();
          } else {
            setStatusModal({ visible: true, type: 'error', title: t('Failed'), subtitle: t('Upload failed') });
          }
        }
      );
    } catch (e) { console.log(e); }
  };

  const handleChangePassword = useCallback(async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPassError(t('Passwords do not match'));
      return;
    }
    try {
      setChangingPassword(true);
      const res = await ismServices.changePassword({ old_password: '', new_password: newPassword, cpassword: confirmPassword });
      if (res?.status === 'success' || res?.data?.status === 'success') {
        setChangePassModal(false);
        setNewPassword(''); setConfirmPassword('');
        showAlert({ title: t('Success'), message: t('Password changed'), buttons: [{ text: t('OK') }] });
      }
    } catch (e) { console.log(e); } finally { setChangingPassword(false); }
  }, [newPassword, confirmPassword, t, showAlert]);

  const handleFetchAccounts = async () => {
    try {
      setIsSwitching(true);
      const identity = await AsyncStorage.getItem("loginIdentity");
      const response = await LoginSrv.login({ identity: identity.trim(), password: '', tenant: 0, user_id: null });
      if (response.status === 'multipleLogin') {
        setAccounts(response.data);
        setModalVisible(true);
      }
    } catch (e) { console.log(e); } finally { setIsSwitching(false); }
  };

  const confirmSwitchLogin = async () => {
    if (!password.trim()) { setSwitchPassError(t('Enter password')); return; }
    try {
      setIsSwitching(true);
      const identity = await AsyncStorage.getItem("loginIdentity");
      const response = await LoginSrv.login({ identity, password, tenant: 0, user_id: selectedUserId });
      if (response.status === 'success') {
        await AsyncStorage.multiRemove(["userInfo", "permissions", "userDetails"]);
        await AsyncStorage.setItem("userInfo", JSON.stringify(response.data));
        navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "MainApp" }] }));
      } else {
        setSwitchPassError(t("Incorrect password"));
      }
    } catch (e) { console.log(e); } finally { setIsSwitching(false); }
  };

  const handleLogout = useCallback(() => {
    showAlert({
      title: t('Logout'), message: t('Are you sure?'),
      buttons: [
        { text: t('Cancel'), style: 'cancel' },
        { text: t('Logout'), style: 'destructive', onPress: async () => {
          await AsyncStorage.clear();
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] }));
        }}
      ]
    });
  }, [t, showAlert, navigation]);

  const avatarSource = useMemo(() => {
    if (userProfile?.image_src) return { uri: userProfile.image_src };
    return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || 'U')}&background=3B82F6&color=fff` };
  }, [userProfile]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={[styles.profileCard, { backgroundColor: theme.cardBg }]}>
          <View style={{ alignItems: 'center' }}>
            <Image source={avatarSource} style={styles.avatar} />
            <TouchableOpacity onPress={handleChangeProfileImage}>
              <Text style={styles.changeText}>{t("Change")}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            {loading && !userProfile ? (
              <View style={{ gap: 8 }}><SkeletonText width="80%" height={18} theme={theme} /><SkeletonText width="60%" theme={theme} /></View>
            ) : (
              <><Text style={[styles.userName, { color: theme.textMain }]}>{userProfile?.name}</Text>
                <Text style={[styles.userSub, { color: theme.textSub }]}>{userProfile?.phone_no}</Text>
                <Text style={[styles.userSub, { color: theme.textSub }]}>{userProfile?.email}</Text></>
            )}
          </View>
        </View>

        {/* Virtual ID */}
        <TouchableOpacity style={[styles.virtualIdCard, { backgroundColor: theme.cardBg }]} onPress={() => navigation.navigate('ResidentIdCard')}>
          <View style={styles.virtualIdLeft}>
            <View style={[styles.virtualIdIcon, { backgroundColor: theme.primary + '18' }]}><Ionicons name="card-outline" size={22} color={theme.primary} /></View>
            <View style={styles.virtualIdText}>
              <Text style={[styles.virtualIdTitle, { color: theme.textMain }]}>{t("Virtual ID Card")}</Text>
              <Text style={[styles.virtualIdSub, { color: theme.textSub }]}>{t("View identity card")}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSub} />
        </TouchableOpacity>

        {/* Unit Details */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <TouchableOpacity style={styles.dropdownHeader} onPress={() => setUnitOpen(p => !p)}>
            <Text style={[styles.sectionTitle, { color: theme.textMain }]}>{t("Unit Details")}</Text>
            <Ionicons name={unitOpen ? 'chevron-up' : 'chevron-down'} size={20} color={theme.textSub} />
          </TouchableOpacity>
          {unitOpen && (
            <View style={styles.dropdownContent}>
              <InfoRow label={t("Tower")} value={userDetails?.tower} theme={theme} loading={loading && !userDetails} />
              <InfoRow label={t("Flat No")} value={userDetails?.flat_no} theme={theme} loading={loading && !userDetails} />
            </View>
          )}
        </View>

        {/* Static Settings */}
        <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.textMain }]}>{t("Settings")}</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={theme.textMain} /><Text style={[styles.actionText, { color: theme.textMain }]}>{t("App Settings")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={() => setChangePassModal(true)}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textMain} /><Text style={[styles.actionText, { color: theme.textMain }]}>{t("Change Password")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleFetchAccounts}>
            <Ionicons name="swap-horizontal-outline" size={20} color={theme.textMain} /><Text style={[styles.actionText, { color: theme.textMain }]}>{t("Switch Account")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={theme.danger} /><Text style={[styles.actionText, { color: theme.danger }]}>{t("Logout")}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.versionText, { color: theme.textSub }]}>v{version} ({buildNumber})</Text>
      </ScrollView>

      {/* Modals */}
      <Modal visible={changePassModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t("Change Password")}</Text>
          <TextInput placeholder={t("New Password")} secureTextEntry value={newPassword} onChangeText={setNewPassword} style={styles.passwordInput} />
          <TextInput placeholder={t("Confirm Password")} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} style={styles.passwordInput} />
          <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]} onPress={handleChangePassword}><Text style={styles.modalPrimaryBtnText}>{t("Update")}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setChangePassModal(false)} style={styles.modalCancelBtn}><Text style={styles.modalCancelText}>{t("Cancel")}</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <AccountSelectorModal visible={modalVisible} accounts={accounts} onSelect={(u) => { setModalVisible(false); setSelectedUserId(u.user_id); setPasswordModal(true); }} onClose={() => setModalVisible(false)} />
      
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t("Verify")}</Text>
          <TextInput placeholder={t("Password")} secureTextEntry value={password} onChangeText={setPassword} style={styles.passwordInput} />
          {switchPassError ? <Text style={styles.inlineError}>{switchPassError}</Text> : null}
          <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: theme.primary }]} onPress={confirmSwitchLogin}><Text style={styles.modalPrimaryBtnText}>{t("Login")}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setPasswordModal(false)} style={styles.modalCancelBtn}><Text style={styles.modalCancelText}>{t("Cancel")}</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <StatusModal visible={statusModal.visible} type={statusModal.type} title={statusModal.title} subtitle={statusModal.subtitle} onClose={() => setStatusModal(p => ({...p, visible: false}))} />
      <AlertComponent />
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 18, marginBottom: 16 },
  avatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E5E7EB' },
  profileInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 18, fontWeight: '700' },
  userSub: { fontSize: 13, marginTop: 3 },
  changeText: { marginTop: 6, fontSize: 13, fontWeight: '600', color: BRAND.COLORS.primary, textAlign: 'center' },
  virtualIdCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 16 },
  virtualIdLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  virtualIdIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  virtualIdText: { flex: 1 },
  virtualIdTitle: { fontSize: 15, fontWeight: '600' },
  virtualIdSub: { fontSize: 12, marginTop: 2 },
  card: { borderRadius: 18, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownContent: { marginTop: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5 },
  infoLabel: { fontSize: 14, flex: 5 },
  infoValue: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  actionText: { fontSize: 15, flex: 1 },
  versionText: { textAlign: 'center', fontSize: 13, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 16 },
  modalTitle: { fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
  passwordInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 14 },
  modalPrimaryBtn: { padding: 14, borderRadius: 10, alignItems: 'center' },
  modalPrimaryBtnText: { color: '#fff', fontWeight: '600' },
  modalCancelBtn: { marginTop: 15, alignItems: 'center' },
  modalCancelText: { color: '#EF4444' },
  inlineError: { color: '#EF4444', fontSize: 12, marginBottom: 10 }
});