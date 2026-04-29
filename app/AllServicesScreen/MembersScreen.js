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

import AppHeader from "../components/AppHeader";
import { visitorServices } from "../../services/visitorServices";

const CACHE_KEY = '@family_members_cache'; // ✅ Cache Key added

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
    <View style={[styles.card, { zIndex: menuIndex === index ? 100 : 1 }]}>
      <View style={styles.avatar}>
        {item.image_src ? (
          <Image
            source={{ uri: item.image_src }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="person" size={22} color="#6B7280" />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>{t(item.relation)}</Text>
        <Text style={styles.sub}>{item.phone_no}</Text>
      </View>

      <TouchableOpacity onPress={() => setMenuIndex(menuIndex === index ? null : index)}>
        <Ionicons name="ellipsis-vertical" size={20} color="#6B7280" />
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
          <View style={[styles.avatar, { backgroundColor: "#E5E7EB" }]} />
          
          <View style={{ flex: 1 }}>
            {/* Name Skeleton */}
            <View style={{ width: '60%', height: 16, backgroundColor: "#E5E7EB", borderRadius: 4, marginBottom: 6 }} />
            {/* Relation Skeleton */}
            <View style={{ width: '40%', height: 12, backgroundColor: "#E5E7EB", borderRadius: 4, marginBottom: 6 }} />
            {/* Phone Skeleton */}
            <View style={{ width: '50%', height: 12, backgroundColor: "#E5E7EB", borderRadius: 4 }} />
          </View>

          {/* Menu Icon Skeleton */}
          <View style={{ width: 4, height: 16, backgroundColor: "#E5E7EB", borderRadius: 2 }} />
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
              colors={["#1565A9"]}
              tintColor="#1565A9"
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
    backgroundColor: "#F4F6F9",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "visible",   
    zIndex: 1,             
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF2F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
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
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    width: 130,
    paddingVertical: 6,
    elevation: 8,
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
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1565A9",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
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
    backgroundColor: "#1565A9",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
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