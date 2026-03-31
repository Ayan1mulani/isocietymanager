import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FloatingActionButton = ({
  onPress,
  icon = "add",
  size = 28,
  backgroundColor,
  shadowColor,
  bottom = 24,
  right = 24,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          backgroundColor,
          shadowColor: shadowColor || backgroundColor,
          bottom,
          right,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      < Ionicons name={icon} size={size} color="#FFFFFF" />
    </TouchableOpacity>
  );
};

export default FloatingActionButton;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',

    elevation: 6, // Android shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});