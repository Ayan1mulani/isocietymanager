import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { visitorServices } from "../../services/visitorServices";

const { width } = Dimensions.get("window");

// ── FIXED MATH TO MATCH 20px STANDARD ──
const SIDE_PADDING = 20; // Aligns perfectly with your headers
const SPACING = 15;      // Gap between images
// Leaves room for the side padding, plus an extra 30px so the next image "peeks" in
const ITEM_WIDTH = width - (SIDE_PADDING * 2) - 30; 
const SNAP_INTERVAL = ITEM_WIDTH + SPACING;

const CarouselSection = () => {

  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     FETCH SOCIETY IMAGES
  =============================== */
  const fetchImages = async () => {
    try {
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!userInfo) {
        console.log("User not logged in yet");
        return;
      }

      const res = await visitorServices.getSocietyImages();
      console.log("SOC IMAGE RESPONSE:", res);

      if (res?.status === "success" && Array.isArray(res?.data)) {
        const formatted = res.data.map((url, index) => ({
          id: index.toString(),
          uri: url
        }));
        setImages(formatted);
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

  /* ===============================
     AUTO SLIDE (only if >1 image)
  =============================== */
  useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % images.length;

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true
      });

      setActiveIndex(nextIndex);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeIndex, images]);

  /* ===============================
     VIEW CHANGE
  =============================== */
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({
    viewAreaCoveragePercentThreshold: 50
  }).current;

  /* ===============================
     LOADING
  =============================== */
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="small" color="#074B7C" />
      </View>
    );
  }

  if (images.length === 0) return null;

  /* ===============================
     UI
  =============================== */
  return (
    <View style={styles.container}>
      
      {/* ── Standardized Header Added ── */}
      <View style={styles.sectionHeader}>
        <Ionicons
          name="camera"
          size={20}
          color="#374151"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.headerText}>Society Snapshot</Text>
      </View>

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

        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.uri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {/* PAGINATION DOTS */}
      {/* {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: activeIndex === index ? "#074B7C" : "#E5E7EB",
                  width: activeIndex === index ? 20 : 8
                }
              ]}
            />
          ))}
        </View>
      )} */}

    </View>
  );
};

export default CarouselSection;

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  
  // ── New Header Styles matching your app ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20, // Matches the 20px padding of the images below it
    marginTop: 25,        // Standardized gap between sections
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },

  loader: {
    height: 120,
    justifyContent: "center",
    alignItems: "center"
  },
  imageContainer: {
    width: ITEM_WIDTH, 
    height: 140, // Bumped slightly to make the images look more premium
    borderRadius: 16, // Made slightly rounder for a modern look
    overflow: "hidden",
    elevation: 2, // Added a tiny shadow
    backgroundColor: "#f0f0f0",
  },
  image: {
    width: "100%",
    height: "100%"
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12
  },
  dot: {
    height: 6, // Slightly slimmer dots
    borderRadius: 3,
    marginHorizontal: 4
  }
});