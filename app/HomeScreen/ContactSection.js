// ImportantContacts.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Linking, Alert,
} from 'react-native';
import { usePermissions } from '../../Utils/ConetextApi';

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
    header: '#60A5FA',
    name: '#F3F4F6',
    phone: '#9CA3AF',
    itemBorder: '#333348',
  } : {
    bg: '#FFFFFF',
    border: '#E5E7EB',
    header: '#074B7C',
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

      <Text style={[s.header, { color: t.header }]}>
        Important Contacts
      </Text>

      <View style={s.row}>
        {CONTACTS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[s.item, { borderColor: t.itemBorder }]}
            onPress={() => handleCall(item.phone)}
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
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 130,
  },

  header: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between', // 👈 equal spacing
  },

  item: {
    width: '23%', // 👈 ensures 4 items fit in any device
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
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