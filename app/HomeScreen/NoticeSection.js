import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Modal,
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import { usePermissions } from '../../Utils/ConetextApi';
import { useNavigation } from '@react-navigation/native';
import { ismServices } from '../../services/ismServices';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 60;
const AUTO_SCROLL_INTERVAL = 4000; // 4 seconds

const NoticesSection = () => {
  const { nightMode } = usePermissions();
  const navigation = useNavigation();
  
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const flatListRef = useRef(null);
  const intervalRef = useRef(null);

  // Theme colors with notice board feel
  const theme = {
    light: {
      sectionBackground: '#F8F9FA',
      headerBackground: '#074B7C',
      cardBackground: '#FFFFFF',
      titleColor: '#FFFFFF',
      seeAllColor: '#FFFFFF',
      noticeTitleColor: '#1A1A1A',
      dateColor: '#666666',
      categoryTextColor: '#FFFFFF',
      borderColor: '#E5E5E5',
      shadowColor: 'rgba(0,0,0,0.15)',
    },
    dark: {
      sectionBackground: '#1A1A1A',
      headerBackground: '#2A2A2A',
      cardBackground: '#2F2F2F',
      titleColor: '#FFFFFF',
      seeAllColor: '#60A5FA',
      noticeTitleColor: '#FFFFFF',
      dateColor: '#CCCCCC',
      categoryTextColor: '#FFFFFF',
      borderColor: '#404040',
      shadowColor: 'rgba(255,255,255,0.1)',
    },
  };

  const currentTheme = nightMode ? theme.dark : theme.light;

  // Category info with notice board colors
  const getCategoryInfo = (category) => {
    switch (category) {
      case 'TICKER':
        return { 
          color: '#E74C3C', 
          icon: 'megaphone-outline',
          gradient: ['#E74C3C', '#C0392B'] 
        };
      case 'EVENT':
        return { 
          color: '#27AE60', 
          icon: 'calendar-outline',
          gradient: ['#27AE60', '#229954'] 
        };
      case 'NOTICE':
        return { 
          color: '#3498DB', 
          icon: 'document-text-outline',
          gradient: ['#3498DB', '#2980B9'] 
        };
      default:
        return { 
          color: '#3498DB', 
          icon: 'document-text-outline',
          gradient: ['#3498DB', '#2980B9'] 
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Auto scroll functionality
  useEffect(() => {
    if (notices.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % notices.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [notices.length]);

  // Fetch notices
  useEffect(() => {
    const fetchNotices = async () => {
      try {
        setLoading(true);
        const response = await ismServices.getMyNotices();
        if (response.data) {
          setNotices(response.data.slice(0, 5)); // Show up to 5 notices
        }
      } catch (error) {
        console.error('Error fetching notices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  // Handle manual scroll - update current index and restart auto-scroll
  const onScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    
    setCurrentIndex(pageNum);
    
    // Restart auto-scroll after manual scroll
    if (notices.length > 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % notices.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);
    }
  };

  // Open modal
  const openModal = (notice) => {
    // Pause auto scroll when modal opens
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSelectedNotice(notice);
    setModalVisible(true);
  };

  // Close modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedNotice(null);
    
    // Resume auto scroll when modal closes
    if (notices.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % notices.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, AUTO_SCROLL_INTERVAL);
    }
  };

  // Render notice card with notice board styling
  const renderNoticeCard = ({ item }) => {
    const { color, icon, gradient } = getCategoryInfo(item.category);
    
    return (
      <TouchableOpacity 
        style={[styles.noticeCard, { 
          backgroundColor: currentTheme.cardBackground,
          shadowColor: currentTheme.shadowColor,
          borderColor: currentTheme.borderColor,
          width: CARD_WIDTH 
        }]}
        onPress={() => openModal(item)}
        activeOpacity={0.9}
      >
        {/* Notice Header with gradient */}
        <LinearGradient
          colors={gradient}
          style={styles.noticeHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerLeft}>
            < Ionicons name={icon} size={18} color="#FFFFFF" />
            <Text style={styles.categoryLabel}>{item.category}</Text>
          </View>
          {!item.is_read && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>NEW</Text>
            </View>
          )}
        </LinearGradient>

        {/* Notice Content */}
        <View style={styles.noticeContent}>
          <Text 
            style={[styles.noticeTitle, { color: currentTheme.noticeTitleColor }]}
            numberOfLines={2}
          >
            {item.subject}
          </Text>
        
          <View style={styles.noticeFooter}>
            <View style={styles.dateContainer}>
              < Ionicons name="time-outline" size={14} color={currentTheme.dateColor} />
              <Text style={[styles.noticeDate, { color: currentTheme.dateColor }]}>
                Published: {formatDate(item.published_at)}
              </Text>
            </View>
            
            <View style={styles.readMoreContainer}>
              <Text style={[styles.readMoreText, { color }]}>Read More</Text>
              < Ionicons name="arrow-forward" size={14} color={color} />
            </View>
          </View>
        </View>

        {/* Corner decoration */}
        <View style={[styles.cornerDecoration, { backgroundColor: color }]} />
      </TouchableOpacity>
    );
  };

  // Render pagination dots
  const renderPaginationDots = () => {
    if (notices.length <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        {notices.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === currentIndex 
                  ? currentTheme.headerBackground 
                  : currentTheme.dateColor,
                opacity: index === currentIndex ? 1 : 0.3,
              }
            ]}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
        <LinearGradient
          colors={[currentTheme.headerBackground, currentTheme.headerBackground + 'DD']}
          style={styles.sectionHeader}
        >
          <Text style={[styles.sectionTitle, { color: currentTheme.titleColor }]}>
            📢 Society Notice Board
          </Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={currentTheme.headerBackground} />
          <Text style={[styles.loadingText, { color: currentTheme.dateColor }]}>
            Loading notices...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: currentTheme.sectionBackground }]}>
      {/* Notice Board Header */}
      <LinearGradient
        colors={[currentTheme.headerBackground, currentTheme.headerBackground + 'DD']}
        style={styles.sectionHeader}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.sectionTitle, { color: currentTheme.titleColor }]}>
            📢 Society Notice Board
          </Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notices')}
            style={styles.viewAllButton}
          >
            <Text style={[styles.viewAllText, { color: currentTheme.seeAllColor }]}>
              View All
            </Text>
            < Ionicons name="arrow-forward" size={14} color={currentTheme.seeAllColor} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {notices.length > 0 ? (
        <>
          <FlatList
            ref={flatListRef}
            data={notices}
            renderItem={renderNoticeCard}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
            onMomentumScrollEnd={onScrollEnd}
            onScrollBeginDrag={() => {
              // Pause auto-scroll when user starts dragging
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }}
            decelerationRate="fast"
            snapToInterval={CARD_WIDTH + 20}
            snapToAlignment="start"
            ItemSeparatorComponent={() => <View style={{ width: 20 }} />}
          />
          {renderPaginationDots()}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          < Ionicons name="document-outline" size={48} color={currentTheme.dateColor} />
          <Text style={[styles.emptyText, { color: currentTheme.dateColor }]}>
            No notices posted yet
          </Text>
        </View>
      )}

      {/* Full Screen Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: currentTheme.cardBackground }]}>
          {selectedNotice && (
            <>
              {/* Modal Header */}
              <LinearGradient
                colors={getCategoryInfo(selectedNotice.category).gradient}
                style={styles.modalHeader}
              >
                <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                  < Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                
                <View style={styles.modalHeaderContent}>
                  <View style={styles.modalCategoryInfo}>
                    < Ionicons name={getCategoryInfo(selectedNotice.category).icon} size={20} color="#FFFFFF" />
                    <Text style={styles.modalCategoryText}>
                      {selectedNotice.category}
                    </Text>
                  </View>
                  
                  <Text style={styles.modalTitle}>
                    {selectedNotice.subject}
                  </Text>
                  <Text style={styles.modalDate}>
                    Published: {formatDate(selectedNotice.published_at)}
                  </Text>
                </View>
              </LinearGradient>

              {/* WebView Content */}
              <WebView
                originWhitelist={['*']}
                source={{ html: selectedNotice.notice }}
                style={styles.webview}
                scalesPageToFit={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webviewLoading}>
                    <ActivityIndicator size="large" color={currentTheme.headerBackground} />
                  </View>
                )}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  carouselContainer: {
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  noticeCard: {
    borderRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  urgentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noticeContent: {
    padding: 16,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    lineHeight: 22,
  },
  noticeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeDate: {
    fontSize: 11,
    marginLeft: 4,
  },
  readMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  cornerDecoration: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 20,
  },
  closeButton: {
    marginRight: 16,
    marginTop: 4,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalCategoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 26,
  },
  modalDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});

export default NoticesSection;