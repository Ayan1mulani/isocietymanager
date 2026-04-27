// SubCategorySelectionScreen.js
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { usePermissions } from '../../Utils/ConetextApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import BRAND from '../config';
import AppHeader from '../components/AppHeader'; 

// ── Translation Imports ──
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

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
  const { t } = useTranslation(); // 👈 Init translation

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
        bg: '#F4F6FA', 
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        sub: '#6B7280',
      };

  return (
    // FIX: Applied theme.bg so night mode actually works!
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]} edges={['bottom']}>
      
      {/* 1. Standardized Header with translated title/fallback */}
      <AppHeader title={selectedCategory?.name ? t(selectedCategory.name) : t('Select Issue')} />

      {/* 2. Issue Count Summary */}
      <View style={styles.summaryContainer}>
         <Text style={[styles.subtitle, { color: theme.sub }]}>
            {t('Choose the specific issue for')} {selectedCategory?.name ? t(selectedCategory.name) : ''} ({subCategories.length})
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
              {t("No issue types available")}
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
                {/* Wrap subcategory name in t() to catch backend translations */}
                {t(item.name)}
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
  root: { 
    flex: 1, 
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