import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Added for fast caching
import SlidingTabs from "../../app/components/SlidingTabs";
import MyStaffScreen from "./MyStaffScreen";
import SearchStaffScreen from "./SearchStaffScreen";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { otherServices } from "../../services/otherServices";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get("window");
const getCacheKey = (userId) => `@staff_categories_cache_${userId}`;

const StaffScreen = () => {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const navigation = useNavigation();
  const route = useRoute();

  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (route?.params?.tabIndex !== undefined) {
      const index = route.params.tabIndex;
      setActiveIndex(index);

      flatListRef.current?.scrollToOffset({
        offset: index * width,
        animated: true,
      });

      navigation.setParams({ tabIndex: undefined });
    }
  }, [route?.params?.tabIndex]);

  const loadCategories = async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
      const userId = userInfo?.id || userInfo?.user_id || "default";
      const CACHE_KEY = getCacheKey(userId);
      // 1. Check local storage first for an instant load
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setCategories(JSON.parse(cachedData));
        setCategoriesLoading(false); // Turn off loader instantly!
      }

      // 2. Fetch fresh data from API
      const res = await otherServices.getStaffCategories();

      if (res?.status === "success") {
        const uniqueCategories = [
          ...new Set(res.data.map(item => item.name))
        ];

        setCategories(uniqueCategories);
        
        // 3. Save the fresh data to cache for next time
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(uniqueCategories));
      }

    } catch (error) {
      console.log("Category Load Error:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleTabPress = (index) => {
    setActiveIndex(index);

    flatListRef.current?.scrollToOffset({
      offset: index * width,
      animated: true,
    });
  };

  // --- SKELETON LOADER UI FOR "FIND STAFF" TAB ---
  const renderSearchSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {/* Fake Search Bar */}
      <View style={styles.skeletonSearchBar} />
      
      {/* Fake Category Chips */}
      <View style={styles.skeletonChipsRow}>
        <View style={[styles.skeletonChip, { width: 80 }]} />
        <View style={[styles.skeletonChip, { width: 100 }]} />
        <View style={[styles.skeletonChip, { width: 70 }]} />
      </View>

      {/* Fake Staff List Items */}
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={styles.skeletonListItem}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonTextContainer}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t("Staff Management")} />

      <SlidingTabs
        tabs={[t("Assigned"), t("Find Staff")]}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
        scrollX={scrollX} 
      />

      <Animated.FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={[0, 1]}
        keyExtractor={(item) => item.toString()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          );
          setActiveIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>
            {item === 0 ? (
              <MyStaffScreen />
            ) : categoriesLoading ? (
              // Show skeleton if network is fetching and no cache exists
              renderSearchSkeleton() 
            ) : (
              <SearchStaffScreen
                categories={categories}
                categoriesLoading={categoriesLoading}
              />
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default StaffScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // Skeleton Styles
  skeletonContainer: {
    flex: 1,
    padding: 16,
  },
  skeletonSearchBar: {
    width: '100%',
    height: 45,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 20,
  },
  skeletonChipsRow: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 10,
  },
  skeletonChip: {
    height: 32,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
  },
  skeletonListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    marginRight: 16,
  },
  skeletonTextContainer: {
    flex: 1,
  },
  skeletonTitle: {
    width: '70%',
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: '40%',
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
});