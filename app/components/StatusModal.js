import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal,
  TouchableOpacity,
  Easing,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const StatusModal = ({
  visible,
  type = "loading", // loading | success | error
  title,
  subtitle,
  onClose,
  autoClose = true,
}) => {
  const [internalVisible, setInternalVisible] = useState(visible);

  // Modal container animations
  const opacity     = useRef(new Animated.Value(0)).current;
  const scale       = useRef(new Animated.Value(0.85)).current;
  const translateY  = useRef(new Animated.Value(20)).current;

  // Icon animations
  const rotation    = useRef(new Animated.Value(0)).current;
  // FIX 4: Always start at 0 regardless of initial type — the type effect handles the correct initial state
  const iconScale   = useRef(new Animated.Value(0)).current;

  const rotationAnim  = useRef(null);
  const closeTimeout  = useRef(null);
  const isClosing     = useRef(false); // Guard against overlapping close calls

  // FIX 3: Stable handleClose via useCallback so effects always call the latest version
  const handleClose = useCallback(() => {
    if (isClosing.current) return; // Prevent double-trigger
    isClosing.current = true;

    if (rotationAnim.current) rotationAnim.current.stop();
    if (closeTimeout.current) clearTimeout(closeTimeout.current);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 10,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // FIX 1: Reset ALL animated values (including opacity) so next open starts clean
      opacity.setValue(0);
      scale.setValue(0.85);
      translateY.setValue(20);
      iconScale.setValue(0);
      isClosing.current = false;

      setInternalVisible(false);
      if (onClose) onClose();
    });
  }, [onClose, opacity, scale, translateY, iconScale]);

  // FIX 2: Separate effect — ONLY handles open/close transitions, never re-runs on type change
  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      setInternalVisible(true);

      // FIX 1: Explicitly reset before animating in, in case prior close was interrupted
      opacity.setValue(0);
      scale.setValue(0.85);
      translateY.setValue(20);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      handleClose();
    }

    return () => {
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, [visible]); // FIX 2: 'type' intentionally removed — handled by its own effect below

  // FIX 2: Separate effect — ONLY handles icon animation when type changes (or on mount)
  useEffect(() => {
    if (type === "loading") {
      rotation.setValue(0);
      iconScale.setValue(1); // Spinner is always visible, no pop needed

      rotationAnim.current = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotationAnim.current.start();
    } else {
      // Stop any ongoing rotation and "pop" the result icon in
      if (rotationAnim.current) rotationAnim.current.stop();

      iconScale.setValue(0);
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // Auto-close on success only after the icon has popped in
      if (type === "success" && autoClose && visible) {
        closeTimeout.current = setTimeout(() => {
          handleClose();
        }, 2000);
      }
    }

    return () => {
      if (rotationAnim.current) rotationAnim.current.stop();
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
    };
  }, [type]); // FIX 2: 'visible' intentionally removed — handled by its own effect above

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const renderIcon = () => {
    if (type === "success") {
      return (
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="checkmark-circle" size={64} color="#22C55E" />
        </Animated.View>
      );
    }
    if (type === "error") {
      return (
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons name="close-circle" size={64} color="#EF4444" />
        </Animated.View>
      );
    }
    return (
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="sync" size={56} color="#1996D3" />
      </Animated.View>
    );
  };

  if (!internalVisible) return null;

  return (
    <Modal transparent visible={internalVisible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.box,
            { opacity, transform: [{ scale }, { translateY }] },
          ]}
        >
          {renderIcon()}

          {title && <Text style={styles.title}>{title}</Text>}

          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {type === "error" && (
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose} activeOpacity={0.8}>
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default StatusModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: 290,
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
    lineHeight: 20,
  },
  closeBtn: {
    marginTop: 24,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});