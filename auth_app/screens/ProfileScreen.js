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
  // Face recognition state removed
  const [loading, setLoading] = useState(false);
  
  // API base URL
  const API_URL = Platform.OS === 'android' 
    ? 'http://192.168.29.66:8000/api/auth/' 
    : 'http://localhost:8000/api/auth/';

  // Face recognition tracking removed

  useEffect(() => {
    fetchProfile();
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to change your profile picture!');
      }
    })();
  }, []);
  
  // Face recognition effect removed
  
  const hideSnackbar = () => {
    setSnackbarVisible(false);
  };

  // Face recognition check function removed

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
      
      // Face image check removed
      
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

  // Face image update function removed

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
                {profile?.avatar ? (
                  <Avatar.Image 
                    source={{ uri: profile.avatar }}
                    size={100} 
                    style={styles.avatar} 
                  />
                ) : (
                  <Avatar.Text 
                    size={120} 
                    label={`${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`}
                    style={styles.avatar}
                    color="#FFFFFF"
                    backgroundColor="#00796B"
                  />
                )}
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
              {/* Face Recognition Card removed as requested */}

              {/* Personal Information Card */}
              <Surface style={styles.card} elevation={3}>
                <View style={styles.sectionHeader}>
                  <Avatar.Icon 
                    size={32} 
                    icon="account-details" 
                    style={styles.sectionIcon} 
                    color="#00A79D"
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
              <Surface style={styles.card} elevation={3}>
                <View style={styles.sectionHeader}>
                  <Avatar.Icon 
                    size={32} 
                    icon="information-outline" 
                    style={styles.sectionIcon} 
                    color="#00A79D"
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
            <Surface style={[styles.card, styles.formContainer]} elevation={3}>
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
          <Card style={[styles.card, styles.logoutCard, { marginBottom: 30 }]}>
            <Card.Content style={styles.logoutCardContent}>
              <View style={styles.logoutInnerContainer}>
                <View style={styles.logoutTextContainer}>
                  <Avatar.Icon 
                    size={40} 
                    icon="logout-variant" 
                    style={styles.logoutIcon} 
                    color="#D32F2F" 
                  />
                  <View style={{ marginLeft: 16 }}>
                    <Text style={styles.logoutTitle}>Logout from Account</Text>
                    <Text style={styles.logoutSubtitle}>End your current session</Text>
                  </View>
                </View>
                <Button 
                  mode="contained" 
                  icon="logout"
                  onPress={logout}
                  style={styles.logoutButton}
                  labelStyle={styles.logoutButtonLabel}
                  contentStyle={{ paddingVertical: 4 }} // Adjust button padding
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
    backgroundColor: '#F0F4F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  appBar: {
    backgroundColor: '#00796B', // Darker Teal
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
    borderRadius: 12,
    overflow: 'visible', // Allow shadow to be visible
    marginBottom: 24, // Increased margin
    backgroundColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  coverImageContainer: {
    height: 150, // Increased height
    backgroundColor: '#00A79D', // Primary Teal
    borderTopLeftRadius: 12, // Match card radius
    borderTopRightRadius: 12, // Match card radius
  },
  // coverImageGradient: (Commented out or removed as we are using a solid color for now)
  // {
  //   position: 'absolute',
  //   left: 0,
  //   right: 0,
  //   top: 0,
  //   bottom: 0,
  //   backgroundColor: 'rgba(0, 121, 107, 0.3)', // Optional subtle overlay
  // },
  coverImageGradient: {}, // Keeping the style rule to avoid breaking if referenced, but empty
  avatarContainer: {
    alignItems: 'center',
    marginTop: -75, // Adjusted for new avatar size and cover height
  },
  avatar: {
    borderWidth: 5, // Thicker border
    borderColor: '#FFFFFF',
    elevation: 8, // Shadow for Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5, // Adjusted position
    right: 5,  // Adjusted position
    backgroundColor: '#00796B', // Darker Teal
    borderRadius: 20, // More rounded
    padding: 4, // Add some padding
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 9, // Ensure it's above avatar shadow
  },
  cameraIcon: {
    margin: 0,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 12, // Increased margin
    paddingHorizontal: 16, // Add some horizontal padding for long names/emails
  },
  name: {
    fontSize: 24, // Larger font size
    fontWeight: '600', // Semi-bold
    color: '#2C3E50', // Dark grayish blue
    marginBottom: 4,
  },
  email: {
    fontSize: 16, // Slightly larger
    color: '#7F8C8D', // Cool gray
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20, // Increased vertical padding
    paddingHorizontal: 16,
    marginTop: 16, // Add margin from profile info
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  editButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#00A79D', // Primary Teal
    borderRadius: 25, // Fully rounded
    paddingVertical: 8, // Adjust padding for touch area
    elevation: 2,
  },
  attendanceButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#FFC107', // Amber/Yellow
    borderRadius: 25, // Fully rounded
    paddingVertical: 8, // Adjust padding for touch area
    elevation: 2,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    // color for editButton will be white (default for contained button with dark bg)
    // color for attendanceButton needs to be set if default isn't good
  },
  card: {
    borderRadius: 12, // Increased radius
    marginBottom: 20, // Increased margin
    padding: 20, // Increased padding
    backgroundColor: '#FFFFFF',
    elevation: 3, // Standardized elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  // Face recognition card styles removed
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center', // Align items vertically
    marginBottom: 16,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18, // Keep size or adjust as needed
    fontWeight: '600', // Semi-bold
    color: '#2C3E50', // Dark grayish blue
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    backgroundColor: 'rgba(0, 167, 157, 0.08)', // Very light teal background
    marginRight: 12,
    borderRadius: 16, // ensure its rounded if size is 32
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50', // Dark grayish blue
  },
  infoContent: {
    marginLeft: 8,
  },
  infoItem: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7F8C8D', // Cool gray
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#333333', // Darker gray/black
    fontWeight: '500',
  },
  formContainer: {
    // Most styling will come from styles.card
    // Add any specific overrides for form container if needed
    // e.g., if padding needs to be different from general card padding
    // For now, let's assume styles.card's padding (20) is fine.
    // If not, we can add: padding: 16, back here.
  },
  input: {
    marginBottom: 16, // Increased margin
    backgroundColor: '#FFFFFF', // Explicitly white
    activeOutlineColor: '#00A79D', // Teal focus color
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    borderRadius: 25, // Fully rounded
    paddingVertical: 8, // Add some vertical padding for better touch target
  },
  cancelButton: {
    marginRight: 8, // Standardized margin
    borderColor: '#B0BEC5', // Softer cool gray border
    labelStyle: { color: '#7F8C8D' }, // Cool gray text
  },
  saveButton: {
    marginLeft: 10, // Keep original margin for now, can be adjusted if layout needs it
    backgroundColor: '#00A79D', // Primary Teal for save button in form
    labelStyle: { color: '#FFFFFF' }, // White text
  },
  // Logout Card Specific Styles
  logoutCard: {
    // General card styles are already applied via styles.card
    // Add specific overrides if needed, e.g., different margin
  },
  logoutCardContent: {
    paddingHorizontal: 0, // Remove default Card.Content padding if custom layout needs it
    paddingVertical: 0, // Remove default Card.Content padding
  },
  logoutInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16, // Apply padding here if Card.Content padding is removed
  },
  logoutTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allow text to take available space before button
    marginRight: 16, // Space before button
  },
  logoutIcon: {
    backgroundColor: '#FFEBEE', // Light red background
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
  },
  logoutSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#D32F2F', // Prominent red
    borderRadius: 25, // Fully rounded
    elevation: 2,
  },
  logoutButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
