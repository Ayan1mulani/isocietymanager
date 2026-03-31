import React, { useRef, useEffect, useState } from "react";
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { visitorServices } from "../../services/visitorServices";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width - 64;
const SPACING = 16;
const SNAP_INTERVAL = ITEM_WIDTH + SPACING;
const SIDE_PADDING = (width - ITEM_WIDTH) / 2 - SPACING / 2; // ✅ corrected

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

      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}

        snapToInterval={SNAP_INTERVAL}      // ✅
        snapToAlignment="start"             // ✅ works correctly with manual padding
        decelerationRate="fast"

        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }} // ✅

        ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}

        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}

        // ✅ required for scrollToIndex to work properly
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
      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor: activeIndex === index ? "#074B7C" : "#ccc",
                  width: activeIndex === index ? 20 : 8
                }
              ]}
            />
          ))}
        </View>
      )}

    </View>
  );
};

export default CarouselSection;

const styles = StyleSheet.create({
  container: {
    marginTop: 10
  },
  loader: {
    height: 120,
    justifyContent: "center",
    alignItems: "center"
  },
  imageContainer: {
    width: ITEM_WIDTH,  // ✅ use constant instead of recalculating
    height: 120,
    borderRadius: 12,
    overflow: "hidden"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4
  }
});