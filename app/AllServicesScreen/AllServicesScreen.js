import React, { useState, useRef, useEffect } from "react";
import { hasPermission } from "../../Utils/PermissionHelper";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Keyboard,

} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AppHeader from "../components/AppHeader";
import { usePermissions } from "../../Utils/ConetextApi";
import { SafeAreaView } from "react-native-safe-area-context";
import BRAND from '../config'


const AllServicesScreen = () => {
  const navigation = useNavigation();
  const { nightMode, permissions } = usePermissions();
  const searchInputRef = useRef(null);

  const [search, setSearch] = useState("");

  const theme = {
    surface: nightMode ? "#1F2937" : "#F9FAFB",
    containerBg: nightMode ? "#0F172A" : "#FFFFFF",
    text: nightMode ? "#F9FAFB" : "#111827",
    textSecondary: nightMode ? "#9CA3AF" : "#6B7280",
    inputBg: nightMode ? "#1F2937" : "#F3F4F6",
    inputBorder: nightMode ? "#374151" : "#E5E7EB",
    border: "#F3F4F6",
  };

  const services = [
    // { title: "Payment", icon: "card-outline" },
    { title: "Notices", icon: "notifications-outline", route: "MyNoticesScreen" },
    { title: "Book Ameneties", icon: "bookmarks-outline", route: "AmenitiesListScreen" },
    { title: "My Complex", icon: "notifications-outline", route: "Notices" },
    { title: "Settings", icon: "settings-outline", route: 'Settings' },
    { title: "My vehicles", icon: "car-outline", route: "MyVehiclesScreen" },
    { title: "Staff", icon: "checkmark-circle-outline", route: "StaffScreen" },
    { title: "Family members", icon: "person-add-outline", route: "FamilyMember" },
    { title: "Add vehicle", icon: "car-outline", route: "AddVehicleScreen" },
    { title: "Bills", icon: "receipt-outline", route: "bills" },
    { title: "My Bookings", icon: "bookmark-outline", route: "MyBookings" },
    { title: 'Energy', icon: 'speedometer-outline', route: 'Meter' },
    { title: 'Payment', icon: 'cash-outline', route: 'Payment' },
    { title: 'Bounced Cheque', icon: 'alert-circle-outline', route: 'BouncedCheques' },
    { title: 'Debit Credit Note', icon: 'time-outline', route: 'PaymentHistory' },
  ];

  // Auto focus when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          // Keyboard.show() is not needed - focus() automatically shows it
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [])
  );

  const filteredServices = services
    .filter((item) => {
      if (!permissions) return false;

      if (item.title === "Add vehicle") {
        return hasPermission(permissions, "VEH", "C");
      }

      if (item.title === "My vehicles") {
        return hasPermission(permissions, "VEH", "R");
      }

      if (item.title === "Bills") {
        return hasPermission(permissions, "BILL", "R");
      }

      if (item.title === "Staff") {
        return hasPermission(permissions, "VMSSTF", "R");
      }

      if (item.title === "Book Ameneties") {
        return hasPermission(permissions, "FBK", "R");
      }
      if (item.title === "My Bookings") {
        return hasPermission(permissions, "FBK", "R");
      }
      if (item.title === "Energy") {
        return hasPermission(permissions, "MTR", "R");
      }
      if (item.title === "Payment") {
        return hasPermission(permissions, "PMT", "R");
      }
      if (item.title === "Bounced Cheque") {
        return hasPermission(permissions, "CHKBNC", "R");
      }
      if (item.title === "Debit Credit Note") {
        return hasPermission(permissions, "PMT", "R");
      }
      if (item.title === "Family members") {
        return hasPermission(permissions, "FMB", "R");
      }
      if (item.title === "Settings") {
        return hasPermission(permissions, "STG", "R");
      }

      if (item.title === "Notices") {
        return hasPermission(permissions, "NTC", "R");
      }


      return true;
    })
    .filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );

  const clearSearch = () => {
    setSearch("");
    searchInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.containerBg }]}>
      <AppHeader title="All Services" />

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: theme.containerBg }]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          < Ionicons name="search-outline" size={20} color={BRAND.COLORS.icon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search services..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus={true}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              < Ionicons name="close-circle" size={20} color={BRAND.COLORS.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SERVICES LIST */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            < Ionicons name="search-outline" size={48} color={BRAND.COLORS.icon} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No services found
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              Try a different search term
            </Text>
          </View>
        ) : (
          filteredServices.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.row,
                {
                  borderBottomColor: theme.inputBorder,
                  backgroundColor: theme.containerBg,
                },
              ]}
              onPress={() => {
                Keyboard.dismiss();
                item.route && navigation.navigate(item.route);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.leftSection}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: BRAND.COLORS.icon + "15" },
                  ]}
                >
                  < Ionicons name={item.icon} size={20} color={BRAND.COLORS.icon} />
                </View>
                <Text style={[styles.text, { color: theme.text }]}>
                  {item.title}
                </Text>
              </View>

              < Ionicons
                name="chevron-forward-outline"
                size={18}
                color={BRAND.COLORS.icon}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AllServicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 4,
    letterSpacing: 1
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: "#ffff"
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubText: {
    textAlign: "center",
    marginTop: 8,
    fontSize: 14,
  },
});