import React, { useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity
} from "react-native";

import SlidingTabs from "../components/SlidingTabs";
import MeterReadingTab from "./MeterReadingTab";
import MeterChartTab from "./MeterChartTab";
import AppHeader from "../components/AppHeader";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";

const screenWidth = Dimensions.get("window").width;

const MeterScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);

  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleTabPress = (index) => {
    if (index === activeTab) return;
    
    setActiveTab(index); // Instantly updates text color

    const scrollView = scrollRef.current?.getNode 
      ? scrollRef.current.getNode() 
      : scrollRef.current;

    // Smooth scroll triggers instantly because the heavy charts are memoized below
    scrollView?.scrollTo({
      x: index * screenWidth,
      animated: true,
    });
  };

  // 🔥 THE FIX: Memoize the heavy content so it doesn't re-render and freeze 
  // the app every time you switch tabs.
  const renderTabContent = useMemo(() => (
    <>
      <View style={{ width: screenWidth }}>
        <MeterReadingTab />
      </View>
      <View style={{ width: screenWidth }}>
        <MeterChartTab />
      </View>
    </>
  ), []); // Empty array means it only renders once on mount

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <AppHeader
        title={t("Energy Consumption")}
        onBack={() => navigation.goBack()}
        rightIcon={
          <TouchableOpacity
            onPress={() => navigation.navigate("ExportMeter")}
            style={{ padding: 6 }}
          >
            <Ionicons name="download-outline" size={22} color="#111827" />
          </TouchableOpacity>
        }
      />

      {/* TABS */}
      <SlidingTabs
        tabs={[t("Reading"), t("Consumption")]}
        activeIndex={activeTab}
        scrollX={scrollX}
        onTabPress={handleTabPress}
      />

      {/* CONTENT */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveTab(index);
        }}
        onScrollAnimationEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setActiveTab(index);
        }}
      >
        {/* Render the memoized heavy charts here */}
        {renderTabContent}
      </Animated.ScrollView>
    </View>
  );
};

export default MeterScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
});