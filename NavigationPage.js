import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  Animated,
  DeviceEventEmitter,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, flushPendingNavigation } from './NavigationService';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer'; // ✅ NEW
import DrawerContent from './app/Common/Drawer/DrawerContent';   // ✅ NEW
import Ionicons from 'react-native-vector-icons/Ionicons';
import BRAND from './app/config';

// ── All your existing screen imports (unchanged) ─────────────────────────────
import SocietySearchScreen from './app/Login/SocietySearchScreen';
import SearchUnitScreen from './app/Login/SearchUnitScreen';
import RegistrationFormScreen from './app/Login/RegistrationFormScreen';
import CreateAccount from './app/Login/SignUpScreen';
import BouncedChequeListScreen from './app/AccountsScreen/BouncedChequeListScreen';
import BouncedChequeDetailScreen from './app/AccountsScreen/BouncedChequeDetailScreen';
import PendingStatusScreen from './app/Login/PendingStatusScreen';
import { useTranslation } from 'react-i18next';
import VisitorPopup from './app/components/VisitorPopup';
import { setPopupHandler } from './services/VisitorPopupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HomeScreen from './app/HomeScreen/HomeScreen';
import PaymentHistoryScreen from './app/AccountsScreen/PaymentHistoryScreen';
import PaymentDetail from './app/AccountsScreen/PaymentDetailScreen';
import VisitorsScreen from './app/VisitorsScreen/VisitorScreen';
import Header from './app/Common/Header/Header';
import LoginScreen from './app/Login/Login';
import MoreScreen from './app/MoreScreen/MorePage';
import { PermissionsProvider, usePermissions } from './Utils/ConetextApi';
import { hasPermission } from './Utils/PermissionHelper';
import { ismServices } from './services/ismServices';
import ServiceRequestTabs from './app/ServiceRequestScreen/ServiceHeader';
import CategorySelectionScreen from './app/ServiceRequestScreen/complaintCatModel';
import SubCategorySelectionScreen from './app/ServiceRequestScreen/subCateScreen';
import ComplaintInputScreen from './app/ServiceRequestScreen/complaintInput';
import AccountsScreen from './app/AccountsScreen/AccountsPage';
import { SafeAreaView } from 'react-native-safe-area-context';
import AddVisitor from './app/VisitorsScreen/components/AddVisitor';
import AddPreApprovedVisitor from './app/VisitorsScreen/singleMultiVisits/SingleVisitorForm';
import AddFrequentVisitor from './app/VisitorsScreen/singleMultiVisits/FrequentVisitorForm';
import ServiceRequestDetailScreen from './app/ServiceRequestScreen/components/ServiceRequestDetail';
import PassDetailsScreen from './app/VisitorsScreen/components/PassDetailsScreen';
import VisitDetailScreen from './app/VisitorsScreen/components/VisitRequestDetailScreen';
import NotificationsScreen from './app/components/NotificationsScreen';
import AddVehicleScreen from './app/VehicleScreen/AddVehicleScreen';
import MyVehiclesScreen from './app/VehicleScreen/MyvehicleScreen';
import VehicleDetailsScreen from './app/VehicleScreen/VehicleDetailsScreen';
import VehicleLogsScreen from './app/VehicleScreen/VehicleLogsScreen';
import VehicleTagScreen from './app/VehicleScreen/VehicleTagScreen';
import StaffScreen from './app/StaffScreen/StaffScreen';
import StaffDetailScreen from './app/StaffScreen/StaffDetailScreen';
import MyStaffDetailScreen from './app/StaffScreen/MyStaffDetailScreen';
import MyStaffAttendanceScreen from './app/StaffScreen/MyStaffAttendanceScreen';
import ContactUsScreen from './app/Common/Feedback/ContactUsScreen';
import AllServicesScreen from './app/AllServicesScreen/AllServicesScreen';
import AddMemberScreen from './app/AllServicesScreen/AddMemberScreen';
import MyNoticesScreen from './app/AllServicesScreen/MyNoticesScreen';
import NoticeDetailScreen from './app/AllServicesScreen/NoticeDetailScreen';
import SettingsScreen from './app/AllServicesScreen/SettingsScreen';
import BillsPage from './app/AllServicesScreen/BillsPage';
import AmenitiesListScreen from './app/AllServicesScreen/AmenitiesListScreen';
import AmenityBookingScreen from './app/AllServicesScreen/AmenityBookingScreen';
import MyBookingsScreen from './app/AllServicesScreen/MyBookingsScreen';
import OtpLoginScreen from './app/Login/OtpLoginScreen';
import MyComplexScreen from './app/MyComplex/MyComplexScreen';
import myNoticeDetailScreen from './app/MyComplex/MyNoticeDetailScreen';
import MembersScreen from './app/AllServicesScreen/MembersScreen';
import OtpVerifyScreen from './app/Login/OtpVerifyScreen';
import ResidentIdCardScreen from './app/HomeScreen/VirtualIdcard';
import VisitorNotificationMessage from './app/VisitorsScreen/VisitorRequestScreen';
import BillPaymentScreen from './app/AllServicesScreen/BillPaymentScreen';
import PaymentDetailScreen from './app/AllServicesScreen/PaymentDetailScreen';
import SurveyPage from './app/AllServicesScreen/SurveyPage';
import Event from './app/AllServicesScreen/Event';
import Payment from './app/AllServicesScreen/Payment';
import MeterScreen from './app/meter/MeterScreen';
import ExportMeterScreen from './app/meter/ExportMeterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator(); // ✅ NEW
const { width } = Dimensions.get('window');

