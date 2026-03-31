import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native";
import SlidingTabs from "../../app/components/SlidingTabs";
import MyStaffScreen from "./MyStaffScreen";
import SearchStaffScreen from "./SearchStaffScreen";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { otherServices } from "../../services/otherServices";
import { useRoute, useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const StaffScreen = () => {
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

    const res = await otherServices.getStaffCategories();

    if (res?.status === "success") {

      const uniqueCategories = [
        ...new Set(res.data.map(item => item.name))
      ];

      setCategories(uniqueCategories);
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

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title="Staff Management" />

      <SlidingTabs
        tabs={["Assigned", "Find Staff"]}
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
});