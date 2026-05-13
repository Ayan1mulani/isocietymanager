import React, { useState, useRef, useEffect } from "react";
import { hasPermission } from "../../Utils/PermissionHelper";
import {
  View,
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
import BRAND from '../config';

// 1. ── Import your global Text component ──
import Text from '../components/TranslatedText';

// 2. ── Import translation hook ──
import { useTranslation } from "react-i18next";

const AllServicesScreen = () => {
  const navigation = useNavigation();
  const { nightMode, permissions } = usePermissions();
  const searchInputRef = useRef(null);

  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // 🎨 Premium Theme Palette
  const theme = {
    containerBg: nightMode ? '#020617' : '#FFFFFF',
    listBg: nightMode ? '#0F172A' : '#FFFFFF',

    text: nightMode ? '#FFFFFF' : '#111827',
    textSecondary: nightMode ? '#9CA3AF' : '#6B7280',

    inputBg: nightMode ? '#0F172A' : '#FFFFFF',
    inputBorder: nightMode ? '#1E293B' : '#E5E7EB',

    divider: nightMode ? '#1E293B' : '#E5E7EB',

    iconBg: nightMode
      ? 'rgba(96, 165, 250, 0.15)'
      : BRAND.COLORS.iconBackground,

    iconColor: nightMode ? '#60A5FA' : BRAND.COLORS.primary,

    cardBorder: nightMode ? '#1E293B' : '#E5E7EB',
  };

  const services = [
    { title: "Notices", icon: "notifications-outline", route: "MyNoticesScreen" },
    { title: "Book Amenities", icon: "bookmarks-outline", route: "AmenitiesListScreen" },
    { title: "My Complex", icon: "accessibility-outline", route: "Notices" },
    { title: "Settings", icon: "settings-outline", route: 'Settings' },
    { title: "My Vehicles", icon: "car-outline", route: "MyVehiclesScreen" },
    { title: "Staff", icon: "checkmark-circle-outline", route: "StaffScreen" },
    { title: "Family members", icon: "people-outline", route: "FamilyMember" },
    { title: "Add vehicle", icon: "add-circle-outline", route: "AddVehicleScreen" },
    { title: "Bills", icon: "receipt-outline", route: "bills" },
    { title: "My Bookings", icon: "calendar-outline", route: "MyBookings" },
    { title: 'Energy', icon: 'speedometer-outline', route: 'Meter' },
    { title: 'Payment', icon: 'wallet-outline', route: 'Payment' },
    { title: 'Bounced Cheque', icon: 'alert-circle-outline', route: 'BouncedCheques' },
    { title: 'Debit Credit Note', icon: 'time-outline', route: 'PaymentHistory' },
    { title: 'Events', icon: 'time-outline', route: 'event' },

    // { title: 'Survey', icon: 'survey-outline', route: 'surveypage' },

  ];

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 300);

      return () => clearTimeout(timer);
    }, [])
  );

  const filteredServices = services
    .filter((item) => {
      if (!permissions) return false;

      if (item.title === "Add vehicle") return hasPermission(permissions, "VEH", "C");
      if (item.title === "My Vehicles") return hasPermission(permissions, "VEH", "R");
      if (item.title === "Bills") return hasPermission(permissions, "BILL", "R");
      if (item.title === "Staff") return hasPermission(permissions, "VMSSTF", "R");
      if (item.title === "Book Amenities") return hasPermission(permissions, "FBK", "R");
      if (item.title === "My Bookings") return hasPermission(permissions, "FBK", "R");
      if (item.title === "Energy") return hasPermission(permissions, "MTR", "R");
      if (item.title === "Payment") return hasPermission(permissions, "PMT", "R");
      if (item.title === "Bounced Cheque") return hasPermission(permissions, "CHKBNC", "R");
      if (item.title === "Debit Credit Note") return hasPermission(permissions, "PMT", "R");
      if (item.title === "Family members") return hasPermission(permissions, "FMB", "R");
      if (item.title === "Settings") return hasPermission(permissions, "STG", "R");
      if (item.title === "Notices") return hasPermission(permissions, "NTC", "R");
      if (item.title === "My Complex") return hasPermission(permissions, "NTC", "R");
      if (item.title === "Events") return hasPermission(permissions, "EVNT", "R");


      return true;
    })
    .filter((item) => {
      const searchTerm = search.toLowerCase();
      const englishTitle = item.title.toLowerCase();
      const translatedTitle = t(item.title).toLowerCase();

      return englishTitle.includes(searchTerm) || translatedTitle.includes(searchTerm);
    });

  const clearSearch = () => {
    setSearch("");
    searchInputRef.current?.focus();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.containerBg }]}>
      <AppHeader title={t("All Services")} />

      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
            },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={theme.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={t("Search services...")}
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoFocus={true}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" // 🚀 ADD THIS LINE
      >
        {filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              {t("No services found")}
            </Text>
            <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
              {t("Try a different search term")}
            </Text>
          </View>
        ) : (
          // 💎 THE INSET GROUPED CARD 💎
          <View 
            style={[
              styles.listCard,
              {
                backgroundColor: theme.listBg,
                borderColor: theme.cardBorder,
              },
              !nightMode && styles.listShadow
            ]}
          >
            {filteredServices.map((item, index) => {
              const isLast = index === filteredServices.length - 1;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.row,
                    { borderBottomColor: theme.divider },
                    isLast && { borderBottomWidth: 0 } // Hide border on last item
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    item.route && navigation.navigate(item.route);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.leftSection}>
                    {/* Modern Rounded Square Icon Container */}
                    <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
                      <Ionicons name={item.icon} size={20} color={theme.iconColor} />
                    </View>
                    <Text style={[styles.text, { color: theme.text }]}>
                      {item.title}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AllServicesScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  searchContainer: { 
    paddingHorizontal: 16, 
    paddingVertical: 12 
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: "500", 
    paddingVertical: 0, 
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  /* 💎 Premium Inset Card Styles */
  listCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 8,
    borderWidth: 1,
  },
  listShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: { 
    flexDirection: "row", 
    alignItems: "center", 
    flex: 1 
  },
  
  /* 💎 Modern Icon Box (Rounded Square) */
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: BRAND.COLORS.iconBorder,
  },
  
  text: { 
    fontSize: 16, 
    fontWeight: "600", 
    letterSpacing: 0.3 
  },
  
  emptyContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingVertical: 80 
  },
  emptyText: { 
    textAlign: "center", 
    marginTop: 16, 
    fontSize: 18, 
    fontWeight: "700" 
  },
  emptySubText: { 
    textAlign: "center", 
    marginTop: 8, 
    fontSize: 15 
  },
});