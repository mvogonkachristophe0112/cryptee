import React, { createContext, useContext, useState, useEffect } from 'react';

// Translation context
const TranslationContext = createContext();

// Available languages
const languages = {
  en: { name: 'English', flag: '🇺🇸' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  de: { name: 'Deutsch', flag: '🇩🇪' }
};

// Fallback translations for when API fails
const fallbackTranslations = {
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      settings: 'Settings',
      help: 'Help',
      report: 'Report Bug',
      send: 'Send',
      receive: 'Receive',
      history: 'History',
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      copyright: 'Copyright'
    },
    copyright: {
      title: 'Copyright & License',
      subtitle: 'Legal information and licensing terms',
      license_agreement: 'Software License Agreement',
      intellectual_property: 'Intellectual Property',
      usage_rights: 'Usage Rights',
      contact: 'Contact Information'
    },
    settings: {
      language: 'Language',
      theme: 'Theme',
      notifications: 'Notifications'
    }
  }
};

export const TranslationProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [translations, setTranslations] = useState(fallbackTranslations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved language preference
    const savedLanguage = localStorage.getItem('cryptee_language') || 'en';
    setCurrentLanguage(savedLanguage);
    loadTranslations(savedLanguage);
  }, []);

  const loadTranslations = async (language) => {
    try {
      setLoading(true);
      const response = await fetch(`/static/translations/${language}.json`);
      if (response.ok) {
        const translationData = await response.json();
        setTranslations(prev => ({
          ...prev,
          [language]: translationData
        }));
      } else {
        console.warn(`Translation file for ${language} not found, using fallback`);
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (language) => {
    if (languages[language]) {
      setCurrentLanguage(language);
      localStorage.setItem('cryptee_language', language);

      // Load translations for the new language if not already loaded
      if (!translations[language]) {
        await loadTranslations(language);
      }
    }
  };

  const t = (key, defaultValue = '') => {
    const keys = key.split('.');
    let value = translations[currentLanguage];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    return value || defaultValue || key;
  };

  const value = {
    currentLanguage,
    languages,
    changeLanguage,
    t,
    loading
  };

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};