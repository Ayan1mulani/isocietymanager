import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height } = Dimensions.get('window');

const FlatSwitcherModal = ({
  visible,
  onClose,
  flats,
  selectedAccount,
  onSelect,
}) => {

  const renderItem = ({ item }) => {
    const isSelected =
      selectedAccount?.society_id === item.society_id;

    return (
      <TouchableOpacity
        style={[
          styles.itemContainer,
          isSelected && styles.selectedItem,
        ]}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        activeOpacity={0.75}
      >
        <View style={styles.itemRow}>
          < Ionicons
            name="business-outline"
            size={20}
            color={isSelected ? '#074B7C' : '#6B7280'}
          />

          <View style={styles.textContainer}>
            <Text
              style={[
                styles.nameText,
                isSelected && styles.selectedText,
              ]}
            >
              {item.name}
            </Text>
            <Text style={styles.subText}>
              {item.society_name}
            </Text>
          </View>

          {isSelected && (
            < Ionicons
              name="checkmark-circle"
              size={20}
              color="#074B7C"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Switch Account</Text>
            <TouchableOpacity onPress={onClose}>
              < Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={flats}
            keyExtractor={(item, index) =>
              `${item.society_id}_${index}`
            }
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => (
              <View style={styles.divider} />
            )}
          />

        </View>
      </View>
    </Modal>
  );
};

export default FlatSwitcherModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    maxHeight: height * 0.75,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  itemContainer: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  selectedItem: {
    backgroundColor: '#F5FAFF',
    borderRadius: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectedText: {
    color: '#074B7C',
  },
  subText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F1F1',
    marginLeft: 32,
  },
});