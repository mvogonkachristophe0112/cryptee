import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  const handleLanguageChange = async (languageCode) => {
    setSelectedLanguage(languageCode);
    try {
      await AsyncStorage.setItem('userLanguage', languageCode);
      Alert.alert('Success', 'Language changed successfully. Restart the app to apply changes.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save language preference');
    }
  };

  const handleRateApp = () => {
    // For iOS
    const iosUrl = 'itms-apps://itunes.apple.com/app/idYOUR_APP_ID';
    // For Android
    const androidUrl = 'market://details?id=com.cryptee.mobile';

    Linking.canOpenURL(iosUrl).then((supported) => {
      if (supported) {
        Linking.openURL(iosUrl);
      } else {
        Linking.openURL(androidUrl);
      }
    }).catch(() => {
      Alert.alert('Info', 'Please visit the app store to rate Cryptee');
    });
  };

  const handleReportBug = () => {
    const email = 'support@cryptee.com';
    const subject = 'Bug Report - Cryptee Mobile App';
    const body = `Please describe the bug you encountered:

App Version: 1.0.0
Device: [Your device model]
OS: [iOS/Android version]
User ID: ${user?.id || 'Not logged in'}

Bug Description:
[Please provide detailed description of the issue]

Steps to reproduce:
1.
2.
3.

Expected behavior:
[What should happen]

Actual behavior:
[What actually happens]
`;

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Unable to open email client');
      }
    });
  };

  const handleShareApp = async () => {
    try {
      const result = await Share.share({
        message: 'Check out Cryptee - Secure Encrypted Messaging! Download now: https://play.google.com/store/apps/details?id=com.cryptee.mobile',
        url: 'https://play.google.com/store/apps/details?id=com.cryptee.mobile',
        title: 'Cryptee - Secure Messaging',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share app');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout
        },
      ]
    );
  };

  const handleNavigateToProfile = () => {
    navigation.navigate('Profile');
  };

  const handleNavigateToHowToUse = () => {
    navigation.navigate('HowToUse');
  };

  const handleNavigateToInviteFriends = () => {
    navigation.navigate('InviteFriends');
  };

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person',
          title: 'Profile',
          subtitle: user?.username || 'Update your profile',
          onPress: handleNavigateToProfile,
        },
        {
          icon: 'logout',
          title: 'Logout',
          subtitle: 'Sign out of your account',
          onPress: handleLogout,
          destructive: true,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'language',
          title: 'Language',
          subtitle: languages.find(lang => lang.code === selectedLanguage)?.name || 'English',
          onPress: () => {
            // Show language selection modal
            Alert.alert(
              'Select Language',
              'Choose your preferred language',
              languages.map(lang => ({
                text: `${lang.flag} ${lang.name}`,
                onPress: () => handleLanguageChange(lang.code),
                style: selectedLanguage === lang.code ? 'default' : 'default',
              })).concat([{ text: 'Cancel', style: 'cancel' }])
            );
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help',
          title: 'How to Use',
          subtitle: 'Tutorials and FAQs',
          onPress: handleNavigateToHowToUse,
        },
        {
          icon: 'bug-report',
          title: 'Report Bug',
          subtitle: 'Help us improve the app',
          onPress: handleReportBug,
        },
        {
          icon: 'star',
          title: 'Rate App',
          subtitle: 'Leave a review on the app store',
          onPress: handleRateApp,
        },
      ],
    },
    {
      title: 'Social',
      items: [
        {
          icon: 'share',
          title: 'Share App',
          subtitle: 'Tell your friends about Cryptee',
          onPress: handleShareApp,
        },
        {
          icon: 'group-add',
          title: 'Invite Friends',
          subtitle: 'Send invitation links',
          onPress: handleNavigateToInviteFriends,
        },
      ],
    },
  ];

  const renderSettingItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={[styles.settingItem, item.destructive && styles.settingItemDestructive]}
      onPress={item.onPress}
    >
      <View style={styles.settingItemLeft}>
        <Icon
          name={item.icon}
          size={24}
          color={item.destructive ? '#dc3545' : '#667eea'}
          style={styles.settingIcon}
        />
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, item.destructive && styles.settingTitleDestructive]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={[styles.settingSubtitle, item.destructive && styles.settingSubtitleDestructive]}>
              {item.subtitle}
            </Text>
          )}
        </View>
      </View>
      <Icon name="chevron-right" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const renderSection = (section, sectionIndex) => (
    <View key={sectionIndex} style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.items.map(renderSettingItem)}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Customize your Cryptee experience</Text>
      </View>

      {settingsSections.map(renderSection)}

      <View style={styles.footer}>
        <Text style={styles.version}>Cryptee v1.0.0</Text>
        <Text style={styles.copyright}>© 2025 Cryptee. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e8f4f8',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    marginHorizontal: 15,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemDestructive: {
    borderBottomColor: '#ffeaea',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 15,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingTitleDestructive: {
    color: '#dc3545',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  settingSubtitleDestructive: {
    color: '#e57373',
  },
  footer: {
    alignItems: 'center',
    padding: 30,
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  copyright: {
    fontSize: 12,
    color: '#999',
  },
});

export default SettingsScreen;