// ─── Home Stack ───────────────────────────────────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
  </Stack.Navigator>
);

// ─── Service Requests Stack ───────────────────────────────────────────────────
const ServiceRequestsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ServiceRequestsMain" component={ServiceRequestTabs} />
  </Stack.Navigator>
);

// ─── Custom Tab Bar (your existing one, unchanged) ────────────────────────────
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { nightMode } = usePermissions();
  const { t } = useTranslation();
  const COLORS = BRAND.COLORS;

  const NAVBAR_BG = nightMode ? '#2A2A2Aee' : COLORS.bottomNavBackground;
  const ACTIVE_COLOR = nightMode ? '#4A90E2' : COLORS.bottomNavActiveIcon;
  const SECONDARY_COLOR = '#FFFFFF';
  const ICON_COLOR_INACTIVE = nightMode ? '#B0B0B0' : '#FFFF';

  const totalTabs = state.routes.length;
  const containerPadding = 15;
  const tabGap = 11 * (totalTabs - 1);
  const availableWidth = width - 40 - containerPadding - tabGap;
  const tabWidth = availableWidth / totalTabs;

  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let position = state.index * (tabWidth + 10) + 15;
    const activeRoute = state.routes[state.index].name;
    if (activeRoute === 'Service Requests' || activeRoute === 'Visitors') {
      position -= 10;
    }
    Animated.spring(translateX, {
      toValue: position,
      useNativeDriver: true,
      damping: 20,
      stiffness: 150,
      mass: 1,
    }).start();
  }, [state.index, tabWidth]);

  const getIconByRouteName = (routeName, color, isFocused) => {
    const iconSize = isFocused ? 18 : 24;
    switch (routeName) {
      case 'Home': return <Ionicons name="home" size={iconSize} color={color} />;
      case 'Service Requests': return <Ionicons name={isFocused ? 'build' : 'build-outline'} size={iconSize} color={color} />;
      case 'Visitors': return <Ionicons name={isFocused ? 'people' : 'people-outline'} size={iconSize} color={color} />;
      case 'More': return <Ionicons name={isFocused ? 'menu' : 'menu-outline'} size={iconSize} color={color} />;
      default: return <Ionicons name="ellipse-outline" size={iconSize} color={color} />;
    }
  };

  const getShortLabel = (label) => label === 'Service Requests' ? 'Request' : label;

  // Tab bar is currently commented out in your code — keeping same
  return null;
};

// ─── Tab Screens (inner) ──────────────────────────────────────────────────────
const TabScreens = () => {
  const { permissions } = usePermissions();
  const permissionsLoaded = permissions !== null && permissions !== undefined;
  const canViewVisitors = !permissionsLoaded || hasPermission(permissions, 'VMS', 'R');
  const canViewComplaints = !permissionsLoaded || hasPermission(permissions, 'COM', 'R');

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarIconName: 'home' }} />
      {canViewComplaints && (
        <Tab.Screen name="Service Requests" component={ServiceRequestsStack} options={{ tabBarIconName: 'build' }} />
      )}
      {canViewVisitors && (
        <Tab.Screen name="Visitors" component={VisitorsScreen} options={{ tabBarIconName: 'people' }} />
      )}
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ tabBarIconName: 'menu' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            DeviceEventEmitter.emit('OPEN_DRAWER');
          },
        }}
      />
    </Tab.Navigator>
  );
};

