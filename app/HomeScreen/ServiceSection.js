import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 1. Added AsyncStorage
import { usePermissions } from '../../Utils/ConetextApi';
import { useNavigation } from '@react-navigation/native';
import { otherServices } from '../../services/otherServices';
import { hasPermission } from '../../Utils/PermissionHelper';
import BRAND from '../config';

import Text from '../components/TranslatedText';

import { useTranslation } from 'react-i18next';

const { width: screenWidth } = Dimensions.get('window');

// 2. Added Cache Key for Panic Contacts
const CONTACTS_CACHE_KEY = '@panic_contacts_cache';

const ServicesSection = () => {
  const { nightMode, permissions } = usePermissions();
  const navigation = useNavigation();

  const { t } = useTranslation();

  const [panicVisible, setPanicVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [note, setNote] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);

  const permissionsLoaded = permissions !== null && permissions !== undefined;

  const canViewPanic = permissionsLoaded && hasPermission(permissions, 'PNC', 'R');
  const canSendPanic = permissionsLoaded && hasPermission(permissions, 'PNC', 'C');

  const allServices = [
    { id: '1', title: 'Accounts', icon: 'card-outline', route: 'Accounts' },
    { id: '2', title: "Notices", icon: "megaphone-outline", route: "MyNoticesScreen" },
    { id: '3', title: "My Complex", icon: "accessibility-outline", route: "Notices" },
    { id: '4', title: 'SOS', icon: 'alert-circle', isPanic: true },
    { id: '5', title: 'Visitors', icon: 'person-outline', route: 'Visitors' },
    { id: '6', title: 'Staff', icon: 'checkmark-circle-outline', route: 'StaffScreen' },
    { id: '7', title: 'Family', icon: 'people-outline', route: 'FamilyMember' },
    { id: '8', title: 'Complaints', icon: 'construct-outline', route: 'Service Requests' },
    { id: '9', title: 'Setting', icon: 'settings-outline', route: 'Settings' },
    { id: '10', title: 'Payment', icon: 'wallet-outline', route: 'Payment' },
    { id: '11', title: 'Energy', icon: 'speedometer-outline', route: 'Meter' },
    { id: '12', title: 'More', icon: 'ellipsis-horizontal-outline', route: 'AllServicesScreen' },
  ];

  const panicReasons = [
    { label: 'Fire', icon: 'flame' },
    { label: 'Theft', icon: 'alert-circle' },
    { label: 'Lift', icon: 'warning' },
    { label: 'Emergency', icon: 'medical' },
  ];

  const theme = {
    iconBgUnselected: nightMode ? '#1F2937' : '#F3F4F6',
    iconColorUnselected: nightMode ? '#D1D5DB' : '#4B5563',
    textColor: nightMode ? '#D1D5DB' : '#374151',
  };

  const handleServicePress = async (service) => {
    if (service.isPanic) {
      setPanicVisible(true);
      fetchContacts();
      return;
    }
    if (service.route) {
      navigation.navigate(service.route);
    }
  };

  // 3. Updated fetchContacts to use Instant Cache Loading
  const fetchContacts = async () => {
    try {
      // INSTANT LOAD: Check cache first
      const cachedData = await AsyncStorage.getItem(CONTACTS_CACHE_KEY);
      if (cachedData) {
        setContacts(JSON.parse(cachedData));
      } else {
        // Only show loader if we have absolutely nothing to display
        setLoadingContacts(true);
      }

      // BACKGROUND FETCH: Get fresh contacts from server
      const res = await otherServices.getPanicContacts();
      if (res?.status === 'success') {
        const phoneData = res.data?.phone_nos;
        let freshContacts = [];
        
        if (phoneData) {
          freshContacts = Array.isArray(phoneData) ? phoneData : [phoneData];
        }
        
        // Update state with fresh data
        setContacts(freshContacts);
        
        // Update cache
        await AsyncStorage.setItem(CONTACTS_CACHE_KEY, JSON.stringify(freshContacts));
      } else if (!cachedData) {
        setContacts([]);
      }
    } catch (error) {
      console.log('Panic Contact Fetch Error:', error);
      if (contacts.length === 0) setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  };

  const callNumber = (number) => {
    Linking.openURL(`tel:${number}`);
  };

  const handleSendAlert = async () => {
    if (!selectedReason) return;
    try {
      setSending(true);
      const res = await otherServices.sendPanicAlert(selectedReason.toUpperCase(), note);

      if (res?.status === 'success') {
        setPanicVisible(false);
        setSuccessVisible(true);
        setTimeout(() => setSuccessVisible(false), 2500);
        setSelectedReason(null);
        setNote('');
      } else {
        Alert.alert(t('Error'), t('Failed to send alert'));
      }
    } catch (error) {
      Alert.alert(t('Error'), t('Something went wrong'));
    } finally {
      setSending(false);
    }
  };

  const visibleServices = allServices.filter((service) => {
    if (!permissionsLoaded) return true;

    if (service.title === 'Accounts') return hasPermission(permissions, 'BILL', 'R');
    if (service.title === 'Visitors') return hasPermission(permissions, 'VMS', 'R');
    if (service.title === 'Staff') return hasPermission(permissions, 'VMSSTF', 'R');
    if (service.title === 'Bills') return hasPermission(permissions, 'BILL', 'R');
    if (service.title === 'Add vehicle') return hasPermission(permissions, 'VEH', 'C');
    if (service.title === 'Bookings') return hasPermission(permissions, 'FBK', 'R');
    if (service.title === 'Payment') return hasPermission(permissions, 'PMT', 'R');
    if (service.title === 'Family') return hasPermission(permissions, 'FMB', 'R');
    if (service.title === 'My Complex') return hasPermission(permissions, 'NTC', 'R');
    if (service.title === 'Setting') return hasPermission(permissions, 'STG', 'R');
    if (service.title === 'Amenities') return hasPermission(permissions, 'FBK', 'R');
    if (service.title === 'Energy') return hasPermission(permissions, 'MTR', 'R');
    if (service.title === 'SOS') return canViewPanic;

    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Services</Text>
      </View>

      <View style={styles.servicesGrid}>
        {visibleServices.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={styles.serviceItem}
            activeOpacity={0.7}
            onPress={() => handleServicePress(service)}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: service.isPanic ? '#FCEEED' : "#f7fafd", borderColor: service.isPanic ? '#FEE2E2' : '#f2f7fb', borderWidth: 1 , elevation: 0.3},
              ]}
            >
              <Ionicons
                name={service.icon}
                size={22}
                color={service.isPanic ? '#EF4444' : theme.iconColorUnselected}
              />
            </View>
            <Text style={[styles.serviceTitle, { color: theme.textColor }]}>
              {service.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 🔴 PANIC MODAL */}
      <Modal visible={panicVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Panic Alert</Text>
              <TouchableOpacity onPress={() => { setPanicVisible(false); setSelectedReason(null); setNote(''); }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDesc}>
              This feature sends PANIC ALERT to security.
            </Text>

            <View style={styles.reasonGrid}>
              {panicReasons.map((reason) => (
                <TouchableOpacity
                  key={reason.label}
                  style={[
                    styles.reasonButton,
                    selectedReason === reason.label && styles.reasonSelected,
                  ]}
                  onPress={() => setSelectedReason(reason.label)}
                >
                  <Ionicons
                    name={reason.icon}
                    size={22}
                    color={selectedReason === reason.label ? '#EF4444' : '#555'}
                  />
                  <Text style={styles.reasonText}>{reason.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder={t("Add an optional message")}
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                maxLength={100}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedReason || sending || !canSendPanic) && { opacity: 0.5 },
              ]}
              disabled={!selectedReason || sending || !canSendPanic}
              onPress={handleSendAlert}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {canSendPanic ? 'Send Alert' : 'No Permission to Send'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.contactText}>Emergency Contact Numbers</Text>

            <ScrollView
              style={styles.contactList}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {loadingContacts ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                contacts.map((number, index) => (
                  <TouchableOpacity
                    key={`${number}-${index}`}
                    style={styles.contactBtn}
                    onPress={() => callNumber(number)}
                  >
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.contactBtnText}>{number}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>

      {/* 🟢 SUCCESS MODAL */}
      <Modal visible={successVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.successOverlay}>
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#22C55E" />
            <Text style={styles.successTitle}>Help is on the way</Text>
            <Text style={styles.successSubtitle}>
              Please stay calm. Security has been notified.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ServicesSection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 0, 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20, 
    marginTop: 20,        
    marginBottom: 10
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 10, 
  },
  inputContainer: { paddingHorizontal: 16, marginTop: 12 },
  messageInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, color: '#374151', minHeight: 45 },
  serviceItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceTitle: { fontSize: 11, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.79)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: screenWidth - 40, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', paddingBottom: 16 },
  modalHeader: { backgroundColor: '#EF4444', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalDesc: { padding: 16, textAlign: 'center' },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  reasonButton: { width: '48%', margin: '1%', padding: 12, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' },
  reasonSelected: { borderWidth: 1, borderColor: '#EF4444' },
  reasonText: { marginTop: 6, fontWeight: '600' },
  submitBtn: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#EF4444', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
  contactText: { textAlign: 'center', fontWeight: '700', marginTop: 12 },
  contactBtn: { marginHorizontal: 16, marginVertical: 6, backgroundColor: '#dd8585', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  contactBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.79)', justifyContent: 'center', alignItems: 'center' },
  successContainer: { width: screenWidth - 60, backgroundColor: '#ffffff', borderRadius: 20, padding: 30, alignItems: 'center' },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#16A34A', marginTop: 12 },
  successSubtitle: { fontSize: 14, textAlign: 'center', color: '#4B5563', marginTop: 6 },
  contactList: { maxHeight: 180, marginTop: 8 },
});