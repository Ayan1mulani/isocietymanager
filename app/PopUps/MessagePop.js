// components/ErrorPopupModal.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const ErrorPopupModal = ({ 
  visible, 
  onClose, 
  title = "Error", 
  message, 
  type = "error", // error, warning, info, success
  buttonText = "OK",
  autoClose = false,
  autoCloseDuration = 3000 
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        setTimeout(() => {
          onClose();
        }, autoCloseDuration);
      }
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'error':
        return { name: 'error', color: '#EF4444', bgColor: '#FEF2F2' };
      case 'warning':
        return { name: 'warning', color: '#F59E0B', bgColor: '#FFFBEB' };
      case 'info':
        return { name: 'info', color: '#3B82F6', bgColor: '#EFF6FF' };
      case 'success':
        return { name: 'check-circle', color: '#10B981', bgColor: '#F0FDF4' };
      default:
        return { name: 'error', color: '#EF4444', bgColor: '#FEF2F2' };
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'info':
        return '#074B7C';
      case 'success':
        return '#10B981';
      default:
        return '#074B7C';
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: opacityAnim }
        ]}
      >
        <Animated.View 
          style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
            <Icon 
              name={iconConfig.name} 
              size={32} 
              color={iconConfig.color} 
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: getButtonColor() }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default ErrorPopupModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  container: {
    width: width * 0.85,
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});