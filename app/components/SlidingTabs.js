import React, { useRef, useEffect, useState } from "react";
import {
  View,
  // Text, <── REMOVED standard Text
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";

// 1. ── NEW: Import your global Text component ──
import Text from '../components/TranslatedText'; // <── Adjust path to point to your TranslatedText file

const screenWidth = Dimensions.get("window").width;
import BRAND from "../config"; 
const COLORS = BRAND.COLORS;

const SlidingTabs = ({
  tabs = [],
  activeIndex = 0,
  onTabPress,
  primaryColor = COLORS.primary,
  inactiveColor = COLORS.secondaryText,
  containerStyle,
  scrollX,
}) => {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  const tabWidth =
    containerWidth && tabs.length
      ? containerWidth / tabs.length
      : 0;

  useEffect(() => {
    if (!scrollX && tabWidth) {
      Animated.spring(translateX, {
        toValue: activeIndex * tabWidth,
        useNativeDriver: true,
        tension: 120,
        friction: 10,
      }).start();
    }
  }, [activeIndex, tabWidth]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View
        style={styles.container}
        onLayout={(e) =>
          setContainerWidth(e.nativeEvent.layout.width)
        }
      >
        {tabs.map((tab, index) => {
          const isActive = activeIndex === index;

          return (
            <TouchableOpacity
              key={index}
              style={[styles.tab, { width: tabWidth }]}
              activeOpacity={0.7}
              onPress={() => onTabPress(index)}
            >
              {/* 2. ── Global Text component handles translation of {tab} ── */}
              <Text
                style={[
                  styles.label,
                  { color: isActive ? primaryColor : inactiveColor },
                  isActive && styles.activeLabel,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}

        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: tabWidth,
                backgroundColor: primaryColor,
                transform: scrollX
                  ? [
                      {
                        translateX: scrollX.interpolate({
                          inputRange: tabs.map(
                            (_, i) => i * screenWidth
                          ),
                          outputRange: tabs.map(
                            (_, i) => i * tabWidth
                          ),
                          extrapolate: "clamp",
                        }),
                      },
                    ]
                  : [{ translateX }],
              },
            ]}
          />
        )}
      </View>
    </View>
  );
};

export default SlidingTabs;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor:'#fff'
  },
  container: {
    flexDirection: "row",
    position: "relative",
  },
  tab: {
    paddingVertical: 12,
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  activeLabel: {
    fontWeight: "700",
  },
  indicator: {
    height: 3,
    borderRadius: 2,
    position: "absolute",
    bottom: 0,
  },
});