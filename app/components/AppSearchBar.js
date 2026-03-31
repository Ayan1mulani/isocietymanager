import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BRAND from '../config'

const AppSearchBar = ({
  value,
  onChangeText,
  placeholder,
  theme,
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.searchBar,
          { backgroundColor: theme.surface },
        ]}
      >
        < Ionicons
          name="search-outline"
          size={20}
          color={theme.textSecondary}
        />

        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
        />

        {value !== "" && (
          <TouchableOpacity onPress={() => onChangeText("")}>
            < Ionicons
              name="close-circle"
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
    borderWidth: 1,
    borderColor: BRAND.COLORS.border,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    letterSpacing: 1,
  },
});

export default AppSearchBar;