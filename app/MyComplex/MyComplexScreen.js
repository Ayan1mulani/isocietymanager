// MyComplexScreen.js
import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import SlidingTabs from "../components/SlidingTabs";
import GuidelinesTab from "./GuidelinesTab";
import AppHeader from "../components/AppHeader";
import MgtTab from "./FacilityTab";
import BRAND from '../config'

import { SafeAreaView } from "react-native-safe-area-context";
import FormsScreen from "./FormsTab";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TABS = [
  'Guidelines &\nRules',
  'MGT /\nFacility Team',
  'Useful\nForms',
];


const MyComplexScreen = () => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const scrollViewRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const tabTranslateY = useRef(new Animated.Value(0)).current;
  const lastOffsetY = useRef(0);

  const renderPage = (index) => {
    switch (index) {
      case 0:
        return <GuidelinesTab />;
      case 1:
        return <MgtTab />;
      case 2:
        return <FormsScreen/>;
      default:
        return null;
    }
  };

  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const diff = offsetY - lastOffsetY.current;

    // Scroll down = hide tabs (move up)
    if (diff > 0) {
      Animated.timing(tabTranslateY, {
        toValue: -TAB_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    // Scroll up = show tabs (move down)
    else if (diff < 0) {
      Animated.timing(tabTranslateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    lastOffsetY.current = offsetY;
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader  title={"My Complex"}/>
      <Animated.View
        style={[
          styles.tabsContainer,
          {
            transform: [{ translateY: tabTranslateY }],
          },
        ]}
      >
        <SlidingTabs
          tabs={TABS}
          activeIndex={activeTabIndex}
          onTabPress={(index) => {
            setActiveTabIndex(index);
            scrollViewRef.current?.scrollTo({
              x: index * SCREEN_WIDTH,
              animated: true,
            });
          }}
          primaryColor= {BRAND.COLORS.primarydark}
          inactiveColor="#6B7280"
          scrollX={scrollX}
        />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / SCREEN_WIDTH
          );
          setActiveTabIndex(index);
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      >
        {TABS.map((_, index) => (
          <View key={index} style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {renderPage(index)}
          </View>
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default MyComplexScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});