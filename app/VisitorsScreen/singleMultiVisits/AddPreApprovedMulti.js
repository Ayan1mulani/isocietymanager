import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Modal,
} from "react-native";
import CalendarSelector from "../components/Calender";
import Ionicons from "react-native-vector-icons/Ionicons";

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const AddPreApprovedMulti = ({ navigation }) => {

    const theme = {
        cardBg: "#FFFFFF",
        text: "#1F2937",
        textSecondary: "#6B7280",
        inputBg: "#F9FAFB",
        border: "#E5E7EB",
        primaryBlue: "#1996D3",
    };

    /* Category Groups */
    const popular = [
        { label: "Cook", icon: "restaurant-outline" },
        { label: "Maid", icon: "home-outline" },
        { label: "Driver", icon: "car-outline" },
        { label: "Plumber", icon: "construct-outline" },
    ];

    const utility = [
        { label: "Electrician", icon: "flash-outline" },
        { label: "AC Service", icon: "snow-outline" },
        { label: "Pest Control", icon: "bug-outline" },
        { label: "Internet Service", icon: "wifi-outline" },
    ];

    const otherServices = [
        { label: "Technician", icon: "build-outline" },
        { label: "Gardener", icon: "leaf-outline" },
        { label: "Security", icon: "shield-outline" },
        { label: "Tutor", icon: "book-outline" },
    ];

    /* States */
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [category, setCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [selectedDays, setSelectedDays] = useState([]);
    const [entriesPerDay, setEntriesPerDay] = useState(1);
    const [durationType, setDurationType] = useState("1week");

    const setPresetDuration = (days) => {
        const today = new Date();
        const end = new Date();
        end.setDate(today.getDate() + days);

        setStartDate(today.toISOString().split("T")[0]);
        setEndDate(end.toISOString().split("T")[0]);
    };

    const toggleDay = (day) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const handleSubmit = () => {
        if (!name || !phone || !category || !startDate || !endDate) {
            Alert.alert("Missing Fields", "Please complete all required fields");
            return;
        }

        Alert.alert("Success", "Access saved successfully");
        navigation?.goBack();
    };

    const renderCategoryBlock = (title, list) => (
        <>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.grid}>
                {list.map((item) => {
                    const active = category === item.label;
                    return (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.gridItem}
                            onPress={() => {
                                setCategory(item.label);
                                setShowModal(false);
                            }}
                        >
                            <View
                                style={[
                                    styles.iconBox,
                                    {
                                        backgroundColor: theme.inputBg,
                                        borderColor: active
                                            ? theme.primaryBlue
                                            : theme.border,
                                        borderWidth: 1,
                                    },
                                ]}
                            >
                                < Ionicons
                                    name={item.icon}
                                    size={22}
                                    color={
                                        active
                                            ? theme.primaryBlue
                                            : theme.textSecondary
                                    }
                                />
                            </View>
                            <Text style={styles.iconLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </>
    );

    return (
        <ScrollView showsVerticalScrollIndicator={false}>

            {/* Name */}
            <View style={styles.card}>
                <Text style={styles.label}>Visitor Name *</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter visitor name"
                    style={styles.input}
                />
            </View>

            {/* Mobile */}
            <View style={styles.card}>
                <Text style={styles.label}>Mobile Number *</Text>
                <View style={styles.phoneRow}>
                    <View style={styles.countryCode}>
                        <Text>+91</Text>
                    </View>
                    <TextInput
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={10}
                        placeholder="Enter 10-digit number"
                        style={styles.phoneInput}
                    />
                </View>
            </View>

            {/* Category */}
            <View style={styles.card}>
                <Text style={styles.label}>Select Service</Text>
                <View style={styles.grid}>
                    {popular.map((item) => {
                        const active = category === item.label;
                        return (
                            <TouchableOpacity
                                key={item.label}
                                style={styles.gridItem}
                                onPress={() => setCategory(item.label)}
                            >
                                <View
                                    style={[
                                        styles.iconBox,
                                        active && { borderColor: theme.primaryBlue }
                                    ]}
                                >
                                    < Ionicons
                                        name={item.icon}
                                        size={22}
                                        color={active ? theme.primaryBlue : "#6B7280"}
                                    />
                                </View>
                                <Text style={styles.iconLabel}>{item.label}</Text>
                            </TouchableOpacity>
                        );
                    })}

                    <TouchableOpacity
                        style={styles.gridItem}
                        onPress={() => setShowModal(true)}
                    >
                        <View style={styles.iconBox}>
                            < Ionicons
                                name="ellipsis-horizontal"
                                size={22}
                                color={theme.primaryBlue}
                            />
                        </View>
                        <Text style={styles.iconLabel}>More</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Duration */}
            <View style={styles.card}>
                <Text style={styles.label}>Duration *</Text>

                <View style={styles.durationRow}>
                    {[
                        { key: "1week", label: "1 Week", days: 7 },
                        { key: "1month", label: "1 Month", days: 30 },
                        { key: "custom", label: "Custom" },
                    ].map((item) => {
                        const active = durationType === item.key;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.durationButton,
                                    active && { backgroundColor: theme.primaryBlue }
                                ]}
                                onPress={() => {
                                    setDurationType(item.key);
                                    if (item.days) setPresetDuration(item.days);
                                    else {
                                        setStartDate(null);
                                        setEndDate(null);
                                    }
                                }}
                            >
                                <Text style={{ color: active ? "#fff" : "#1F2937" }}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {durationType === "custom" && (
                    <View style={styles.dateRow}>
                        <View style={styles.dateColumn}>
                            <CalendarSelector
                                selectedDate={startDate}
                                onDateSelect={setStartDate}
                                label="Start Date"
                                required
                            />
                        </View>
                        <View style={styles.dateColumn}>
                            <CalendarSelector
                                selectedDate={endDate}
                                onDateSelect={setEndDate}
                                label="End Date"
                                required
                            />
                        </View>
                    </View>
                )}
            </View>

            {/* Active Days */}
            <View style={styles.card}>
                <Text style={styles.label}>Active Days</Text>
                <View style={styles.daysRow}>
                    {weekDays.map((day) => {
                        const active = selectedDays.includes(day);
                        return (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.dayBox,
                                    active && { backgroundColor: theme.primaryBlue }
                                ]}
                                onPress={() => toggleDay(day)}
                            >
                                <Text style={{ color: active ? "#fff" : "#1F2937" }}>
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Entries */}
            <View style={styles.card}>
                <Text style={styles.label}>Entries Per Day</Text>
                <View style={styles.counterRow}>
                    <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() =>
                            setEntriesPerDay(Math.max(1, entriesPerDay - 1))
                        }
                    >
                        < Ionicons name="remove" size={18} />
                    </TouchableOpacity>

                    <Text style={styles.counterText}>{entriesPerDay}</Text>

                    <TouchableOpacity
                        style={styles.counterBtn}
                        onPress={() => setEntriesPerDay(entriesPerDay + 1)}
                    >
                        < Ionicons name="add" size={18} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Save */}
            <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: theme.primaryBlue }]}
                onPress={handleSubmit}
            >
                <Text style={styles.submitText}>Save Access</Text>
            </TouchableOpacity>

            {/* Modal */}
            <Modal visible={showModal} animationType="slide">
                <View style={{ flex: 1, backgroundColor: "#fff" }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Service</Text>
                        <TouchableOpacity onPress={() => setShowModal(false)}>
                            < Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ padding: 20 }}>
                        {renderCategoryBlock("Popular", popular)}
                        {renderCategoryBlock("Utility Services", utility)}
                        {renderCategoryBlock("Other Services", otherServices)}
                    </ScrollView>
                </View>
            </Modal>

        </ScrollView>
    );
};

export default AddPreApprovedMulti;

const styles = StyleSheet.create({
    card: { borderRadius: 16, padding: 16, marginBottom:-10},
    label: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        borderColor: "#E5E7EB",
    },
    phoneRow: { flexDirection: "row", gap: 8 },
    countryCode: {
        width: 60,
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderColor: "#E5E7EB",
    },
    phoneInput: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        borderColor: "#E5E7EB",
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    gridItem: { width: "20%", alignItems: "center", marginBottom: 10 },
    iconBox: {
        width: 55,
        height: 55,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 6,
    },
    iconLabel: { fontSize: 11, textAlign: "center" },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "700",
        marginBottom: 12,
        marginTop: 10,
    },
    durationRow: { flexDirection: "row", gap: 10 },
    durationButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: "center",
    },
    dateRow: { flexDirection: "row", gap: 12, marginTop: 12 },
    dateColumn: { flex: 1 },
    daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    dayBox: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    counterRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    counterBtn: {
        width: 40,
        height: 40,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    counterText: { fontSize: 18, fontWeight: "600" },
    submitButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginTop: 20,
        marginBottom: 40,
    },
    submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    modalHeader: {
        backgroundColor: "#1996D3",
        padding: 16,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 50,
    },
    modalTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
});