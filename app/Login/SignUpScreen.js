import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    Linking,
    Image,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import BRAND from '../config';
import { ismServices } from '../../services/ismServices';

const SignUpScreen = () => {
    const navigation = useNavigation();

    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [email, setEmail] = useState('');
    const [agreed, setAgreed] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    // --- 🔴 New Error States ---
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');

    // --- 🔴 Validation Function ---
    const validateForm = () => {
        let isValid = true;
        let newErrors = {};

        if (!name.trim()) {
            newErrors.name = "Please enter your full name.";
            isValid = false;
        }

        if (!mobile.trim()) {
            newErrors.mobile = "Please enter your mobile number.";
            isValid = false;
        } else if (mobile.length !== 10) {
            newErrors.mobile = "Please enter a valid 10-digit mobile number.";
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            newErrors.email = "Please enter your email address.";
            isValid = false;
        } else if (!emailRegex.test(email)) {
            newErrors.email = "Please enter a valid email address.";
            isValid = false;
        }

        if (!agreed) {
            newErrors.agreed = "You must agree to the Terms & Conditions.";
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleSendOTP = async () => {
        // Clear previous top-level errors
        setApiError(''); 

        // Run local validation
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await ismServices.generateRegistrationOtp(name, mobile, email);

            if (response && response.status === 'success') {
                navigation.navigate("OtpVerify", {
                    isRegistration: true,
                    mobile: mobile,
                    email: email,
                    name: name,
                    otpData: response.data
                });
            } else {
                // 🔴 Handle API Errors (like OTP blocked) here inline
                setApiError(response?.message || "Failed to generate OTP. Please try again.");
            }
        } catch (error) {
            console.error("SignUp OTP Error:", error);
            // 🔴 Handle Network/Crash Errors here inline
            setApiError(error?.message || "Something went wrong. Please check your internet connection.");
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to clear specific error when user starts typing
    const handleTextChange = (setter, fieldName) => (value) => {
        setter(value);
        if (errors[fieldName]) {
            setErrors((prev) => ({ ...prev, [fieldName]: null }));
        }
    };

    // Helper to clear checkbox error when toggled
    const handleAgreedToggle = () => {
        setAgreed(!agreed);
        if (errors.agreed) {
            setErrors((prev) => ({ ...prev, agreed: null }));
        }
    };

    return (
        <View style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()}>
                            <Icon name="arrow-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Sign Up</Text>
                    </View>

                    {/* Logo Container */}
                    <View style={styles.logoContainer}>
                        <Image source={BRAND.LOGO} style={styles.logo} resizeMode="contain" />
                    </View>

                    {/* Content */}
                    <View style={styles.container}>

                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Enter details to get OTP</Text>

                        {/* 🔴 Top Level API Error Display (e.g. OTP Blocked) */}
                        {apiError ? (
                            <View style={styles.apiErrorContainer}>
                                <Icon name="error-outline" size={20} color="#d32f2f" />
                                <Text style={styles.apiErrorText}>{apiError}</Text>
                            </View>
                        ) : null}

                        {/* Name */}
                        <View style={styles.fieldContainer}>
                            <View style={[styles.inputContainer, errors.name && styles.errorBorder]}>
                                <Icon name="person" size={20} color={errors.name ? "#d32f2f" : "#9e9e9e"} />
                                <TextInput
                                    placeholder="Full Name"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.input}
                                    value={name}
                                    onChangeText={handleTextChange(setName, 'name')}
                                    editable={!isLoading}
                                />
                            </View>
                            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                        </View>

                        {/* Mobile */}
                        <View style={styles.fieldContainer}>
                            <View style={[styles.inputContainer, errors.mobile && styles.errorBorder]}>
                                <Icon name="phone" size={20} color={errors.mobile ? "#d32f2f" : "#9e9e9e"} />
                                <TextInput
                                    placeholder="Mobile Number"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.input}
                                    keyboardType="numeric"
                                    maxLength={10}
                                    value={mobile}
                                    onChangeText={handleTextChange(setMobile, 'mobile')}
                                    editable={!isLoading}
                                />
                            </View>
                            {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
                        </View>

                        {/* Email */}
                        <View style={styles.fieldContainer}>
                            <View style={[styles.inputContainer, errors.email && styles.errorBorder]}>
                                <Icon name="email" size={20} color={errors.email ? "#d32f2f" : "#9e9e9e"} />
                                <TextInput
                                    placeholder="Email ID"
                                    placeholderTextColor="#9CA3AF"
                                    style={styles.input}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={handleTextChange(setEmail, 'email')}
                                    editable={!isLoading}
                                />
                            </View>
                            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                        </View>

                        {/* Button */}
                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleSendOTP}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Send OTP</Text>
                            )}
                        </TouchableOpacity>

                        {/* Login */}
                        <View style={styles.loginRow}>
                            <Text style={styles.loginText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.navigate("Login")} disabled={isLoading}>
                                <Text style={styles.loginLink}>Login</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Terms */}
                        <View style={styles.termsContainer}>
                            <View style={styles.termsRow}>
                                <TouchableOpacity onPress={handleAgreedToggle} disabled={isLoading}>
                                    <Icon
                                        name={agreed ? "check-box" : "check-box-outline-blank"}
                                        size={20}
                                        color={agreed ? BRAND.PRIMARY_COLOR : errors.agreed ? "#d32f2f" : '#9e9e9e'}
                                    />
                                </TouchableOpacity>
                                <Text style={styles.termsText}>
                                    I agree to the{' '}
                                    <Text
                                        style={styles.termsLink}
                                        onPress={() =>
                                            Linking.openURL('https://isocietymanager.com/terms-conditions.html')
                                        }
                                    >
                                        Terms & Conditions
                                    </Text>
                                </Text>
                            </View>
                            {errors.agreed && <Text style={[styles.errorText, { textAlign: 'center' }]}>{errors.agreed}</Text>}
                        </View>

                        {/* Footer */}
                        <Text style={styles.poweredBy}>
                            Powered By{" "}
                            <Text style={{ color: BRAND.PRIMARY_COLOR }}>
                                Factech Automation Solutions Pvt Ltd
                            </Text>
                        </Text>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

