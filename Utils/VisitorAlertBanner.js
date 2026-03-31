
import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  Animated,
  DeviceEventEmitter,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { VISITOR_ALERT_EVENT } from "../Utils/PushNotifications"; // adjust path

// ─── Layout constants ─────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const BANNER_HEIGHT = 160;
const TOP_OFFSET = Platform.OS === "ios" ? 54 : 16;
const DISMISS_THRESHOLD = -60; // px swipe-up to dismiss
const AUTO_DISMISS_MS = 12_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (label, value) =>
  value ? (
    <Text style={styles.metaRow} numberOfLines={1}>
      <Text style={styles.metaLabel}>{label} </Text>
      <Text style={styles.metaValue}>{value}</Text>
    </Text>
  ) : null;

// ─── Component ────────────────────────────────────────────────────────────────
export default function VisitorAlertBanner() {
  const [payload, setPayload] = useState(null); // { visitor, notificationId }
  const translateY = useRef(new Animated.Value(-(BANNER_HEIGHT + TOP_OFFSET + 30))).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef(null);
  const visible = useRef(false);

  // ── Slide in ────────────────────────────────────────────────────────────────
  const show = useCallback((data) => {
    visible.current = true;
    setPayload(data);
    clearTimeout(autoDismissTimer.current);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: TOP_OFFSET,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    autoDismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
  }, []);

  // ── Slide out ────────────────────────────────────────────────────────────────
  const dismiss = useCallback(() => {
    if (!visible.current) return;
    clearTimeout(autoDismissTimer.current);

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -(BANNER_HEIGHT + TOP_OFFSET + 30),
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      visible.current = false;
      setPayload(null);
    });
  }, []);

  // ── Swipe-up to dismiss ───────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(TOP_OFFSET + g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < DISMISS_THRESHOLD) {
          dismiss();
        } else {
          Animated.spring(translateY, {
            toValue: TOP_OFFSET,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ── Event subscription ───────────────────────────────────────────────────
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(VISITOR_ALERT_EVENT, show);
    return () => {
      sub.remove();
      clearTimeout(autoDismissTimer.current);
    };
  }, [show]);

  if (!payload) return null;

  const { visitor } = payload;

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }], opacity }]}
      {...panResponder.panHandlers}
    >
      {/* ── Drag handle ── */}
      <View style={styles.handle} />

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Text style={styles.bellIcon}>🔔</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTitle}>Visitor Alert</Text>
          <Text style={styles.alertSub}>Someone is at the gate</Text>
        </View>
        <Pressable onPress={dismiss} hitSlop={12}>
          <Text style={styles.closeBtn}>✕</Text>
        </Pressable>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Visitor info ── */}
      <View style={styles.visitorRow}>
        {/* Photo */}
        {visitor.photo ? (
          <Image source={{ uri: visitor.photo }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>
              {(visitor.name || "?")[0].toUpperCase()}
            </Text>
          </View>
        )}

        {/* Details */}
        <View style={styles.details}>
          <Text style={styles.visitorName} numberOfLines={1}>
            {visitor.name || "Unknown Visitor"}
          </Text>
          {fmt("📞", visitor.phoneNumber)}
          {fmt("🎯", visitor.purpose)}
          {fmt("🕐", visitor.startTime)}
        </View>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.btn, styles.btnDeny]}
          onPress={() => {
            // TODO: call your deny API with visitor.id
            console.log("❌ Denied visitor:", visitor.id);
            dismiss();
          }}
        >
          <Text style={styles.btnDenyText}>Deny</Text>
        </Pressable>

        <Pressable
          style={[styles.btn, styles.btnApprove]}
          onPress={() => {
            // TODO: call your approve API with visitor.id
            console.log("✅ Approved visitor:", visitor.id);
            dismiss();
          }}
        >
          <Text style={styles.btnApproveText}>Approve</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RADIUS = 20;

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    zIndex: 9999,
    elevation: 20,
    alignSelf: "center",
    width: SCREEN_W - 24,
    backgroundColor: "#1C1C1E",
    borderRadius: RADIUS,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
  },

  // ── Drag handle
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#48484A",
    marginBottom: 10,
  },

  // ── Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2C2C2E",
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: { fontSize: 18 },
  alertTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  alertSub: {
    color: "#8E8E93",
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    color: "#636366",
    fontSize: 16,
    fontWeight: "600",
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#38383A",
    marginBottom: 12,
  },

  // ── Visitor
  visitorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2C2C2E",
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#3A3A3C",
  },
  avatarInitial: {
    color: "#EBEBF5",
    fontSize: 22,
    fontWeight: "700",
  },
  details: { flex: 1, justifyContent: "center", gap: 2 },
  visitorName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  metaRow: { flexDirection: "row" },
  metaLabel: { color: "#8E8E93", fontSize: 12 },
  metaValue: { color: "#EBEBF5", fontSize: 12, flexShrink: 1 },

  // ── Buttons
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDeny: {
    backgroundColor: "#2C2C2E",
    borderWidth: 1,
    borderColor: "#FF453A33",
  },
  btnDenyText: {
    color: "#FF453A",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnApprove: {
    backgroundColor: "#30D158",
  },
  btnApproveText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});