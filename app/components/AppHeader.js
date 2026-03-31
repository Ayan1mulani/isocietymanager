import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const AppHeader = ({
  title,
  nightMode = false,
  showBack = true,
  rightIcon, // ✅ ADDED
}) => {
  const navigation = useNavigation();

  const theme = {
    background: nightMode ? '#121212' : '#FFFFFF',
    text: nightMode ? '#FFFFFF' : '#111827',
    border: nightMode ? '#2C2C2C' : '#E5E7EB',
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      {/* Left Section */}
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
      </View>

      {/* ✅ RIGHT SECTION (NEW) */}
      <View style={styles.right}>
        {rightIcon ? rightIcon : <View style={{ width: 24 }} />}
      </View>

    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  container: {
    height: 55,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: { // ✅ ADDED
    width: 30,
    alignItems: 'flex-end',
    marginRight:15
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  iconBtn: {
    padding: 6,
  },
});