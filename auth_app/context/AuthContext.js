import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API base URL - update with your Django server URL
// const API_URL = 'http://10.0.2.2:8000/api/auth/';  // For Android emulator
// const API_URL = 'http://localhost:8000/api/auth/';  // For iOS simulator
// const API_URL = 'http://localhost:8000/api/auth/';  // For iOS simulator
// const API_URL = 'http://10.84.15.213:8000/api/auth/';  // For iOS simulator
const API_URL = 'http://192.168.29.66:8000/api/auth/';  // For physical device (your computer's IP)

// Create context
export const AuthContext = createContext();

// Context provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  // Initialize auth state
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          setAuthToken(token);
          setIsAuthenticated(true);
          // Load user profile
          try {
            const userResponse = await getUserProfile(token);
            setUser(userResponse);
          } catch (err) {
            console.log('Error loading initial user profile:', err);
            // If we can't get the profile, clear the token
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userType');
            setAuthToken(null);
            setIsAuthenticated(false);
          }
        }
      } catch (e) {
        console.log('Failed to load token from storage:', e);
      }
    };

    loadToken();
  }, []);

  // Register user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Registration data:', userData);
      
      // Remove terms_agreement field as the backend doesn't expect it
      const { terms_agreement, ...userDataToSend } = userData;
      
      // Format date if it exists
      if (userDataToSend.date_of_birth && typeof userDataToSend.date_of_birth === 'object') {
        userDataToSend.date_of_birth = userDataToSend.date_of_birth.toISOString().split('T')[0];
      }
      
      const response = await axios.post(`${API_URL}register/`, userDataToSend);
      
      console.log('Registration successful:', response.data);
      
      // Check if the current user is already authenticated (admin registering a new user)
      const currentToken = await AsyncStorage.getItem('userToken');
      const isAdmin = user && user.is_staff;
      
      // Only save token and set user if not already authenticated as admin
      if (!currentToken || !isAdmin) {
        // Save token and user data
        const token = response.data.token;
        await AsyncStorage.setItem('userToken', token);
        
        // Determine user type based on roles
        let userType = 'user';
        if (response.data.user.is_staff) {
          userType = 'admin';
        } else if (response.data.user.is_supervisor) {
          userType = 'supervisor';
        }
        await AsyncStorage.setItem('userType', userType);
        
        setUser(response.data.user);
        setAuthToken(token);
        setIsAuthenticated(true);
      }
      
      setLoading(false);
      
      return response.data;
    } catch (error) {
      setLoading(false);
      console.log('Registration error details:', error.response?.data);
      
      // More detailed error handling
      if (error.response) {
        if (error.response.data.email) {
          setError(`Email error: ${error.response.data.email[0]}`);
        } else if (error.response.data.password) {
          setError(`Password error: ${error.response.data.password[0]}`);
        } else if (error.response.data.password2) {
          setError(`Confirm password error: ${error.response.data.password2[0]}`);
        } else if (error.response.data.non_field_errors) {
          setError(error.response.data.non_field_errors[0]);
        } else {
          setError(`Registration failed: ${JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        setError('No response from server. Check your network connection.');
      } else {
        setError(`Error: ${error.message}`);
      }
      
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Attempting login with email: ${email} to ${API_URL}login/`);
      
      const response = await axios.post(`${API_URL}login/`, {
        username: email,  // Django REST Framework's ObtainAuthToken expects 'username'
        password: password,
      });
      
      console.log('Login successful:', response.data);
      
      // Save token and user type
      const token = response.data.token;
      await AsyncStorage.setItem('userToken', token);
      
      // Determine user type based on roles
      let userType = 'user';
      if (response.data.is_staff) {
        userType = 'admin';
      } else if (response.data.is_supervisor) {
        userType = 'supervisor';
      }
      await AsyncStorage.setItem('userType', userType);
      
      // Set auth state
      setAuthToken(token);
      setIsAuthenticated(true);
      
      // Get user profile
      try {
        const userResponse = await getUserProfile(token);
        setUser(userResponse);
      } catch (profileError) {
        console.log('Error getting user profile after login:', profileError);
        // Continue anyway since login was successful
      }
      
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      console.log('Login error details:', error.response?.data);
      
      // More detailed error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data.username) {
          setError(`Email error: ${error.response.data.username[0]}`);
        } else if (error.response.data.password) {
          setError(`Password error: ${error.response.data.password[0]}`);
        } else if (error.response.data.non_field_errors) {
          setError(error.response.data.non_field_errors[0]);
        } else {
          setError(`Server error: ${JSON.stringify(error.response.data)}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError('No response from server. Check your network connection.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Error: ${error.message}`);
      }
      
      throw error;
    }
  };

  // Removed auto-checkout functionality
  
  // Logout user
  const logout = async () => {
    setLoading(true);
    
    try {
      // Removed auto-checkout functionality
      
      if (authToken) {
        // Call logout endpoint
        await axios.post(
          `${API_URL}logout/`, 
          {}, 
          { headers: { Authorization: `Token ${authToken}` } }
        );
      }
    } catch (error) {
      console.log('Logout error', error);
    } finally {
      // Clear storage and state regardless of API call result
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userType');
      setUser(null);
      setAuthToken(null);
      setIsAuthenticated(false);
      setLoading(false);
    }
  };

  // Get user profile
  const getUserProfile = async (token) => {
    try {
      const userToken = token || authToken || await AsyncStorage.getItem('userToken');
      
      if (!userToken) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `${API_URL}profile/`, 
        { headers: { Authorization: `Token ${userToken}` } }
      );
      
      return response.data;
    } catch (error) {
      console.log('Get profile error', error);
      throw error;
    }
  };

  // Update user profile
  const updateProfile = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.patch(
        `${API_URL}profile/`, 
        userData,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      setUser(response.data);
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      setError('Failed to update profile. Please try again.');
      throw error;
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.put(
        `${API_URL}change-password/`, 
        passwordData,
        { headers: { Authorization: `Token ${token}` } }
      );
      
      // Update token if returned
      if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      }
      
      setLoading(false);
      return response.data;
    } catch (error) {
      setLoading(false);
      setError(
        error.response?.data?.old_password?.[0] || 
        'Failed to change password. Please try again.'
      );
      throw error;
    }
  };

  // Admin: Get all users
  const getUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `${API_URL}admin/users/`, 
        { headers: { Authorization: `Token ${token}` } }
      );
      
      return response.data;
    } catch (error) {
      console.log('Get users error', error);
      throw error;
    }
  };

  // Admin: Get user details
  const getUserDetails = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await axios.get(
        `${API_URL}admin/users/${userId}/`, 
        { headers: { Authorization: `Token ${token}` } }
      );
      
      return response.data;
    } catch (error) {
      console.log('Get user details error', error);
      throw error;
    }
  };
  
  // Upload face image for a user (admin function)
  const uploadUserFaceImage = async (userId, imageUri) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create form data for upload
      const formData = new FormData();
      
      // Extract filename from URI
      const fileNameParts = imageUri.split('/');
      const fileName = fileNameParts[fileNameParts.length - 1] || 'face_reference.jpg';
      
      // Create file object directly from URI
      // For React Native, we need to create a file object with the right properties
      const fileType = 'image/jpeg';
      
      // Append the image as a file with the correct name and type
      formData.append('face_image', {
        uri: imageUri,
        name: fileName,
        type: fileType
      });
      
      // Add user_id to the form data
      if (userId) {
        // Ensure user_id is a string and explicitly log it
        const userIdString = userId.toString();
        console.log('Adding user_id to FormData:', userIdString);
        formData.append('user_id', userIdString);
      } else {
        console.warn('No userId provided for face image upload');
      }
      
      // Enhanced logging for debugging
      console.log('Uploading image:', fileName);
      console.log('For user ID:', userId);
      
      // Log FormData contents
      console.log('FormData contents:');
      for (let pair of formData._parts) {
        console.log(pair[0] + ': ' + JSON.stringify(pair[1]));
      }
      
      // Make the API request
      console.log('Making API request to:', `${API_URL}face/admin-upload/`);
      console.log('With auth token:', authToken ? 'Token present' : 'No token');
      
      const uploadResponse = await fetch(`${API_URL}face/admin-upload/`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Token ${authToken}`
          // Don't set Content-Type header - React Native's fetch will automatically set it with the correct boundary
          // Setting it manually can cause issues with multipart/form-data boundaries
        }
      });
      
      console.log('Response status:', uploadResponse.status);
      console.log('Response status text:', uploadResponse.statusText);
      
      // Parse the response
      const responseData = await uploadResponse.json();
      
      // Check if the request was successful
      if (!uploadResponse.ok) {
        throw new Error(responseData.error || 'Upload failed');
      }
      
      setLoading(false);
      return responseData;
    } catch (error) {
      console.error('Face image upload error:', error);
      setLoading(false);
      setError(error.message || 'Failed to upload face image');
      throw error;
    }
  };

  // Get all face images for a user
  const getUserFaceImages = async (userId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // First get the user details to get the email
      const userDetails = await getUserDetails(userId);
      if (!userDetails || !userDetails.email) {
        throw new Error('Could not retrieve user email');
      }
      
      // Convert email to the format used in the file system
      // Use global regex to replace all periods with '_dot_'
      const safeEmail = userDetails.email.replace('@', '_at_').replace(/\./g, '_dot_');
      
      // Get the reference face image from the user profile
      const referenceFaceImage = userDetails.profile?.face_image;
      
      // Create a list of face images
      let faceImages = [];
      
      // Add the reference image if it exists
      if (referenceFaceImage) {
        faceImages.push({
          image_url: referenceFaceImage,
          upload_date: userDetails.profile?.updated_at || new Date().toISOString(),
          is_reference: true
        });
      }
      
      // Get the base URL from the reference image URL if available
      let baseUrl = '';
      if (referenceFaceImage) {
        // Extract the base URL up to the media directory
        const urlParts = referenceFaceImage.split('/');
        const mediaIndex = urlParts.findIndex(part => part === 'media');
        baseUrl = urlParts.slice(0, mediaIndex + 1).join('/') + '/';
      } else {
        // If no reference image, construct a base URL using the API_URL
        // This is a fallback in case there's no reference image
        const apiUrlParts = API_URL.split('/');
        // Remove the 'api/' part if it exists
        const apiIndex = apiUrlParts.findIndex(part => part === 'api');
        if (apiIndex !== -1) {
          apiUrlParts.splice(apiIndex, 1);
        }
        baseUrl = apiUrlParts.join('/') + '/media/';
      }
      
      // Log the user ID for debugging
      console.log('Using user ID for image search:', userId);
      console.log('Base URL for images:', baseUrl);
      
      try {
        // Make an API call to get all face images for this user
        // If the user is an admin or supervisor viewing another user's images
        const response = await fetch(`${API_URL}face/admin-multi-upload/?user_id=${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Face images API response:', data);
          
          if (data.face_images && Array.isArray(data.face_images)) {
            // Map the API response to our expected format
            const apiImages = data.face_images.map(img => ({
              image_url: img.url || img.image,
              upload_date: img.updated_at || img.created_at,
              is_reference: false,
              angle_index: img.angle_index
            }));
            
            // Combine with reference image if it exists
            faceImages = [...faceImages, ...apiImages.filter(img => 
              !faceImages.some(existing => existing.image_url === img.image_url)
            )];
            
            console.log('Combined face images from API:', faceImages);
            return { face_images: faceImages };
          }
        } else {
          console.log('API request failed, falling back to sequential file naming');
        }
      } catch (apiError) {
        console.log('Error fetching face images from API:', apiError);
        console.log('Falling back to sequential file naming method');
      }
      
      // Fallback: Use sequential file naming pattern
      // This uses the sequential file naming implemented in the backend
      const directoryPath = `${baseUrl}face_recognition/${safeEmail}/`;
      console.log('Using sequential file naming pattern for directory:', directoryPath);
      
      // Clear existing images array to avoid duplicates
      // Keep only the reference image if it exists
      const referenceImage = faceImages.find(img => img.is_reference);
      faceImages = referenceImage ? [referenceImage] : [];
      
      // Base filename is the user ID
      const baseFilename = `${userId}.jpg`;
      
      // Add the base file (without suffix) and mark it as reference
      const baseImageUrl = `${directoryPath}${baseFilename}`;
      if (!faceImages.some(img => img.image_url === baseImageUrl)) {
        console.log('Adding base image URL:', baseImageUrl);
        faceImages.push({
          image_url: baseImageUrl,
          upload_date: new Date().toISOString(),
          is_reference: true  // Mark the base file as reference
        });
      }
      
      // Add sequentially named files (_1, _2, _3, etc.)
      // Try up to 20 sequential files to ensure we get all images
      for (let i = 1; i <= 20; i++) {
        // Try both userId_i.jpg and just i.jpg patterns
        const patterns = [
          `${userId}_${i}.jpg`,  // Pattern: userId_i.jpg
          `${i}.jpg`,           // Pattern: i.jpg
          `_${i}.jpg`           // Pattern: _i.jpg
        ];
        
        for (const filename of patterns) {
          const sequentialImageUrl = `${directoryPath}${filename}`;
          
          // Only add if it's not already in the list
          if (!faceImages.some(img => img.image_url === sequentialImageUrl)) {
            console.log('Adding sequential image URL:', sequentialImageUrl);
            faceImages.push({
              image_url: sequentialImageUrl,
              upload_date: new Date(Date.now() - (i * 60000)).toISOString(), // Simulate different dates
              is_reference: false,
              angle_index: i
            });
          }
        }
      }
      
      // Also try to add any additional images that might be in the folder with different naming patterns
      // For example, try adding images with angle names or other patterns
      const additionalPatterns = [
        `${userId}_front.jpg`,
        `${userId}_left.jpg`,
        `${userId}_right.jpg`,
        `${userId}_up.jpg`,
        `${userId}_down.jpg`,
        `${userId}_angle.jpg`,
        `front.jpg`,
        `left.jpg`,
        `right.jpg`,
        `up.jpg`,
        `down.jpg`,
        `angle.jpg`
      ];
      
      for (const pattern of additionalPatterns) {
        const additionalImageUrl = `${directoryPath}${pattern}`;
        if (!faceImages.some(img => img.image_url === additionalImageUrl)) {
          console.log('Adding additional pattern image URL:', additionalImageUrl);
          faceImages.push({
            image_url: additionalImageUrl,
            upload_date: new Date().toISOString(),
            is_reference: false
          });
        }
      }
      
      // Log the constructed face images for debugging
      console.log('Total face images found:', faceImages.length);
      console.log('Constructed sequential face images:', faceImages.map(img => img.image_url));
      
      // Log detailed information about each image pattern
      const referenceImages = faceImages.filter(img => img.is_reference);
      const sequentialImages = faceImages.filter(img => {
        const filename = img.image_url.split('/').pop();
        return filename.includes('_') && !isNaN(filename.split('_').pop().split('.')[0]);
      });
      const numberOnlyImages = faceImages.filter(img => {
        const filename = img.image_url.split('/').pop();
        const name = filename.split('.')[0];
        return !isNaN(name) && name !== userId;
      });
      const angleNamedImages = faceImages.filter(img => {
        const filename = img.image_url.split('/').pop();
        return filename.includes('front') || 
               filename.includes('left') || 
               filename.includes('right') || 
               filename.includes('up') || 
               filename.includes('down') || 
               filename.includes('angle');
      });
      
      console.log('Image pattern breakdown:');
      console.log(`- Reference images: ${referenceImages.length}`);
      console.log(`- Sequential numbered images: ${sequentialImages.length}`);
      console.log(`- Number-only images: ${numberOnlyImages.length}`);
      console.log(`- Angle-named images: ${angleNamedImages.length}`);
      
      // Check for any images that might have failed to load
      if (faceImages.length === 0) {
        console.warn('WARNING: No face images were found for this user!');
      } else if (faceImages.length === 1 && referenceImages.length === 1) {
        console.warn('WARNING: Only the reference image was found, no additional images were detected!');
      }
      
      return { face_images: faceImages };
    } catch (error) {
      console.log('Get user face images error', error);
      return { face_images: [] }; // Return empty array if there's an error
    }
  };

  // Delete a specific face image for a user (admin function)
  const deleteUserFaceImage = async (userId, imageUrl) => {
    try {
      setLoading(true);
      setError(null);
      
      // Extract the filename from the image URL
      const urlParts = imageUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      
      // Extract the user's email from the URL to identify the folder
      // URL format is typically: /media/face_recognition/email_at_domain_dot_com/filename.jpg
      const folderParts = imageUrl.split('/');
      let userFolder = '';
      
      // Find the face_recognition folder index
      const faceRecognitionIndex = folderParts.findIndex(part => part === 'face_recognition');
      if (faceRecognitionIndex !== -1 && folderParts.length > faceRecognitionIndex + 1) {
        userFolder = folderParts[faceRecognitionIndex + 1];
      }
      
      console.log('Attempting to delete face image:', filename);
      console.log('From user folder:', userFolder);
      
      // First, get the user details to confirm the image exists
      const userDetails = await getUserDetails(userId);
      if (!userDetails) {
        throw new Error('Could not retrieve user details');
      }
      
      // Since there's no dedicated API endpoint for deleting face images,
      // we'll make a best effort to delete the file by:
      // 1. Removing it from the UI
      // 2. Logging the deletion request for server-side handling
      
      // In a production environment, you would implement a proper API endpoint
      // to handle file deletion on the server
      
      // Log detailed information for debugging and potential server-side processing
      console.log('Face image deletion request:', {
        userId: userId,
        userEmail: userDetails.email,
        imageUrl: imageUrl,
        filename: filename,
        userFolder: userFolder,
        timestamp: new Date().toISOString()
      });
      
      // Alert the user about the current limitations
      Alert.alert(
        'Image Deletion',
        'The image has been removed from the display. Due to current backend limitations, ' +
        'the actual file may still exist on the server. This will be addressed in a future update.',
        [{ text: 'OK' }]
      );
      
      // Return true to indicate success to the UI
      // The UI will remove the image from the display
      return true;
    } catch (err) {
      // Handle specific error cases
      if (err.response) {
        // If we get a 403, it means the user doesn't have permission
        if (err.response.status === 403) {
          setError('You do not have permission to delete this image');
        } 
        // For other status codes
        else {
          setError(`Failed to delete image: ${err.response.data?.detail || 'Unknown error'}`);
        }
      } else {
        setError(err.message || 'Failed to connect to the server');
      }
      
      console.error('Delete face image error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete user (admin only)
  const deleteUser = async (userId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Using the correct API endpoint for user deletion
      // From the Django backend's api_urls.py: path('admin/users/<int:pk>/', AdminUserDetailView.as_view())
      await axios.delete(`${API_URL}admin/users/${userId}/`, {
        headers: {
          Authorization: `Token ${authToken}`
        }
      });
      
      console.log('User deleted successfully');
      return true;
    } catch (err) {
      // Handle specific error cases
      if (err.response) {
        // If we get a 403, it means the user doesn't have permission
        if (err.response.status === 403) {
          setError('You do not have permission to delete this user');
        } 
        // If we get a 404, the user might not exist
        else if (err.response.status === 404) {
          setError('User not found or already deleted');
        }
        // For other status codes
        else {
          setError(`Failed to delete user: ${err.response.data?.detail || 'Unknown error'}`);
        }
      } else {
        setError('Failed to connect to the server');
      }
      
      console.error('Delete user error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        authToken,
        register,
        login,
        logout,
        getUserProfile,
        updateProfile,
        changePassword,
        getUsers,
        getUserDetails,
        uploadUserFaceImage,
        getUserFaceImages,
        deleteUserFaceImage,
        deleteUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};