import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Image,
  TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import BRAND from "../../config";

const BASE_URL = "https://ism-vms.s3.amazonaws.com/company-logo/";

const ProviderSelector = ({
  visitorType,
  theme,
  required,
  selectedProvider,
  setSelectedProvider,
  stylesFromParent = {},   // FIX 3: default fallback to avoid crash
}) => {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [search, setSearch] = useState("");

  if (visitorType !== "cab" && visitorType !== "delivery") {
    return null;
  }

  const deliveryCompanies = [
    { name: "Dominos", logo_url: `${BASE_URL}dominos.png` },
    { name: "Runnr", logo_url: `${BASE_URL}runnr.png` },
    { name: "Shadow fax", logo_url: `${BASE_URL}shadow-fax.png` },
    { name: "Snapdeal", logo_url: `${BASE_URL}snapdeal.png` },
    { name: "Swiggy", logo_url: `${BASE_URL}swiggy.png` },
    { name: "Uber eats", logo_url: `${BASE_URL}uber-eats.png` },
    { name: "UPS", logo_url: `${BASE_URL}ups.png` },
    { name: "Xpressbees", logo_url: `${BASE_URL}xpressbees.png` },
    { name: "Zomato", logo_url: `${BASE_URL}zomato.png` },
    { name: "Box8", logo_url: `${BASE_URL}box8.png` },
    { name: "DHL", logo_url: `${BASE_URL}dhl.png` },
    { name: "Pizza hut", logo_url: `${BASE_URL}pizza-hut.png` },
    { name: "Zop now", logo_url: `${BASE_URL}zop-now.png` },
    { name: "Licious", logo_url: `${BASE_URL}licious.png` },
    { name: "Firstcry", logo_url: `${BASE_URL}firstcry.png` },
    { name: "1mg", logo_url: `${BASE_URL}1MG.jpg` },
    { name: "Yatharth", logo_url: `${BASE_URL}Yatharth.png` },
    { name: "Ekart", logo_url: `${BASE_URL}ekart.png` },
    { name: "Flipkart", logo_url: `${BASE_URL}flipkart.png` },
    { name: "Amazon", logo_url: `${BASE_URL}amazon.png` },
    { name: "Bharat gas", logo_url: `${BASE_URL}bharat-gas.png` },
    { name: "Big basket", logo_url: `${BASE_URL}big-basket.png` },
    { name: "Delhivery", logo_url: `${BASE_URL}delhivery.png` },
    { name: "DTDC", logo_url: `${BASE_URL}dtdc.png` },
    { name: "Dunzo", logo_url: `${BASE_URL}dunzo.png` },
    { name: "Ecom express", logo_url: `${BASE_URL}ecom-express.png` },
    { name: "Faasos", logo_url: `${BASE_URL}faasos.png` },
    { name: "Fedex", logo_url: `${BASE_URL}fedex.png` },
    { name: "First flight", logo_url: `${BASE_URL}first-flight.png` },
    { name: "ABC Retail", logo_url: `${BASE_URL}abc.jpeg` },
    { name: "Food panda", logo_url: `${BASE_URL}food-panda.png` },
    { name: "Freshmenu", logo_url: `${BASE_URL}freshmenu.png` },
    { name: "Gati", logo_url: `${BASE_URL}gati.png` },
    { name: "Grofers", logo_url: `${BASE_URL}grofers.png` },
    { name: "HP Gas", logo_url: `${BASE_URL}hp-gas.png` },
    { name: "Indane", logo_url: `${BASE_URL}indane.png` },
    { name: "India post", logo_url: `${BASE_URL}india-post.png` },
    { name: "Myntra", logo_url: `${BASE_URL}myntra.png` },
    { name: "Paytm", logo_url: `${BASE_URL}paytm.png` },
  ];

  const cabCompanies = [
    { name: "Ola", logo_url: `${BASE_URL}ola.png` },
    { name: "Uber", logo_url: `${BASE_URL}uber.png` },
    { name: "Meru", logo_url: `${BASE_URL}meru.png` },
  ];

  const rawList = visitorType === "cab" ? cabCompanies : deliveryCompanies;

  // FIX 1: popularProviders is now actually used to build the quick row
  const popularProviders = ["Amazon", "Dominos", "Zop now"];

  let quickList = [];

  if (visitorType === "cab") {
    quickList = [{ name: "Custom", logo_url: null }, ...rawList];
  } else {
    // FIX 1: filter by popularProviders instead of hardcoded slice(0,3)
    let popularItems = rawList.filter((item) =>
      popularProviders.includes(item.name)
    );

    // FIX 4: if selected item came from modal, replace last slot so row stays fixed
    const isModalSelection =
      selectedProvider &&
      selectedProvider !== "Custom" &&
      !popularProviders.includes(selectedProvider);

    if (isModalSelection) {
      const selectedItem = rawList.find((item) => item.name === selectedProvider);
      if (selectedItem) {
        // Replace last popular item with the modal selection
        popularItems = [...popularItems.slice(0, -1), selectedItem];
      }
    }

    quickList = [
      { name: "Custom", logo_url: null },
      ...popularItems,
    ];
  }

  /* ================== MODAL LIST ================== */

  const providerList = rawList.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // FIX 2: clear search when closing modal
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
        setSearch(""); // FIX 2: clear search on item select
      }}
    >
      <View
        style={[
          styles.logoBox,
          // FIX 5: only change borderColor, not borderWidth (no layout shift)
          selectedProvider === item.name
            ? { borderColor: theme.primaryBlue, backgroundColor: "#E6F4FB" }
            : { borderColor: "transparent" },
        ]}
      >
        <Image source={{ uri: item.logo_url }} style={styles.logo} />
      </View>
      <Text style={{ marginTop: 6 }}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <>
      {/* Divider */}
      <View
        style={[
          stylesFromParent.horizontalLine,
          { backgroundColor: theme.border },
        ]}
      />

      {/* Card */}
      <View style={[stylesFromParent.card, { backgroundColor: theme.cardBg }]}>
        <Text style={[stylesFromParent.label, { color: theme.text }]}>
          {visitorType === "cab"
            ? "Select Cab Provider"
            : "Select Delivery Company"}
          {required && <Text style={{ color: "#EF4444" }}> *</Text>}
        </Text>

        {/* QUICK ROW */}
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
                  // FIX 5: only change borderColor, not borderWidth (no layout shift / blank image)
                  selectedProvider === item.name
                    ? { borderColor: "#000000", backgroundColor: "#E6F4FB" }
                    : { borderColor: "transparent" },
                ]}
              >
                {item.name === "Custom" ? (
                  <Ionicons
                    name="layers-outline"
                    size={26}
                    color={BRAND.COLORS.icon}
                  />
                ) : (
                  <Image source={{ uri: item.logo_url }} style={styles.logo} />
                )}
              </View>
              <Text style={styles.quickText}>{item.name}</Text>
            </TouchableOpacity>
          ))}

          {/* DELIVERY ONLY — More button */}
          {visitorType === "delivery" && (
            <TouchableOpacity
              style={styles.quickItem}
              onPress={() => setShowProviderModal(true)}
            >
              <View style={[styles.logoBox, { borderColor: "transparent" }]}>
                <Ionicons name="ellipsis-horizontal" size={20} />
              </View>
              <Text style={styles.quickText}>More</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* MODAL (Delivery only) */}
      {visitorType === "delivery" && (
        <Modal visible={showProviderModal} animationType="slide">
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delivery Companies</Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor="#9CA3AF"
                value={search}
                onChangeText={setSearch}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: "#111827"
                }}
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

/* ================== STYLES ================== */

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginTop: 12,

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
    borderWidth: 2,            // FIX 5: always present — no layout shift
    borderColor: "transparent", // FIX 5: transparent by default
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