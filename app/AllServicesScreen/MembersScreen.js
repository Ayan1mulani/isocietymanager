import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage'; // ✅ Added for caching
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';
import BRAND from '../config';

const COLORS = BRAND.COLORS;

import AppHeader from "../components/AppHeader";
import { visitorServices } from "../../services/visitorServices";

const getCacheKey = (userId) => `@family_members_cache_${userId}`;

const MembersScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuIndex, setMenuIndex] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMembers();
    }, [])
  );

  const loadMembers = async () => {
    try {
      const userInfoRaw = await AsyncStorage.getItem("userInfo");
      const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
      const userId = userInfo?.id || userInfo?.user_id || "default";
      const CACHE_KEY = getCacheKey(userId);
      // 1. INSTANT LOAD: Check cache first
      const cachedData = await AsyncStorage.getItem(CACHE_KEY);
      if (cachedData) {
        setMembers(JSON.parse(cachedData));
        setLoading(false); // Hide skeleton instantly!
      } else {
        setLoading(true); // Only show skeleton if no cache exists
      }

      // 2. BACKGROUND FETCH: Get fresh data from API
      const res = await visitorServices.getFamilyMembers();
      if (res?.status === "success") {
        const freshData = res.data || [];
        
        // Update UI
        setMembers(freshData);
        
        // 3. Update cache for next time
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(freshData));
      } else if (!cachedData) {
        setMembers([]);
      }
    } catch (error) {
      console.log("Members error:", error);
      if (members.length === 0) setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleDelete = (memberId) => {
    Alert.alert(
      t("Delete Member"),
      t("Are you sure you want to delete this member?"),
      [
        { text: t("Cancel") },
        {
          text: t("Delete"),
          style: "destructive",
          onPress: async () => {
                const userInfoRaw = await AsyncStorage.getItem("userInfo");
                const userInfo = userInfoRaw ? JSON.parse(userInfoRaw) : null;
                const userId = userInfo?.id || userInfo?.user_id || "default";
                const CACHE_KEY = getCacheKey(userId);
            try {
              await visitorServices.deleteFamilyMember(memberId);
              // Update local state instantly
              const updatedMembers = members.filter(m => m.id !== memberId);
              setMembers(updatedMembers);
              // Update cache instantly
              await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(updatedMembers));
            } catch (error) {
              console.log(error);
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }) => (
    <View
      style={[
        styles.card,
        {
          zIndex: menuIndex === index ? 100 : 1,
          borderColor: '#E5E7EB',
        },
      ]}
    >
      <View style={styles.avatar}>
        {item.image_src ? (
          <Image
            source={{ uri: item.image_src }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={22} color={COLORS.primary} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>{t(item.relation)}</Text>
        <Text style={styles.sub}>{item.phone_no}</Text>
      </View>

      <TouchableOpacity onPress={() => setMenuIndex(menuIndex === index ? null : index)}>
        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {menuIndex === index && (
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuIndex(null);
              navigation.navigate("AddMember", { member: item });
            }}
          >
            <Ionicons name="create-outline" size={18} color="#111" />
            <Text style={styles.menuText}>{t("Edit")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuIndex(null);
              handleDelete(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="red" />
            <Text style={[styles.menuText, { color: "red" }]}>{t("Delete")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // --- SKELETON LOADER UI ---
  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4, 5].map((key) => (
        <View key={key} style={[styles.card, { elevation: 0, shadowOpacity: 0 }]}>
          {/* Avatar Skeleton */}
          <View style={[styles.avatar, { backgroundColor: "#F3F4F6" }]} />
          
          <View style={{ flex: 1 }}>
            {/* Name Skeleton */}
            <View style={{ width: '60%', height: 16, backgroundColor: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
            {/* Relation Skeleton */}
            <View style={{ width: '40%', height: 12, backgroundColor: "#F3F4F6", borderRadius: 4, marginBottom: 6 }} />
            {/* Phone Skeleton */}
            <View style={{ width: '50%', height: 12, backgroundColor: "#F3F4F6", borderRadius: 4 }} />
          </View>

          {/* Menu Icon Skeleton */}
          <View style={{ width: 4, height: 16, backgroundColor: "#F3F4F6", borderRadius: 2 }} />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader title={t("Family Members")} />

      {loading ? (
        renderSkeleton() // ✅ Render custom skeleton instead of spinner
      ) : (
        <FlatList
          data={members}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{
            padding: 16,
            flexGrow: members.length === 0 ? 1 : 0
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={60} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>{t("No Family Members")}</Text>
              <Text style={styles.emptySub}>
                {t("Add your family members so security can allow them easily.")}
              </Text>

              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate("AddMember")}
              >
                <Text style={styles.emptyBtnText}>{t("Add Member")}</Text>
              </TouchableOpacity>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {members.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("AddMember")}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default MembersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'visible',
    zIndex: 1,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.iconBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORS.iconBorder,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  menu: {
    position: 'absolute',
    top: 42,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    width: 135,
    paddingVertical: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 999,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  menuText: {
    marginLeft: 8,
    fontSize: 13,
    color: "#111",
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
});