// ─── NavigationTabs: Drawer wraps the Tab navigator ──────────────────────────
//
//  ┌─────────────────────────────────────────────────┐
//  │  Drawer.Navigator  (drawerType="slide",          │
//  │                     width=78% screen)            │
//  │  ┌───────────────────────────────────────────┐  │
//  │  │  SafeAreaView                             │  │
//  │  │  ├── <Header />   (your ResidentHeader)   │  │
//  │  │  └── <TabScreens />                       │  │
//  │  └───────────────────────────────────────────┘  │
//  │  DrawerContent (your custom UI)                 │
//  └─────────────────────────────────────────────────┘
//
const MainWithHeader = () => {
  const { nightMode } = usePermissions();
  return (
    <SafeAreaView
      style={[
        { flex: 1 },
        nightMode ? { backgroundColor: '#1A1A1A' } : { backgroundColor: '#F8FAFC' },
      ]}
    >
      <Header />
      <TabScreens />
    </SafeAreaView>
  );
};

const NavigationTabs = () => {
  const { nightMode } = usePermissions();

  useEffect(() => {
    const checkPendingNavigation = async () => {
      try {
        const shouldNavigate = await AsyncStorage.getItem('SHOULD_NAVIGATE_VISITOR');
        const visitorStr = await AsyncStorage.getItem('PENDING_VISITOR_NAVIGATE');
        if (!shouldNavigate || !visitorStr) return;
        const visitor = JSON.parse(visitorStr);
        if (!visitor?.id) return;
        await AsyncStorage.removeItem('SHOULD_NAVIGATE_VISITOR');
        await AsyncStorage.removeItem('PENDING_VISITOR_NAVIGATE');
        setTimeout(() => {
          navigationRef.navigate('VisitorApproval', { visitor });
        }, 600);
      } catch (e) {
        console.log('❌ Navigation error:', e);
      }
    };
    checkPendingNavigation();
  }, []);

  return (
    // ✅ Drawer.Navigator wraps everything.
    // drawerContent renders your custom UI (DrawerContent.js)
    // The gesture + animation is fully handled by React Navigation.
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',          // slides the screen + drawer together (native feel)
        drawerPosition: 'left',
        drawerStyle: {
          width: width * 0.78,        // same as your DRAWER_WIDTH
          backgroundColor: '#FFFFFF',
        },
        swipeEnabled: true,           // swipe to open/close
        swipeEdgeWidth: 50,           // how far from left edge the swipe activates
        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name="MainApp" component={MainWithHeader} />
    </Drawer.Navigator>
  );
};

