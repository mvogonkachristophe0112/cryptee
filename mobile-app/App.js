import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import SendScreen from './src/screens/SendScreen';
import ReceivedScreen from './src/screens/ReceivedScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import HowToUseScreen from './src/screens/HowToUseScreen';
import InviteFriendsScreen from './src/screens/InviteFriendsScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import context
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Theme
const theme = {
  colors: {
    primary: '#667eea',
    accent: '#764ba2',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    error: '#dc3545',
  },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Send') {
            iconName = 'send';
          } else if (route.name === 'Received') {
            iconName = 'inbox';
          } else if (route.name === 'History') {
            iconName = 'history';
          } else if (route.name === 'Settings') {
            iconName = 'settings';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Send" component={SendScreen} />
      <Tab.Screen name="Received" component={ReceivedScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Main stack navigator
function MainStack() {
  const { isAuthenticated, loading } = useAuth();
  console.log('MainStack rendering - isAuthenticated:', isAuthenticated, 'loading:', loading);

  // Show loading screen while auth is initializing
  if (loading) {
    console.log('Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Loading Cryptee...</Text>
        <View style={{
          width: 50,
          height: 50,
          borderWidth: 4,
          borderColor: '#667eea',
          borderTopColor: 'transparent',
          borderRadius: 25,
        }} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="HowToUse" component={HowToUseScreen} />
          <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

// App component
export default function App() {
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <MainStack />
          <Toast />
        </NavigationContainer>
      </PaperProvider>
    </AuthProvider>
  );
}