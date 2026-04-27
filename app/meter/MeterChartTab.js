import React, { useEffect, useState, useMemo } from "react";
import { View, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { ismServices } from "../../services/ismServices";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const MeterChartTab = () => {
  const { t, i18n } = useTranslation();
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await ismServices.getMeterConsumption();
      if (res?.status === "success" && res?.data?.length > 0) {
        setRawData(res.data);
      }
    } catch (e) {
      console.log("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleBarPress = (index) => {
    setSelectedIndex(selectedIndex === index ? null : index);
  };

  const { chartData, stats } = useMemo(() => {
    if (!rawData || rawData.length === 0) {
      return { chartData: [], stats: { grid: 0, dg: 0, ahu: 0 } };
    }

    const barData = [];
    let totalGrid = 0;
    let totalDg = 0;
    let totalAhu = 0;

    rawData.forEach((item, index) => {
      if (!item || typeof item.time !== 'string' || item.time.length < 8) return;

      const day = item.time.slice(6, 8);
      const month = parseInt(item.time.slice(4, 6));
      
      // Localized month name
      const monthName = new Date(2026, month - 1).toLocaleString(i18n.language === 'km' ? 'km-KH' : 'en-US', { month: 'short' });
      const label = `${day} ${monthName}`;

      const gridVal = Number(item.grid) || 0;
      const dgVal = Number(item.dg) || 0;
      const ahuVal = Number(item.ahu) || 0;

      totalGrid += gridVal;
      totalDg += dgVal;
      totalAhu += ahuVal;

      const gridBarIndex = index * 2;
      const dgBarIndex = index * 2 + 1;

      // Grid bar
      barData.push({
        value: gridVal,
        label: label,
        frontColor: '#10B981',
        spacing: 4,
        labelWidth: 50,
        labelTextStyle: { fontSize: 10, color: '#9CA3AF' },
        onPress: () => handleBarPress(gridBarIndex),
        topLabelComponent: () =>
          selectedIndex === gridBarIndex ? (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipValue} numberOfLines={1} adjustsFontSizeToFit>
                {gridVal.toFixed(1)}
              </Text>
            </View>
          ) : null,
      });

      // DG bar
      barData.push({
        value: dgVal,
        frontColor: '#F59E0B',
        onPress: () => handleBarPress(dgBarIndex),
        topLabelComponent: () =>
          selectedIndex === dgBarIndex ? (
            <View style={styles.tooltip}>
              <Text style={styles.tooltipValue} numberOfLines={1} adjustsFontSizeToFit>
                {dgVal.toFixed(1)}
              </Text>
            </View>
          ) : null,
      });
    });

    return {
      chartData: barData,
      stats: { grid: totalGrid, dg: totalDg, ahu: totalAhu }
    };
  }, [rawData, selectedIndex, i18n.language]); // Re-calculate when language changes

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E8BC0" />
      </View>
    );
  }

  if (chartData.length === 0) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>{t("No data available")}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{t("Energy Breakdown")}</Text>
        <Text style={styles.subtitle}>{t("Grid & generator usage")}</Text>
      </View>

      <View style={styles.chartCard}>
        <BarChart
          data={chartData}
          barWidth={25}
          spacing={25}
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ fontSize: 10, color: '#9CA3AF' }}
          rulesColor="#F3F4F6"
          rulesType="dashed"
          noOfSections={4}
          maxValue={Math.max(...chartData.map(d => d.value)) * 1.3 || 100}
          isAnimated
          animationDuration={300}
          height={200}
          yAxisLabelSuffix=" kW"
          showScrollIndicator={false}
          initialSpacing={20}
          endSpacing={20}
          nestedScrollEnabled={true}
          topLabelContainerStyle={{ marginBottom: 10 }}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>{t("Grid")}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>{t("DG")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t("Grid Supply")}</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.grid.toFixed(1)} {t("kWh")}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t("DG Supply")}</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.dg.toFixed(1)} {t("kWh")}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t("AHU Usage")}</Text>
          <Text style={styles.statValue}>{stats.ahu.toFixed(1)} {t("kWh")}</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t("Total Usage")}</Text>
          <Text style={styles.statValue}>{(stats.grid + stats.dg).toFixed(1)} {t("kWh")}</Text>
        </View>
      </View>
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 20,
    paddingLeft: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  // ✅ ADDED BACK AND MODIFIED TOOLTIP STYLES
  tooltip: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',

    width: 60, 
  },
  tooltipValue: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginTop: 16,
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    width: '47%', 
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
});

export default MeterChartTab;