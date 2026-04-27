import { useTranslation } from 'react-i18next';
import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, FlatList, View, ActivityIndicator } from 'react-native';
import ComplaintCard from './complaintCard';
import { usePermissions } from '../../Utils/ConetextApi';
import { useNavigation } from '@react-navigation/native';
import BRAND from '../config';
import EmptyState from '../components/EmptyState';
import ComplaintStats from '../components/ComplaintStatsModal';
import Text from '../components/TranslatedText';


const TERMINAL_STATUSES = ['closed', 'resolved', 'completed', 'cancelled', 'rejected'];

export const getComplaintAction = (status, canReopen) => {
  const s = (status || '').toLowerCase().trim();
  if (TERMINAL_STATUSES.includes(s)) return canReopen ? 'reopen' : 'none';
  return 'close';
};

const THEME = {
  light: { backgroundColor: '#f4f7f9', textColor: '#333333', inactiveTextColor: '#6c757d' },
  dark:  { backgroundColor: '#121212', textColor: '#ffffff', inactiveTextColor: '#aaaaaa' },
};

const ComplaintRow = React.memo(({ item, nightMode, canReopen, onPress }) => {
  const action = getComplaintAction(item.status, canReopen);
  return (
    <ComplaintCard
      complaint={item}
      nightMode={nightMode}
      action={action}
      canReopen={canReopen}
      onPress={onPress}
    />
  );
});

const ComplaintListScreen = ({
  nightMode,
  status,
  complaints    = [],
  isLoading     = false,
  isLoadingMore = false,
  hasMore       = false,
  listBottomPadding = 190,
  onRefresh,
  onLoadMore,
  showStats  = false,
  canReopen  = false,
}) => {
  const navigation = useNavigation();
  const { nightMode: contextNightMode } = usePermissions();
  const { t } = useTranslation();

  const currentNightMode = nightMode !== undefined ? nightMode : contextNightMode;
  const currentTheme     = currentNightMode ? THEME.dark : THEME.light;

  const [selectedSegment, setSelectedSegment] = useState(null);

  const uniqueComplaints = useMemo(() => {
    const seen = new Set();
    return complaints.filter((item) => {
      const key = item.id ?? item.com_no;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [complaints]);

  // Dynamic filter matching Donut Chart exact selection
  const filteredComplaints = useMemo(() => {
    if (!selectedSegment) return uniqueComplaints;
    return uniqueComplaints.filter((c) =>
      (c.status || '').toLowerCase().trim() === selectedSegment
    );
  }, [uniqueComplaints, selectedSegment]);

  const renderItem = useCallback(({ item }) => {
    return (
      <ComplaintRow
        item={item}
        nightMode={currentNightMode}
        canReopen={canReopen}
        onPress={() =>
          navigation.navigate('ServiceRequestDetail', {
            complaint: item,
            canReopen,
            onGoBack:  onRefresh,
          })
        }
      />
    );
  }, [currentNightMode, canReopen, onRefresh, navigation]);

  const keyExtractor = useCallback((item, index) =>
    `complaint-${item.id ?? item.com_no ?? 'noid'}-${index}`,
  []);

  const handleEndReached = useCallback(() => {
  if (hasMore && !isLoadingMore && !isLoading && uniqueComplaints.length > 0){
      onLoadMore?.();
    }
  }, [hasMore, isLoadingMore, isLoading, filteredComplaints.length, onLoadMore]);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={BRAND.COLORS.primary} />
        <Text style={[styles.footerText, { color: currentTheme.inactiveTextColor }]}>
         {t("Loading more…")}
        </Text>
      </View>
    );
  }, [isLoadingMore, currentTheme.inactiveTextColor]);

  const listHeader = useMemo(() => {
    if (!showStats) return null;
    return (
      <ComplaintStats
        theme={currentTheme}
        nightMode={currentNightMode}
        onSegmentPress={setSelectedSegment}
        selectedSegment={selectedSegment}
      />
    );
  }, [showStats, currentTheme, currentNightMode, selectedSegment]);

  if (isLoading && uniqueComplaints.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: currentTheme.backgroundColor }]}>
        <ActivityIndicator size="large" color={BRAND.COLORS.primary} />
        <Text style={[styles.loadingText, { color: currentTheme.textColor }]}>
         {t("Loading")} {t(status)} {t("complaints...")}
        </Text>
      </View>
    );
  }

const emptyTitle = selectedSegment
  ? `${t("No")} ${t(selectedSegment)} ${t("Complaints")}`
  : `${t("No")} ${t(status)} ${t("Complaints")}`;
 
  const emptySubtitle = selectedSegment
  ? `${t("No")} ${t(selectedSegment)} ${t("complaints found")}`
  : t("Complaints will appear here once submitted");

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.backgroundColor }]}>
      <FlatList
       data={uniqueComplaints}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListFooterComponent={renderFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={30}
        windowSize={7}
        initialNumToRender={10}
        ListEmptyComponent={
          <EmptyState
            icon="mail-open-outline"
            title={emptyTitle}
            subtitle={emptySubtitle}
            theme={{ text: currentTheme.textColor, textSecondary: currentTheme.inactiveTextColor }}
          />
        }
        contentContainerStyle={
          uniqueComplaints.length === 0 ? styles.emptyContainer : { paddingBottom: listBottomPadding }
        }
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={onRefresh}
      />
    </View>
  );
};

export default React.memo(ComplaintListScreen, (prev, next) => {
  return (
    prev.complaints    === next.complaints    &&
    prev.isLoading     === next.isLoading     &&
    prev.isLoadingMore === next.isLoadingMore &&
    prev.hasMore       === next.hasMore       &&
    prev.nightMode     === next.nightMode     &&
    prev.canReopen     === next.canReopen     &&
    prev.showStats     === next.showStats     &&
    prev.status        === next.status
  );
});

const styles = StyleSheet.create({
  container:      { flex: 1 },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flexGrow: 1 },
  loadingText: { fontSize: 14, marginTop: 10, textAlign: 'center', fontWeight: '500' },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 8 },
  footerText: { fontSize: 13 },
});