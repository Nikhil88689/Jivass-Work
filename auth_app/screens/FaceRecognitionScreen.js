import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform, Linking } from 'react-native';
import { 
  Text, 
  Button, 
  ActivityIndicator, 
  Appbar,
  Portal,
  Dialog
} from 'react-native-paper';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

// Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const FaceRecognitionScreen = ({ navigation }) => {
  const { authToken, user } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasReferenceImage, setHasReferenceImage] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  
  // Storage key for face image status
  const FACE_IMAGE_STATUS_KEY = 'USER_HAS_FACE_IMAGE';

  // API base URL - update to match your server address
  // For Android emulator: 10.0.2.2 points to host machine's localhost
  // For iOS simulator: localhost or 127.0.0.1 works
  // For physical devices: Use your computer's actual IP address (e.g., 192.168.1.100)
  // Try multiple options if one doesn't work
  const getApiUrl = () => {
    if (Platform.OS === 'android') {
      // Try these IPs in order for Android
      return 'http://192.168.29.66:8000/api/auth/';
    } else {
      // iOS usually works with localhost
      return 'http://localhost:8000/api/auth/';
    }
  };
  
  const API_URL = getApiUrl();

  useEffect(() => {
    (async () => {
      // Request camera permission
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(cameraStatus === 'granted');
      
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationStatus === 'granted');
      
      // Check if user has a reference image without showing dialog
      try {
        const cachedStatus = await AsyncStorage.getItem(FACE_IMAGE_STATUS_KEY);
        console.log('Cached face image status:', cachedStatus);
        
        if (cachedStatus === 'true') {
          console.log('Using cached status: User has face image');
          setHasReferenceImage(true);
        } else {
          // If no cached status or it's 'false', check with server silently
          console.log('No valid cached status, checking with server');
          const hasImage = await checkServerForReferenceImage();
          setHasReferenceImage(hasImage);
          
          // Update cache
          await AsyncStorage.setItem(FACE_IMAGE_STATUS_KEY, hasImage ? 'true' : 'false');
        }
      } catch (storageError) {
        console.error('Error reading from AsyncStorage:', storageError);
        // Fall back to server check if storage fails
        const hasImage = await checkServerForReferenceImage();
        setHasReferenceImage(hasImage);
      }
    })();
  }, []);

  // We'll check for face image existence by directly asking the server
  // Helper function to check server without UI side effects
  const checkServerForReferenceImage = async () => {
    try {
      // Try direct face check endpoint
      try {
        const faceCheckResponse = await axios.get(`${API_URL}face/check/`, {
          headers: { Authorization: `Token ${authToken}` },
          timeout: 5000
        });
        
        if (faceCheckResponse.data && faceCheckResponse.data.has_face_image) {
          return true;
        }
      } catch (error) {
        console.log('Face check endpoint not available');
      }
      
      // Try history endpoint
      try {
        const historyResponse = await axios.get(`${API_URL}face/history/`, {
          headers: { Authorization: `Token ${authToken}` },
          timeout: 5000
        });
        
        if (historyResponse.data && historyResponse.data.has_uploads) {
          return true;
        }
      } catch (error) {
        console.log('History endpoint not available');
      }
      
      // No evidence of a face image
      return false;
    } catch (error) {
      console.error('Error in server check:', error);
      return false;
    }
  };
  
  // Removed checkReferenceImage function as users no longer need to capture reference images
  
  // Function to check profile API as a last resort
  const checkProfileAPI = async (foundReferenceImage, showDialogIfNeeded) => {
      try {
        console.log('Checking profile as last resort');
        const response = await axios.get(`${API_URL}profile/`, {
          headers: { Authorization: `Token ${authToken}` },
          timeout: 10000
        });
        
        // Just log the response, we don't expect to find face image info here
        console.log('Profile data received:', response.data);
      } catch (profileError) {
        console.log('Profile check failed:', profileError.message);
      }
      
      // If we get here and haven't returned, we haven't confirmed a reference image exists
      if (!foundReferenceImage) {
        console.log('No reference image found through any method');
        await AsyncStorage.setItem(FACE_IMAGE_STATUS_KEY, 'false');
        setHasReferenceImage(false);
        
        if (showDialogIfNeeded) {
          console.log('Showing reference dialog as requested');
          setShowReferenceDialog(true);
        }
      }
  };
  
  // Function to check for reference image and show dialog if needed
  const checkReferenceImage = async (showDialogIfNeeded = false) => {
    try {
      let foundReferenceImage = await checkServerForReferenceImage();
      
      // If server check didn't find an image, try profile API as last resort
      if (!foundReferenceImage) {
        await checkProfileAPI(foundReferenceImage, showDialogIfNeeded);
      }
    } catch (err) {
      console.error('Error in checkReferenceImage:', err);
      
      // Only show dialog if requested
      if (showDialogIfNeeded && err.message && err.message.includes('Network Error')) {
        Alert.alert(
          'Network Error',
          'Could not connect to the server to check for a reference image. Would you like to try capturing one anyway?',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Capture Reference',
              onPress: () => setShowReferenceDialog(true)
            }
          ]
        );
      }
    }
  };

  const getCurrentLocation = async () => {
    try {
      if (!locationPermission) {
        Alert.alert('Permission Required', 'Location permission is needed for attendance verification.');
        return null;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
    } catch (err) {
      console.error('Error getting location:', err);
      Alert.alert('Error', 'Could not get your current location');
      return null;
    }
  };

  const captureImage = async () => {
    try {
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Resize and compress image
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 600 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        return manipResult;
      }
      return null;
    } catch (err) {
      console.error('Error capturing image:', err);
      return null;
    }
  };

  // Removed captureReference function as users no longer need to capture reference images
  // This functionality is now only available to admins in the UserDetailScreen

  const captureAndVerify = async () => {
    try {
      // First check cached status
      let referenceStatus = false;
      try {
        const cachedStatus = await AsyncStorage.getItem(FACE_IMAGE_STATUS_KEY);
        referenceStatus = cachedStatus === 'true';
        console.log('Cached face image status:', referenceStatus);
      } catch (storageError) {
        console.log('Error reading cached face status:', storageError.message);
      }
      
      // If we still don't think we have a reference image, check with the server silently
      if (!referenceStatus && !hasReferenceImage) {
        try {
          console.log('Double-checking reference image status with server...');
          const hasFace = await checkServerForReferenceImage();
          if (hasFace) {
            console.log('Server confirms reference image exists');
            referenceStatus = true;
            setHasReferenceImage(true);
          }
        } catch (checkError) {
          console.log('Error in server face check:', checkError.message);
        }
      }
      
      // If we still don't have a reference image, prompt to create one
      if (!referenceStatus && !hasReferenceImage) {
        console.log('No reference image found, showing dialog');
        setShowReferenceDialog(true);
        return;
      }
      
      setLoading(true);
      
      // Get location
      const coords = await getCurrentLocation();
      if (!coords) {
        setLoading(false);
        return;
      }
      
      const image = await captureImage();
      if (!image) {
        setLoading(false);
        return;
      }
      
      console.log('Image captured for verification:', image.uri);
      
      // Create form data for upload
      const formData = new FormData();
      formData.append('face_image', {
        uri: image.uri,
        type: 'image/jpeg',
        name: 'face_verification.jpg'
      });
      formData.append('latitude', coords.latitude.toFixed(6));
      formData.append('longitude', coords.longitude.toFixed(6));
      
      console.log('Sending for face verification to:', `${API_URL}face/check-in/`);
      
      // Send to server for face verification
      // We're using the check-in endpoint but we'll intercept the result and not navigate back to attendance
      const response = await axios.post(
        `${API_URL}face/check-in/`, // Using existing endpoint
        formData,
        { 
          headers: { 
            'Authorization': `Token ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('Face verification response:', response.data);
      
      // The check-in endpoint might have already created an attendance record,
      // but we'll store the verification results for dual verification anyway
      
      // If attendance record was created, extract verification information
      if (response.data && response.data.attendance) {
        console.log('Attendance was recorded by endpoint, but we will use this only for verification');
        
        // Store that we have a valid face image (long-term storage)
        await AsyncStorage.setItem(FACE_IMAGE_STATUS_KEY, 'true');
        
        // Store the verification results for attendance check-in (short-term)
        const verificationResults = {
          verified: true, 
          // Backend doesn't include confidence percentage, so we'll use a default
          confidence: response.data.face_verification?.confidence || 95,
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15*60000).toISOString(), // Valid for 15 minutes
          // Store the attendance ID so we can reference it later
          existingAttendanceId: response.data.attendance.id
        };
        
        await AsyncStorage.setItem('FACE_VERIFICATION_RESULTS', JSON.stringify(verificationResults));
        console.log('Stored face verification results:', verificationResults);
        
        Alert.alert(
          'Face Verification Successful', 
          'Your identity was verified! You can now return to the attendance screen for the dual verification check-in.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (response.data && response.data.face_verification && response.data.face_verification.matched) {
        // Regular response format with face_verification
        
        // Store that we have a valid face image (long-term storage)
        await AsyncStorage.setItem(FACE_IMAGE_STATUS_KEY, 'true');
        
        // Store the verification results for attendance check-in (short-term)
        const verificationResults = {
          verified: true,
          confidence: response.data.face_verification.confidence,
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude
          },
          timestamp: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 15*60000).toISOString() // Valid for 15 minutes
        };
        
        await AsyncStorage.setItem('FACE_VERIFICATION_RESULTS', JSON.stringify(verificationResults));
        console.log('Stored face verification results:', verificationResults);
        
        Alert.alert(
          'Face Verification Successful', 
          `Your identity was verified with ${response.data.face_verification.confidence}% confidence. Returning to attendance screen for final check-in.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Verification failed
        Alert.alert(
          'Face Verification Failed', 
          'Your face could not be verified. Please try again with better lighting and a clear view of your face.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Face verification error:', err.response?.data || err);
      
      if (err.response && err.response.data) {
        Alert.alert('Verification Failed', err.response.data.error || 'Face verification failed');
      } else {
        Alert.alert('Error', 'Failed to complete face verification');
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null || locationPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.text}>Requesting permissions...</Text>
      </View>
    );
  }
  
  if (hasPermission === false || locationPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera and location permissions are required.</Text>
        <Button 
          mode="contained" 
          onPress={() => Linking.openSettings()}
          style={styles.button}
        >
          Open Settings
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Face Verification" />
      </Appbar.Header>
      
      <View style={styles.contentContainer}>
        <Text style={styles.instructionText}>
          When you click the button below, your camera will open.
          Please center your face in the frame and take a clear photo.
        </Text>
        
        <View style={styles.faceIconContainer}>
          <Text style={styles.faceIcon}>😊</Text>
        </View>
        
        <Button
          mode="contained"
          icon="camera"
          loading={loading}
          disabled={loading}
          onPress={captureAndVerify}
          style={styles.verifyButton}
        >
          Take Photo & Verify
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    borderWidth: 2,
    borderColor: '#3498db',
    borderStyle: 'dashed',
  },
  faceIcon: {
    fontSize: 80,
  },
  instructionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 24,
  },
  verifyButton: {
    marginTop: 30,
    paddingVertical: 8,
    width: '100%',
    backgroundColor: '#4caf50',
  },
  text: {
    textAlign: 'center',
    margin: 20,
  },
  button: {
    margin: 20,
  },
  dialogText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dialogInstructions: {
    fontSize: 16,
  },
});

export default FaceRecognitionScreen;