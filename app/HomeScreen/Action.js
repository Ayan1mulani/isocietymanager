import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { usePermissions } from '../../Utils/ConetextApi';

const ServiceActionPage = ({ route, navigation }) => {
  // Safely handle route params - works both with and without navigation
  const serviceType = route?.params?.serviceType;
  const { nightMode } = usePermissions();
  const [selectedAction, setSelectedAction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Theme colors
  const theme = {
    light: {
      background: '#F8FAFC',
      cardBackground: '#FFFFFF',
      textPrimary: '#111827',
      textSecondary: '#6B7280',
      iconColor: '#074B7C',
      border: '#E5E7EB',
      gradient: ['#074B7C', '#053A62'],
    },
    dark: {
      background: '#0A0A0A',
      cardBackground: '#1A1A1A',
      textPrimary: '#F9FAFB',
      textSecondary: '#9CA3AF',
      iconColor: '#60A5FA',
      border: '#374151',
      gradient: ['#2985BE', '#58A7E9'],
    },
  };

  const currentTheme = nightMode ? theme.dark : theme.light;

  // Service actions data
  const serviceActions = {
    amenities: [
      { id: '1', title: 'Swimming Pool', icon: 'water', status: 'Available', time: '6 AM - 10 PM' },
      { id: '2', title: 'Gym', icon: 'fitness', status: 'Available', time: '5 AM - 11 PM' },
      { id: '3', title: 'Clubhouse', icon: 'home', status: 'Available', time: '24/7' },
      { id: '4', title: 'Tennis Court', icon: 'tennisball', status: 'Booked', time: '6 AM - 9 PM' },
      { id: '5', title: 'Kids Play Area', icon: 'basketball', status: 'Available', time: '6 AM - 8 PM' },
      { id: '6', title: 'Party Hall', icon: 'sparkles', status: 'Available', time: 'Bookable' },
    ],
    concerns: [
      { id: '1', title: 'Water Leakage', icon: 'water-outline', category: 'Plumbing' },
      { id: '2', title: 'Electrical Issue', icon: 'flash-outline', category: 'Electrical' },
      { id: '3', title: 'Cleanliness', icon: 'trash-outline', category: 'Housekeeping' },
      { id: '4', title: 'Noise Complaint', icon: 'volume-high-outline', category: 'General' },
      { id: '5', title: 'Security', icon: 'shield-outline', category: 'Security' },
      { id: '6', title: 'Other', icon: 'ellipsis-horizontal-outline', category: 'General' },
    ],
    parking: [
      { id: '1', title: 'Visitor Parking', icon: 'car-outline', slots: '5 Available', duration: 'Max 4 hours' },
      { id: '2', title: 'Reserved Parking', icon: 'car-sport-outline', slots: 'Your Spot: A-101', duration: 'Permanent' },
      { id: '3', title: 'Two Wheeler', icon: 'bicycle-outline', slots: '12 Available', duration: 'Max 8 hours' },
      { id: '4', title: 'Guest Parking', icon: 'car', slots: '3 Available', duration: 'Max 2 hours' },
    ],
    vehicles: [
      { id: '1', name: 'Honda City', number: 'MH 12 AB 1234', type: 'Car', icon: 'car' },
      { id: '2', name: 'Royal Enfield', number: 'MH 12 CD 5678', type: 'Bike', icon: 'bicycle' },
    ],
  };

  const getServiceContent = () => {
    switch (serviceType) {
      case 'amenities':
        return {
          title: 'Amenities',
          subtitle: 'Book and manage society amenities',
          data: serviceActions.amenities,
          actionText: 'Book Now',
        };
      case 'concerns':
        return {
          title: 'Raise Concern',
          subtitle: 'Report issues and complaints',
          data: serviceActions.concerns,
          actionText: 'Report',
        };
      case 'parking':
        return {
          title: 'Parking',
          subtitle: 'Book parking slots',
          data: serviceActions.parking,
          actionText: 'Book Slot',
        };
      case 'vehicles':
        return {
          title: 'My Vehicles',
          subtitle: 'Manage your registered vehicles',
          data: serviceActions.vehicles,
          actionText: 'View Details',
        };
      default:
        return {
          title: 'Services',
          subtitle: 'Select a service',
          data: [],
          actionText: 'Select',
        };
    }
  };

  const content = getServiceContent();

  const handleActionPress = (item) => {
    setSelectedAction(item);
    setModalVisible(true);
  };

  const renderActionModal = () => {
    if (!selectedAction) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.textPrimary }]}>
                {selectedAction.title || selectedAction.name}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                < Ionicons name="close" size={24} color={currentTheme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {serviceType === 'amenities' && (
                <>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Status: {selectedAction.status}
                  </Text>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Timing: {selectedAction.time}
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="Select Date"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="Select Time Slot"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                </>
              )}

              {serviceType === 'concerns' && (
                <>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Category: {selectedAction.category}
                  </Text>
                  <TextInput
                    style={[styles.textArea, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="Describe your concern..."
                    placeholderTextColor={currentTheme.textSecondary}
                    multiline
                    numberOfLines={4}
                  />
                  <TouchableOpacity style={styles.attachButton}>
                    < Ionicons name="attach" size={20} color={currentTheme.iconColor} />
                    <Text style={[styles.attachText, { color: currentTheme.iconColor }]}>
                      Attach Photo
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {serviceType === 'parking' && (
                <>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Available: {selectedAction.slots}
                  </Text>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Duration: {selectedAction.duration}
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="Vehicle Number"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="From Time"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                  <TextInput
                    style={[styles.input, { 
                      borderColor: currentTheme.border, 
                      color: currentTheme.textPrimary 
                    }]}
                    placeholder="To Time"
                    placeholderTextColor={currentTheme.textSecondary}
                  />
                </>
              )}

              {serviceType === 'vehicles' && (
                <>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Type: {selectedAction.type}
                  </Text>
                  <Text style={[styles.modalLabel, { color: currentTheme.textSecondary }]}>
                    Number: {selectedAction.number}
                  </Text>
                  <View style={styles.vehicleActions}>
                    <TouchableOpacity style={[styles.vehicleButton, { borderColor: currentTheme.border }]}>
                      < Ionicons name="create-outline" size={20} color={currentTheme.iconColor} />
                      <Text style={[styles.vehicleButtonText, { color: currentTheme.textPrimary }]}>
                        Edit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.vehicleButton, { borderColor: '#EF4444' }]}>
                      < Ionicons name="trash-outline" size={20} color="#EF4444" />
                      <Text style={[styles.vehicleButtonText, { color: '#EF4444' }]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <LinearGradient
              colors={currentTheme.gradient}
              style={styles.submitButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <TouchableOpacity
                style={styles.submitButtonInner}
                onPress={() => {
                  setModalVisible(false);
                  // Handle submission
                }}
              >
                <Text style={styles.submitButtonText}>
                  {serviceType === 'vehicles' ? 'Close' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    );
  };

  const renderServiceCard = (item) => {
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.card, { backgroundColor: currentTheme.cardBackground }]}
        activeOpacity={0.7}
        onPress={() => handleActionPress(item)}
      >
        <View style={styles.cardContent}>
          <LinearGradient
            colors={currentTheme.gradient}
            style={styles.cardIcon}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            < Ionicons name={item.icon} size={24} color="#FFFFFF" />
          </LinearGradient>
          
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: currentTheme.textPrimary }]}>
              {item.title || item.name}
            </Text>
            <Text style={[styles.cardSubtitle, { color: currentTheme.textSecondary }]}>
              {item.status || item.category || item.slots || item.number}
            </Text>
          </View>

          < Ionicons name="chevron-forward" size={20} color={currentTheme.textSecondary} />
        </View>

        {(item.time || item.duration) && (
          <View style={styles.cardFooter}>
            < Ionicons name="time-outline" size={14} color={currentTheme.textSecondary} />
            <Text style={[styles.cardFooterText, { color: currentTheme.textSecondary }]}>
              {item.time || item.duration}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // If no serviceType is provided (when used in HomeScreen), return null or a placeholder
  if (!serviceType) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.cardBackground }]}>
        {/* Only show back button if navigation exists */}
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            < Ionicons name="arrow-back" size={24} color={currentTheme.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={[styles.headerTitle, { color: currentTheme.textPrimary }]}>
            {content.title}
          </Text>
          <Text style={[styles.headerSubtitle, { color: currentTheme.textSecondary }]}>
            {content.subtitle}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <LinearGradient
            colors={currentTheme.gradient}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            < Ionicons name="add" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {content.data.map((item) => renderServiceCard(item))}
        </View>
      </ScrollView>

      {/* Action Modal */}
      {renderActionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cardFooterText: {
    fontSize: 12,
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  attachText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  vehicleActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  vehicleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  vehicleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonInner: {
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ServiceActionPage;