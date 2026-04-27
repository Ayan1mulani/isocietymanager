import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { usePermissions } from '../../Utils/ConetextApi';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

// 💡 TIP: In a real app, you should fetch this list from your API 
// so the numbers change automatically based on the country.
const CONTACTS = [
  {
    id: '1',
    name: 'Emergency',
    phone: '112',
    image: 'https://cdn-icons-png.flaticon.com/512/7373/7373323.png'
  },
  {
    id: '2',
    name: 'Police',
    phone: '100',
    image: 'https://img.icons8.com/color/96/police-badge.png'
  },
  {
    id: '3',
    name: 'Ambulance',
    phone: '108',
    image: 'https://img.icons8.com/color/96/ambulance.png'
  },
  {
    id: '4',
    name: 'Fire',
    phone: '101',
    image: 'https://img.icons8.com/color/96/fire-truck.png'
  },
];

export default function ImportantContacts() {
  const { t } = useTranslation();
  const { nightMode } = usePermissions();

  const colors = nightMode ? {
    bg: '#1E1E2A',
    header: '#F9FAFB',
    icon: '#D1D5DB',
    name: '#F3F4F6',
    phone: '#9CA3AF',
    itemBorder: '#333348',
  } : {
    bg: 'transparent',
    header: '#374151',
    icon: '#374151',
    name: '#1F2937',
    phone: '#6B7280',
    itemBorder: '#E5E7EB',
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert(t('Error'), t('Unable to place call'))
    );
  };

  return (
    <View style={s.container}>
      <View style={s.sectionHeader}>
        <Ionicons name="call" size={20} color={colors.icon} style={{ marginRight: 8 }} />
        <Text style={[s.headerText, { color: colors.header }]}>
          {t("Important Contacts")}
        </Text>
      </View>

      <View style={s.row}>
        {CONTACTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.item, { borderColor: colors.itemBorder, backgroundColor: nightMode ? '#1E1E2A' : '#fff' }]}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: item.image }} style={s.avatar} />
            <Text style={[s.name, { color: colors.name }]} numberOfLines={1}>
              {t(item.name)}
            </Text>
            <Text style={[s.phone, { color: colors.phone }]}>
              {item.phone}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    marginHorizontal: 20, // 👈 Standardized to 20
    marginTop: 25,        // 👈 Standardized to 25
    marginBottom: 130,    // Keeps your bottom screen clearance
  },

  // ── New Header Styles ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Existing Grid Styles ──
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 0.4,

    borderWidth: 0.5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 6,
  },
  name: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  phone: {
    fontSize: 10,
    marginTop: 2,
  },
});