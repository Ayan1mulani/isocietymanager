import React from "react";
import { TouchableOpacity, Text, StyleSheet, View } from "react-native";
import BRAND from "../config";

const COLORS = BRAND.COLORS;

const SubmitButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && { opacity: 0.6 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        {icon && <View style={{ marginRight: 6 }}>{icon}</View>}
        <Text style={styles.text}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default SubmitButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop:30,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },

  text: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },
});