import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Linking, Alert,
} from 'react-native';
import { usePermissions } from '../../Utils/ConetextApi';
import Ionicons from 'react-native-vector-icons/Ionicons'; // 👈 Added for the standard header icon

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
  const { nightMode } = usePermissions();

  const t = nightMode ? {
    bg: '#1E1E2A',
    border: '#2C2C3E',
    header: '#F9FAFB', // Updated to match other standard headers in dark mode
    icon: '#D1D5DB',
    name: '#F3F4F6',
    phone: '#9CA3AF',
    itemBorder: '#333348',
  } : {
    bg: 'transparent', // Removed the white box so it sits cleanly on the screen background
    border: 'transparent',
    header: '#374151', // Standardized dark gray header
    icon: '#374151',
    name: '#1F2937',
    phone: '#6B7280',
    itemBorder: '#E5E7EB',
  };

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'Unable to place call')
    );
  };

  return (
    <View style={[s.container, { backgroundColor: t.bg, borderColor: t.border }]}>

      {/* ── Standardized Header ── */}
      <View style={s.sectionHeader}>
        <Ionicons
          name="call"
          size={20}
          color={t.icon}
          style={{ marginRight: 8 }}
        />
        <Text style={[s.headerText, { color: t.header }]}>
          Important Contacts
        </Text>
      </View>

      <View style={s.row}>
        {CONTACTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.item, { borderColor: t.itemBorder, backgroundColor: nightMode ? '#1E1E2A' : '#fff' }]}
            onPress={() => handleCall(item.phone)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: item.image }} style={s.avatar} />

            <Text style={[s.name, { color: t.name }]} numberOfLines={1}>
              {item.name}
            </Text>

            <Text style={[s.phone, { color: t.phone }]}>
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
    elevation: 0.3,

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