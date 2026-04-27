import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import { usePermissions } from '../../Utils/ConetextApi';
import { ismServices } from '../../services/ismServices';
import BRAND from '../config';
import { useTranslation } from 'react-i18next';
import Text from '../components/TranslatedText';

const THEME = {
  primary: BRAND.COLORS.primary,
  bgLight: '#F4F7F9',
  cardLight: '#FFFFFF',
  textDark: '#333333',
  textLight: '#FFFFFF',
  mute: '#6C757D',
  shadow: 'rgba(0,0,0,0.1)',
  ticker: '#FF6B6B',
  event: '#4ECDC4',
  notice: '#45B7D1',
};

const categoryInfo = (cat) => {
  switch (cat) {
    case 'TICKER': return { color: THEME.ticker, icon: 'newspaper-outline' };
    case 'EVENT':  return { color: THEME.event,  icon: 'calendar-outline' };
    default:       return { color: THEME.notice, icon: 'notifications-outline' };
  }
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

export default function NoticesScreen() {
  // Initialize translation hook
  const { t, i18n } = useTranslation();
  const { nightMode } = usePermissions();
  
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  const theme = {
    bg: nightMode ? '#121212' : THEME.bgLight,
    card: nightMode ? '#1E1E1E' : THEME.cardLight,
    text: nightMode ? THEME.textLight : THEME.textDark,
    sub: nightMode ? '#AAAAAA' : THEME.mute,
    shadow: nightMode ? 'rgba(255,255,255,0.05)' : THEME.shadow,
  };

  const formatDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(i18n.language === 'km' ? 'km-KH' : 'en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
    } catch {
      return d;
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await ismServices.getMyNotices();
        setNotices(res.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openModal = (item) => {
    setSelected(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelected(null);
  };

  const renderCard = ({ item }) => {
    const { color, icon } = categoryInfo(item.category);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}
        activeOpacity={0.8}
        onPress={() => openModal(item)}
      >
        <View style={styles.cardHeader}>
          <Ionicons name={icon} size={18} color={color} />
          <Text style={[styles.badge, { backgroundColor: color }]}>
            {t(item.category)}
          </Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {item.subject}
        </Text>
        <Text style={[styles.date, { color: theme.sub }]}>
          {formatDate(item.published_at)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
        <Text style={styles.loadingText}>{t("Loading Notices...")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={notices}
        keyExtractor={i => i.id.toString()}
        renderItem={renderCard}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: theme.sub }}>{t("No notices available")}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={[styles.modal, { backgroundColor: theme.bg }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            {selected && (() => {
              const { color, icon } = categoryInfo(selected.category);
              return (
                <>
                  <Ionicons name={icon} size={20} color={color} />
                  <Text style={[styles.modalBadge, { backgroundColor: color }]}>
                    {t(selected.category)}
                  </Text>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    {selected.subject}
                  </Text>
                  <Text style={[styles.modalDate, { color: theme.sub }]}>
                    {formatDate(selected.published_at)}
                  </Text>
                </>
              );
            })()}
          </View>
          {selected && (
            <WebView
              originWhitelist={['*']}
              source={{ html: selected.notice }}
              style={{ flex: 1, backgroundColor: 'transparent' }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F4F6F9",
  },
  loadingText: {
    fontSize: 13,
    color: "#9CA3AF",
  },

  card: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    overflow: 'hidden',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    marginRight: 16,
  },
  modalBadge: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    overflow: 'hidden',
  },
  modalTitle: {
    width: '100%',
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  modalDate: {
    width: '100%',
    marginTop: 4,
    fontSize: 12,
  },
});