// ─── NavigationPage (root, unchanged) ────────────────────────────────────────
const NavigationPage = () => {
  const { t } = useTranslation();
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  useEffect(() => {
    ismServices.getUserDetails();
  }, []);

  useEffect(() => {
    setPopupHandler((message) => {
      setPopupMessage(message);
      setPopupVisible(true);
    });
  }, []);

  return (
    <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
      <Stack.Navigator
        screenOptions={{
          cardStyle: { backgroundColor: '#ffffff' },
          cardOverlayEnabled: false,
          cardShadowEnabled: false,
          headerShown: false,
          animation: 'simple_push',
        }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        {/* ✅ MainApp now points to NavigationTabs which contains the Drawer */}
        <Stack.Screen name="MainApp" component={NavigationTabs} />
        <Stack.Screen name="AddVisitor" component={AddVisitor} />
        <Stack.Screen name="AddPreVisitor" component={AddPreApprovedVisitor} />
        <Stack.Screen name="AddFrequentVisitor" component={AddFrequentVisitor} />
        <Stack.Screen name="CategorySelection" component={CategorySelectionScreen} />
        <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
        <Stack.Screen name="SubCategorySelection" component={SubCategorySelectionScreen} />
        <Stack.Screen name="complaintInput" component={ComplaintInputScreen} />
        <Stack.Screen name="PassDetails" component={PassDetailsScreen} />
        <Stack.Screen name="Accounts" component={AccountsScreen} />
        <Stack.Screen name="SocietySearch" component={SocietySearchScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PendingStatus" component={PendingStatusScreen} options={{ headerShown: false }} />
        <Stack.Screen name="VisitDetailScreen" component={VisitDetailScreen} />
        <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
        <Stack.Screen name="AddVehicleScreen" component={AddVehicleScreen} />
        <Stack.Screen name="MyVehiclesScreen" component={MyVehiclesScreen} />
        <Stack.Screen name="VehicleDetailsScreen" component={VehicleDetailsScreen} />
        <Stack.Screen name="VehicleLogsScreen" component={VehicleLogsScreen} />
        <Stack.Screen name="VehicleTagScreen" component={VehicleTagScreen} />
        <Stack.Screen name="StaffScreen" component={StaffScreen} />
        <Stack.Screen name="StaffDetailScreen" component={StaffDetailScreen} />
        <Stack.Screen name="MyStaffDetailScreen" component={MyStaffDetailScreen} />
        <Stack.Screen name="MyStaffAttendanceScreen" component={MyStaffAttendanceScreen} />
        <Stack.Screen name="ContactUsScreen" component={ContactUsScreen} />
        <Stack.Screen name="AllServicesScreen" component={AllServicesScreen} />
        <Stack.Screen name="SignUp" component={CreateAccount} options={{ headerShown: false }} />
        <Stack.Screen name="SearchUnit" component={SearchUnitScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RegistrationForm" component={RegistrationFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AddMember" component={AddMemberScreen} />
        <Stack.Screen name="MyNoticesScreen" component={MyNoticesScreen} />
        <Stack.Screen name="NoticeDetailScreen" component={NoticeDetailScreen} />
        <Stack.Screen name="Visitors" component={VisitorsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="bills" component={BillsPage} />
        <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
        <Stack.Screen name="PaymentDetail" component={PaymentDetail} />
        <Stack.Screen name="AmenitiesListScreen" component={AmenitiesListScreen} />
        <Stack.Screen name="AmenityBooking" component={AmenityBookingScreen} />
        <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
        <Stack.Screen name="OtpLoginScreen" component={OtpLoginScreen} />
        <Stack.Screen name="Notices" component={MyComplexScreen} />
        <Stack.Screen name="NoticeDetail" component={myNoticeDetailScreen} />
        <Stack.Screen name="FamilyMember" component={MembersScreen} />
        <Stack.Screen name="OtpLogin" component={OtpLoginScreen} />
        <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
        <Stack.Screen name="Meter" component={MeterScreen} />
        <Stack.Screen name="BillPaymentScreen" component={BillPaymentScreen} />
        <Stack.Screen name="Payment" component={Payment} />
        <Stack.Screen name="PaymentDetailScreen" component={PaymentDetailScreen} />
        <Stack.Screen name="ExportMeter" component={ExportMeterScreen} />
        <Stack.Screen name="BouncedCheques" component={BouncedChequeListScreen} />
        <Stack.Screen name="BouncedChequeDetail" component={BouncedChequeDetailScreen} />
        <Stack.Screen name="surveypage" component={SurveyPage} />
        <Stack.Screen name="event" component={Event} />
        <Stack.Screen name="more" component={MoreScreen} />
        <Stack.Screen name="requests" component={ServiceRequestTabs} />
        <Stack.Screen name="VisitorNotificationMessage" component={VisitorNotificationMessage} />
        <Stack.Screen name="ResidentIdCard" component={ResidentIdCardScreen} options={{ title: t('Resident ID Card') }} />
      </Stack.Navigator>

      <VisitorPopup
        visible={popupVisible}
        message={popupMessage}
        onClose={() => setPopupVisible(false)}
      />
    </NavigationContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center',
  },
  bottomNavBar: {
    flexDirection: 'row', height: 65, borderRadius: 35, alignItems: 'center',
    paddingHorizontal: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 15, gap: 10,
  },
  slidingIndicator: {
    position: 'absolute', height: 40, width: 80, borderRadius: 20, top: 12.5, left: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  tabItem: { justifyContent: 'center', alignItems: 'center', height: 52, zIndex: 1 },
  tabContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  tabLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});

export default NavigationPage;