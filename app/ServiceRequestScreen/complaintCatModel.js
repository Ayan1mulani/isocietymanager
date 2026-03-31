import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TextInput
} from 'react-native';

import { usePermissions } from '../../Utils/ConetextApi';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { complaintService } from '../../services/complaintService';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BRAND from '../config';
import AppHeader from '../components/AppHeader';

const { width } = Dimensions.get('window');
const H_PADDING = 16;
const GAP = 10;
const CARD_WIDTH = (width - H_PADDING * 2 - GAP * 2) / 3;

const CategorySelectionScreen = () => {
  const { nightMode } = usePermissions();
  const navigation = useNavigation();

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = nightMode
    ? {
        background: '#121212',
        surface: '#1E1E1E',
        border: '#2C2C2C',
        text: '#FFFFFF',
        secondary: '#9CA3AF',
        searchBg: '#2A2A2A',
      }
    : {
        background: '#FFFFFF',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        secondary: '#6B7280', // Slightly adjusted for visibility
        searchBg: '#F3F4F6',
      };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await complaintService.getCategories();
      const list = Object.values(res.data).map((c) => ({
        id: c.id,
        name: c.name,
        sub_catagory: c.sub_catagory || [],
      }));
      setCategories(list);
    } catch (e) {
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const rows = [];
  for (let i = 0; i < filtered.length; i += 3) {
    rows.push(filtered.slice(i, i + 3));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['bottom']}>
      {/* 1. Header fixed at top */}
      <AppHeader title={"Select Category"} />

      {loading ? (
        /* 2. Loader centered in the remaining space */
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={BRAND.COLORS.primary} />
          <Text style={{ marginTop: 12, color: theme.secondary, fontWeight: '500' }}>
            Loading categories...
          </Text>
        </View>
      ) : (
        /* 3. Content loaded after loading is false */
        <View style={{ flex: 1 }}>
          {/* SEARCH BAR */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.searchBg, borderColor: theme.border, marginTop: 10 }
            ]}
          >
            <Ionicons name="search" size={18} color={theme.secondary} />
            <TextInput
              placeholder="Search category..."
              placeholderTextColor={theme.secondary}
              value={search}
              onChangeText={setSearch}
              style={[styles.searchInput, { color: theme.text }]}
            />
            {search !== "" && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color={theme.secondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* GRID */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color={theme.secondary} />
                <Text style={{ marginTop: 10, color: theme.secondary, fontSize: 15 }}>
                  No categories found
                </Text>
              </View>
            ) : (
              rows.map((row, index) => (
                <View key={index} style={styles.row}>
                  {row.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.card,
                        {
                          backgroundColor: theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() =>
                        navigation.navigate('SubCategorySelection', {
                          selectedCategory: item,
                        })
                      }
                    >
                      <Text
                        style={[styles.cardText, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Invisible cards to maintain grid alignment */}
                  {row.length < 3 &&
                    Array.from({ length: 3 - row.length }).map((_, i) => (
                      <View key={i} style={{ width: CARD_WIDTH }} />
                    ))}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

export default CategorySelectionScreen;

const styles = StyleSheet.create({
  loader: {
    flex: 1, // Takes all space below header
    justifyContent: 'center', // Centers vertically
    alignItems: 'center', // Centers horizontally
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: H_PADDING,
    marginBottom: 14,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    marginBottom: GAP,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 15,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Elevation for better UI
    elevation: 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
});