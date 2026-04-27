import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { otherServices } from "../../services/otherServices";
import AppHeader from "../components/AppHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import BRAND from '../config'
import { usePermissions } from "../../Utils/ConetextApi";
import { hasPermission } from "../../Utils/PermissionHelper";
import { useFocusEffect, useRoute } from "@react-navigation/native";

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const PRIMARY = BRAND.COLORS.primary;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getVehicleIcon = (model = "") => {
  const lower = model.toLowerCase();
  if (lower.includes("bike") || lower.includes("scooter") || lower.includes("motorcycle"))
    return "bicycle-outline";
  if (lower.includes("truck") || lower.includes("van"))
    return "bus-outline";
  return "car-sport-outline";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge = ({ label, color, icon }) => {
  const { t } = useTranslation(); // 👈 Init translation for sub-component
  return (
    <View style={[badgeStyles.badge, { backgroundColor: color + "18", borderColor: color + "40" }]}>
      {icon && < Ionicons name={icon} size={11} color={color} />}
      <Text style={[badgeStyles.label, { color }]}>{t(label)}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

const VehicleCard = ({ item, onPress }) => {
  const { t } = useTranslation(); // 👈 Init translation
  
  const isApproved = item.is_approved === 1;
  const isIn = item.status === 1;
  const isSubscribed = item.is_subscribed === 1;
  const iconName = getVehicleIcon(item.model);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      {/* Left Icon */}
      <View style={[styles.iconWrapper, { backgroundColor: isApproved ? "#EEF4FB" : "#FFF8EC" }]}>
        < Ionicons name={iconName} size={26} color={isApproved ? PRIMARY : "#F59E0B"} />
      </View>

      {/* Main Content */}
      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <Text style={styles.vehicleNo}>{item.vehicle_no}</Text>
          {isApproved && (
            <View style={styles.notifyIcon}>
              < Ionicons
                name={isSubscribed ? "notifications" : "notifications-off-outline"}
                size={15}
                color={isSubscribed ? PRIMARY : "#9CA3AF"}
              />
            </View>
          )}
        </View>

        <Text style={styles.model}>{item.model || t("Unknown Model")}</Text>

        <View style={styles.badgeRow}>
          {isApproved ? (
            <StatusBadge
              label={isIn ? "Inside" : "Outside"}
              color={isIn ? "#16A34A" : "#DC2626"}
              icon={isIn ? "checkmark-circle-outline" : "exit-outline"}
            />
          ) : (
            <StatusBadge
              label="Pending Approval"
              color="#F59E0B"
              icon="time-outline"
            />
          )}
        </View>
      </View>

    </TouchableOpacity>
  );
};

const EmptyState = () => {
  const { t } = useTranslation(); // 👈 Init translation
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBox}>
        < Ionicons name="car-outline" size={40} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>{t("No Vehicles Added")}</Text>
      <Text style={styles.emptySubtitle}>
        {t("Tap the + button to register your vehicle")}
      </Text>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
const MyVehiclesScreen = ({ navigation }) => {
  const route = useRoute();
  const { t } = useTranslation(); // 👈 Init translation

  const { permissions } = usePermissions();

  const canCreateVehicle = permissions && hasPermission(permissions, "VEH", "C");
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await otherServices.getMyVehicles();
      setVehicles(res?.data || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.refresh) {
        fetchVehicles();
        navigation.setParams({ refresh: false });
      }
    }, [route.params?.refresh])
  );

  const handleCardPress = (item) => {
    const isApproved = item.is_approved === 1;
    navigation.navigate(
      isApproved ? "VehicleDetailsScreen" : "AddVehicleScreen",
      { vehicle: item }
    );
  };

  const approved = vehicles.filter((v) => v.is_approved === 1);
  const pending  = vehicles.filter((v) => v.is_approved !== 1);

  return (
    <SafeAreaView style={styles.container}>
      
      <AppHeader title={t("My Vehicles")} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>{t("Loading vehicles...")}</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <VehicleCard item={item} onPress={() => handleCardPress(item)} />
          )}
          contentContainerStyle={[
            styles.list,
            vehicles.length === 0 && { flexGrow: 1 },
          ]}
          ListHeaderComponent={
            vehicles.length > 0 ? (
              <View style={styles.summaryRow}>
                {pending.length > 0 && (
                  <View style={styles.summaryChip}>
                    <View style={[styles.summaryDot, { backgroundColor: "#F59E0B" }]} />
                    <Text style={styles.summaryText}>{pending.length} {t("Pending")}</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={<EmptyState />}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {canCreateVehicle && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddVehicleScreen")}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

    </SafeAreaView>
  );
};

export default MyVehiclesScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgb(255, 255, 255)",
  },

  // Summary
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 1,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },

  // List
  list: {
    padding: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    gap: 12,
  },
  iconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleNo: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  notifyIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  model: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
    marginBottom: 8,
    fontWeight: "500",
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Loading
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F4F6F9",
  },
  loadingText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});