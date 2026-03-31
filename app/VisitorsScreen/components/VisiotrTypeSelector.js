import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const COLORS = {
  primary: '#1996D3',
  error: '#FF3B30',
};

const VisitorTypeModal = ({
  visible,
  onClose,
  onSelect,
  theme,
}) => {
  const options = [
    { label: 'Guest', icon: 'people-outline', type: 'guest' },
    { label: 'Delivery', icon: 'cube-outline', type: 'delivery' },
    { label: 'Cab', icon: 'car-outline', type: 'cab' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.surface },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Select Visitor Type
            </Text>

            <TouchableOpacity onPress={onClose}>
              < Ionicons
                name="close"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          {/* Row Options */}
          <View style={styles.rowContainer}>
            {options.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.optionCard}
                onPress={() => onSelect(item.type)}
                activeOpacity={0.8}
              >
                <View style={styles.iconCircle}>
                  < Ionicons
                    name={item.icon}
                    size={26}
                    color={COLORS.primary}
                  />
                </View>

                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default VisitorTypeModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    borderRadius: 18,
    padding: 20,
  },

  // Header row
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  title: {
    fontSize: 17,
    fontWeight: '600',
  },

  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  optionCard: {
    alignItems: 'center',
    flex: 1,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(25,150,211,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});