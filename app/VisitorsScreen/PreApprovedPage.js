import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import PreApprovedCard from './components/PreApprovedCard';
import AddPreVisitorModal from './components/AddPreVisitorModal';

const mockPreApprovedData = [
   { 
    id: '1', 
    name: 'Swiggy Delivery',
    category: 'Food Delivery',
    type: 'Delivery', 
    allowedPerDay: '3 entries/day',
    activeDays: [0, 1, 2, 3, 4, 5, 6],
    photo: 'https://images.livemint.com/img/2022/06/02/1600x900/swiggy-k8WH--621x414@LiveMint_1654170854420.jpg',
    phone: null,
    isActive: true,
    passId: '100044',
    createdDate: '2026-02-12',
  },
  { 
    id: '2', 
    name: 'Ramesh Kumar',
    category: 'Household Staff',
    type: 'Maid', 
    allowedPerDay: '2 entries/day',
    activeDays: [1, 2, 3, 4, 5],
    photo: 'https://img.freepik.com/premium-photo/indian-man-smiling-confident-young-indian-people-standing-isolated-white-background_875825-118427.jpg',
    phone: '9876543210',
    isActive: true,
    passId: '100045',
    createdDate: '2026-02-10',
  },
  { 
    id: '3', 
    name: 'Amazon Delivery',
    category: 'Package Delivery',
    type: 'Delivery', 
    allowedPerDay: '1 entry/day',
    activeDays: [0, 2, 4, 6],
    photo: 'https://tse2.mm.bing.net/th/id/OIP.JXzY1kSRgOqgKp03x8mdhAHaE7?cb=defcachec2&rs=1&pid=ImgDetMain&o=7&rm=3',
    phone: null,
    isActive: false,
    passId: '100046',
    createdDate: '2026-02-08',
  },
  
];

const PreApprovedPage = ({ nightMode }) => {
  const navigation = useNavigation(); // ✅ important

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); // ✅ MISSING BEFORE

  const theme = {
    background: nightMode ? '#121212' : '#FFFFFF',
    text: nightMode ? '#FFFFFF' : '#212529',
    textSecondary: nightMode ? '#9E9E9E' : '#6C757D',
    primary: '#1996D3',
    searchBg: nightMode ? '#2E2E2E' : '#F1F3F5',
  };

  const categories = [
    'All',
    ...new Set(mockPreApprovedData.map(item => item.category)),
  ];

  const filteredData = mockPreApprovedData.filter(item => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.phone && item.phone.includes(searchQuery));

    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.searchBg }]}>
          < Ionicons name="search-outline" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search name, category or phone"
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: showFilters ? theme.primary : theme.searchBg },
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          < Ionicons
            name="filter"
            size={20}
            color={showFilters ? '#fff' : theme.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      {showFilters && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === category
                      ? theme.primary
                      : theme.searchBg,
                },
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={{
                  color:
                    selectedCategory === category ? '#fff' : theme.text,
                }}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* List */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <PreApprovedCard
            item={item}
            theme={theme}
            onEdit={() => {}}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        < Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Modal */}
      <AddPreVisitorModal
        visible={showAddModal}
        nightMode={nightMode}
        onClose={() => setShowAddModal(false)}
        onSingleEntry={() => {
          setShowAddModal(false);
          setTimeout(() => {
            navigation.navigate('AddVisitor');
          }, 200);
        }}
        onPreApproved={() => {
          setShowAddModal(false);
          setTimeout(() => {
            navigation.navigate('AddPreVisitor');
          }, 200);
        }}
      />
    </View>
  );
};

export default PreApprovedPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

   searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 10,
      gap: 10,
    },


  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },

  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },

  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
});