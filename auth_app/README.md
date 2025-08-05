# Authentication App

A React Native mobile app for the Django authentication system.

## Features

- User authentication (login, registration, logout)
- Email verification
- Profile management
- Admin dashboard
- Password reset functionality
- Secure token-based authentication
- Modern UI with React Native Paper

## Prerequisites

- Node.js (v14+)
- npm or yarn
- Expo CLI
- Android Studio or Xcode (for running on emulators)
- Django backend server running

## Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Update API URL:
Open `context/AuthContext.js` and update the API_URL to point to your Django backend:

```javascript
// For Android emulator
const API_URL = 'http://10.0.2.2:8000/api/auth/';

// For iOS simulator
// const API_URL = 'http://localhost:8000/api/auth/';

// For physical device on same network
// const API_URL = 'http://YOUR_COMPUTER_IP:8000/api/auth/';
```

## Running the App

1. Start the Expo development server:
```bash
npx expo start
```

2. Run on Android or iOS:
- Press `a` to run on Android emulator
- Press `i` to run on iOS simulator
- Scan the QR code with the Expo Go app on your physical device

## Project Structure

- `App.js` - Main application component and navigation setup
- `context/AuthContext.js` - Authentication context provider
- `screens/` - Application screens
  - `LoginScreen.js` - User login
  - `RegisterScreen.js` - User registration
  - `HomeScreen.js` - Home screen
  - `ProfileScreen.js` - User profile management
  - `SettingsScreen.js` - App settings
  - `AdminDashboardScreen.js` - Admin dashboard
  - `UserDetailScreen.js` - User details for admins
- `assets/` - Images and other static assets

## Backend API Integration

This app connects to a Django REST API with the following endpoints:

- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET /api/auth/profile/` - Get user profile
- `PATCH /api/auth/profile/` - Update user profile
- `PUT /api/auth/change-password/` - Change password
- `GET /api/auth/admin/users/` - Admin: Get all users
- `GET /api/auth/admin/users/:id/` - Admin: Get user details

# Face Recognition Attendance System

## Setting Up Face Recognition

The attendance system uses facial recognition to verify your identity when checking in. Here's how to set up and manage your reference face image:

### Adding Your Reference Face Image

1. **From the Profile Screen:**
   - Navigate to the Profile tab
   - Scroll down to the "Face Recognition" section
   - Tap "Set Up Face Image"
   - Follow the camera prompts to take a clear photo of your face
   - This image will be used as your reference for all future verifications

2. **When First Using Face Recognition:**
   - If you try to use face recognition check-in without a reference image
   - The app will automatically prompt you to set up a reference image
   - Follow the on-screen instructions to capture your face

### Tips for Good Face Recognition

For the best face recognition results:

- **Good Lighting:** Ensure your face is well-lit, avoiding harsh shadows
- **Face Position:** Look directly at the camera with your full face visible
- **Remove Obstructions:** Take off glasses, masks, or other face coverings
- **Expression:** Maintain a neutral expression (slight smile is okay)
- **Distance:** Position your face to fill most of the frame (not too far or close)

### Using Face Recognition for Check-In

1. From the Attendance screen, tap "Face Recognition Check In"
2. Position your face in the frame and take a photo
3. The system will:
   - Verify your location (GPS)
   - Compare your face with your reference image
   - Mark your attendance if both verifications pass

### Updating Your Reference Image

If you're having trouble with face verification or your appearance has changed:

1. Go to the Profile tab
2. Scroll to the "Face Recognition" section
3. Tap "Update Face Image"
4. Take a new reference photo following the tips above

### Troubleshooting

If face verification fails:
- Check your lighting conditions
- Ensure your face is clearly visible and centered
- Try updating your reference image if problems persist
- Make sure you're within range of an authorized location

## Privacy Note

Your face images are stored securely on the server and are only used for attendance verification purposes. The system does not share your biometric data with third parties. 