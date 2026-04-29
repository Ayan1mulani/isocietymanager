import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import FastImage from "@d11/react-native-fast-image";
import LinearGradient from "react-native-linear-gradient";
import { visitorServices } from "../../services/visitorServices";
import { usePermissions } from "../../Utils/ConetextApi";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const { width } = Dimensions.get("window");

const SIDE_PADDING = 20;
const SPACING = 14;
// Width when multiple images (leaves space on right for the next card)
const ITEM_WIDTH_MULTI = width - SIDE_PADDING * 2 - 40;
// Width when only 1 image (takes full available space)
const ITEM_WIDTH_SINGLE = width - SIDE_PADDING * 2;

const SNAP_INTERVAL = ITEM_WIDTH_MULTI + SPACING;
const CARD_HEIGHT = 120;

/* ─── Shimmer Placeholder ─── */
const ShimmerCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View style={[styles.shimmerCard, { opacity }]}>
      <LinearGradient
        colors={["#E5E7EB", "#F3F4F6", "#E5E7EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
};

/* ─── Animated Dot ─── */
const AnimatedDot = ({ index, scrollX, theme }) => {
  const inputRange = [
    (index - 1) * SNAP_INTERVAL,
    index * SNAP_INTERVAL,
    (index + 1) * SNAP_INTERVAL,
  ];

  const dotWidth = scrollX.interpolate({
    inputRange,
    outputRange: [6, 22, 6],
    extrapolate: "clamp",
  });

  const opacity = scrollX.interpolate({
    inputRange,
    outputRange: [0.35, 1, 0.35],
    extrapolate: "clamp",
  });

  const scale = scrollX.interpolate({
    inputRange,
    outputRange: [0.8, 1.15, 0.8],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: dotWidth,
          opacity,
          transform: [{ scaleY: scale }],
          backgroundColor: theme.textMain,
          borderRadius: 4,
        },
      ]}
    />
  );
};

const CarouselSection = () => {
  const { t } = useTranslation();
  const { nightMode } = usePermissions();
  const flatListRef = useRef(null);
  const activeIndexRef = useRef(0);
  
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenImage, setFullScreenImage] = useState(null); // State for full screen modal

  const scrollX = useRef(new Animated.Value(0)).current;

  const theme = {
    background: nightMode ? "#111827" : "#FFFFFF",
    textMain: nightMode ? "#F9FAFB" : "#111827",
    textSub: nightMode ? "#9CA3AF" : "#6B7280",
    pillBg: nightMode ? "#1E293B" : "#F8FAFC", 
    pillBorder: nightMode ? "#334155" : "#E2E8F0", 
  };

  const fetchImages = async () => {
    try {
      const res = await visitorServices.getSocietyImages();
      if (res?.status === "success" && Array.isArray(res?.data)) {
        const formatted = res.data.map((url, index) => ({
          id: index.toString(),
          uri: url,
        }));
        setImages(formatted);
        FastImage.preload(res.data.map((url) => ({ uri: url })));
      }
    } catch (error) {
      console.log("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      const next = (activeIndexRef.current + 1) % images.length;
      flatListRef.current?.scrollToOffset({
        offset: next * SNAP_INTERVAL,
        animated: true,
      });
      activeIndexRef.current = next;
    }, 4500);

    return () => clearInterval(interval);
  }, [images.length]);

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      activeIndexRef.current = idx;
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (images.length === 0 && !loading) return null;

  const isSingleImage = images.length === 1;

  return (
    <View style={[styles.sectionWrapper, { backgroundColor: theme.background }]}>
      {loading ? (
        <View style={styles.shimmerRow}>
          {[0, 1].map((i) => (
            <ShimmerCard key={i} />
          ))}
        </View>
      ) : (
        <Animated.FlatList
          ref={flatListRef}
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          snapToInterval={isSingleImage ? width : SNAP_INTERVAL} // Disable snapping for single image
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => setFullScreenImage(item.uri)}
              style={[
                styles.card, 
                // ✨ Dynamic width: full width if 1 image, cropped width if multiple
                { width: isSingleImage ? ITEM_WIDTH_SINGLE : ITEM_WIDTH_MULTI }
              ]}
            >
              <FastImage
                source={{
                  uri: item.uri,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />
            </TouchableOpacity>
          )}
        />
      )}

      {!loading && images.length > 1 && (
        <View style={styles.paginationWrapper}>
          <View style={[styles.paginationPill, {
            backgroundColor: theme.pillBg,
            borderColor: theme.pillBorder,
            borderWidth: 1
          }]}>
            {images.map((_, index) => (
              <AnimatedDot
                key={index}
                index={index}
                scrollX={scrollX}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      {/* 🔴 Full Screen Image Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
        statusBarTranslucent
      >
        <View style={styles.modalBackground}>
          <SafeAreaView style={styles.modalSafeArea}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setFullScreenImage(null)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            
            {fullScreenImage && (
              <FastImage
                source={{ uri: fullScreenImage }}
                style={styles.fullScreenImage}
                resizeMode={FastImage.resizeMode.contain}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>

    </View>
  );
};

export default CarouselSection;

const styles = StyleSheet.create({
  sectionWrapper: {
    paddingTop: 30,
  },

  /* Card */
  card: {
    height: CARD_HEIGHT,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    backgroundColor: "#E5E7EB",
  },

  /* Shimmer */
  shimmerRow: {
    flexDirection: "row",
    paddingHorizontal: SIDE_PADDING,
    gap: SPACING,
  },
  shimmerCard: {
    width: ITEM_WIDTH_MULTI,
    height: CARD_HEIGHT,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },

  /* Pagination */
  paginationWrapper: {
    alignItems: "center",
    marginTop: 15,
  },
  paginationPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 4,
  },

  /* Full Screen Modal */
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  modalSafeArea: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullScreenImage: {
    width: "100%",
    height: "100%",
  },
});