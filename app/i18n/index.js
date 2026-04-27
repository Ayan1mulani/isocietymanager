import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Import your dictionaries
import en from '../locales/en.json';
import vi from '../locales/vi.json';
import zh from '../locales/zh.json';
import km from '../locales/km.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
  zh: { translation: zh },
  km: { translation: km },
};

// 2. Create a plugin to load/save the language from device storage
const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        return callback(savedLanguage);
      }
      return callback('en'); // Default to English if nothing is saved
    } catch (error) {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (language) => {
    try {
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  }
};

// 3. Initialize i18next
i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    compatibilityJSON: 'v3', // Required for React Native
    interpolation: {
      escapeValue: false // React Native already protects from XSS
    }
  });

export default i18n;