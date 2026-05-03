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
import AsyncStorage from '@react-native-async-storage/async-storage'; 
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
    skeleton: "#E5E7EB",
  },
  dark: {
    background: "#121212",
    surface: "#1E1E1E",
    text: "#FFFFFF",
    textSecondary: "#9E9E9E",
    border: "#2C2C2C",
    skeleton: "#334155",
  },
};


const getCacheKey = (category, userId) => `@staff_cat_${category}_${userId}`;

const SearchStaffScreen = ({ nightMode, categories, categoriesLoading }) => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { flatNo } = usePermissions();

  const [staffList, setStaffList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [search, setSearch] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  
  // Local session memory to prevent loading when switching back and forth
  const [sessionCache, setSessionCache] = useState({});

  const theme = nightMode ? COLORS.dark : COLORS.light;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchStaff = useCallback(async (category) => {
    if (!category) return;

    try {
      // Get user id for cache key
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
      const uid = userInfo?.id || userInfo?.user_id || "default";
      const cacheKey = getCacheKey(category, uid);

      // 1. Check Session Cache (Instant)
      if (sessionCache[category]) {
        setStaffList(sessionCache[category]);
        setFilteredList(sessionCache[category]);
        setStaffLoading(false);
      } else {
        // 2. Check Storage Cache
        const localData = await AsyncStorage.getItem(cacheKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          setStaffList(parsed);
          setFilteredList(parsed);
          setStaffLoading(false);
        } else {
          setStaffLoading(true); 
        }
      }

      setSearch("");
      const res = await otherServices.getStaffByCategory(category);
      
      if (res?.status === "success") {
        const data = Array.isArray(res.data) ? res.data : [];
        
        // 3. Update UI and Caches
        setStaffList(data);
        setFilteredList(data);
        setSessionCache(prev => ({ ...prev, [category]: data }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (error) {
      console.log("Fetch error", error);
    } finally {
      setStaffLoading(false);
    }
  }, [sessionCache]);

  useEffect(() => {
    if (categories?.length > 0 && !selectedCategory) {
      const first = categories[0];
      setSelectedCategory(first);
      fetchStaff(first);
    }
  }, [categories, fetchStaff, selectedCategory]);

  const handleCategoryPress = (cat) => {
    if (cat === selectedCategory) return;
    setSelectedCategory(cat);
    fetchStaff(cat);
  };

  const isStaffAssociated = useCallback((item) => {
    if (!item.work_location || !flatNo) return false;
    try {
        const locs = typeof item.work_location === 'string' ? JSON.parse(item.work_location) : item.work_location;
        return locs.some(loc => loc.display_unit_no === flatNo || loc.flat_no === flatNo);
    } catch { return false; }
  }, [flatNo]);

  const handleSearch = useCallback((text) => {
    setSearch(text);
    const q = text.trim().toLowerCase();
    if (!q) {
      setFilteredList(staffList);
      return;
    }
    const filtered = staffList.filter(item => 
      (item.name || "").toLowerCase().includes(q) ||
      (item.designation || "").toLowerCase().includes(q) ||
      (item.code || "").toString().toLowerCase().includes(q)
    );
    setFilteredList(filtered);
  }, [staffList]);

  const renderSkeleton = () => (
    <View style={{ paddingHorizontal: 16 }}>
      {[1, 2, 3, 4].map((i) => (
        <AppCard key={i} theme={theme}>
            <View style={styles.cardHeader}>
              <View style={styles.leftSection}>
                <View style={[styles.avatar, { backgroundColor: theme.skeleton }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ width: '60%', height: 16, backgroundColor: theme.skeleton, borderRadius: 4, marginBottom: 6 }} />
                  <View style={{ width: '40%', height: 12, backgroundColor: theme.skeleton, borderRadius: 4 }} />
                </View>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: theme.skeleton, marginVertical: 10 }} />
            <View style={{ width: '80%', height: 12, backgroundColor: theme.skeleton, borderRadius: 4 }} />
        </AppCard>
      ))}
    </View>
  );

  const renderItem = ({ item }) => {
    let workLocations = [];
    try {
        workLocations = typeof item.work_location === 'string' ? JSON.parse(item.work_location) : item.work_location;
    } catch { workLocations = []; }
    
    const validMobile = item.mobile && item.mobile !== 0 && item.mobile !== "0";

    return (
      <AppCard theme={theme}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate(isStaffAssociated(item) ? "MyStaffDetailScreen" : "StaffDetailScreen", { staff: item })}
        >
          <View style={styles.cardHeader}>
            <View style={styles.leftSection}>
              <View style={styles.avatar}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={20} color={theme.textSecondary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.staffName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.designation, { color: theme.textSecondary }]} numberOfLines={1}>{t(item.designation || item.category)}</Text>
                {item.code ? <Text style={[styles.empId, { color: theme.textSecondary }]}>ID: {item.code}</Text> : null}
              </View>
            </View>
            <View style={[styles.categoryBadge, { backgroundColor: `${COLORS.primary}15` }]}>
              <Text style={[styles.categoryBadgeText, { color: COLORS.primary }]}>{t(selectedCategory)}</Text>
            </View>
          </View>
          {(validMobile || workLocations?.length > 0) && (
            <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
              {validMobile && (
                <View style={styles.footerRow}>
                  <Ionicons name="call-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.footerText, { color: theme.textSecondary }]}>{item.mobile}</Text>
                </View>
              )}
              {workLocations?.length > 0 && (
                <View style={styles.footerRow}>
                  <Ionicons name="location-outline" size={13} color={theme.textSecondary} />
                  <Text style={[styles.footerText, { color: theme.textSecondary }]} numberOfLines={1}>
                    {workLocations.map(l => l.display_unit_no || l.flat_no).join(", ")}
                  </Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </AppCard>
    );
  };

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
              scrollEventThrottle={16} // Restored
              nestedScrollEnabled={true} // Restored to fix paging conflict
            >
              {categories?.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip, 
                    { 
                      backgroundColor: selectedCategory === cat ? COLORS.primary : theme.surface, 
                      borderColor: theme.border, 
                      borderWidth: selectedCategory === cat ? 0 : 1 
                    }
                  ]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Text style={[styles.categoryChipText, { color: selectedCategory === cat ? "#fff" : theme.text }]}>{t(cat)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <AppSearchBar value={search} onChangeText={handleSearch} placeholder={t("Search staff...")} theme={theme} />

      {staffLoading ? renderSkeleton() : (
        <FlatList
          data={filteredList}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          nestedScrollEnabled={true} // Restored
          ListEmptyComponent={<EmptyState icon="people-outline" title={t("No Staff Found")} theme={theme} />}
        />
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  categoryRow: { paddingVertical: 8 },
  categoryScrollContent: { paddingHorizontal: 16 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipText: { fontSize: 13, fontWeight: "600", textTransform: "capitalize" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  leftSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.surface, justifyContent: "center", alignItems: "center", marginRight: 10, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between" },
  staffName: { fontSize: 15, fontWeight: "700" },
  designation: { fontSize: 13 },
  empId: { fontSize: 11, marginTop: 2 },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" },
  categoryBadgeText: { fontSize: 10, fontWeight: "700" },
  cardFooter: { borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  footerRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  footerText: { fontSize: 12, marginLeft: 6 },
});

export default SearchStaffScreen;