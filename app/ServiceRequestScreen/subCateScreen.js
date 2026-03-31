// SubCategorySelectionScreen.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { usePermissions } from '../../Utils/ConetextApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import BRAND from '../config';
import AppHeader from '../components/AppHeader'; // ✅ Added AppHeader

const ICON_MAP = [
  { keys: ['electric', 'power'], name: 'electrical-services' },
  { keys: ['plumb', 'water'], name: 'plumbing' },
  { keys: ['ac', 'air'], name: 'ac-unit' },
  { keys: ['clean'], name: 'cleaning-services' },
  { keys: ['security'], name: 'security' },
  { keys: ['paint'], name: 'format-paint' },
  { keys: ['carp'], name: 'carpenter' },
  { keys: ['garden'], name: 'park' },
];

const getIcon = (name = '') => {
  const n = name.toLowerCase();
  const hit = ICON_MAP.find(m => m.keys.some(k => n.includes(k)));
  return hit?.name || 'handyman';
};

const SubCategorySelectionScreen = ({ navigation, route }) => {
  const { nightMode } = usePermissions();

  const selectedCategory = route?.params?.selectedCategory || {};
  const subCategories = selectedCategory?.sub_catagory || [];

  const theme = nightMode
    ? {
        bg: '#121212',
        surface: '#1E1E1E',
        border: '#2C2C2C',
        text: '#FFFFFF',
        sub: '#9CA3AF',
      }
    : {
        bg: '#F4F6FA', // Light background for better contrast
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        sub: '#6B7280',
      };

  return (
    <SafeAreaView style={[styles.root]} edges={['bottom']}>
      
      {/* 1. Standardized Header */}
      <AppHeader title={selectedCategory?.name || 'Select Issue'} />

      {/* 2. Issue Count Summary */}
      <View style={styles.summaryContainer}>
         <Text style={[styles.subtitle, { color: theme.sub }]}>
            Choose the specific {selectedCategory?.name?.toLowerCase()} issue ({subCategories.length})
          </Text>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {subCategories.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="search-off" size={48} color={theme.sub} />
            <Text style={{ marginTop: 10, color: theme.sub, fontSize: 15 }}>
              No issue types available
            </Text>
          </View>
        ) : (
          subCategories.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('complaintInput', {
                  category: selectedCategory,
                  subCategory: item,
                })
              }
            >
              <View style={[styles.iconBox, { backgroundColor: nightMode ? '#252525' : '#F0F7FF' }]}>
                <MaterialIcons
                  name={getIcon(item.name)}
                  size={24}
                  color={BRAND.COLORS.primary}
                />
              </View>

              <Text
                style={[styles.cardText, { color: theme.text }]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.sub}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SubCategorySelectionScreen;

const styles = StyleSheet.create({
  root: { flex: 1 ,    backgroundColor:'#ffff'
},

  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    // Subtle shadow
    elevation: 0.1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  cardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
});