export default SignUpScreen;

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: BRAND.PRIMARY_COLOR,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: BRAND.PRIMARY_COLOR,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        marginLeft: 15,
        fontWeight: '600',
    },
    logoContainer: {
        width: '60%',
        alignSelf: 'center',
        justifyContent: 'center',
        paddingBottom: 20,
    },
    logo: {
        width: 300,
        height: 60,
        alignSelf: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#777',
        marginBottom: 20,
    },
    
    // 🔴 Field Container to hold Input + Error text
    fieldContainer: {
        marginBottom: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f3f4f6',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 55,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    input: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#111827',
    },
    button: {
        backgroundColor: BRAND.COLORS?.button || BRAND.PRIMARY_COLOR,
        height: 55,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#B0B0B0',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loginRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    },
    loginText: {
        color: '#555',
    },
    loginLink: {
        color: BRAND.PRIMARY_COLOR,
        fontWeight: '600',
    },
    termsContainer: {
        marginTop: 20,
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    termsText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#555',
    },
    termsLink: {
        color: BRAND.PRIMARY_COLOR,
        textDecorationLine: 'underline',
    },
    poweredBy: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 12,
        color: '#999',
    },

    // 🔴 New Error Styles
    errorBorder: { 
        borderColor: '#d32f2f',
        backgroundColor: '#fffafa' 
    },
    errorText: { 
        color: '#d32f2f', 
        fontSize: 12, 
        marginTop: 4, 
        marginLeft: 4 
    },
    apiErrorContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#ffebee', 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 15, 
        borderWidth: 1, 
        borderColor: '#ffcdd2' 
    },
    apiErrorText: { 
        color: '#d32f2f', 
        fontSize: 14, 
        flex: 1,
        marginLeft: 8 
    },
});