import React from "react";
import { View, StyleSheet } from "react-native";

const AppCard = ({ children, style, theme }) => {
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          backgroundColor: theme.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
});

export default AppCard;