import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Platform, Linking } from 'react-native';
import { 
  Text, 
  Title, 
  Card, 
  Button, 
  ActivityIndicator, 
  List, 
  Divider, 
  FAB,
  Appbar,
  DataTable,
  Chip,
  Avatar,
  Surface,
  useTheme,
  Badge,
  Caption,
  Subheading,
  IconButton,
  Banner
} from 'react-native-paper';
import * as Location from 'expo-location';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import AsyncStorage for face verification status
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import attendance configuration and helper functions
import { ATTENDANCE_CONFIG, isCheckInLate, isCheckOutEarly, getAttendanceTimeRequirements } from '../config/attendanceConfig';

const AttendanceScreen = ({ navigation }) => {
  const { authToken, user } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [attendances, setAttendances] = useState([]);
  const [activeAttendance, setActiveAttendance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Add state for face verification
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceVerificationDetails, setFaceVerificationDetails] = useState(null);

  // API base URL
  const API_URL = 'http://192.168.29.66:8000/api/auth/';

  useEffect(() => {
    requestLocationPermission();
    fetchAttendances();
    fetchSummary();
  }, []);
  
  // Add a new useEffect to check for face verification status when screen focuses
  useEffect(() => {
    const checkFaceVerification = async () => {
      try {
        const storedVerification = await AsyncStorage.getItem('FACE_VERIFICATION_RESULTS');
        if (storedVerification) {
          const verificationData = JSON.parse(storedVerification);
          console.log('Found stored face verification:', verificationData);
          
          // Check if verification is still valid (not expired)
          const expiryTime = new Date(verificationData.expiresAt).getTime();
          const now = new Date().getTime();
          
          if (now < expiryTime && verificationData.verified) {
            console.log('Face verification is valid and not expired');
            setFaceVerified(true);
            setFaceVerificationDetails(verificationData);
          } else {
            // Clear expired verification
            console.log('Face verification expired or invalid, clearing data');
            await AsyncStorage.removeItem('FACE_VERIFICATION_RESULTS');
            setFaceVerified(false);
            setFaceVerificationDetails(null);
          }
        } else {
          console.log('No stored face verification found');
          setFaceVerified(false);
          setFaceVerificationDetails(null);
        }
      } catch (error) {
        console.error('Error checking face verification:', error);
        setFaceVerified(false);
        setFaceVerificationDetails(null);
      }
    };
    
    // Check immediately when component mounts
    checkFaceVerification();
    
    // Set up a listener for when screen comes into focus
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Attendance screen in focus, checking face verification');
      checkFaceVerification();
    });
    
    // Cleanup the listener when component unmounts
    return unsubscribe;
  }, [navigation]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status !== 'granted') {
        setError('Location permission is required for attendance tracking');
        Alert.alert(
          'Permission Required',
          'Location permission is needed to verify your attendance. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: openSettings }
          ]
        );
      }
    } catch (err) {
      setError('Error requesting location permission');
      console.log(err);
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        await requestLocationPermission();
        if (!locationPermission) {
          return null;
        }
      }
      
      setLoading(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentLocation(location.coords);
      setLoading(false);
      return location.coords;
    } catch (err) {
      setError('Error getting current location');
      setLoading(false);
      console.log(err);
      return null;
    }
  };

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      setAttendances(response.data);
      
      // Enhanced active attendance detection
      const activeAttendances = response.data.filter(a => !a.check_out_time);
      console.log('Active attendances found:', activeAttendances);
      
      if (activeAttendances.length > 0) {
        // Sort by check-in time (most recent first) and take the first one
        const mostRecent = activeAttendances.sort((a, b) => 
          new Date(b.check_in_time) - new Date(a.check_in_time)
        )[0];
        
        console.log('Setting active attendance to:', mostRecent);
        setActiveAttendance(mostRecent);
      } else {
        console.log('No active attendances found');
        setActiveAttendance(null);
      }
      
      setLoading(false);
    } catch (err) {
      setError('Error fetching attendance records');
      setLoading(false);
      console.error('Fetch attendances error:', err.response?.data || err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await axios.get(`${API_URL}attendance/summary/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      setSummary(response.data);
    } catch (err) {
      console.log('Error fetching attendance summary:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendances();
    await fetchSummary();
    setRefreshing(false);
  };

  // Standard GPS-only check-in (keeping for backward compatibility)
  const handleCheckIn = async () => {
    try {
      setLoading(true);
      
      // First, check if there's already an active attendance
      console.log('Checking for existing active attendance');
      const attendanceResponse = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      const activeAttendances = attendanceResponse.data.filter(a => !a.check_out_time);
      if (activeAttendances.length > 0) {
        console.log('Found existing active attendance:', activeAttendances[0]);
        setActiveAttendance(activeAttendances[0]);
        setLoading(false);
        Alert.alert('Already Checked In', 'You already have an active check-in. Please check out first before checking in again.');
        return;
      }
      
      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert('Error', 'Could not get your current location');
        setLoading(false);
        return;
      }

      // Log coordinates for debugging
      console.log('Check-in coordinates:', {
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6))
      });

      // Check if the current time is after the grace period for check-in
      const now = new Date();
      const isLate = isCheckInLate(now);
      console.log('Current time:', now.toLocaleTimeString(), 'Is late?', isLate);
      
      console.log('Sending GPS-only check-in request');
      const response = await axios.post(
        `${API_URL}attendance/check-in/`,
        {
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
          verification_method: 'GPS_ONLY',
          is_late: isLate // Send the late status to the backend
        },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      
      console.log('Check-in response:', response.data);
      
      if (response.data.attendance) {
        setActiveAttendance(response.data.attendance);
        Alert.alert('Success', 'Check-in successful with GPS verification only!');
      }
      
      await fetchAttendances();
      await fetchSummary();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.log('Full check-in error object:', err);
      console.error('Check-in error:', err.response?.data || err);
      
      if (err.response && err.response.data) {
        Alert.alert(
          'Check-in Failed', 
          err.response.data.non_field_errors?.[0] || 
          err.response.data.error || 
          JSON.stringify(err.response.data) || 
          'You are not within range of any authorized location.'
        );
      } else {
        Alert.alert('Error', 'Failed to check in. Please try again.');
      }
    }
  };
  
  // New dual verification check-in (face + GPS)
  const handleDualVerificationCheckIn = async () => {
    try {
      setLoading(true);
      
      // First, check if there's already an active attendance
      console.log('Checking for existing active attendance');
      const attendanceResponse = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      const activeAttendances = attendanceResponse.data.filter(a => !a.check_out_time);
      
      // Check if we already have an active attendance (either from a regular check-in or from face verification)
      const existingActiveAttendance = activeAttendances.length > 0 ? activeAttendances[0] : null;
      
      // Check if we have an existing attendance ID from the face verification process
      const existingAttendanceIdFromFace = faceVerificationDetails?.existingAttendanceId;
      
      // If we have an existing active attendance
      if (existingActiveAttendance) {
        console.log('Found existing active attendance:', existingActiveAttendance);
        setActiveAttendance(existingActiveAttendance);
        
        // Clear the face verification since we already have an active attendance
        await AsyncStorage.removeItem('FACE_VERIFICATION_RESULTS');
        setFaceVerified(false);
        setFaceVerificationDetails(null);
        
        setLoading(false);
        Alert.alert(
          'Already Checked In',
          'You already have an active check-in. The face verification has been recorded.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Check if face has been verified
      if (!faceVerified || !faceVerificationDetails) {
        setLoading(false);
        Alert.alert(
          'Face Verification Required', 
          'Please complete face verification before checking in.',
          [{ 
            text: 'Verify Face', 
            onPress: () => navigation.navigate('FaceRecognition')
          }]
        );
        return;
      }
      
      // If we have an attendance ID from face verification, we'll use it directly
      if (existingAttendanceIdFromFace) {
        console.log('Using existing attendance from face verification:', existingAttendanceIdFromFace);
        
        // Get the specific attendance record by ID
        try {
          const attendanceDetailResponse = await axios.get(
            `${API_URL}attendance/${existingAttendanceIdFromFace}/`, 
            { headers: { Authorization: `Token ${authToken}` } }
          );
          
          console.log('Retrieved existing attendance:', attendanceDetailResponse.data);
          
          // Update it as a dual verification attendance
          const updateResponse = await axios.patch(
            `${API_URL}attendance/${existingAttendanceIdFromFace}/`,
            { verification_method: 'FACE_GPS' },
            { headers: { Authorization: `Token ${authToken}` } }
          );
          
          console.log('Updated attendance with dual verification:', updateResponse.data);
          
          if (updateResponse.data) {
            setActiveAttendance(updateResponse.data);
            
            // Clear the face verification since it's been used
            await AsyncStorage.removeItem('FACE_VERIFICATION_RESULTS');
            setFaceVerified(false);
            setFaceVerificationDetails(null);
            
            Alert.alert('Success', 'Check-in completed with both face and GPS verification!');
          }
          
          await fetchAttendances();
          await fetchSummary();
          setLoading(false);
          return;
        } catch (detailError) {
          console.error('Error getting/updating existing attendance:', detailError);
          // Continue with normal check-in if we can't get the existing attendance
        }
      }
      
      // If we don't have an existing attendance or couldn't update it, proceed with normal check-in
      
      // Get current GPS coordinates
      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert('Error', 'Could not get your current location');
        setLoading(false);
        return;
      }
      
      // Log coordinates for debugging
      console.log('Dual verification check-in coordinates:', {
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6))
      });
      
      // Prepare data for dual verification check-in
      const checkInData = {
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6)),
        face_verification: {
          verified: faceVerificationDetails.verified,
          confidence: faceVerificationDetails.confidence,
          timestamp: faceVerificationDetails.timestamp
        },
        verification_method: 'FACE_GPS'
      };
      
      console.log('Sending dual verification check-in request:', checkInData);
      
      // Since the backend doesn't have a dual-verification endpoint, we'll use the regular check-in endpoint
      const response = await axios.post(
        `${API_URL}attendance/check-in/`,
        checkInData,
        { headers: { Authorization: `Token ${authToken}` } }
      );
      
      console.log('Dual verification check-in response:', response.data);
      
      if (response.data.attendance) {
        setActiveAttendance(response.data.attendance);
        
        // Clear the face verification since it's been used
        await AsyncStorage.removeItem('FACE_VERIFICATION_RESULTS');
        setFaceVerified(false);
        setFaceVerificationDetails(null);
        
        Alert.alert('Success', 'Check-in successful with both face and GPS verification!');
      }
      
      await fetchAttendances();
      await fetchSummary();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.log('Full dual verification check-in error:', err);
      console.error('Dual verification check-in error:', err.response?.data || err);
      
      // Special handling for 400 error which might mean location validation failed
      if (err.response && err.response.status === 400) {
        Alert.alert(
          'Location Validation Failed',
          'You are not within range of any authorized location. However, your face has been verified.',
          [{ text: 'OK' }]
        );
      } else if (err.response && err.response.data) {
        Alert.alert(
          'Dual Verification Check-in Failed', 
          err.response.data.non_field_errors?.[0] || 
          err.response.data.error || 
          JSON.stringify(err.response.data) || 
          'Dual verification check-in failed. Please try again.'
        );
      } else {
        Alert.alert('Error', 'Failed to complete dual verification check-in. Please try again.');
      }
    }
  };

  const handleCheckOut = async () => {
    try {
      // Check if the current time is before the required check-out time (5 PM)
      const now = new Date();
      const isEarlyCheckOut = isCheckOutEarly(now);
      
      // If trying to check out before 5 PM, show a warning dialog
      if (isEarlyCheckOut) {
        Alert.alert(
          'Early Check-Out',
          `The required check-out time is after ${ATTENDANCE_CONFIG.checkOutTime.hour % 12}:${ATTENDANCE_CONFIG.checkOutTime.minute.toString().padStart(2, '0')} PM. Are you sure you want to check out early?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Check Out Anyway', style: 'destructive', onPress: () => processCheckOut() }
          ]
        );
        return;
      }
      
      // If after 5 PM, proceed with check-out directly
      await processCheckOut();
    } catch (err) {
      setLoading(false);
      console.error('Check-out validation error:', err);
      Alert.alert('Error', 'Failed to process check-out: ' + (err.message || 'Unknown error'));
    }
  };
  
  // Function to process the actual check-out operation
  const processCheckOut = async () => {
    try {
      setLoading(true);
      
      // Debug information
      console.log('Starting checkout process');
      
      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert('Error', 'Could not get your current location');
        setLoading(false);
        return;
      }
      
      // Log coordinates for debugging
      console.log('Check-out coordinates:', {
        latitude: Number(coords.latitude.toFixed(6)),
        longitude: Number(coords.longitude.toFixed(6))
      });
      
      // Try using the traditional approach first
      // Fetch latest attendance records to ensure we have current data
      console.log('Fetching latest attendance records');
      const attendanceResponse = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Find active attendances specifically for the current user
      console.log('Current user ID:', user ? user.id : 'user not available');
      
      const currentActiveAttendances = attendanceResponse.data.filter(a => {
        // Check both user ID and email to ensure we're finding the right record
        const isUserMatch = (a.user === user?.id) || (a.user_email === user?.email);
        const isActive = !a.check_out_time;
        console.log(`Checking attendance #${a.id}: User match: ${isUserMatch}, Active: ${isActive}`);
        return isActive && isUserMatch;
      });
      
      console.log('Found active attendances:', currentActiveAttendances.length);
      
      if (currentActiveAttendances.length === 0) {
        setLoading(false);
        Alert.alert('Error', 'No active check-in found for your account. Please check in first.');
        return;
      }
      
      // Use the most recent active attendance
      const mostRecentActiveAttendance = currentActiveAttendances.sort((a, b) => 
        new Date(b.check_in_time) - new Date(a.check_in_time)
      )[0];
      
      console.log('Selected attendance for checkout:', mostRecentActiveAttendance.id);
      
      // Make the check-out request
      const response = await axios.post(
        `${API_URL}attendance/check-out/`,
        {
          attendance_id: mostRecentActiveAttendance.id,
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6))
        },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      
      console.log('Checkout response:', response.data);
      
      setActiveAttendance(null);
      Alert.alert('Success', 'Check-out successful!');
      await fetchAttendances();
      await fetchSummary();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.log('Full checkout error object:', err);
      console.error('Check-out error:', err.response?.data || err);
      
      if (err.response && err.response.data) {
        Alert.alert(
          'Check-out Failed', 
          err.response.data.non_field_errors?.[0] || 
          err.response.data.error || 
          JSON.stringify(err.response.data) || 
          'Failed to check out.'
        );
      } else {
        Alert.alert('Error', 'Failed to check out: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    
    // Get hours and minutes
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Format the duration
    if (diffHrs === 0) {
      return `${diffMins}m`;
    } else {
      return `${diffHrs}h ${diffMins}m`;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#f0f2f5' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: '#f8f9fa' }]}>
      <Appbar.Header elevation={0} style={{ backgroundColor: theme.colors.primary, height: 70 }}>
        <Appbar.Content 
          title="Attendance Manager" 
          titleStyle={{ fontWeight: 'bold', fontSize: 22, color: 'white', letterSpacing: 0.5 }} 
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          subtitleStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}
        />
        <IconButton 
          icon="bell-outline" 
          color="white" 
          size={24} 
          onPress={() => {}} 
          style={{ marginRight: -8 }}
        />
        <IconButton 
          icon="refresh" 
          color="white" 
          size={24} 
          onPress={onRefresh} 
        />
      </Appbar.Header>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Attendance Summary Card */}
        <Surface style={[styles.card, { borderRadius: 20, elevation: 4, marginBottom: 20, overflow: 'hidden' }]}>
          <View style={{ padding: 0 }}>
            {/* Card Header with Gradient */}
            <View style={{ 
              backgroundColor: theme.colors.primary, 
              paddingVertical: 16, 
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon 
                  size={40} 
                  icon="chart-timeline-variant" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }} 
                  color="white" 
                />
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Today's Status</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</Text>
                </View>
              </View>
              <Badge style={{ backgroundColor: activeAttendance ? '#4CAF50' : '#FF9800', color: 'white', fontWeight: 'bold' }}>
                {activeAttendance ? 'CHECKED IN' : 'NOT CHECKED IN'}
              </Badge>
            </View>
            
            {/* Schedule Info */}
            <View style={{ backgroundColor: 'white', padding: 20 }}>
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleItem}>
                  <View style={styles.scheduleTimeContainer}>
                    <Icon name="clock-time-nine-outline" size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.scheduleTimeText}>{`${ATTENDANCE_CONFIG.checkInTime.hour}:${ATTENDANCE_CONFIG.checkInTime.minute.toString().padStart(2, '0')} AM`}</Text>
                  </View>
                  <Text style={styles.scheduleLabel}>Check-in Time</Text>
                  <Caption style={styles.scheduleNote}>Grace period: {ATTENDANCE_CONFIG.checkInTime.gracePeriodMinutes} min</Caption>
                </View>
                
                <Divider style={{ width: 1, height: '80%', backgroundColor: '#E0E0E0' }} />
                
                <View style={styles.scheduleItem}>
                  <View style={styles.scheduleTimeContainer}>
                    <Icon name="clock-time-five-outline" size={24} color={theme.colors.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.scheduleTimeText}>{`${ATTENDANCE_CONFIG.checkOutTime.hour - 12}:${ATTENDANCE_CONFIG.checkOutTime.minute.toString().padStart(2, '0')} PM`}</Text>
                  </View>
                  <Text style={styles.scheduleLabel}>Check-out Time</Text>
                  <Caption style={styles.scheduleNote}>Or later as needed</Caption>
                </View>
              </View>
            </View>
          </View>
        </Surface>
        {!locationPermission && (
          <Surface style={[styles.card, { borderRadius: 20, elevation: 4, marginBottom: 20, overflow: 'hidden' }]}>
            <View style={{ padding: 0 }}>
              {/* Error header */}
              <View style={{ 
                backgroundColor: '#FF5252',
                paddingVertical: 16, 
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Avatar.Icon 
                  size={40} 
                  icon="alert-circle-outline" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }} 
                  color="white" 
                />
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Location Access Required</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Cannot proceed without permission</Text>
                </View>
              </View>
              
              {/* Error content */}
              <View style={{ backgroundColor: 'white', padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <Icon name="map-marker-alert" size={24} color="#FF5252" style={{ marginRight: 12 }} />
                  <Text style={{ flex: 1, color: '#424242', lineHeight: 20 }}>
                    For accurate attendance tracking, we need to verify your location. This data is only used when you check in or out.
                  </Text>
                </View>
                
                <Button 
                  mode="contained" 
                  icon="map-marker-check" 
                  onPress={requestLocationPermission}
                  style={{ backgroundColor: '#FF5252', borderRadius: 10, elevation: 0 }}
                  labelStyle={{ fontSize: 14, letterSpacing: 0.5, fontWeight: 'bold' }}
                  contentStyle={{ height: 48 }}
                >
                  Enable Location Access
                </Button>
              </View>
            </View>
          </Surface>
        )}
        
        {summary && (
          <Surface style={[styles.card, { borderRadius: 16, elevation: 2, marginBottom: 16, backgroundColor: '#EBF5FB' }]}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Avatar.Icon 
                  size={36} 
                  icon="chart-timeline-variant" 
                  style={{ backgroundColor: '#E8F0FF', marginRight: 12 }} 
                  color={theme.colors.primary} 
                />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>Monthly Summary</Text>
              </View>
              
              <View style={[styles.summaryRow, { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16 }]}>
                <View style={styles.summaryItem}>
                  <Avatar.Icon 
                    size={44} 
                    icon="calendar-check" 
                    style={{ backgroundColor: '#E1F5FE', marginBottom: 8 }} 
                    color="#0288D1"
                  />
                  <Text style={styles.summaryLabel}>Days Present</Text>
                  <Text style={[styles.summaryValue, { color: '#0288D1' }]}>{summary.days_present}</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Avatar.Icon 
                    size={44} 
                    icon="clock-outline" 
                    style={{ backgroundColor: '#E8F5E9', marginBottom: 8 }} 
                    color="#2E7D32"
                  />
                  <Text style={styles.summaryLabel}>Total Hours</Text>
                  <Text style={[styles.summaryValue, { color: '#2E7D32' }]}>{summary.total_hours}</Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Avatar.Icon 
                    size={44} 
                    icon="calendar-multiple-check" 
                    style={{ backgroundColor: '#FFF3E0', marginBottom: 8 }} 
                    color="#EF6C00"
                  />
                  <Text style={styles.summaryLabel}>Check-ins</Text>
                  <Text style={[styles.summaryValue, { color: '#EF6C00' }]}>{summary.attendance_count}</Text>
                </View>
              </View>
            </View>
          </Surface>
        )}
        
        <Surface style={[styles.card, { borderRadius: 20, elevation: 4, marginBottom: 20, overflow: 'hidden' }]}>
          <View style={{ padding: 0 }}>
            {/* Status Card Header */}
            <View style={{ 
              backgroundColor: activeAttendance ? '#4CAF50' : '#FF9800', 
              paddingVertical: 16, 
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon 
                  size={40} 
                  icon={activeAttendance ? "check-circle" : "clipboard-check-outline"} 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }} 
                  color="white" 
                />
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                    {activeAttendance ? 'Currently Checked In' : 'Attendance Status'}
                  </Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                    {activeAttendance 
                      ? `Since: ${formatDate(activeAttendance.check_in_time)}` 
                      : 'Please check in to record your attendance'}
                  </Text>
                </View>
              </View>
              {activeAttendance && (
                <Chip 
                  mode="outlined" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'transparent' }}
                  textStyle={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}
                >
                  {activeAttendance.verification_method === 'FACE_GPS' ? 'FACE ID + GPS' : 'GPS ONLY'}
                </Chip>
              )}
            </View>
            
            {/* Status Card Content */}
            <View style={{ backgroundColor: 'white', padding: 20 }}>
              {activeAttendance ? (
                <View>
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Icon name="clock-in" size={22} color={theme.colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.infoLabel}>Check-in Time</Text>
                        <Text style={styles.infoValue}>
                          {new Date(activeAttendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.infoItem}>
                      <Icon name="timer-outline" size={22} color={theme.colors.primary} />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>{calculateDuration(activeAttendance.check_in_time, new Date())}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <Divider style={{ marginVertical: 16 }} />
                  
                  <Text style={{ fontSize: 14, color: '#555555', marginBottom: 16, lineHeight: 20, textAlign: 'center' }}>
                    Don't forget to check out when you're done for the day.
                    Your attendance won't be properly recorded without a check-out.
                  </Text>
                  
                  <Button 
                    mode="contained" 
                    icon="logout-variant" 
                    onPress={handleCheckOut}
                    style={{ backgroundColor: '#E53935', borderRadius: 10 }}
                    labelStyle={{ fontSize: 16, letterSpacing: 0.5, fontWeight: 'bold' }}
                    contentStyle={{ height: 48 }}
                    disabled={loading}
                  >
                    Check Out Now
                  </Button>
                </View>
              ) : (
                <View>
                  {/* Verification Status Indicators */}
                  <View style={styles.verificationContainer}>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#424242', marginBottom: 12 }}>Verification Status</Text>
                    
                    <View style={styles.verificationRow}>
                      <View style={[styles.verificationBadge, { backgroundColor: faceVerified ? '#E8F5E9' : '#FFF8E1' }]}>
                        <Icon 
                          name={faceVerified ? "face-recognition" : "face-recognition"} 
                          size={20} 
                          color={faceVerified ? '#2E7D32' : '#FFA000'} 
                          style={{ marginRight: 8 }} 
                        />
                        <Text style={{ color: faceVerified ? '#2E7D32' : '#FFA000', fontSize: 13, fontWeight: 'bold' }}>
                          {faceVerified ? 'Face Verified' : 'Face Required'}
                        </Text>
                      </View>
                      
                      <View style={[styles.verificationBadge, { backgroundColor: locationPermission ? '#E8F5E9' : '#FFF8E1' }]}>
                        <Icon 
                          name="map-marker-check" 
                          size={20} 
                          color={locationPermission ? '#2E7D32' : '#FFA000'} 
                          style={{ marginRight: 8 }} 
                        />
                        <Text style={{ color: locationPermission ? '#2E7D32' : '#FFA000', fontSize: 13, fontWeight: 'bold' }}>
                          {locationPermission ? 'GPS Ready' : 'GPS Required'}
                        </Text>
                      </View>
                    </View>
                    
                    {faceVerified && faceVerificationDetails && (
                      <Text style={{ fontSize: 12, color: '#757575', marginTop: 8, textAlign: 'center' }}>
                        Face verified with {faceVerificationDetails.confidence}% confidence
                      </Text>
                    )}
                  </View>
                  
                  <Divider style={{ marginVertical: 16 }} />
                  
                  <Text style={{ fontSize: 14, color: '#757575', marginBottom: 16, lineHeight: 20, textAlign: 'center' }}>
                    Choose a check-in method below. For highest security,
                    use dual verification with Face ID and GPS.
                  </Text>
                  
                  <View style={styles.buttonContainer}>
                    <Button 
                      mode="contained" 
                      icon="face-recognition"
                      onPress={() => navigation.navigate('FaceRecognition')}
                      style={{ backgroundColor: '#4CAF50', borderRadius: 10, flex: 1, marginRight: 10 }}
                      labelStyle={{ fontSize: 14, letterSpacing: 0.5, fontWeight: 'bold' }}
                      contentStyle={{ height: 48 }}
                      disabled={loading || !locationPermission}
                    >
                      Verify Face ID
                    </Button>
                    
                    <Button 
                      mode="outlined" 
                      icon="login-variant"
                      onPress={handleCheckIn}
                      style={{ 
                        borderColor: '#FF9800',
                        borderRadius: 10,
                        borderWidth: 2,
                        flex: 1
                      }}
                      labelStyle={{ fontSize: 14, color: '#FF9800', fontWeight: 'bold' }}
                      contentStyle={{ height: 48 }}
                      disabled={loading || !locationPermission}
                    >
                      GPS Only
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Surface>
        
        <Surface style={[styles.card, { borderRadius: 20, elevation: 4, marginBottom: 30, overflow: 'hidden' }]}>
          <View style={{ padding: 0 }}>
            {/* Recent Attendance Header */}
            <View style={{ 
              backgroundColor: theme.colors.primary, 
              paddingVertical: 16, 
              paddingHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Avatar.Icon 
                  size={40} 
                  icon="history" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 12 }} 
                  color="white" 
                />
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Recent Attendance</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                    Last {Math.min(5, attendances.length)} attendance records
                  </Text>
                </View>
              </View>
              <IconButton 
                icon="calendar" 
                color="white" 
                size={24} 
                onPress={() => navigation.navigate('MyAttendance')} 
              />
            </View>

            {/* Attendance Table */}
            <View style={{ backgroundColor: 'white', padding: 16 }}>
              <DataTable style={styles.dataTable}>
                <DataTable.Header style={styles.tableHeader}>
                  <DataTable.Title><Text style={{ fontWeight: 'bold', color: '#424242' }}>Date</Text></DataTable.Title>
                  <DataTable.Title><Text style={{ fontWeight: 'bold', color: '#424242' }}>Check In</Text></DataTable.Title>
                  <DataTable.Title><Text style={{ fontWeight: 'bold', color: '#424242' }}>Check Out</Text></DataTable.Title>
                  <DataTable.Title numeric><Text style={{ fontWeight: 'bold', color: '#424242' }}>Hours</Text></DataTable.Title>
                </DataTable.Header>
                
                {attendances.length > 0 ? (
                  attendances.slice(0, 5).map((attendance) => (
                    <DataTable.Row key={attendance.id}>
                      <DataTable.Cell>
                        <Text style={{ color: '#424242', fontWeight: '500' }}>
                          {new Date(attendance.check_in_time).toLocaleDateString([], {month: 'short', day: 'numeric'})}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        <Text style={{ color: theme.colors.primary, fontWeight: '500' }}>
                          {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </DataTable.Cell>
                      <DataTable.Cell>
                        {attendance.check_out_time ? (
                          <Text style={{ color: '#E53935', fontWeight: '500' }}>
                            {new Date(attendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        ) : (
                          <Chip size={20} style={{ backgroundColor: '#FFECB3' }} textStyle={{ color: '#FF8F00', fontSize: 10 }}>ACTIVE</Chip>
                        )}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        <Text style={{ fontWeight: '600', color: '#424242' }}>
                          {attendance.duration || (attendance.check_out_time ? 
                            calculateDuration(attendance.check_in_time, attendance.check_out_time) : 
                            calculateDuration(attendance.check_in_time, new Date()))
                          }
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))
                ) : (
                  <DataTable.Row>
                    <DataTable.Cell style={{ flex: 4, justifyContent: 'center', paddingVertical: 24 }}>
                      <Text style={{ textAlign: 'center', color: '#757575', fontStyle: 'italic' }}>
                        No attendance records found
                      </Text>
                    </DataTable.Cell>
                  </DataTable.Row>
                )}
              </DataTable>
              
              {attendances.length > 5 && (
                <Button 
                  mode="outlined" 
                  icon="calendar-month-outline"
                  onPress={() => navigation.navigate('MyAttendance')}
                  style={{ borderColor: theme.colors.primary, borderRadius: 10, marginTop: 16 }}
                  labelStyle={{ color: theme.colors.primary, fontSize: 14, fontWeight: '500' }}
                  contentStyle={{ height: 44 }}
                >
                  View All Records
                </Button>
              )}
            </View>
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    marginBottom: 16,
    borderRadius: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    padding: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    borderRadius: 10,
    marginVertical: 4,
  },
  verificationContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleItem: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
  },
  scheduleTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTimeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 4,
  },
  scheduleNote: {
    color: '#9E9E9E',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  dataTable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#E8F0FF',
  },
});

export default AttendanceScreen; 