// MyParkingPage.js
import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BRAND from '../../config'


const COLORS = {
 primary: BRAND.COLORS.primaryDark,
  success: '#34C759',
  error: '#FF3B30',
  light: {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#212529',
    textSecondary: '#6C757D',
    border: '#DEE2E6',
  },
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    border: '#2C2C2C',
  },
};

const MyParkingPage = ({ nightMode, parkingBookings = [], loading, onRefresh }) => {
  const theme = nightMode ? COLORS.dark : COLORS.light;

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const renderItem = ({ item }) => {
    const isActive = item.status === 1;

    return (
      <View style={[styles.card]}>
        <View style={styles.header}>
          <View style={styles.left}>
            < Ionicons name="car-outline" size={22} color={BRAND.COLORS.icon} />
            <Text style={[styles.vehicle, { color: theme.text }]}>
              {item?.data?.vehicle_no || 'Vehicle'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isActive ? COLORS.success : COLORS.error },
            ]}
          >
            <Text style={styles.statusText}>
              {isActive ? 'ACTIVE' : 'COMPLETED'}
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            From: {formatDate(item.booking_from)}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            To: {formatDate(item.booking_to)}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={['left', 'right']}
    >
      <FlatList
        data={parkingBookings}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 180, // ✅ FAB safe space
          flexGrow: parkingBookings.length === 0 ? 1 : 0,
        }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.center}>
            < Ionicons
              name="car-outline"
              size={60}
              color={theme.textSecondary}
            />
            <Text
              style={{
                marginTop: 15,
                fontSize: 16,
                color: theme.text,
                fontWeight: '600',
              }}
            >
              No Parking Bookings
            </Text>
            <Text
              style={{
                marginTop: 5,
                color: theme.textSecondary,
              }}
            >
              Your parking bookings will appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(3, 65, 109, 0.04)',
    overflow: 'hidden', // 👈 important

  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicle: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  timeContainer: {
    marginTop: 10,
    gap: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyParkingPage;