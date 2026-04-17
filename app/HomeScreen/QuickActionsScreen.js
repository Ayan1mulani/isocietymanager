import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";
import LinearGradient from 'react-native-linear-gradient';
import BRAND from "../config";

const SCREEN_WIDTH = Dimensions.get("window").width;

const ACTIONS = [
  { id: "1", title: "Pass", icon: "create-outline", screen: "Visitors", module: "VMS", action: "R" },
  { id: "2", title: "Amenities", icon: "bookmark-outline", screen: "AmenitiesListScreen", module: "FBK", action: "R" },
  { id: "3", title: "Notice", icon: "megaphone-outline", screen: "MyNoticesScreen", module: "NTC", action: "R" },
  { id: "4", title: "Bookings", icon: "calendar-outline", screen: "MyBookings", module: "FBK", action: "R" },
  { id: "5", title: "My Vehicles", icon: "car-outline", screen: "MyVehiclesScreen", module: "VEH", action: "R" },
];

const QuickActionsScreen = () => {
  const navigation = useNavigation();
  const { permissions } = usePermissions();

  const permissionsLoaded = permissions !== null && permissions !== undefined;

  const visibleActions = ACTIONS.filter((item) => {
    if (!permissionsLoaded) return false;

    if (!item.module) return true;

    return hasPermission(permissions, item.module, item.action);
  }).slice(0, 5); // ensure max 5

  return (
    <View style={styles.container}>
      {visibleActions.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          activeOpacity={0.75}
          onPress={() => navigation.navigate(item.screen)}
        >
          <LinearGradient
 colors={["#5a7cc6", "#5a7cc6"]}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.iconWrapper}
>
  <Ionicons name={item.icon} size={22} color="#fff" />
</LinearGradient>

          <Text style={styles.label} numberOfLines={1}>
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default QuickActionsScreen;

const styles = StyleSheet.create({

  container: {
    flexDirection: "row",
    justifyContent:"space-evenly",
    paddingHorizontal: 16,
    marginTop: 8,
  },

  card: {
    alignItems: "center",
    width: SCREEN_WIDTH / 5 - 14, // ensures 5 items fit perfectly
  },

  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#5572b0d1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
    textAlign: "center",
  },

});