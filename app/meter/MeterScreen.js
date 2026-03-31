import React, { useState, useRef } from "react";
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

const screenWidth = Dimensions.get("window").width;

const MeterScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState(0);

  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <AppHeader
        title="Energy Consumption"
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
        tabs={["Reading", "Consumption"]}
        activeIndex={activeTab}
        scrollX={scrollX}
        onTabPress={(index) => {
          setActiveTab(index);
          scrollRef.current?.scrollTo({
            x: index * screenWidth,
            animated: true,
          });
        }}
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
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / screenWidth
          );
          setActiveTab(index);
        }}
      >
        <View style={{ width: screenWidth }}>
          <MeterReadingTab />
        </View>

        <View style={{ width: screenWidth }}>
          <MeterChartTab />
        </View>
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