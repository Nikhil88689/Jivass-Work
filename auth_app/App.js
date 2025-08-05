import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator, Text } from 'react-native';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import UserDetailScreen from './screens/UserDetailScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import FaceRecognitionScreen from './screens/FaceRecognitionScreen';
import NewAdminScreen from './screens/NewAdminScreen';
import UserAttendanceScreen from './screens/UserAttendanceScreen';
import MyAttendanceScreen from './screens/MyAttendanceScreen';

// Import context
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom theme
// Define a modern professional theme
const theme = {
  ...DefaultTheme,
  dark: false,
  roundness: 12,
  colors: {
    ...DefaultTheme.colors,
    // Primary brand colors
    primary: '#2563eb',       // Primary blue
    primaryDark: '#1d4ed8',   // Darker blue for active states
    primaryLight: '#60a5fa',  // Lighter blue for highlights
    
    // Secondary and accent colors
    secondary: '#4f46e5',     // Secondary purple for contrast
    accent: '#06b6d4',        // Cyan for accents
    
    // UI element colors
    success: '#16a34a',       // Green for success states
    warning: '#fbbf24',       // Amber for warnings
    error: '#ef4444',         // Red for errors
    info: '#3b82f6',          // Blue for information
    
    // Background and surface colors
    background: '#f8fafc',    // Lighter background for better contrast
    surface: '#ffffff',       // White surface for cards
    elevation: '#f1f5f9',     // For elevated elements
    
    // Text colors
    text: '#0f172a',          // Nearly black for main text
    textSecondary: '#475569', // Slate gray for secondary text
    textDisabled: '#94a3b8',  // Light slate for disabled text
    placeholder: '#94a3b8',   // Matching placeholder color
    
    // Border and divider colors
    border: '#e2e8f0',        // Light border color
    disabled: '#e5e7eb',      // Disabled state color
    backdrop: 'rgba(15, 23, 42, 0.5)', // Modal backdrop
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '200',
    },
  },
  animation: {
    scale: 1.0,
  },
};

// Stack Navigator for Attendance screens
const AttendanceStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AttendanceMain" component={AttendanceScreen} />
      <Stack.Screen name="FaceRecognition" component={FaceRecognitionScreen} />
      <Stack.Screen name="MyAttendance" component={MyAttendanceScreen} options={{ title: 'My Attendance Dashboard' }} />
    </Stack.Navigator>
  );
};

// Admin Stack Navigator for admin-specific screens
const AdminStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen} 
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen 
        name="UserDetail" 
        component={UserDetailScreen} 
        options={{ title: 'User Details' }} 
      />
    </Stack.Navigator>
  );
};

// Tab Navigator for authenticated users
const TabNavigator = () => {
  const { user } = useAuth();
  const isAdmin = user && user.is_staff;
  const isSupervisor = user && user.is_supervisor;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
        },
        headerShown: false,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceStack} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-check" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="My Dashboard" 
        component={MyAttendanceScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-timeline-variant" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      {(isAdmin || isSupervisor) && (
        <Tab.Screen 
          name="Admin" 
          component={AdminStack} 
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={isAdmin ? "shield-account" : "account-tie"} color={color} size={size} />
            ),
          }}
        />
      )}
    </Tab.Navigator>
  );
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

// Root navigator that handles authentication state
const RootNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user, isAuthenticated, authToken } = useAuth();

  // Check authentication state when component mounts or auth changes
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      // Wait a moment to ensure auth state is loaded
      setTimeout(() => {
        console.log('Auth state check:', isAuthenticated ? 'Authenticated' : 'Not authenticated');
        console.log('User state:', user ? 'User loaded' : 'No user');
        setIsLoading(false);
      }, 500);
    };

    checkAuth();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!isAuthenticated ? (
        // Auth screens
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ title: 'Create Account' }} 
          />
        </>
      ) : (
        // Authenticated screens (both admin and regular users)
        <>
          <Stack.Screen 
            name="Main" 
            component={TabNavigator} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="UserDetail" 
            component={UserDetailScreen} 
            options={{ title: 'User Details' }} 
          />
          {/* Register Screen - Added for admin access */}
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ 
              title: 'Register New User',
              headerStyle: {
                backgroundColor: '#3498db',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }} 
          />
          {/* Direct access to Admin Dashboard */}
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboardScreen} 
            options={{ 
              title: 'Admin Dashboard',
              headerStyle: {
                backgroundColor: '#3498db',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }} 
          />
          {/* New Admin Screen */}
          <Stack.Screen 
            name="NewAdmin" 
            component={NewAdminScreen} 
            options={{ 
              title: 'Admin Control Panel',
              headerStyle: {
                backgroundColor: '#2c3e50',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }} 
          />
          
          {/* User Attendance Screen */}
          <Stack.Screen 
            name="UserAttendance" 
            component={UserAttendanceScreen} 
            options={{ 
              title: 'Attendance Records',
              headerStyle: {
                backgroundColor: '#3498db',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
};