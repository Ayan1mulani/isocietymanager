import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ismServices } from '../../services/ismServices'; // Adjust path
import BRAND from '../config'; // Adjust path

const SocietySearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Extract token and user data passed from OtpVerify
  const { token, mobile, email, name } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSocietyId, setSelectedSocietyId] = useState(null); // Controls the radio button

  // Debounced Search Effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        handleSearch(searchQuery.trim());
      } else {
        setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async (query) => {
    setIsLoading(true);
    try {
      const response = await ismServices.searchSociety(query, token);
      if (response && response.status === 'success') {
        setResults(response.data || []);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedSocietyId === item.id;
    const isRegistrationOpen = item.config?.user_registration;

    return (
      <TouchableOpacity
        style={styles.listItem}
        // 1. FIXED: Tapping the item ONLY selects the radio button. No navigation here.
        onPress={() => setSelectedSocietyId(item.id)} 
      >
        <View style={styles.listContent}>
          <Text style={styles.societyName}>{item.name}</Text>
          <Text style={styles.societyAddress}>{item.address.trim()}</Text>
          
          {isRegistrationOpen && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Registration Open</Text>
            </View>
          )}
        </View>
        <View style={styles.radioContainer}>
          <Icon
            name={isSelected ? "radio-button-checked" : "radio-button-unchecked"}
            size={24}
            color={isSelected ? "#286bb8" : "#9e9e9e"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => (
    <TouchableOpacity style={styles.listItem} onPress={() => {/* Handle manual request */}}>
      <View style={styles.listContent}>
        <Text style={styles.societyName}>Not Found for what you are searching for?</Text>
        <Text style={styles.societyAddress}>Click here to Request and Register with us</Text>
      </View>
      <View style={styles.radioContainer}>
        <Icon name="radio-button-unchecked" size={24} color="#9e9e9e" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sign Up</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Society"
          placeholderTextColor="#605555"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && <ActivityIndicator size="small" color="#286bb8" style={{ marginRight: 10 }} />}
      </View>

      {/* Results List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListFooterComponent={searchQuery.length > 0 ? renderFooter : null}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      
      {/* 2. FIXED: Proceed Button appears when a society is selected and navigates to SearchUnit */}
      {selectedSocietyId && (
        <TouchableOpacity 
          style={styles.nextButton} 
          onPress={() => {
            const selectedSoc = results.find(s => s.id === selectedSocietyId);
            
            navigation.navigate("SearchUnit", {
              token: token,
              societyId: selectedSocietyId,
              societyName: selectedSoc?.name,
              mobile: mobile,
              email: email,
              name: name
            });
          }}
        >
          <Text style={styles.nextButtonText}>Proceed</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default SocietySearchScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', backgroundColor: '#286bb8', padding: 15, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', margin: 10, borderRadius: 8, paddingHorizontal: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 16, color: '#000' },
  listItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eeeeee', alignItems: 'center' },
  listContent: { flex: 1, paddingRight: 10 },
  societyName: { fontSize: 16, color: '#000', marginBottom: 4 },
  societyAddress: { fontSize: 13, color: '#757575', marginBottom: 8 },
  badge: { backgroundColor: '#4caf50', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  radioContainer: { justifyContent: 'center', alignItems: 'center' },
  nextButton: { backgroundColor: '#286bb8', margin: 15, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});