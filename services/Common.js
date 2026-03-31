import AsyncStorage from "@react-native-async-storage/async-storage";

const Common = {
    getLoggedInUser: async () => {
        try {
            const userInfo = await AsyncStorage.getItem('userInfo');
            
            if (!userInfo) {
                return null;
            }

            const parsedUserInfo = JSON.parse(userInfo);
            return parsedUserInfo;

        } catch (e) {
            console.error("Error in getLoggedInUser", e)
            throw e;
        }
    },

    getUserDetails: async () => {
        try {
            // ✅ Use 'userInfo' instead of 'userDetails'
            const userInfo = await AsyncStorage.getItem('userInfo');
            
          if (!userInfo) {
            return null;
}
            const parsedUserInfo = JSON.parse(userInfo);
            return parsedUserInfo;

        } catch (e) {
            console.error("Error in getUserDetails", e); // ✅ Fixed log name
            throw e; // ✅ Re-throw
        }
    },
}

export { Common };