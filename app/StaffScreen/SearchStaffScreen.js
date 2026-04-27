import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { otherServices } from "../../services/otherServices";
import { useNavigation } from "@react-navigation/native";
import AppCard from "../components/AppCard";
import AppSearchBar from "../components/AppSearchBar";
import BRAND from "../config";
import { usePermissions } from "../../Utils/ConetextApi";
import EmptyState from "../components/EmptyState";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const COLORS = {
  primary: BRAND.COLORS.primary,
  light: {
    background: "#FFFFFF",
    surface: "#ffffff",
    text: "#212529",
    textSecondary: "#6C757D",
    border: "#DEE2E6",
  },
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#9E9E9E",
    border: "#2C2C2C",
  },
};

const parseWorkLocations = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return [];
};

const toStr = (val) =>
  val != null && typeof val === "string" ? val.toLowerCase() : "";

const SearchStaffScreen = ({ nightMode, categories, categoriesLoading }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { flatNo } = usePermissions();

  const [staffList, setStaffList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);

  const theme = nightMode ? COLORS.dark : COLORS.light;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchStaff = useCallback(async (category) => {
    if (!category) return;
    try {
      setStaffLoading(true);
      setSearch("");
      const res = await otherServices.getStaffByCategory(category);
      const data = res?.status === "success" ? normalizeArray(res.data) : [];
      setStaffList(data);
      setFilteredList(data);
    } catch (error) {
      setStaffList([]);
      setFilteredList([]);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  useEffect(() => {
    if (categories?.length > 0 && !selectedCategory) {
      const first = categories[0];
      setSelectedCategory(first);
      fetchStaff(first);
    }
  }, [categories, fetchStaff, selectedCategory]);

  const isStaffAssociated = useCallback(
    (item) => {
      if (!item.work_location || !flatNo) return false;
      const workLocations = parseWorkLocations(item.work_location);
      return workLocations.some(
        (loc) => loc.display_unit_no === flatNo || loc.flat_no === flatNo
      );
    },
    [flatNo]
  );

  const handleSearch = useCallback(
    (text) => {
      setSearch(text);
      const q = text.trim().toLowerCase();
      if (!q) {
        setFilteredList(staffList);
        return;
      }
      const filtered = staffList.filter(
        (item) =>
          toStr(item.name).includes(q) ||
          toStr(item.designation).includes(q) ||
          toStr(item.category).includes(q) ||
          String(item.code || "").toLowerCase().includes(q)
      );
      setFilteredList(filtered);
    },
    [staffList]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const workLocations = parseWorkLocations(item.work_location);
      const validMobile = item.mobile && item.mobile !== 0 && item.mobile !== "0";

      return (
        <AppCard theme={theme}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate(
                isStaffAssociated(item)
                  ? "MyStaffDetailScreen"
                  : "StaffDetailScreen",
                { staff: item }
              )
            }
          >
            <View style={styles.cardHeader}>
              <View style={styles.leftSection}>
                <View style={styles.avatar}>
                  {item.image && item.image.startsWith("http") ? (
                    <Image source={{ uri: item.image }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={20} color={theme.textSecondary} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.staffName, { color: theme.text }]} numberOfLines={1}>
                    {item.name || t("Unknown")}
                  </Text>
                  <Text style={[styles.designation, { color: theme.textSecondary }]} numberOfLines={1}>
                    {t(item.designation || "No Designation")}
                  </Text>
                  {item.code ? (
                    <Text style={[styles.empId, { color: theme.textSecondary }]}>
                      {t("EMP ID")}: {item.code}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.primary}15` }]}>
                <Text style={[styles.categoryBadgeText, { color: COLORS.primary }]} numberOfLines={1}>
                  {t(selectedCategory)}
                </Text>
              </View>
            </View>

            {(validMobile || workLocations.length > 0) && (
              <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
                {validMobile ? (
                  <View style={styles.footerRow}>
                    <Ionicons name="call-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                      {item.mobile}
                    </Text>
                  </View>
                ) : null}

                {workLocations.length > 0 ? (
                  <View style={styles.footerRow}>
                    <Ionicons name="location-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.footerText, { color: theme.textSecondary }]} numberOfLines={1}>
                      {workLocations
                        .map((loc) => loc.display_unit_no || loc.flat_no)
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </TouchableOpacity>
        </AppCard>
      );
    },
    [theme, styles, selectedCategory, isStaffAssociated, navigation, t]
  );

  return (
    <View style={{ flex: 1 }}>
      {categories?.length > 0 && (
        <View style={styles.categoryRow}>
          {categoriesLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 16 }} />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
              scrollEventThrottle={16}
              nestedScrollEnabled={true}
            >
              {categories?.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive ? COLORS.primary : theme.surface,
                        borderWidth: isActive ? 0 : 1,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      fetchStaff(cat);
                    }}
                  >
                    <Text style={[styles.categoryChipText, { color: isActive ? "#fff" : theme.text }]} numberOfLines={1}>
                      {t(cat)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      <AppSearchBar
        value={search}
        onChangeText={handleSearch}
        placeholder={t("Search by name, role or ID...")}
        theme={theme}
      />

      {staffLoading ? (
        <View style={styles.listLoadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => (item.id != null ? item.id.toString() : index.toString())}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <EmptyState
              icon="people-outline"
              title={t("No Staff Found")}
              subtitle={t("Try another category or search term")}
              theme={theme}
            />
          )}
          nestedScrollEnabled={true}
          initialNumToRender={10}
          windowSize={5}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      )}
    </View>
  );
};

const createStyles = (theme) =>
  StyleSheet.create({
    categoryRow: { paddingVertical: 8 },
    categoryScrollContent: { paddingHorizontal: 16, paddingVertical: 2 },
    categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, maxWidth: 160 },
    categoryChipText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
    listLoadingState: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
    leftSection: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
    avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, justifyContent: "center", alignItems: "center", marginRight: 10, overflow: "hidden" },
    avatarImage: { width: "100%", height: "100%" },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    staffName: { fontSize: 15, fontWeight: "700", marginBottom: 3 },
    designation: { fontSize: 13 },
    empId: { fontSize: 12, marginTop: 2, fontWeight: "500" },
    categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", flexShrink: 0, maxWidth: 120 },
    categoryBadgeText: { fontSize: 11, fontWeight: "700" },
    cardFooter: { borderTopWidth: 1, paddingTop: 10 },
    footerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    footerText: { fontSize: 13, marginLeft: 6, flex: 1 },
  });

export default SearchStaffScreen;