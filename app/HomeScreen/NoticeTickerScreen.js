import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { ismServices } from "../../services/ismServices";
import Ionicons from "react-native-vector-icons/Ionicons";

// 1. ── NEW: Import your global Text component ──
import Text from '../components/TranslatedText'; // <--- ADJUST PATH IF NEEDED

const SCREEN_WIDTH = Dimensions.get("window").width;
const SPEED = 70; // adjust speed

const NoticeTickerScreen = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  useEffect(() => {
    loadNotices();
  }, []);

  useEffect(() => {
    if (!loading && textWidth > 0) {
      startTicker();
    }
  }, [textWidth, loading]);

  const loadNotices = async () => {
    try {
      const res = await ismServices.getMyNotices("TICKER");
      if (res?.status === "success") {
        setNotices(res.data || []);
      }
    } catch (error) {
      console.log("Notice API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cleanHtml = (html) => {
    if (!html) return "";
    return html
      .replace(/<[^>]+>/g, "")
      .replace(/\n/g, " ")
      .replace(/\r/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // 🔥 Combine all notices (like marquee)
  const tickerText =
    notices.length > 0
      ? notices.map((n) => cleanHtml(n.notice)).join("     •     ") + "     •     "
      : "";

  const startTicker = () => {
    translateX.setValue(SCREEN_WIDTH);

    const totalDistance = SCREEN_WIDTH + textWidth;
    const duration = (totalDistance / SPEED) * 1000;

    Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration,
        useNativeDriver: true,
      })
    ).start();
  };

  const openNotice = () => {
    if (notices.length > 0) {
      setSelectedNotice(notices[0]);
      setModalVisible(true);
    }
  };

  if (!loading && notices.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Ionicons name="megaphone" size={20} color="#000" style={{ marginRight: 6 }} />
        {/* 2. ── Automatically handled by global <Text> ── */}
        <Text style={styles.title}>Notices</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#1565A9" />
      ) : (
        <TouchableOpacity style={styles.tickerBox} onPress={openNotice}>

          {/* Hidden text for width */}
          <Text
            style={[styles.tickerText, styles.hiddenText]}
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          >
            {tickerText}
          </Text>

          {/* Animated ticker */}
          <Animated.View
            style={{
              flexDirection: "row", 
              position: "absolute",
              left: 0,
              transform: [{ translateX }],
            }}
          >
            <Text style={styles.tickerText}>
              {tickerText}
            </Text>
          </Animated.View>

        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{selectedNotice?.subject}</Text>

            <View style={styles.divider} />

            <ScrollView style={styles.scrollView}>
              <Text style={styles.modalText}>
                {cleanHtml(selectedNotice?.notice)}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              {/* 3. ── Automatically handled by global <Text> ── */}
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default NoticeTickerScreen;

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700", color: "#111827" },
  tickerBox: { height: 40, borderRadius: 13, backgroundColor: "#FCEEED", justifyContent: "center", borderWidth: 1, borderColor: "#F8D7DA", overflow: "hidden", flexDirection: "row", alignItems: "center" },
  tickerText: { fontSize: 14, color: "#1F2937", fontWeight: "500" },
  hiddenText: { position: "absolute", opacity: 0, top: -9999 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContainer: { backgroundColor: "#fff", borderRadius: 10, padding: 18, maxHeight: "80%" },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  divider: { height: 1, backgroundColor: "#eee", marginBottom: 12 },
  scrollView: { maxHeight: 300 },
  modalText: { fontSize: 14, lineHeight: 22 },
  closeButton: { marginTop: 16, alignSelf: "flex-end", backgroundColor: "#1565A9", paddingHorizontal: 20, paddingVertical: 9, borderRadius: 6 },
  closeText: { color: "#fff", fontWeight: "600" },
});