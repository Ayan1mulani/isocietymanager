import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
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
const ITEM_WIDTH = width - SIDE_PADDING * 2 - 40;
const SNAP_INTERVAL = ITEM_WIDTH + SPACING;
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
/**
 * Each dot interpolates its own width and opacity directly from the shared
 * scrollX Animated.Value, so animations are perfectly in sync with the finger.
 */
const AnimatedDot = ({ index, scrollX, total, theme }) => {
  // Input range: one full page before, this page, one full page after
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

  // Scale for a subtle "pop" feel on the active dot
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
  const activeIndexRef = useRef(0);           // shadow ref — avoids stale closure in timer
  const [activeIndex, setActiveIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single Animated.Value that tracks horizontal scroll offset
  const scrollX = useRef(new Animated.Value(0)).current;

  const theme = {
    background: nightMode ? "#111827" : "#FFFFFF",
    textMain: nightMode ? "#F9FAFB" : "#111827",
    textSub: nightMode ? "#9CA3AF" : "#6B7280",
    pillBg: nightMode ? "#374151" : "#F3F4F6",
  };

  /* ── Fetch ── */
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

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      const next = (activeIndexRef.current + 1) % images.length;
      flatListRef.current?.scrollToOffset({
        offset: next * SNAP_INTERVAL,
        animated: true,
      });
      // State update handled by onViewableItemsChanged; ref updated here for timer
      activeIndexRef.current = next;
    }, 4500);

    return () => clearInterval(interval);
  }, [images.length]);

  /* ── Viewability ── */
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const idx = viewableItems[0].index ?? 0;
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const formatNumber = (num) => num.toString();

  if (images.length === 0 && !loading) return null;

  return (
    <View style={[styles.sectionWrapper, { backgroundColor: theme.background }]}>

      {/* ── Header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Ionicons name="albums" size={20} color="#111827" />
          </View>
          <Text style={[styles.headerText, { color: theme.textMain }]}>
            {t("Society Snapshot")}
          </Text>
        </View>
      </View>

      {/* ── List ── */}
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
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum={true}
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          // Drive scrollX from native thread — zero JS overhead while swiping
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }   // width interpolation needs JS driver
          )}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <FastImage
                source={{
                  uri: item.uri,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={styles.gradientOverlay}
              />
              <View style={styles.indexBadge}>
                <Text style={styles.indexBadgeText}>
                  {formatNumber(index + 1)}/{formatNumber(images.length)}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ── Pagination ── */}
      {!loading && images.length > 1 && (
        <View style={styles.paginationWrapper}>
          <View style={[styles.paginationPill, { backgroundColor: theme.pillBg }]}>
            {images.map((_, index) => (
              <AnimatedDot
                key={index}
                index={index}
                scrollX={scrollX}
                total={images.length}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

    </View>
  );
};

export default CarouselSection;

const styles = StyleSheet.create({
  sectionWrapper: {
    paddingTop: 30,
  },

  /* Header */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: SIDE_PADDING,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  /* Card */
  card: {
    width: ITEM_WIDTH,
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
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT * 0.9,
    zIndex: 1,
  },
  indexBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 3,
  },
  indexBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* Shimmer */
  shimmerRow: {
    flexDirection: "row",
    paddingHorizontal: SIDE_PADDING,
    gap: SPACING,
  },
  shimmerCard: {
    width: ITEM_WIDTH,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 4,
  },
});