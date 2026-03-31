import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
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

const SCREEN_WIDTH = Dimensions.get("window").width;

const NoticeTickerScreen = () => {

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const animationRef = useRef(null);

  useEffect(() => {
    loadNotices();
  }, []);

  // ✅ Start ticker only after loading is done and textWidth is measured
  useEffect(() => {
    if (!loading && textWidth > 0) {
      startTicker();
    }
    return () => {
      // Cleanup animation on unmount
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [loading, textWidth]);

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

  const startTicker = () => {
    // Stop any existing animation first
    if (animationRef.current) {
      animationRef.current.stop();
    }

    translateX.setValue(SCREEN_WIDTH);

    // ✅ Use actual measured text width so long text fully scrolls off screen
    const totalDistance = SCREEN_WIDTH + textWidth;
    const duration = (totalDistance / 80) * 1000; // 80px per second

    animationRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration,
        useNativeDriver: true,
      })
    );

    animationRef.current.start();
  };

  const cleanHtml = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "").trim();
  };

  const openNotice = (notice) => {
    setSelectedNotice(notice);
    setModalVisible(true);
  };

  const tickerText =
    notices.length > 0
      ? notices.map((n) => cleanHtml(n.notice)).join("     •     ")
      : "No notices available";


  if (!loading && notices.length === 0) {
    return null; // 🔥 renders nothing, takes zero space
  }
  return (
    <View style={styles.container}>

      {/* Title */}

      <View style={styles.titleRow}>
        <Ionicons
          name="megaphone"
          size={20}
          color="#000000"
          style={{ marginRight: 6 }}
        />
        <Text style={styles.title}>Notices</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="#1565A9" />
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.tickerBox}
          onPress={() => notices.length > 0 && openNotice(notices[0])}
        >
          {/* ✅ Hidden text to measure actual width before animation starts */}
          <Text
            numberOfLines={1}
            style={[styles.tickerText, styles.hiddenText]}
            onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          >
            {tickerText}
          </Text>

          <Animated.Text
            numberOfLines={1}
            style={[
              styles.tickerText,
              { transform: [{ translateX }] },
            ]}
          >
            {tickerText}
          </Animated.Text>
        </TouchableOpacity>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            <Text style={styles.modalTitle}>
              {selectedNotice?.subject}
            </Text>

            <View style={styles.divider} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
            >
              <Text style={styles.modalText}>
                {cleanHtml(selectedNotice?.notice)}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
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

  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

title: {
  fontSize: 18,
  fontWeight: "600",
  color: "#111827",
  includeFontPadding: false,  
  textAlignVertical: "center", 
},

  tickerBox: {
    height: 40,
    borderRadius: 6,
    backgroundColor: "#f1e3e3",
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 10,
  },

  tickerText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "500",
  },

  // ✅ Invisible text used only to measure width — positioned off screen
  hiddenText: {
    position: "absolute",
    opacity: 0,
    top: -9999,
    left: 0,
    right: 0,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 18,
    maxHeight: "80%",
  },
  titleRow: {
  flexDirection: "row",
  alignItems: "center",
   marginBottom: 12,
},

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F2F4",
    marginBottom: 12,
  },

  scrollView: {
    maxHeight: 300,
  },

  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
  },

  closeButton: {
    marginTop: 16,
    alignSelf: "flex-end",
    backgroundColor: "#1565A9",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 6,
  },

  closeText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 13,
  },

});