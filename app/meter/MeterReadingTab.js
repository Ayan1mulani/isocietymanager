import React, { useEffect, useState, useRef } from "react";
import {
    View,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    RefreshControl,
    ScrollView,
    Modal,
    TouchableOpacity
} from "react-native";
import moment from "moment";
import "moment/locale/km"; // Import Khmer locale for moment
import { ismServices } from "../../services/ismServices";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import Text from "../components/TranslatedText";

const MeterReadingTab = () => {
    const { t, i18n } = useTranslation();
    const [data, setData] = useState([]);
    const [pageNo, setPageNo] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loadingLive, setLoadingLive] = useState(false);

    const onEndReachedCalledDuringMomentum = useRef(false);

    // Sync moment locale with app language
    useEffect(() => {
        moment.locale(i18n.language === 'km' ? 'km' : 'en');
    }, [i18n.language]);

    useEffect(() => {
        loadData(1);
    }, []);

    const loadData = async (page = 1) => {
        try {
            if (page === 1) setLoading(true);
            const res = await ismServices.getMeterReadings(page);

            if (res?.status === "success") {
                const newData = res.data || [];
                const formatted = newData.map((item) => ({
                    ...item,
                    // 🔥 Fixed to "en-IN" to keep numbers in English digits
                    grid: Number(item.grid).toLocaleString("en-IN"),
                    dg: Number(item.dg).toLocaleString("en-IN"),
                    time: moment(item.date_time).format("D MMM YY, h:mm A"),
                }));

                if (page === 1) {
                    setData(formatted);
                } else {
                    setData((prev) => [...prev, ...formatted]);
                }

                if (newData.length < 20) setHasMore(false);

                if (newData.length > 0 && page === 1) {
                    const latest = newData[0]?.updated_at || newData[0]?.date_time;
                    setLastSync(moment(latest).format("D MMM YY, h:mm A"));
                }
            }
        } catch (err) {
            console.log("Meter API Error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleInfoPress = async () => {
        setShowInfo(true);
        setLoadingLive(true);
        try {
            const res = await ismServices.getLiveMeterReading();
            if (res?.status === "success") setSelectedItem(res.data);
        } catch (e) {
            console.log("Live API error", e);
        } finally {
            setLoadingLive(false);
        }
    };

    const loadMore = async () => {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
        const nextPage = pageNo + 1;
        setPageNo(nextPage);
        await loadData(nextPage);
        setLoadingMore(false);
    };

    const onRefresh = () => {
        setRefreshing(true);
        setPageNo(1);
        setHasMore(true);
        loadData(1);
    };

    if (!loading && data.length === 0) {
        return (
            <View style={styles.loader}>
                <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>{t("No meter readings available")}</Text>
            </View>
        );
    }

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={styles.syncCard}>
                <View style={styles.syncLeft}>
                    <Text style={styles.syncText}>
                        {t("Last Sync")}: {lastSync || "--"}
                    </Text>
                </View>

                <TouchableOpacity style={styles.liveButton} onPress={handleInfoPress}>
                    <Ionicons name="pulse" size={16} color="#FFF" />
                    <Text style={styles.liveButtonText}>{t("Live")}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.tableHeaderRow}>
                <Text style={[styles.headerText, { flex: 2, paddingLeft: 16, textAlign: 'left' }]}>{t("Date & Time")}</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>{t("Grid (kW)")}</Text>
                <Text style={[styles.headerText, { flex: 1 }]}>{t("DG (kW)")}</Text>
            </View>
        </View>
    );

    const renderItem = ({ item, index }) => (
        <View style={[styles.row, index % 2 === 0 ? styles.rowLight : styles.rowDark]}>
            <Text style={[styles.cell, styles.timeCell, { flex: 2 }]}>{item.time}</Text>
            <View style={[styles.valueCellWrapper, { flex: 1 }]}><Text style={[styles.cell, styles.gridText]}>{item.grid}</Text></View>
            <View style={[styles.valueCellWrapper, { flex: 1 }]}><Text style={[styles.cell, styles.dgText]}>{item.dg}</Text></View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#2E8BC0" />
                <Text style={styles.loadingText}>{t("Fetching readings...")}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                stickyHeaderIndices={[0]}
                onEndReached={() => {
                    if (!onEndReachedCalledDuringMomentum.current) {
                        loadMore();
                        onEndReachedCalledDuringMomentum.current = true;
                    }
                }}
                onMomentumScrollBegin={() => { onEndReachedCalledDuringMomentum.current = false; }}
                onEndReachedThreshold={0.3}
                ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color="#2E8BC0" /></View> : null}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2E8BC0"]} />}
                contentContainerStyle={styles.listContent}
            />

            <Modal visible={showInfo} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.pulseDot} />
                                <Text style={styles.modalTitle}>{t("Live Meter Status")}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowInfo(false)}><Ionicons name="close" size={24} color="#6B7280" /></TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                            {loadingLive ? (
                                <View style={styles.modalLoader}>
                                    <ActivityIndicator size="large" color="#2E8BC0" />
                                    <Text style={styles.modalLoaderText}>{t("Contacting meter...")}</Text>
                                </View>
                            ) : selectedItem ? (
                                <View style={styles.modalDataContainer}>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("Meter ID")}</Text><Text style={styles.value}>{selectedItem.id}</Text></View>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("Unit Number")}</Text><Text style={styles.value}>{selectedItem.unit_no}</Text></View>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("Grid Reading")}</Text><Text style={[styles.value, { color: '#059669' }]}>{selectedItem.grid} kW</Text></View>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("DG Reading")}</Text><Text style={[styles.value, { color: '#D97706' }]}>{selectedItem.dg} kW</Text></View>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("AHU")}</Text><Text style={styles.value}>{selectedItem.ahu}</Text></View>
                                    <View style={styles.infoRow}><Text style={styles.label}>{t("Date Time")}</Text><Text style={styles.value}>{moment(selectedItem.date_time).format("D MMM YY, h:mm A")}</Text></View>
                                    <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.label}>{t("Last Updated")}</Text><Text style={styles.value}>{moment(selectedItem.updated_at).format("D MMM YY, h:mm A")}</Text></View>
                                </View>
                            ) : (
                                <View style={styles.modalLoader}>
                                    <Ionicons name="alert-circle-outline" size={32} color="#9CA3AF" />
                                    <Text style={styles.modalLoaderText}>{t("No live data available")}</Text>
                                </View>
                            )}
                        </ScrollView>

                        {!loadingLive && (
                            <TouchableOpacity style={styles.okButton} onPress={() => setShowInfo(false)}>
                                <Text style={styles.okText}>{t("Done")}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

export default MeterReadingTab;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "rgb(255, 255, 255)", // Soft modern background
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F4F6F9",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    emptyText: {
        marginTop: 12,
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    listContent: {
        paddingBottom: 30,
    },
    headerContainer: {
        backgroundColor: "#F4F6F9",
        paddingTop: 12,
    },
    syncCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    syncLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    syncText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
    },
    liveButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2E8BC0",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    liveButtonText: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "700",
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#b5a7e26b",
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: "#D1D5DB",
    },
    headerText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#4B5563",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        textAlign: "center",
    },
    row: {
        flexDirection: "row",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: "#F1F5F9",
    },
    rowLight: {
        backgroundColor: "#FFFFFF",
    },
    rowDark: {
        backgroundColor: "#FAFAFA",
    },
    cell: {
        fontSize: 13,
        textAlign: "center",
    },
    timeCell: {
        textAlign: 'left',
        paddingLeft: 16,
        color: "#4B5563",
        fontWeight: "500",
    },
    valueCellWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
    gridText: {
        color: "#059669", // Emerald green for Grid
        fontWeight: "700",
    },
    dgText: {
        color: "#D97706", // Amber orange for DG
        fontWeight: "700",
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: "center",
    },

    /* --- Modal Styles --- */
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(17, 24, 39, 0.6)", // Darker, sleeker overlay
        justifyContent: "center",
        alignItems: "center",
    },
    modalBox: {
        width: "88%",
        maxHeight: "85%",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderColor: "#F3F4F6",
        backgroundColor: "#FAFAFA",
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#10B981", // Success green
        marginRight: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#111827",
    },
    modalDataContainer: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    infoRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: "#F3F4F6",
    },
    label: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500",
    },
    value: {
        fontSize: 14,
        color: "#111827",
        fontWeight: "600",
        textAlign: "right",
        flex: 1,
        marginLeft: 20,
    },
    modalLoader: {
        paddingVertical: 40,
        alignItems: "center",
    },
    modalLoaderText: {
        marginTop: 12,
        color: "#6B7280",
        fontSize: 14,
        fontWeight: "500",
    },
    okButton: {
        backgroundColor: "#2E8BC0",
        marginHorizontal: 20,
        marginBottom: 20,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    okText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 15,
    },
});