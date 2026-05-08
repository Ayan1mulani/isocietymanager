// MyComplexScreen.js
import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import SlidingTabs from "../components/SlidingTabs";
import GuidelinesTab from "./GuidelinesTab";
import AppHeader from "../components/AppHeader";
import MgtTab from "./FacilityTab";
import { useTranslation } from 'react-i18next';
import BRAND from '../config';

import { SafeAreaView } from "react-native-safe-area-context";
import FormsScreen from "./FormsTab";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MyComplexScreen = () => {
  const { t } = useTranslation(); 
  
  // 1. Move TABS inside the component so it can access 't'
  const TABS = [
    t('Guidelines &\nRules'),
    t('MGT /\nFacility Team'),
    t('Useful\nForms'),
  ];

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
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

    const TAB_HEIGHT = 50; // Ensure this is defined

    if (diff > 0) {
      Animated.timing(tabTranslateY, {
        toValue: -TAB_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
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
      <AppHeader title={t("My Complex")}/>
      
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
            setLoading(true);
            setActiveTabIndex(index);

            scrollViewRef.current?.scrollTo({
              x: index * SCREEN_WIDTH,
              animated: true,
            });

            setTimeout(() => {
              setLoading(false);
            }, 400);
          }}
          primaryColor={BRAND.COLORS.primarydark}
          inactiveColor="#6B7280"
          scrollX={scrollX}
        />
      </Animated.View>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator
            size="small"
            color={BRAND.COLORS.primary}
          />
        </View>
      )}

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
          setLoading(false);
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
  loaderContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 999,
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});