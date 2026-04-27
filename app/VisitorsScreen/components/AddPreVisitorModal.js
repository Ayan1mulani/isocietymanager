import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import Text from '../../components/TranslatedText'; 

const PreApproveModal = ({
  visible,
  nightMode = false,
  onClose,
  onDelivery,
  onGuest,
  onCab,
}) => {

  const theme = {
    background: nightMode ? '#0F1115' : '#F6F8FC',
    overlay: 'rgba(0, 0, 0, 0.82)',
    text: nightMode ? '#F5F7FA' : '#1E293B',
    textSecondary: nightMode ? '#9CA3AF' : '#64748B',
    border: nightMode ? '#1F2937' : '#E5E7EB',
    primary: '#7C3AED',
    chevron: nightMode ? '#6B7280' : '#94A3B8',
    headlineText: '#FFFFFF',
    subText: 'rgba(255,255,255,0.8)',
  };

  // 2. ── Labels match keys in your JSON files ──
  const options = [
    { key: 'delivery', label: 'Delivery', icon: 'moped', onPress: onDelivery },
    { key: 'guest', label: 'Guest', icon: 'account-group', onPress: onGuest },
    { key: 'cab', label: 'Cab', icon: 'taxi', onPress: onCab },
  ];


  return (
<Modal
  visible={visible}
  transparent
  animationType="none"
  onRequestClose={onClose}
>
  <Pressable
    style={[styles.overlay, { backgroundColor: theme.overlay }]}
    onPress={onClose}
  >
    <View style={styles.headerArea}>
      <View style={styles.titleRow}>
        {/* 3. ── Automatically handled by global <Text> ── */}
        <Text style={[styles.headline, { color: theme.headlineText }]}>
          Add Visitor
        </Text>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          < Ionicons name="close" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.subheadline, { color: theme.subText }]}>
        Pre-approve visits for faster smoother entry
      </Text>
    </View>

    <TouchableOpacity
      activeOpacity={1}
      style={[
        styles.sheet,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
        },
      ]}
    >
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={styles.optionRow}
          onPress={opt.onPress}
          activeOpacity={0.75}
        >
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons
              name={opt.icon}
              size={26}
              color={theme.primary}
            />
          </View>

          <Text style={[styles.optionLabel, { color: theme.text }]}>
            {opt.label}
          </Text>

          < Ionicons
            name="chevron-forward"
            size={18}
            color={theme.chevron}
          />
        </TouchableOpacity>
      ))}
    </TouchableOpacity>
  </Pressable>
</Modal>
  );
};

export default PreApproveModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  /* Header */
  headerArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 20,
  },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  headline: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subheadline: {
    fontSize: 15,
    lineHeight: 22,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.54)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Sheet */
  sheet: {
    borderRadius: 25,
    overflow: 'hidden',
    borderWidth: 1,
    marginHorizontal: 15,
    marginBottom: 20,
    paddingVertical: 8,
  },

  /* Options */
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 24,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(124,58,237,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  optionLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
  },
});