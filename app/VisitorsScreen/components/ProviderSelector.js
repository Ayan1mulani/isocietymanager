import React, { useEffect, useState } from "react";
import {
  View, TouchableOpacity, Modal, FlatList,
  StyleSheet, Image, TextInput, ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { ismServices } from "../../../services/ismServices";

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../../components/TranslatedText'; 

const ProviderSelector = ({
  visitorType,
  theme,
  required,
  selectedProvider,
  setSelectedProvider,
  stylesFromParent = {},
}) => {
  const { t } = useTranslation(); // 👈 Init translation
  
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [search, setSearch] = useState("");
  const [allCompanies, setAllCompanies] = useState([]);  
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  if (visitorType !== "cab" && visitorType !== "delivery") return null;

  // ✅ Fetch from API & Cache Images
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const category = visitorType === "cab" ? "cab" : "delivery";
        const res = await ismServices.getMasterCompanies(category);
        if (res?.status === "success") {
          console.log("Fetched companies:", res.data);
          
          // Normalize and PRE-FETCH IMAGES for instant loading
          const normalized = (res.data || []).map((item) => {
            if (item.icon) {
              Image.prefetch(item.icon); // 🚀 This caches the image in the background instantly!
            }
            return {
              name: item.name,
              logo_url: item.icon,
            };
          });
          
          setAllCompanies(normalized);
        }
      } catch (err) {
        console.log("ProviderSelector fetch error:", err);
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [visitorType]);

  // ✅ Popular providers shown in quick row
  const popularProviders = ["Amazon", "Dominos", "Zomato"];

  let quickList = [];

  if (visitorType === "cab") {
    quickList = [...allCompanies];
  } else {
    let popularItems = allCompanies.filter((item) =>
      popularProviders.includes(item.name)
    );

    // If fewer than 3 popular found, fill from top of list
    if (popularItems.length < 3) {
      const extras = allCompanies
        .filter((item) => !popularProviders.includes(item.name))
        .slice(0, 3 - popularItems.length);
      popularItems = [...popularItems, ...extras];
    }

    // If selected came from modal, replace last quick slot
    const isModalSelection =
      selectedProvider &&
      !popularItems.find((item) => item.name === selectedProvider);

    if (isModalSelection) {
      const selectedItem = allCompanies.find((item) => item.name === selectedProvider);
      if (selectedItem) {
        popularItems = [...popularItems.slice(0, 2), selectedItem];
      }
    }

    quickList = popularItems;
  }

  // Modal list filtered by search
  const providerList = allCompanies.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseModal = () => {
    setShowProviderModal(false);
    setSearch("");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.modalItem}
      onPress={() => {
        setSelectedProvider(item.name);
        setShowProviderModal(false);
        setSearch("");
      }}
    >
      <View
        style={[
          styles.logoBox,
          selectedProvider === item.name
            ? { borderColor: theme.primaryBlue, backgroundColor: "#E6F4FB" }
            : { borderColor: "transparent" },
        ]}
      >
        <Image 
          source={{ uri: item.logo_url, cache: 'force-cache' }} // 🚀 Force cache usage
          style={styles.logo} 
        />
      </View>
      <Text style={{ marginTop: 6, fontSize: 11, textAlign: "center", color: '#111827' }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={[stylesFromParent.horizontalLine, { backgroundColor: theme.border }]} />

      <View style={[stylesFromParent.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[stylesFromParent.label, { color: theme.text }]}>
          {visitorType === "cab" ? t("Select Cab Provider") : t("Select Delivery Company")}
          {required && <Text style={{ color: "#EF4444" }}> *</Text>}
        </Text>

        {loadingCompanies ? (
          <ActivityIndicator
            size="small"
            color={theme.primaryBlue || "#1565A9"}
            style={{ marginTop: 12 }}
          />
        ) : (
          <View style={styles.row}>
            {quickList.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={styles.quickItem}
                onPress={() => setSelectedProvider(item.name)}
              >
                <View
                  style={[
                    styles.logoBox,
                    selectedProvider === item.name
                      ? { borderColor: "#000000", backgroundColor: "#E6F4FB" }
                      : { borderColor: "transparent" },
                  ]}
                >
                  <Image 
                    source={{ uri: item.logo_url, cache: 'force-cache' }} // 🚀 Force cache usage
                    style={styles.logo} 
                  />
                </View>
                <Text style={[styles.quickText, { color: theme.text }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}

            {/* More button — delivery only */}
            {visitorType === "delivery" && (
              <TouchableOpacity
                style={styles.quickItem}
                onPress={() => setShowProviderModal(true)}
              >
                <View style={[styles.logoBox, { borderColor: "transparent", backgroundColor: theme.inputBg || '#F3F4F6' }]}>
                  <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
                </View>
                <Text style={[styles.quickText, { color: theme.text }]}>{t("More")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Modal */}
      {visitorType === "delivery" && (
        <Modal visible={showProviderModal} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg || '#FFFFFF' }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("Delivery Companies")}</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBox, { backgroundColor: theme.inputBg || "#F1F3F5" }]}>
              <Ionicons name="search" size={18} color={theme.textSecondary || '#9CA3AF'} />
              <TextInput
                placeholder={t("Search...")}
                placeholderTextColor={theme.textSecondary || "#9CA3AF"}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, marginLeft: 8, color: theme.text || "#111827" }}
              />
            </View>

            <FlatList
              data={providerList}
              renderItem={renderItem}
              keyExtractor={(item) => item.name}
              numColumns={4}
              contentContainerStyle={{ padding: 20 }}
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
};

export default ProviderSelector;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: 12,
    flexWrap: "wrap",
  },
  quickItem: {
    alignItems: "center",
    marginRight: 18,
    marginBottom: 8,
  },
  logoBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 6,
    borderWidth: 2,
    borderColor: "transparent",
  },
  logo: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  quickText: {
    fontSize: 11,
    textAlign: "center",
  },
  modalHeader: {
    backgroundColor: "#2E6AA3",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F3F5",
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  modalItem: {
    flex: 1,
    alignItems: "center",
    marginBottom: 20,
  },
});