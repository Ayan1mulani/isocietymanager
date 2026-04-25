import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
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
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

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

const CarouselSection = () => {
  const { nightMode } = usePermissions();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Clean Theme Palette ──
  const theme = {
    background: nightMode ? "#111827" : "#FFFFFF",
    textMain: nightMode ? "#F9FAFB" : "#111827",
    textSub: nightMode ? "#9CA3AF" : "#6B7280",
    pillBg: nightMode ? "#374151" : "#F3F4F6",
    iconBadgeBg: nightMode ? "#374151" : "#111827",
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
      const nextIndex = (activeIndex + 1) % images.length;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeIndex, images]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (images.length === 0 && !loading) return null;

  return (
    <View style={[styles.sectionWrapper, { backgroundColor: theme.background }]}>

      {/* ── Header ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBadge]}>
            <Ionicons name="albums" size={20} color="'#111827"style={{ marginRight: 8 }} />
          </View>
          <Text style={[styles.headerText, { color: theme.textMain }]}>
            Society Snapshot
          </Text>
        </View>


      </View>

      {/* ── Shimmer or Real List ── */}
      {loading ? (
        <View style={styles.shimmerRow}>
          {[0, 1].map((i) => <ShimmerCard key={i} />)}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          snapToInterval={SNAP_INTERVAL}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfig}
          getItemLayout={(_, index) => ({
            length: SNAP_INTERVAL,
            offset: SNAP_INTERVAL * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={styles.card}>

              {/* Image */}
              <FastImage
                source={{
                  uri: item.uri,
                  priority: FastImage.priority.high,
                  cache: FastImage.cacheControl.immutable,
                }}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />

              {/* Bottom gradient overlay */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.5)"]}
                style={styles.gradientOverlay}
              />

              {/* Index badge */}
              <View style={styles.indexBadge}>
                <Text style={styles.indexBadgeText}>
                  {index + 1}/{images.length}
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
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index
                    ? [styles.dotActive, { backgroundColor: theme.textMain }]
                    : [styles.dotInactive, { backgroundColor: theme.textSub, opacity: 0.4 }],
                ]}
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
    paddingTop:30
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
  headerPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  headerPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
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
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
  },
  dotInactive: {
    width: 6,
  },
});