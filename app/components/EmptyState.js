import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const EmptyState = ({
  icon = "information-circle-outline",
  title = "No Data Found",
  subtitle = "",
  theme,
}) => {
  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={60}
        color={theme?.textSecondary || "#9CA3AF"}
      />

      <Text style={[styles.title, { color: theme?.text || "#111827" }]}>
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[styles.subtitle, { color: theme?.textSecondary || "#6B7280" }]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

export default EmptyState;

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    alignItems: "center",
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },

  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
});