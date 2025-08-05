import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking, Image, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { 
  Card, 
  Surface, 
  Title, 
  Text, 
  Button, 
  ActivityIndicator, 
  List, 
  Switch, 
  Divider, 
  Avatar, 
  Chip, 
  Badge, 
  useTheme 
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Component to handle image loading with fallback
const ImageWithFallback = ({ imageUrl, style, onDelete }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const filename = imageUrl ? imageUrl.split('/').pop() : 'unknown';
  
  // Log the image URL for debugging with more details
  useEffect(() => {
    console.log(`[ImageWithFallback] Attempting to load image: ${filename}`);
    console.log(`[ImageWithFallback] Full URL: ${imageUrl}`);
    console.log(`[ImageWithFallback] Image style dimensions: ${style.width} x ${style.height}`);
    
    // Reset error state when imageUrl changes
    setHasError(false);
    setIsLoading(true);
    setLoadAttempts(prev => prev + 1);
    
    // Preload the image to check if it exists
    Image.prefetch(imageUrl)
      .then(() => {
        console.log(`[ImageWithFallback] Image prefetch successful: ${filename}`);
      })
      .catch(error => {
        console.error(`[ImageWithFallback] Image prefetch failed: ${filename}`);
        console.error(`[ImageWithFallback] Error details: ${JSON.stringify(error)}`);
        setHasError(true);
        setIsLoading(false);
      });
      
    return () => {
      console.log(`[ImageWithFallback] Cleanup for image: ${filename}`);
    };
  }, [imageUrl, style]);
  
  // If there's an error loading the image, show error placeholder instead of returning null
  if (hasError) {
    console.log(`[ImageWithFallback] Rendering error placeholder for: ${filename}`);
    return (
      <View style={[styles.imageContainer, styles.errorImageContainer]}>
        <Icon name="image-off" size={24} color="#ff6b6b" />
        <Text style={styles.errorImageText}>Failed to load</Text>
        <Text style={[styles.errorImageText, {fontSize: 8}]}>{filename}</Text>
        <Text style={[styles.errorImageText, {fontSize: 7}]}>Attempts: {loadAttempts}</Text>
        {onDelete && (
          <TouchableOpacity 
            style={styles.deleteImageButton}
            onPress={() => {
              console.log(`[ImageWithFallback] Deleting failed image: ${filename}`);
              onDelete(imageUrl);
            }}
          >
            <Icon name="delete" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  }
  
  return (
    <View style={styles.imageContainer}>
      {isLoading && (
        <View style={styles.imageLoadingContainer}>
          <ActivityIndicator size="small" color="#0000ff" />
        </View>
      )}
      <Image 
        source={{ uri: imageUrl }} 
        style={style} 
        resizeMode="cover"
        onLoadStart={() => {
          console.log(`[ImageWithFallback] Image load started: ${filename}`);
          setIsLoading(true);
        }}
        onLoadEnd={() => {
          console.log(`[ImageWithFallback] Image loaded successfully: ${filename}`);
          setIsLoading(false);
        }}
        onError={(e) => {
          console.error(`[ImageWithFallback] Image load error: ${filename}`);
          console.error(`[ImageWithFallback] Full URL that failed: ${imageUrl}`);
          console.error(`[ImageWithFallback] Error details: ${e.nativeEvent ? JSON.stringify(e.nativeEvent) : 'Unknown error'}`);
          setIsLoading(false);
          setHasError(true);
        }}
      />
      {onDelete && (
        <TouchableOpacity 
          style={styles.deleteImageButton}
          onPress={() => {
            console.log(`[ImageWithFallback] Deleting image: ${filename}`);
            onDelete(imageUrl);
          }}
        >
          <Icon name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { getUserDetails, deleteUser, uploadUserFaceImage, getUserFaceImages, deleteUserFaceImage, user: currentUser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [faceImages, setFaceImages] = useState([]);
  const [deletingImage, setDeletingImage] = useState(false);
  const theme = useTheme();

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching details for user ID: ${userId}`);
      const userData = await getUserDetails(userId);
      setUser(userData);
      console.log('User data fetched successfully:', userData.first_name, userData.last_name, userData.email);
      
      // Fetch all face images from the user's folder
      try {
        console.log('Fetching face images for user ID:', userId);
        const faceImagesData = await getUserFaceImages(userId);
        
        if (faceImagesData && faceImagesData.face_images) {
          console.log(`Found ${faceImagesData.face_images.length} face images before processing`);
          console.log('Face images before processing:', JSON.stringify(faceImagesData.face_images));
          
          // Log all image URLs for debugging
          console.log('All image URLs before filtering:');
          faceImagesData.face_images.forEach((img, idx) => {
            const filename = img.image_url.split('/').pop();
            console.log(`  ${idx+1}. ${filename} (${img.image_url})`);
            console.log(`     Reference: ${img.is_reference || false}, Angle: ${img.angle_index || 'N/A'}`);
          });
          
          // Filter out any duplicate images by URL
          const uniqueImages = faceImagesData.face_images.filter((img, index, self) => 
            index === self.findIndex((t) => t.image_url === img.image_url)
          );
          
          console.log(`After removing duplicates: ${uniqueImages.length} images`);
          
          // Sort images to show reference images first, then by angle_index if available
          const sortedImages = [...uniqueImages].sort((a, b) => {
            // First priority: reference images come first
            if (a.is_reference && !b.is_reference) return -1;
            if (!a.is_reference && b.is_reference) return 1;
            
            // Second priority: sort by angle_index if available
            if (a.angle_index && b.angle_index) {
              return a.angle_index - b.angle_index;
            }
            
            // Third priority: sort by upload date (newest first)
            if (a.upload_date && b.upload_date) {
              return new Date(b.upload_date) - new Date(a.upload_date);
            }
            
            return 0;
          });
          
          console.log(`After sorting: ${sortedImages.length} images`);
          console.log('Face images after sorting:', JSON.stringify(sortedImages));
          
          // Log images after sorting with more details
          console.log('Detailed sorted images:');
          sortedImages.forEach((img, idx) => {
            const filename = img.image_url.split('/').pop();
            console.log(`  ${idx+1}. ${filename}`);
            console.log(`     Reference: ${img.is_reference || false}, Angle: ${img.angle_index || 'N/A'}`);
            console.log(`     Upload date: ${img.upload_date || 'N/A'}`);
            console.log(`     URL: ${img.image_url}`);
          });
          
          // Check if we have any valid images
          if (sortedImages.length > 0) {
            console.log('Setting face images state with sorted images');
            setFaceImages(sortedImages);
          } else {
            console.log('No valid face images found after processing');
            setFaceImages([]);
          }
        } else {
          console.log('No face images data returned from getUserFaceImages');
          setFaceImages([]);
        }
      } catch (faceImgErr) {
        console.error('Error fetching face images:', faceImgErr);
        console.error('Error details:', JSON.stringify(faceImgErr));
        // Don't set the main error state, just log the error
        setFaceImages([]);
      }
      
      setLoading(false);
      console.log('Finished loading user details and face images');
    } catch (err) {
      console.error('Error fetching user details:', err);
      console.error('Error details:', JSON.stringify(err));
      setError('Failed to load user details. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const handleToggleActive = () => {
    Alert.alert(
      user.is_active ? 'Deactivate User' : 'Activate User',
      `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} this user?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => {
            // This would be implemented with an API call in a real app
            Alert.alert('Feature Coming Soon', 'User status toggle will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleToggleAdmin = () => {
    Alert.alert(
      user.is_admin ? 'Remove Admin Rights' : 'Grant Admin Rights',
      `Are you sure you want to ${user.is_admin ? 'remove admin rights from' : 'make'} this user ${user.is_admin ? '' : 'an admin'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: () => {
            // This would be implemented with an API call in a real app
            Alert.alert('Feature Coming Soon', 'Admin rights toggle will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Reset Password',
      'Are you sure you want to reset this user\'s password? They will receive an email with instructions.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          onPress: () => {
            // This would be implemented with an API call in a real app
            Alert.alert('Feature Coming Soon', 'Password reset will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleDeleteUser = () => {
    // Check if current user is a supervisor (not allowed to delete users)
    if (currentUser && currentUser.is_supervisor) {
      Alert.alert(
        'Permission Denied',
        'Supervisors do not have permission to delete users. Please contact an administrator.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    Alert.alert(
      'Delete User',
      'Are you sure you want to permanently delete this user? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              setLoading(true);
              const success = await deleteUser(userId);
              
              if (success) {
                Alert.alert(
                  'Success',
                  'User has been permanently deleted.',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                Alert.alert('Error', 'Failed to delete user. Please try again.');
              }
            } catch (err) {
              console.error('Error deleting user:', err);
              Alert.alert('Error', 'Failed to delete user. Please try again.');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: '#f0f2f5'}}>
      <ScrollView 
        style={[styles.container]} 
        contentContainerStyle={styles.contentContainer}
      >
      {loading ? (
        <Surface style={styles.loadingContainer} elevation={0}>
          <ActivityIndicator animating={true} color={theme.colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>Loading user details...</Text>
        </Surface>
      ) : error ? (
        <Banner
          visible={true}
          icon="alert-circle"
          actions={[
            {
              label: 'Retry',
              onPress: () => fetchUserDetails(),
            },
          ]}
        >
          {error}
        </Banner>
      ) : user ? (
        <>
          {/* User profile header */}
          <Surface style={styles.profileCard} elevation={4}>
            <View style={styles.profileHeaderContainer}>
              <View style={styles.profileAvatarContainer}>
                <Avatar.Text 
                  size={90} 
                  label={`${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`}
                  style={styles.avatar}
                  color="#FFFFFF"
                  labelStyle={{ fontSize: 36 }}
                />
                {user.is_admin && (
                  <Badge 
                    style={styles.adminBadge} 
                    size={24}
                    icon="shield-account"
                  />
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.first_name} {user.last_name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <View style={styles.badgeContainer}>
                  <Chip 
                    style={[styles.badge, { backgroundColor: user.is_active ? '#dcfce7' : '#fef2f2' }]}
                    textStyle={{ color: user.is_active ? '#14532d' : '#991b1b', fontWeight: '600' }}
                    icon={user.is_active ? "check-circle" : "close-circle"}
                    mode="outlined"
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Chip>
                  {user.is_admin && (
                    <Chip 
                      style={[styles.badge, { backgroundColor: '#e0f2fe', marginLeft: 8 }]}
                      textStyle={{ color: '#0284c7', fontWeight: '600' }}
                      icon="shield-account"
                      mode="outlined"
                    >
                      Administrator
                    </Chip>
                  )}
                </View>
              </View>
            </View>
          </Surface>

          {/* Contact information */}
          <Surface style={styles.infoCard} elevation={2}>
            <View style={styles.cardHeader}>
              <Icon name="account-card-details-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Contact Information</Text>
            </View>
            
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="email-outline" 
                  style={{backgroundColor: '#e8f4fd'}} 
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactValue}>{user.email}</Text>
              </View>
              <Button
                mode="text"
                icon="open-in-new"
                onPress={() => Linking.openURL(`mailto:${user.email}`)}
                style={styles.contactActionButton}
                labelStyle={{ marginRight: 0 }}
                contentStyle={{ height: 40 }}
              />
            </View>

            <Divider style={styles.itemDivider} />
            
            {user.phone && (
              <View style={styles.contactItem}>
                <View style={styles.contactIconContainer}>
                  <Avatar.Icon 
                    size={40} 
                    icon="phone" 
                    style={{backgroundColor: '#e6f7ed'}} 
                    color="#16a34a"
                  />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <Text style={styles.contactValue}>{user.phone}</Text>
                </View>
                <Button
                  mode="text"
                  icon="open-in-new"
                  onPress={() => Linking.openURL(`tel:${user.phone}`)}
                  style={styles.contactActionButton}
                  labelStyle={{ marginRight: 0 }}
                  contentStyle={{ height: 40 }}
                />
              </View>
            )}
          </Surface>

          {/* Account information */}
          <Surface style={styles.infoCard} elevation={2}>
            <View style={styles.cardHeader}>
              <Icon name="account-cog-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>

            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="identifier" 
                  style={{backgroundColor: '#f0f9ff'}} 
                  color="#0369a1"
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>User ID</Text>
                <Text style={styles.contactValue}>{user.id}</Text>
              </View>
            </View>

            <Divider style={styles.itemDivider} />
            
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="calendar-check-outline" 
                  style={{backgroundColor: '#f0fdf4'}} 
                  color="#166534"
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Date Joined</Text>
                <Text style={styles.contactValue}>
                  {user.date_joined ? 
                    new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 
                    'January 1, 2025'}
                </Text>
              </View>
            </View>

            <Divider style={styles.itemDivider} />
            
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="login-variant" 
                  style={{backgroundColor: '#f5f3ff'}} 
                  color="#6d28d9"
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Last Login</Text>
                <Text style={styles.contactValue}>
                  {user.last_login ? 
                    new Date(user.last_login).toLocaleString('en-US') : 
                    'May 20, 2025 11:30 AM'}
                </Text>
              </View>
            </View>
          </Surface>
          
          {/* Profile information */}
          <Surface style={styles.infoCard} elevation={2}>
            <View style={styles.cardHeader}>
              <Icon name="card-account-details-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Profile Information</Text>
            </View>

            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="badge-account-outline" 
                  style={{backgroundColor: '#fef3c7'}} 
                  color="#b45309"
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Bio</Text>
                <Text style={styles.contactValue}>
                  {(user.profile && user.profile.bio) ? user.profile.bio : 'No bio provided'}
                </Text>
              </View>
            </View>

            <Divider style={styles.itemDivider} />
            
            <View style={styles.contactItem}>
              <View style={styles.contactIconContainer}>
                <Avatar.Icon 
                  size={40} 
                  icon="map-marker-outline" 
                  style={{backgroundColor: '#ffedd5'}} 
                  color="#c2410c"
                />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactLabel}>Address</Text>
                <Text style={styles.contactValue}>
                  {(user.profile && user.profile.address) ? user.profile.address : 'No address provided'}
                </Text>
              </View>
            </View>

            {user.website && (
              <>
                <Divider style={styles.itemDivider} />
                
                <View style={styles.contactItem}>
                  <View style={styles.contactIconContainer}>
                    <Avatar.Icon 
                      size={40} 
                      icon="web" 
                      style={{backgroundColor: '#f0f9ff'}} 
                      color="#0284c7"
                    />
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactLabel}>Website</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {user.website}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    icon="open-in-new"
                    onPress={() => Linking.openURL(user.website)}
                    style={styles.contactActionButton}
                    labelStyle={{ marginRight: 0 }}
                    contentStyle={{ height: 40 }}
                  />
                </View>
              </>
            )}
          </Surface>
          
          {/* Face Recognition Reference Image Section - Only visible to admins */}
          {currentUser && (currentUser.is_staff || currentUser.is_supervisor) && (
            <Surface style={[styles.infoCard, {backgroundColor: '#f0f8ff'}]} elevation={2}>
              <View style={styles.cardHeader}>
                <Icon name="face-recognition" size={22} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>Face Recognition</Text>
              </View>
              
              <Text style={styles.faceRecognitionDescription}>
                Upload a reference image for this user's face recognition authentication.
                This image will be used to verify the user's identity during attendance check-in.
              </Text>
              
              <View style={styles.buttonContainer}>
                <Button 
                  mode="contained" 
                  icon="camera" 
                  onPress={async () => {
                    try {
                      // Launch camera
                      const result = await ImagePicker.launchCameraAsync({
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      
                      if (!result.canceled && result.assets && result.assets.length > 0) {
                        // Resize and compress image - ensure it's in JPEG format with reasonable size
                        console.log('Original image URI:', result.assets[0].uri);
                        
                        const manipResult = await ImageManipulator.manipulateAsync(
                          result.assets[0].uri,
                          [{ resize: { width: 600 } }],
                          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        
                        console.log('Manipulated image URI:', manipResult.uri);
                        console.log('Image width:', manipResult.width);
                        console.log('Image height:', manipResult.height);
                        
                        // Show loading indicator
                        setLoading(true);
                        
                        try {
                          // Upload the image with user ID
                          console.log('Uploading image for user ID:', userId);
                          const response = await uploadUserFaceImage(userId, manipResult.uri);
                          
                          console.log('Upload response:', response);
                          
                          // Show success message
                          Alert.alert(
                            'Success', 
                            'Reference face image uploaded successfully',
                            [{ text: 'OK' }]
                          );
                          
                          // Refresh user details
                          fetchUserDetails();
                        } catch (error) {
                          console.error('Upload error:', error);
                          console.error('Error details:', error.response?.data);
                          console.error('Error status:', error.response?.status);
                          
                          // Show more detailed error message
                          Alert.alert(
                            'Upload Failed', 
                            error.response?.data?.error || 
                            `Failed to upload reference image (${error.response?.status || 'unknown error'}). ` +
                            'Please try again or contact support.',
                            [{ text: 'OK' }]
                          );
                        } finally {
                          setLoading(false);
                        }
                      }
                    } catch (err) {
                      console.error('Error capturing image:', err);
                      Alert.alert('Error', 'Failed to capture image');
                    }
                  }}
                  style={[styles.faceRecognitionButton, { marginRight: 8 }]}
                  labelStyle={{ fontSize: 14, letterSpacing: 0.5 }}
                  contentStyle={{ height: 48 }}
                  loading={loading}
                  disabled={loading}
                >
                  Take Photo
                </Button>
                
                <Button 
                  mode="contained" 
                  icon="folder-image" 
                  onPress={async () => {
                    try {
                      // Launch image picker
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ImagePicker.MediaTypeOptions.Images,
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.8,
                      });
                      
                      if (!result.canceled && result.assets && result.assets.length > 0) {
                        // Resize and compress image - ensure it's in JPEG format with reasonable size
                        console.log('Original gallery image URI:', result.assets[0].uri);
                        
                        const manipResult = await ImageManipulator.manipulateAsync(
                          result.assets[0].uri,
                          [{ resize: { width: 600 } }],
                          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        
                        console.log('Manipulated gallery image URI:', manipResult.uri);
                        console.log('Gallery image width:', manipResult.width);
                        console.log('Gallery image height:', manipResult.height);
                        
                        // Show loading indicator
                        setLoading(true);
                        
                        try {
                          // Upload the image with user ID
                          console.log('Uploading gallery image for user ID:', userId);
                          const response = await uploadUserFaceImage(userId, manipResult.uri);
                          
                          console.log('Gallery upload response:', response);
                          
                          // Show success message
                          Alert.alert(
                            'Success', 
                            'Reference face image uploaded successfully',
                            [{ text: 'OK' }]
                          );
                          
                          // Refresh user details
                          fetchUserDetails();
                        } catch (error) {
                          console.error('Gallery upload error:', error);
                          console.error('Gallery error details:', error.response?.data);
                          console.error('Gallery error status:', error.response?.status);
                          
                          Alert.alert(
                            'Upload Failed', 
                            error.response?.data?.error || 
                            `Failed to upload reference image (${error.response?.status || 'unknown error'}). ` +
                            'Please try again or contact support.',
                            [{ text: 'OK' }]
                          );
                        } finally {
                          setLoading(false);
                        }
                      }
                    } catch (err) {
                      console.error('Error selecting image:', err);
                      Alert.alert('Error', 'Failed to select image');
                    }
                  }}
                  style={styles.faceRecognitionButton}
                  labelStyle={{ fontSize: 14, letterSpacing: 0.5 }}
                  contentStyle={{ height: 48 }}
                  loading={loading}
                  disabled={loading}
                >
                  Select from Gallery
                </Button>
              </View>
            </Surface>
          )}
          
          {/* Face Images Display Section */}
          {user && user.profile && (
            <Surface style={[styles.infoCard, {backgroundColor: '#f5f8ff'}]} elevation={2}>
              <View style={styles.cardHeader}>
                <Icon name="face-recognition" size={22} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>User Face Images</Text>
              </View>
              
              {/* Display all face images for the user */}
              {faceImages && faceImages.length > 0 ? (
                <View style={styles.allFaceImagesContainer}>
                  <Text style={styles.allFaceImagesTitle}>All Face Recognition Images</Text>
                  <Text style={styles.faceImagesCount}>Found {faceImages.length} images</Text>
                  
                  {/* Debug button to help diagnose image loading issues */}
                  <TouchableOpacity 
                    style={{
                      backgroundColor: '#e0f2fe',
                      padding: 8,
                      borderRadius: 8,
                      marginBottom: 10,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}
                    onPress={() => {
                      console.log('DEBUG - All face images:', JSON.stringify(faceImages));
                      console.log(`Total face images found: ${faceImages.length}`);
                      
                      // Log each image with detailed information
                      faceImages.forEach((img, idx) => {
                        const filename = img.image_url.split('/').pop();
                        console.log(`Image ${idx}: ${img.image_url}`);
                        console.log(`  - Filename: ${filename}`);
                        console.log(`  - Is Reference: ${img.is_reference}`);
                        console.log(`  - Angle Index: ${img.angle_index || 'N/A'}`);
                        console.log(`  - Upload Date: ${img.upload_date || 'N/A'}`);
                      });
                      
                      // Count reference images
                      const referenceCount = faceImages.filter(img => img.is_reference).length;
                      console.log(`Reference images: ${referenceCount}`);
                      
                      // Count images by naming pattern
                      const userIdPattern = faceImages.filter(img => img.image_url.includes(`${userId}_`)).length;
                      const numberOnlyPattern = faceImages.filter(img => {
                        const filename = img.image_url.split('/').pop();
                        const name = filename.split('.')[0];
                        return !isNaN(name) && name !== userId;
                      }).length;
                      const underscorePattern = faceImages.filter(img => img.image_url.includes('_')).length;
                      
                      console.log(`Images with userId_ pattern: ${userIdPattern}`);
                      console.log(`Images with number-only pattern: ${numberOnlyPattern}`);
                      console.log(`Images with underscore pattern: ${underscorePattern}`);
                      
                      Alert.alert('Debug Info', 
                        `Logged ${faceImages.length} image URLs to console\n` +
                        `Reference images: ${referenceCount}\n` +
                        `Images by pattern:\n` +
                        `- userId_: ${userIdPattern}\n` +
                        `- number only: ${numberOnlyPattern}\n` +
                        `- with underscore: ${underscorePattern}`
                      );
                    }}
                  >
                    <Icon name="bug-outline" size={16} color="#0284c7" style={{marginRight: 4}} />
                    <Text style={{color: '#0284c7', fontWeight: '500', fontSize: 12}}>Debug Images</Text>
                  </TouchableOpacity>
                  
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.faceImagesScrollView}>
                    {faceImages.map((image, index) => (
                      <View key={index} style={styles.faceImageItem}>
                        <View style={styles.faceImageContainer}>
                          <ImageWithFallback 
                            imageUrl={image.image_url} 
                            style={[styles.additionalFaceImage, image.is_reference && styles.referenceImage]}
                          />
                          <TouchableOpacity 
                            style={styles.deleteImageButton}
                            disabled={deletingImage}
                            onPress={() => {
                              // Extract filename for better user feedback
                              const filename = image.image_url.split('/').pop();
                              
                              Alert.alert(
                                'Delete Face Image',
                                `Are you sure you want to delete this face image (${filename})? This will attempt to remove the image from the server.`,
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { 
                                    text: 'Delete', 
                                    style: 'destructive',
                                    onPress: async () => {
                                      // Create a reference to this specific image for UI updates
                                      const imageToDelete = image.image_url;
                                      
                                      // Set the specific image as deleting (we'll track it in the component state)
                                      setFaceImages(prevImages => 
                                        prevImages.map(img => 
                                          img.image_url === imageToDelete 
                                            ? {...img, isDeleting: true} 
                                            : img
                                        )
                                      );
                                      
                                      setDeletingImage(true);
                                      try {
                                        // Call the updated deleteUserFaceImage function
                                        const success = await deleteUserFaceImage(userId, imageToDelete);
                                        if (success) {
                                          // Remove the image from the UI state
                                          setFaceImages(prevImages => 
                                            prevImages.filter(img => img.image_url !== imageToDelete)
                                          );
                                          
                                          // Log detailed information
                                          console.log(`Face image deleted from UI: ${filename}`);
                                          console.log(`Image URL: ${imageToDelete}`);
                                          console.log(`User ID: ${userId}`);
                                          console.log(`Timestamp: ${new Date().toISOString()}`);
                                        }
                                      } catch (error) {
                                        // Reset the deleting state for this image
                                        setFaceImages(prevImages => 
                                          prevImages.map(img => 
                                            img.image_url === imageToDelete 
                                              ? {...img, isDeleting: false} 
                                              : img
                                          )
                                        );
                                        
                                        console.error('Error deleting face image:', error);
                                        Alert.alert('Error', `Failed to delete face image: ${filename}`);
                                      } finally {
                                        setDeletingImage(false);
                                      }
                                    }
                                  }
                                ]
                              );
                            }}
                          >
                            {image.isDeleting ? (
                              <ActivityIndicator size="small" color="#ff4d4f" />
                            ) : (
                              <Icon name="delete" size={20} color="#ff4d4f" />
                            )}
                          </TouchableOpacity>
                        </View>
                        {image.is_reference && (
                          <View style={styles.referenceImageBadge}>
                            <Text style={styles.referenceImageText}>Primary</Text>
                          </View>
                        )}
                        {/* Display image label based on sequential naming */}
                        <Text style={styles.faceImageLabel}>
                          {image.is_reference ? 'Primary' : 
                            (() => {
                              // Extract filename from URL
                              const filename = image.image_url.split('/').pop();
                              
                              // Check for angle-specific names
                              if (filename.includes('front')) return 'Front';
                              if (filename.includes('left')) return 'Left';
                              if (filename.includes('right')) return 'Right';
                              if (filename.includes('up')) return 'Up';
                              if (filename.includes('down')) return 'Down';
                              if (filename.includes('angle')) return 'Angle';
                              
                              // Check for sequential naming with underscore (_1, _2, etc.)
                              if (filename.includes('_')) {
                                const parts = filename.split('_');
                                const numberPart = parts[parts.length - 1].split('.')[0];
                                if (!isNaN(numberPart)) return `Angle ${numberPart}`;
                              }
                              
                              // Check for just number.jpg pattern
                              const justNumber = filename.split('.')[0];
                              if (!isNaN(justNumber) && justNumber !== userId) return `Angle ${justNumber}`;
                              
                              // Default label
                              return `Image ${index + 1}`;
                            })()
                          }
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.noFaceImageContainer}>
                  <Icon name="face-recognition" size={60} color="#d1d5db" />
                  <Text style={styles.noFaceImageText}>No face images available</Text>
                  {currentUser && (currentUser.is_staff || currentUser.is_supervisor) && (
                    <Text style={styles.noFaceImageSubtext}>
                      Use the Face Recognition section above to upload an image
                    </Text>
                  )}
                </View>
              )}
              
              <View style={styles.faceRecognitionTipsContainer}>
                <Text style={styles.faceRecognitionTipsTitle}>Face Recognition Tips:</Text>
                <Text style={styles.faceRecognitionTip}>• Ensure good lighting when capturing the reference image</Text>
                <Text style={styles.faceRecognitionTip}>• Face should be clearly visible and centered</Text>
                <Text style={styles.faceRecognitionTip}>• Avoid wearing accessories that cover facial features</Text>
                <Text style={styles.faceRecognitionTip}>• Multiple angles improve recognition accuracy</Text>
              </View>
            </Surface>
          )}
          
          {/* Attendance section */}
          <Surface style={[styles.infoCard, {backgroundColor: '#f0f7ff'}]} elevation={2}>
            <View style={styles.cardHeader}>
              <Icon name="calendar-clock" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Attendance Records</Text>
            </View>
            
            <Text style={styles.attendanceDescription}>
              View detailed attendance history, analytics, and generate reports for this user.
            </Text>
            
            <Button 
              mode="contained" 
              icon="calendar-check" 
              onPress={() => navigation.navigate('UserAttendance', { 
                userId: userId, 
                userName: user ? `${user.first_name} ${user.last_name}` : 'User' 
              })}
              style={styles.attendanceButton}
              labelStyle={{ fontSize: 14, letterSpacing: 0.5 }}
              contentStyle={{ height: 48 }}
            >
              View Attendance Records
            </Button>
          </Surface>
          
          {/* Danger Zone Section - Only visible to admins, not supervisors */}
          {(!currentUser || !currentUser.is_supervisor) && (
            <Surface style={styles.dangerCard} elevation={3}>
              <View style={styles.dangerHeader}>
                <Icon name="alert-circle" size={24} color="#b91c1c" />
                <Text style={styles.dangerTitle}>Danger Zone</Text>
              </View>
              
              <Text style={styles.dangerDescription}>
                These actions are permanent and cannot be undone. Please use caution.
              </Text>
              
              <Button 
                mode="contained" 
                icon="delete-forever" 
                onPress={handleDeleteUser}
                style={styles.dangerButton}
                labelStyle={{ fontSize: 14, letterSpacing: 0.5, color: '#FFFFFF' }}
                contentStyle={{ height: 50 }}
                disabled={loading}
              >
                {loading ? 'Deleting User...' : 'Delete User Permanently'}
              </Button>
            </Surface>
          )}
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.retryButton}>
            Go Back
          </Button>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  errorImageContainer: {
    backgroundColor: '#f8d7da',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
    width: 120,
    height: 120,
  },
  errorImageText: {
    fontSize: 10,
    color: '#721c24',
    marginTop: 4,
    textAlign: 'center',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    borderRadius: 12,
  },
  // Profile card styles
  profileCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    padding: 20,
  },
  profileHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    backgroundColor: '#2563eb',
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  // Face image styles
  faceImageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  faceImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  faceImageCaption: {
    marginTop: 8,
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  noFaceImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    height: 200,
  },
  // All face images styles
  allFaceImagesContainer: {
    marginTop: 24,
    marginBottom: 16,
    width: '100%',
  },
  allFaceImagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  faceImagesCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  faceImagesScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  faceImageItem: {
    marginRight: 12,
    alignItems: 'center',
    width: 120,
  },
  faceImageLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#0284c7',
    textAlign: 'center',
  },
  additionalFaceImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 6,
  },
  deleteImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    zIndex: 10,
  },
  referenceImage: {
    borderWidth: 2,
    borderColor: '#0284c7',
  },
  referenceImageBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#0284c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  referenceImageText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  faceImageDate: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  placeholderContainer: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    padding: 10,
  },
  noFaceImageText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  noFaceImageSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  faceRecognitionTipsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7', // Using a fixed color instead of theme.colors.primary
  },
  faceRecognitionTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  faceRecognitionTip: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 12,
    height: 32,
  },
  // Info cards styles
  infoCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: '#1e293b',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactIconContainer: {
    marginRight: 16,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  contactActionButton: {
    marginLeft: 8,
    padding: 0,
  },
  itemDivider: {
    height: 1,
    marginVertical: 12,
  },
  // Attendance section styles
  attendanceDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 16,
  },
  attendanceButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    marginVertical: 8,
  },
  faceRecognitionDescription: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 20,
  },
  faceRecognitionButton: {
    marginTop: 8,
    backgroundColor: '#0284c7',
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Danger zone styles
  dangerCard: {
    marginVertical: 20,
    borderRadius: 16,
    backgroundColor: '#fff1f2',
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 40,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: '#b91c1c',
  },
  dangerDescription: {
    fontSize: 14,
    color: '#b91c1c',
    marginBottom: 16,
    opacity: 0.9,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: '#b91c1c',
    borderRadius: 12,
  },
});

export default UserDetailScreen;
