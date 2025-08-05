import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from 'react-native-paper';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  Alert,
  StatusBar,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Text, 
  Surface, 
  Button, 
  Avatar, 
  TextInput, 
  HelperText, 
  Divider,
  ActivityIndicator,
  Snackbar,
  Appbar,
  Card,
  IconButton
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { Formik } from 'formik';
import * as Yup from 'yup';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';

// Validation schema
const ProfileSchema = Yup.object().shape({
  first_name: Yup.string().required('First name is required'),
  last_name: Yup.string().required('Last name is required'),
  phone_number: Yup.string().nullable(),
  bio: Yup.string(),
  address: Yup.string()
});

const ProfileScreen = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { user, authToken, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('info');
  const [profile, setProfile] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [hasFaceImage, setHasFaceImage] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // API base URL
  const API_URL = Platform.OS === 'android' 
    ? 'http://192.168.29.66:8000/api/auth/' 
    : 'http://localhost:8000/api/auth/';

  // Keep track of if a face image upload was successful in the current session
  const [faceUploadedThisSession, setFaceUploadedThisSession] = useState(false);

  useEffect(() => {
    fetchProfile();
    checkFaceImageExists();
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to change your profile picture!');
      }
    })();
  }, []);
  
  // Effect to ensure UI consistency for face image status
  useEffect(() => {
    // If we've uploaded a face image successfully in this session, make sure UI shows it
    if (faceUploadedThisSession && !hasFaceImage) {
      setHasFaceImage(true);
    }
  }, [faceUploadedThisSession, hasFaceImage]);
  
  const hideSnackbar = () => {
    setSnackbarVisible(false);
  };

  const checkFaceImageExists = async () => {
    try {
      // First check AsyncStorage for cached status
      const cachedStatus = await AsyncStorage.getItem('USER_HAS_FACE_IMAGE');
      if (cachedStatus === 'true') {
        console.log('Using cached status: User has face image');
        return true;
      }

      // Try multiple methods to determine if user has a face image
      try {
        const response = await axios.get(`${API_URL}face/check/`, {
          headers: { Authorization: `Token ${authToken}` },
          timeout: 5000
        });
        
        if (response.data && response.data.has_face_image) {
          await AsyncStorage.setItem('USER_HAS_FACE_IMAGE', 'true');
          return true;
        }
      } catch (error) {
        console.log('Error checking face image via direct check:', error);
      }
      
      // Method 2: Check face history
      try {
        const historyResponse = await axios.get(`${API_URL}face/history/`, {
          headers: { Authorization: `Token ${authToken}` },
          timeout: 5000
        });
        
        if (historyResponse.data && historyResponse.data.has_uploads) {
          await AsyncStorage.setItem('USER_HAS_FACE_IMAGE', 'true');
          return true;
        }
      } catch (historyError) {
        console.log('Error checking face history:', historyError);
      }
      
      // Method 3: Check if the user's profile indicates they've been verified before
      if (profile && profile.id) {
        if (profile.is_verified !== undefined || profile.phone_number) {
          await AsyncStorage.setItem('USER_HAS_FACE_IMAGE', 'true');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log('Error in comprehensive face image check:', error);
      return false;
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}profile/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      const userData = response.data;
      
      setProfile(userData);
      setFirstName(userData.first_name || '');
      setLastName(userData.last_name || '');
      setEmail(userData.email || '');
      
      // Check for face image existence
      const hasFaceImage = await checkFaceImageExists();
      setHasFaceImage(hasFaceImage);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true);
      
      // Update the profile on the backend
      await axios.patch(`${API_URL}profile/`, {
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone_number,
        profile: {
          bio: values.bio,
          address: values.address,
        }
      }, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Update local state
      setFirstName(values.first_name);
      setLastName(values.last_name);
      setProfile(prev => ({
        ...prev,
        first_name: values.first_name,
        last_name: values.last_name,
        phone_number: values.phone_number,
        profile: {
          ...prev.profile,
          bio: values.bio,
          address: values.address,
        }
      }));
      
      setIsEditing(false);
      setSnackbarMessage('Profile updated successfully');
      setSnackbarType('success');
      setSnackbarVisible(true);
      setLoading(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setLoading(false);
      setSnackbarMessage('Failed to update profile');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        
        // Compress image for upload
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 300, height: 300 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // Create form data for API upload
        const formData = new FormData();
        formData.append('avatar', {
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
        
        // Upload the image
        await axios.patch(
          `${API_URL}profile/avatar/`,
          formData,
          {
            headers: {
              Authorization: `Token ${authToken}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // Refresh profile to get updated avatar URL
        await fetchProfile();
        
        setSnackbarMessage('Profile picture updated successfully');
        setSnackbarType('success');
        setSnackbarVisible(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating profile picture:', error);
      setLoading(false);
      setSnackbarMessage('Failed to update profile picture');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  const updateFaceImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        
        // Compress image for upload
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        
        // Create form data for API upload
        const formData = new FormData();
        formData.append('face_image', {
          uri: manipResult.uri,
          type: 'image/jpeg',
          name: 'face_image.jpg',
        });
        
        // Upload the face image
        await axios.post(
          `${API_URL}face/upload/`,
          formData,
          {
            headers: {
              Authorization: `Token ${authToken}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // Mark as uploaded in this session and in AsyncStorage
        await AsyncStorage.setItem('USER_HAS_FACE_IMAGE', 'true');
        setFaceUploadedThisSession(true);
        setHasFaceImage(true);
        
        setSnackbarMessage(hasFaceImage ? 'Face image updated successfully' : 'Face registered successfully');
        setSnackbarType('success');
        setSnackbarVisible(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error updating face image:', error);
      setLoading(false);
      setSnackbarMessage('Failed to update face image');
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  // Render loading state if profile data is still loading
  if (loading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#555' }}>Loading profile...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
      <Appbar.Header style={styles.appBar}>
        <Appbar.Content 
          title="Profile" 
          titleStyle={styles.appBarTitle} 
        />
        <Appbar.Action icon="refresh" onPress={fetchProfile} color="white" />
      </Appbar.Header>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidView}>
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>
          
          {/* Profile Header with Avatar */}
          <Surface style={styles.profileHeader} elevation={4}>
            <View style={styles.coverImageContainer}>
              <View style={styles.coverImageGradient}></View>
            </View>
            
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={pickImage}>
                <Avatar.Image 
                  source={profile?.avatar 
                    ? { uri: profile.avatar } 
                    : require('../assets/avatar-placeholder.png')} 
                  size={100} 
                  style={styles.avatar} 
                />
                <View style={styles.cameraIconContainer}>
                  <IconButton 
                    icon="camera" 
                    size={20}
                    color="white"
                    style={styles.cameraIcon}
                  />
                </View>
              </TouchableOpacity>
              
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{firstName} {lastName}</Text>
                <Text style={styles.email}>{email}</Text>
              </View>
            </View>
            
            {/* Quick Actions Row */}
            <View style={styles.quickActionsContainer}>
              <Button 
                mode="contained" 
                onPress={() => setIsEditing(true)} 
                icon="account-edit" 
                style={styles.editButton}
                labelStyle={styles.buttonLabel}
                disabled={isEditing}
              >
                Edit Profile
              </Button>
              
              <Button
                mode="contained"
                onPress={() => navigation.navigate('MyAttendance')}
                icon="calendar-check"
                style={styles.attendanceButton}
                labelStyle={styles.buttonLabel}
              >
                My Attendance
              </Button>
            </View>
          </Surface>

          {!isEditing ? (
            <>
              {/* Face Recognition Card */}
              <Surface style={styles.card} elevation={1}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Avatar.Icon 
                      size={40} 
                      icon="face-recognition" 
                      style={[styles.cardIcon, {backgroundColor: hasFaceImage ? '#4CAF50' : '#1976D2'}]} 
                    />
                  </View>
                  
                  <View style={styles.cardHeaderContent}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardTitle}>Face Recognition</Text>
                      <View style={[styles.statusChip, 
                        {backgroundColor: hasFaceImage ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)'}]}>
                        <Text style={[styles.statusText, 
                          {color: hasFaceImage ? '#4CAF50' : '#FF9800'}]}>
                          {hasFaceImage ? 'Enabled' : 'Setup Required'}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={styles.cardDescription}>
                      {hasFaceImage 
                        ? 'Your face is registered for secure authentication. Update occasionally to improve recognition.'
                        : 'Register your face to enable secure biometric authentication for attendance.'}
                    </Text>
                  </View>
                </View>
                
                <Button 
                  mode="contained" 
                  icon={hasFaceImage ? "face-recognition" : "face-man"}
                  onPress={updateFaceImage}
                  style={[styles.actionButton, 
                    {backgroundColor: hasFaceImage ? '#4CAF50' : '#1976D2'}]}
                  labelStyle={styles.buttonLabel}
                >
                  {hasFaceImage ? 'Update Face Image' : 'Register Face'}
                </Button>
              </Surface>

              {/* Personal Information Card */}
              <Surface style={styles.card} elevation={1}>
                <View style={styles.sectionHeader}>
                  <Avatar.Icon 
                    size={24} 
                    icon="account-details" 
                    style={styles.sectionIcon} 
                    color="#1976D2"
                  />
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                </View>
                
                <View style={styles.infoContent}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>First Name</Text>
                    <Text style={styles.infoValue}>{firstName || 'Not set'}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Last Name</Text>
                    <Text style={styles.infoValue}>{lastName || 'Not set'}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{email}</Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>
                      {profile && profile.phone_number ? profile.phone_number : 'Not set'}
                    </Text>
                  </View>
                </View>
              </Surface>
              
              {/* Additional Information Card */}
              <Surface style={styles.card} elevation={1}>
                <View style={styles.sectionHeader}>
                  <Avatar.Icon 
                    size={24} 
                    icon="information-outline" 
                    style={[styles.sectionIcon, {backgroundColor: 'rgba(0, 150, 136, 0.1)'}]} 
                    color="#009688"
                  />
                  <Text style={styles.sectionTitle}>Additional Information</Text>
                </View>
                
                <View style={styles.infoContent}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Bio</Text>
                    <Text style={styles.infoValue}>
                      {profile && profile.profile && profile.profile.bio ? profile.profile.bio : 'Not set'}
                    </Text>
                  </View>
                  
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {profile && profile.profile && profile.profile.address ? profile.profile.address : 'Not set'}
                    </Text>
                  </View>
                </View>
              </Surface>
            </>
          ) : (
            <Surface style={styles.formContainer} elevation={1}>
              <Formik
                initialValues={{
                  first_name: firstName,
                  last_name: lastName,
                  phone_number: profile?.phone_number || '',
                  bio: profile?.profile?.bio || '',
                  address: profile?.profile?.address || '',
                }}
                validationSchema={ProfileSchema}
                onSubmit={handleUpdateProfile}>
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View>
                    <TextInput
                      label="First Name"
                      value={values.first_name}
                      onChangeText={handleChange('first_name')}
                      onBlur={handleBlur('first_name')}
                      style={styles.input}
                      mode="outlined"
                      error={touched.first_name && errors.first_name}
                    />
                    {touched.first_name && errors.first_name && (
                      <HelperText type="error">{errors.first_name}</HelperText>
                    )}
                    
                    <TextInput
                      label="Last Name"
                      value={values.last_name}
                      onChangeText={handleChange('last_name')}
                      onBlur={handleBlur('last_name')}
                      style={styles.input}
                      mode="outlined"
                      error={touched.last_name && errors.last_name}
                    />
                    {touched.last_name && errors.last_name && (
                      <HelperText type="error">{errors.last_name}</HelperText>
                    )}
                    
                    <TextInput
                      label="Phone Number"
                      value={values.phone_number}
                      onChangeText={handleChange('phone_number')}
                      onBlur={handleBlur('phone_number')}
                      style={styles.input}
                      mode="outlined"
                      keyboardType="phone-pad"
                    />
                    
                    <TextInput
                      label="Bio"
                      value={values.bio}
                      onChangeText={handleChange('bio')}
                      onBlur={handleBlur('bio')}
                      style={styles.input}
                      mode="outlined"
                      multiline
                      numberOfLines={3}
                    />
                    
                    <TextInput
                      label="Address"
                      value={values.address}
                      onChangeText={handleChange('address')}
                      onBlur={handleBlur('address')}
                      style={styles.input}
                      mode="outlined"
                      multiline
                      numberOfLines={2}
                    />
                    
                    <View style={styles.buttonContainer}>
                      <Button
                        mode="outlined"
                        onPress={() => setIsEditing(false)}
                        style={[styles.button, styles.cancelButton]}
                        labelStyle={{ fontSize: 14 }}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={handleSubmit}
                        style={[styles.button, styles.saveButton]}
                        labelStyle={{ fontSize: 14, color: 'white' }}
                      >
                        Save Changes
                      </Button>
                    </View>
                  </View>
                )}
              </Formik>
            </Surface>
          )}
          
          {/* Logout Card */}
          <Card style={[styles.card, { marginBottom: 30 }]}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar.Icon 
                    size={40} 
                    icon="logout-variant" 
                    style={{ backgroundColor: '#FFEBEE' }} 
                    color="#E53935" 
                  />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' }}>Logout from Account</Text>
                    <Text style={{ fontSize: 12, color: '#777777' }}>End your current session</Text>
                  </View>
                </View>
                <Button 
                  mode="contained" 
                  icon="logout"
                  onPress={logout}
                  style={{ backgroundColor: '#E53935', borderRadius: 8 }}
                  labelStyle={{ fontSize: 14 }}
                >
                  Logout
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={hideSnackbar}
        duration={3000}
        style={{ backgroundColor: snackbarType === 'success' ? '#4CAF50' : snackbarType === 'error' ? '#F44336' : '#2196F3' }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  appBar: {
    backgroundColor: '#1976D2',
    elevation: 4,
  },
  appBarTitle: {
    fontWeight: 'bold', 
    fontSize: 20, 
    color: 'white',
  },
  keyboardAvoidView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  coverImageContainer: {
    height: 120,
    backgroundColor: '#1976D2',
    position: 'relative',
  },
  coverImageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(25, 118, 210, 0.9)',
  },
  avatarContainer: {
    padding: 16,
    alignItems: 'center',
    marginTop: -50,
  },
  avatar: {
    borderWidth: 4,
    borderColor: 'white',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1976D2',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  cameraIcon: {
    margin: 0,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  email: {
    fontSize: 14,
    color: '#777777',
    marginTop: 4,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 8,
  },
  attendanceButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#FF9800',
  },
  buttonLabel: {
    fontSize: 14,
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  cardIconContainer: {
    marginRight: 16,
  },
  cardIcon: {
    borderRadius: 20,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDescription: {
    fontSize: 14,
    color: '#555555',
    marginTop: 8,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  infoContent: {
    marginLeft: 8,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#777777',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  formContainer: {
    borderRadius: 8,
    marginBottom: 16,
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 8,
  },
  cancelButton: {
    marginRight: 10,
    borderColor: '#8E8E93',
  },
  saveButton: {
    marginLeft: 10,
    backgroundColor: '#1976D2',
  },
});

export default ProfileScreen;
