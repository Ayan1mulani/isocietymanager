import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { ismServices } from '../../services/ismServices';
import BRAND from '../config';




const RegistrationFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const { societyId, societyName, token, mobile, email, name, flatNo } = route.params || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [formName, setFormName] = useState(name || '');
  const [formMobile, setFormMobile] = useState(mobile || '');
  const [formEmail, setFormEmail] = useState(email || '');
  const [isTenant, setIsTenant] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');

  // --- 📸 Handle Camera ---
  const handleCamera = async () => {
    setShowPicker(false);
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setSelectedFile(result.assets[0]);
    }
  };

  const uploadDocument = async () => {
  if (!selectedFile) return null;
  try {
    const res = await ismServices.uploadDocs(formData, token);

    if (res?.status === 'success') {
      return res.data.url; // ✅ IMPORTANT
    } else {
      Alert.alert("Upload failed", res?.message);
      return null;
    }
  } catch (err) {
    console.log(err);
    Alert.alert("Upload error");
    return null;
  }
};
  // --- 🖼️ Handle Gallery ---
  const handleGallery = async () => {
    setShowPicker(false);
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setSelectedFile(result.assets[0]);
    }
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};
    if (!formName.trim()) { newErrors.formName = "Please enter your name."; isValid = false; }
    if (!formMobile.trim()) { newErrors.formMobile = "Please enter your mobile number."; isValid = false; }
    else if (formMobile.length < 10) { newErrors.formMobile = "Min 10 digits required."; isValid = false; }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
  setApiError('');
  if (!validateForm()) return;

  setIsSubmitting(true);

  try {
    // ✅ STEP 1: Upload file
    const uploadedUrl = await uploadDocument();

    // ✅ STEP 2: Send correct payload (NOT FormData)
    const payload = {
      society_id: societyId,
      form_data: {
        flat_no: flatNo,
        phone_no: formMobile,
        name: formName,
        email: formEmail,
        is_tenant: isTenant,
        remarks: remarks,
        document: uploadedUrl ? [uploadedUrl] : []
      }
    };

    const response = await ismServices.submitRegistrationForm(payload, token);

    if (response && response.status === 'success') {
      const formId = response.data?.id;

      await AsyncStorage.setItem(
        'pendingRegistration',
        JSON.stringify({ token, societyId, formId })
      );

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "PendingStatus", params: { token, societyId, formId } }]
        })
      );
    } else {
      setApiError(response?.message || "Submission failed.");
    }

  } catch (error) {
    console.log(error);
    setApiError("Connection Error. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

  const handleTextChange = (setter, fieldName) => (value) => {
    setter(value);
    if (errors[fieldName]) setErrors((prev) => ({ ...prev, [fieldName]: null }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Up : {societyName}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {apiError ? (
            <View style={styles.apiErrorContainer}>
              <Icon name="error-outline" size={20} color="#d32f2f" style={{ marginRight: 8 }} />
              <Text style={styles.apiErrorText}>{apiError}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <View style={[styles.inputBox, { backgroundColor: '#f9f9f9' }]}>
              <Text style={{ color: '#000', fontSize: 16 }}>{flatNo}</Text>
              <Icon name="check-circle" size={20} color="#4caf50" />
            </View>
          </View>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputBox, errors.formName && styles.errorBorder]}>
              <TextInput style={styles.input} placeholder="Name" value={formName} onChangeText={handleTextChange(setFormName, 'formName')} />
            </View>
            {errors.formName && <Text style={styles.errorText}>{errors.formName}</Text>}
          </View>

          {/* Mobile Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputBox, errors.formMobile && styles.errorBorder]}>
              <TextInput style={styles.input} placeholder="Phone Number" keyboardType="number-pad" value={formMobile} onChangeText={handleTextChange(setFormMobile, 'formMobile')} />
            </View>
            {errors.formMobile && <Text style={styles.errorText}>{errors.formMobile}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputBox, errors.formEmail && styles.errorBorder]}>
              <TextInput style={styles.input} placeholder="Email ID" keyboardType="email-address" autoCapitalize="none" value={formEmail} onChangeText={handleTextChange(setFormEmail, 'formEmail')} />
            </View>
          </View>

          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setIsTenant(!isTenant)}>
            <Icon name={isTenant ? "check-box" : "check-box-outline-blank"} size={24} color={isTenant ? BRAND.PRIMARY_COLOR : "#757575"} />
            <Text style={styles.checkboxText}>Are you a Tenant?</Text>
          </TouchableOpacity>

          {/* --- Photo Upload --- */}
          <View style={styles.docSection}>
            <Text style={styles.docLabel}>Identity Proof (Aadhar/Voter ID/Lease)</Text>
            <TouchableOpacity style={styles.uploadTrigger} onPress={() => setShowPicker(true)}>
              <View style={styles.uploadIconBox}>
                <Icon name={selectedFile ? "insert-drive-file" : "add-a-photo"} size={24} color={BRAND.PRIMARY_COLOR} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadTitle}>{selectedFile ? "Photo Attached" : "Tap to add photo"}</Text>
                {selectedFile && <Text style={styles.selectedFileName} numberOfLines={1}>{selectedFile.fileName || "image.jpg"}</Text>}
              </View>
              {selectedFile && <Icon name="check-circle" size={20} color="#4caf50" />}
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputBox}>
              <TextInput style={styles.input} placeholder="Remarks" placeholderTextColor="#9e9e9e" value={remarks} onChangeText={setRemarks} />
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.btnRequest, isSubmitting && { opacity: 0.7 }]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnRequestText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- 🚀 Camera/Gallery Modal --- */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPicker(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Source</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.optionRow}>
              <TouchableOpacity style={styles.optionBtn} onPress={handleCamera}>
                <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}><Icon name="photo-camera" size={28} color="#1976D2" /></View>
                <Text style={styles.optionLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionBtn} onPress={handleGallery}>
                <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}><Icon name="image" size={28} color="#7B1FA2" /></View>
                <Text style={styles.optionLabel}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
};

export default RegistrationFormScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', backgroundColor: '#286bb8', padding: 15, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },

  inputContainer: { marginBottom: 15 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, height: 52, paddingHorizontal: 15, backgroundColor: '#fff' },
  input: { flex: 1, height: 50, fontSize: 16, color: '#000' },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 5 },
  checkboxText: { marginLeft: 10, fontSize: 16, color: '#333' },

  docSection: { marginBottom: 25 },
  docLabel: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '600' },
  uploadTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', borderWidth: 1, borderStyle: 'dashed', borderColor: '#286bb8', borderRadius: 10, padding: 15 },
  uploadIconBox: { width: 45, height: 45, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  uploadTitle: { fontSize: 15, fontWeight: '600', color: '#286bb8' },
  selectedFileName: { fontSize: 12, color: '#666', marginTop: 2 },

  actionRow: { marginTop: 10 },
  btnRequest: { backgroundColor: '#286bb8', paddingVertical: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  btnRequestText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  errorBorder: { borderColor: '#d32f2f' },
  errorText: { color: '#d32f2f', fontSize: 12, marginTop: 4, marginLeft: 4 },
  apiErrorContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebee', padding: 12, borderRadius: 8, marginBottom: 20 },
  apiErrorText: { color: '#d32f2f', fontSize: 14, flex: 1 },

  // MODAL STYLES
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  optionBtn: { alignItems: 'center', width: '40%' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  optionLabel: { fontSize: 14, color: '#333', fontWeight: '500' }
});