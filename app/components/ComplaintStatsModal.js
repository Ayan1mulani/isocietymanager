import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { complaintService } from "../../services/complaintService";
import { useFocusEffect } from '@react-navigation/native';

const COLOR_PALETTE = [
  "#FF8A65", // Orange
  "#7B68EE", // Purple-blue
  "#4DD0E1", // Cyan
  "#A855F7", // Purple
  "#FCA5A5", // Light Red
  "#FDE047", // Yellow
  "#86EFAC", // Light Green
];

const ComplaintStats = ({ theme, nightMode, onSegmentPress, selectedSegment }) => {
  const [dynamicData, setDynamicData] = useState([]);
  const animRefs = useRef({}); 

  useFocusEffect(
    useCallback(() => { fetchStats(); }, [])
  );

  const fetchStats = async () => {
    try {
      const res = await complaintService.getComplaintStatusCount();
      console.log("STATS API RESPONSE:", JSON.stringify(res.data, null, 2));
      if (res?.status === "success") {
        const newData = (res.data || []).map((item, index) => {
          const key = (item.status || "").toLowerCase().trim();
          const name = item.status || "Unknown";
          
          if (!animRefs.current[key]) {
            animRefs.current[key] = new Animated.Value(0);
          }

          return {
            name: name,
            count: item.count,
            key: key,
            color: COLOR_PALETTE[index % COLOR_PALETTE.length],
            anim: animRefs.current[key],
          };
        });
        setDynamicData(newData);
      }
    } catch (e) {
      console.log("Stats fetch error:", e);
    }
  };

  useEffect(() => {
    dynamicData.forEach((item) => {
      Animated.spring(item.anim, {
        toValue: selectedSegment === item.key ? 1 : 0,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedSegment, dynamicData]);

  const total = dynamicData.reduce((sum, item) => sum + (item.count || 0), 0);
  const OUTER_R = 55;
  const INNER_R = 34;
  const GAP_DEG = 1.5;

  const polarToCartesian = (r, angleDeg) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
  };

  const createArc = (startAngle, endAngle, outerR, innerR) => {
    const span = endAngle - startAngle;
    if (span >= 359) {
      const mid = startAngle + 180;
      const o1 = polarToCartesian(outerR, startAngle);
      const o2 = polarToCartesian(outerR, mid);
      const i1 = polarToCartesian(innerR, startAngle);
      const i2 = polarToCartesian(innerR, mid);

      return [
        "M", o1.x, o1.y, "A", outerR, outerR, 0, 1, 1, o2.x, o2.y,
        "A", outerR, outerR, 0, 1, 1, o1.x, o1.y, "L", i1.x, i1.y,
        "A", innerR, innerR, 0, 1, 0, i2.x, i2.y, "A", innerR, innerR, 0, 1, 0, i1.x, i1.y, "Z",
      ].join(" ");
    }

    const adjStart = startAngle + GAP_DEG / 2;
    const adjEnd = endAngle - GAP_DEG / 2;
    if (adjEnd <= adjStart) return "";

    const outerStart = polarToCartesian(outerR, adjStart);
    const outerEnd = polarToCartesian(outerR, adjEnd);
    const innerStart = polarToCartesian(innerR, adjStart);
    const innerEnd = polarToCartesian(innerR, adjEnd);
    const largeArc = adjEnd - adjStart > 180 ? "1" : "0";

    return [
      "M", outerStart.x, outerStart.y, "A", outerR, outerR, 0, largeArc, 1, outerEnd.x, outerEnd.y,
      "L", innerEnd.x, innerEnd.y, "A", innerR, innerR, 0, largeArc, 0, innerStart.x, innerStart.y, "Z",
    ].join(" ");
  };

  let currentAngle = -90;
  const segments = dynamicData.map((item) => {
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    const angle = total > 0 ? (percentage / 100) * 360 : 0;
    const segment = {
      ...item,
      percentage: Math.round(percentage),
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
    };
    currentAngle += angle;
    return segment;
  });

  const renderLegendItem = (item) => {
    if (!item) return null;
    const isSelected = selectedSegment === item.key;
    const dotScale = item.anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

    return (
      <TouchableOpacity
        key={item.key}
        style={styles.legendItem}
        onPress={() => onSegmentPress?.(selectedSegment === item.key ? null : item.key)}
      >
        <Animated.View style={[styles.dot, { backgroundColor: item.color, transform: [{ scale: dotScale }] }]} />
        <View style={styles.legendText}>
          <Text
            style={{ color: theme?.textColor || "#000", fontWeight: isSelected ? "700" : "400", fontSize: 13 }}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text style={{ fontSize: 11, color: isSelected ? item.color : "#666" }}>
            {item.count} ({item.percentage}%)
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: nightMode ? "#1E1E2D" : "#FFF" }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={styles.chartWrapper}>
          <Svg width={120} height={120} viewBox="-60 -60 120 120">
            <Circle cx={0} cy={0} r={(OUTER_R + INNER_R) / 2} stroke="#E0E0E0" strokeWidth={OUTER_R - INNER_R} fill="none" />
            {total > 0 && segments.map((s, i) => {
              const path = createArc(s.startAngle, s.endAngle, OUTER_R, INNER_R);
              if (!path) return null;
              return (
                <Path key={i} d={path} fill={s.color} opacity={selectedSegment ? (selectedSegment === s.key ? 1 : 0.35) : 1} />
              );
            })}
          </Svg>
          <View style={styles.centerLabel}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: nightMode ? "#fff" : "#111" }}>{total}</Text>
            <Text style={{ fontSize: 10, color: "#9CA3AF" }}>Total</Text>
          </View>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap' }}>
          {dynamicData.map(renderLegendItem)}
        </View>
      </View>
    </View>
  );
};

export default ComplaintStats;

const styles = StyleSheet.create({
  container: { margin: 16, padding: 16, borderRadius: 16 },
  chartWrapper: { width: 120, height: 120, marginRight: 16 },
  centerLabel: { position: "absolute", width: 120, height: 120, alignItems: "center", justifyContent: "center" },
  legendItem: { flexDirection: "row", alignItems: "center", width: "48%", marginBottom: 10, marginRight: "2%" },
  legendText: { flex: 1, overflow: "hidden" },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, flexShrink: 0 },
});