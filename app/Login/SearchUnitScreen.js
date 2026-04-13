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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ismServices } from '../../services/ismServices'; 
import BRAND from '../config';

const SearchUnitScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get data passed from Society Search
  const { token, societyId, societyName, mobile, email, name } = route.params || {};

  const [isLoading, setIsLoading] = useState(true);
  const [allFlats, setAllFlats] = useState([]);
  const [filteredFlats, setFilteredFlats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchFlats();
  }, []);

  const fetchFlats = async () => {
    setIsLoading(true);
    try {
      const response = await ismServices.getSocietyAssets(societyId, token);
      if (response?.status === 'success' && response.data?.flat_nos) {
        setAllFlats(response.data.flat_nos);
        setFilteredFlats(response.data.flat_nos);
      } else {
        Alert.alert("Notice", "No units found for this society.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load units.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredFlats(allFlats);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allFlats.filter(item => item.flat_no.toLowerCase().includes(lowerQuery));
    setFilteredFlats(filtered);
  };

 const handleSelectFlat = (flatNo) => {
    // Navigate to the final form, passing ALL data including the selected flat
    navigation.navigate("RegistrationForm", {
      token,
      societyId,
      societyName,
      mobile,
      email,
      name,
      flatNo // <-- Safely passed to the final step!
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Unit - {societyName}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#757575" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Flat / Unit No."
         placeholderTextColor="#605555"

          value={searchQuery}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
      </View>

      {/* Flat List */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#286bb8" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={filteredFlats}
       keyExtractor={(item, index) => item.flat_no + "_" + index}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.listItem} onPress={() => handleSelectFlat(item.flat_no)}>
              <Text style={styles.listText}>{item.flat_no}</Text>
              <Icon name="chevron-right" size={24} color="#ccc" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No units match your search.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

export default SearchUnitScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', backgroundColor: '#286bb8', padding: 15, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', margin: 15, borderRadius: 8, paddingHorizontal: 10 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  listText: { fontSize: 16, color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#777', fontSize: 16 }
});