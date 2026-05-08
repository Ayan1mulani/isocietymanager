import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FastImage from "@d11/react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import ImageZoom from "react-native-image-pan-zoom"; // 🚀 Added for Zoom
import { visitorServices } from "../../services/visitorServices";
import { usePermissions } from "../../Utils/ConetextApi";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const { width, height } = Dimensions.get("window");

const SIDE_PADDING = 20;
const SPACING = 14;
const ITEM_WIDTH_MULTI = width - SIDE_PADDING * 2 - 40;
const ITEM_WIDTH_SINGLE = width - SIDE_PADDING * 2;
const SNAP_INTERVAL = ITEM_WIDTH_MULTI + SPACING;
const CARD_HEIGHT = 120;

/* ─── Shimmer Placeholder ─── */
const ShimmerCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  return (
    <Animated.View style={[styles.shimmerCard, { opacity }]}>
      <LinearGradient colors={["#E5E7EB", "#F3F4F6", "#E5E7EB"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
};

/* ─── Animated Dot ─── */
const AnimatedDot = ({ index, scrollX, theme }) => {
  const inputRange = [(index - 1) * SNAP_INTERVAL, index * SNAP_INTERVAL, (index + 1) * SNAP_INTERVAL];
  const dotWidth = scrollX.interpolate({ inputRange, outputRange: [6, 22, 6], extrapolate: "clamp" });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.35, 1, 0.35], extrapolate: "clamp" });
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1.15, 0.8], extrapolate: "clamp" });
  return (
    <Animated.View style={[styles.dot, { width: dotWidth, opacity, transform: [{ scaleY: scale }], backgroundColor: theme.textMain, borderRadius: 4 }]} />
  );
};

const CarouselSection = ({ refreshTrigger }) => {
  const { t } = useTranslation();
  const { nightMode } = usePermissions();
  const flatListRef = useRef(null);
  const activeIndexRef = useRef(0);
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const theme = {
    background: nightMode ? "#111827" : "#FFFFFF",
    textMain: nightMode ? "#F9FAFB" : "#111827",
    pillBg: nightMode ? "#1E293B" : "#F8FAFC", 
    pillBorder: nightMode ? "#334155" : "#E2E8F0", 
  };

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await visitorServices.getSocietyImages();
      if (res?.status === "success" && Array.isArray(res?.data)) {
        const formatted = res.data.map((url, index) => ({ id: index.toString(), uri: url }));
        setImages(formatted);
        FastImage.preload(res.data.map((url) => ({ uri: url })));
      }
    } catch (error) {
      console.log("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchImages(); }, [refreshTrigger]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      const next = (activeIndexRef.current + 1) % images.length;
      flatListRef.current?.scrollToOffset({ offset: next * SNAP_INTERVAL, animated: true });
      activeIndexRef.current = next;
    }, 4500);
    return () => clearInterval(interval);
  }, [images.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) activeIndexRef.current = viewableItems[0].index ?? 0;
  }, []);

  if (images.length === 0 && !loading) return null;

  return (
    <View style={[styles.sectionWrapper, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.shimmerRow}>{[0, 1].map((i) => <ShimmerCard key={i} />)}</View>
      ) : (
        <Animated.FlatList
          ref={flatListRef}
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          snapToInterval={images.length === 1 ? width : SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => setFullScreenImage(item.uri)}
              style={[styles.card, { width: images.length === 1 ? ITEM_WIDTH_SINGLE : ITEM_WIDTH_MULTI }]}
            >
              <FastImage source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode={FastImage.resizeMode.cover} />
            </TouchableOpacity>
          )}
        />
      )}

      {!loading && images.length > 1 && (
        <View style={styles.paginationWrapper}>
          <View style={[styles.paginationPill, { backgroundColor: theme.pillBg, borderColor: theme.pillBorder, borderWidth: 1 }]}>
            {images.map((_, index) => <AnimatedDot key={index} index={index} scrollX={scrollX} theme={theme} />)}
          </View>
        </View>
      )}

      {/* ─── NATIVE ZOOM MODAL ─── */}
      <Modal visible={!!fullScreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(null)}>
        <View style={styles.modalBackground}>
          <SafeAreaView style={{ flex: 1 }}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setFullScreenImage(null)}>
              <Ionicons name="close" size={30} color="#FFF" />
            </TouchableOpacity>

            {fullScreenImage && (
              <ImageZoom
                cropWidth={width}
                cropHeight={height}
                imageWidth={width}
                imageHeight={height}
                minScale={1}
                maxScale={5}
                enableSwipeDown={true}
                onSwipeDown={() => setFullScreenImage(null)}
              >
                <FastImage
                  source={{ uri: fullScreenImage }}
                  style={{ width: width, height: height }}
                  resizeMode={FastImage.resizeMode.contain}
                />
              </ImageZoom>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

export default CarouselSection;

const styles = StyleSheet.create({
  sectionWrapper: { paddingTop: 30 },
  card: { height: CARD_HEIGHT, borderRadius: 18, overflow: "hidden", elevation: 4, backgroundColor: "#E5E7EB" },
  shimmerRow: { flexDirection: "row", paddingHorizontal: SIDE_PADDING, gap: SPACING },
  shimmerCard: { width: ITEM_WIDTH_MULTI, height: CARD_HEIGHT, borderRadius: 22, overflow: "hidden", backgroundColor: "#E5E7EB" },
  paginationWrapper: { alignItems: "center", marginTop: 15 },
  paginationPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, gap: 6 },
  dot: { height: 6 },
  modalBackground: { flex: 1, backgroundColor: "#000" },
  closeButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 25,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});