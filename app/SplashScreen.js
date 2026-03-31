// import React, { useEffect } from "react";
// import { View, ActivityIndicator, StyleSheet } from "react-native";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useNavigation } from "@react-navigation/native";
// import BRAND from "./config";

// const SplashScreen = () => {
//   const navigation = useNavigation();

//   const checkLogin = async () => {
//     try {
//       const user = await AsyncStorage.getItem("userInfo");

//       if (user) {
//         // user already logged in
//         navigation.reset({
//           index: 0,
//           routes: [{ name: "Home" }],
//         });
//       } else {
//         // user not logged in
//         navigation.reset({
//           index: 0,
//           routes: [{ name: "Login" }],
//         });
//       }
//     } catch (error) {
//       navigation.replace("Login");
//     }
//   };

//   useEffect(() => {
//     setTimeout(checkLogin, 1500); // show splash for 1.5 sec
//   }, []);

//   return (
//     <View style={styles.container}>
//       <ActivityIndicator size="large" color={BRAND.COLORS.primary} />
//     </View>
//   );
// };

// export default SplashScreen;

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: BRAND.COLORS.background,
//     justifyContent: "center",
//     alignItems: "center",
//   },
// });