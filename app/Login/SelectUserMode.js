import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import BRAND from '../config';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const { height } = Dimensions.get('window');

const AccountSelectorModal = ({ visible, onClose, accounts, onSelect }) => {
  const { t } = useTranslation();
  const [selectedAccount, setSelectedAccount] = useState(null);

  const handleSelect = (account) => {
    setSelectedAccount(account.user_id);
    setTimeout(() => {
      onSelect(account);
      setSelectedAccount(null);
    }, 150);
  };

  const renderAccountItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.accountCard,
        selectedAccount === item.user_id && styles.selectedCard
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.8}
    >
      <View style={styles.accountContent}>
        <View style={styles.iconContainer}>
          <Icon name="home" size={20} color={BRAND.COLORS.icon} />
        </View>

        <View style={styles.accountInfo}>
          {/* Typically user/society names from API are kept as-is, but you can wrap in t() if they are static keys */}
          <Text style={styles.accountName}>{item.name}</Text>
          <Text style={styles.accountDetail}>
            {item.society_name} {item.flat_no && `• ${t('Flat')} ${item.flat_no}`}
          </Text>
        </View>

        <View style={styles.checkContainer}>
          {selectedAccount === item.user_id ? (
            <View style={styles.selectedCheck}>
              <Icon name="check" size={16} color="#fff" />
            </View>
          ) : (
            <View style={styles.uncheckedCircle} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("Select Account")}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={accounts}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderAccountItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        </View>
      </View>
    </Modal>
  );
};

export default AccountSelectorModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    maxHeight: height * 0.8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#074B7C',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  accountCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCard: {
    backgroundColor: '#EEF7FF',
    borderColor: '#074B7C',
  },
  accountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.COLORS.iconbg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  accountDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  checkContainer: {
    marginLeft: 8,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#074B7C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
});