import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { usePermissions } from '../../Utils/ConetextApi';
import { useNavigation } from '@react-navigation/native';
import { otherServices } from '../../services/otherServices';
import { hasPermission } from '../../Utils/PermissionHelper';
import BRAND from '../config';

const { width: screenWidth } = Dimensions.get('window');

const ServicesSection = () => {
  const { nightMode, permissions } = usePermissions();
  const navigation = useNavigation();

  const [panicVisible, setPanicVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [note, setNote] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [sending, setSending] = useState(false);

  // ── Permission flags ──────────────────────────────────────────────────────
  const permissionsLoaded = permissions !== null && permissions !== undefined;

  // FIX 1: "C" does not exist — correct values are CREATE / UPDATE / DELETE / R
  const canViewPanic = permissionsLoaded && hasPermission(permissions, 'PNC', 'R');
  const canSendPanic = permissionsLoaded && hasPermission(permissions, 'PNC', 'C');

  const allServices = [
    { id: '1', title: 'Accounts', icon: 'card-outline', route: 'Accounts' },
    { id: '2', title: 'Staff', icon: 'checkmark-circle-outline', route: 'StaffScreen' },
    { id: '3', title: 'Visitors', icon: 'person-outline', route: 'Visitors' },
    { id: '4', title: 'SOS', icon: 'alert-circle', isPanic: true },
    { id: '5', title: 'Family', icon: 'people-outline', route: 'FamilyMember' },
    { id: '6', title: 'Contact Us', icon: 'mail-outline', route: 'ContactUsScreen' },
    { id: '7', title: 'Setting', icon: 'settings-outline', route: 'Settings' },
    {  id : '8',title: "My Complex", icon: "accessibility-outline", route: "Notices" },
    { id: '9', title: 'Bills', icon: 'receipt-outline', route: 'bills' },
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

  const fetchContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await otherServices.getPanicContacts();
      if (res?.status === 'success') {
        const phoneData = res.data?.phone_nos;
        if (!phoneData) setContacts([]);
        else if (Array.isArray(phoneData)) setContacts(phoneData);
        else setContacts([phoneData]);
      }
    } catch (error) {
      console.log('Panic Contact Fetch Error:', error);
      setContacts([]);
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
      // Pass the 'note' state as the second argument
      const res = await otherServices.sendPanicAlert(selectedReason.toUpperCase(), note);
      
      if (res?.status === 'success') {
        setPanicVisible(false);
        setSuccessVisible(true);
        setTimeout(() => setSuccessVisible(false), 2500);
        setSelectedReason(null);
        setNote('');
      } else {
        Alert.alert('Error', 'Failed to send alert');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setSending(false);
    }
  };

  // ── Filter services based on permissions ──────────────────────────────────
  const visibleServices = allServices.filter((service) => {
    if (!permissionsLoaded) return true;

    if (service.title === 'Accounts')
      return hasPermission(permissions, 'BILL', 'R');

    if (service.title === 'Visitors')
      return hasPermission(permissions, 'VMS', 'R');

    if (service.title === 'Staff')
      return hasPermission(permissions, 'VMSSTF', 'R');

    if (service.title === 'Bills')
      return hasPermission(permissions, 'BILL', 'R');

    if (service.title === 'Add vehicle')
      return hasPermission(permissions, 'VEH', 'C');

    if (service.title === 'Bookings')
      return hasPermission(permissions, 'FBK', 'R');

    if (service.title === 'Amenities')
      return hasPermission(permissions, 'FBK', 'R');

    if (service.title === 'SOS')
      return canViewPanic;

    return true;
  });

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Ionicons
          name="construct"
          size={20}
          color={nightMode ? '#D1D5DB' : '#374151'}
          style={{ marginRight: 8, paddingLeft: 8 }}
        />
        <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Services</Text>
      </View>

      {/* Services Grid */}
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
                { backgroundColor: service.isPanic ? '#FEE2E2' : BRAND.COLORS.iconbg },
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
                placeholder="Add an optional message"
                placeholderTextColor="#9CA3AF"
                value={note}
                onChangeText={setNote}
                maxLength={100}
              />
            </View>

            {/* FIX 3: Send button disabled if no CREATE permission OR nothing selected */}
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
  container: { marginHorizontal: 10, marginTop: 10 },
  inputContainer: { 
    paddingHorizontal: 16, 
    marginTop: 12 
  },
  messageInput: { 
    backgroundColor: '#F9FAFB', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 8, 
    padding: 12, 
    color: '#374151',
    minHeight: 45
  },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  serviceItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
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
});