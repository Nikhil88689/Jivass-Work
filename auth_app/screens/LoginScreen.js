import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Title, 
  HelperText, 
  Surface,
  Avatar,
  Card,
  useTheme,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Validation schema
const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const { login, error, loading } = useAuth();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const theme = useTheme();

  const handleLogin = async (values) => {
    try {
      const result = await login(values.email, values.password);
      console.log('Login successful, navigating to Main screen');
      // Force a reload of the app to trigger the navigation change
      // This ensures the RootNavigator sees the updated token
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        // Navigation will happen automatically in RootNavigator when it detects the token
        console.log('User token found, navigation should occur automatically');
      }
    } catch (error) {
      console.log('Login error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.appName}>AttendX</Text>
            <Text style={styles.tagline}>Attendance Management Simplified</Text>
          </View>
          
          <Card style={styles.card}>
            <View style={styles.logoContainer}>
              <Avatar.Icon 
                size={80} 
                icon="account-circle"
                style={styles.logo}
                color={theme.colors.surface}
                backgroundColor={theme.colors.primary}
              />
              <Title style={styles.title}>Welcome Back</Title>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Sign in to your account</Text>
            </View>
            <Divider style={styles.divider} />
            
            {error && (
              <View style={styles.errorContainer}>
                <HelperText type="error" visible={true} style={styles.errorText}>
                  {error}
                </HelperText>
              </View>
            )}
            
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleLogin}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.form}>
                  <TextInput
                    label="Email"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && errors.email}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<TextInput.Icon icon="email" color={theme.colors.primary} />}
                    mode="outlined"
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                    theme={{ roundness: 8 }}
                  />
                  {touched.email && errors.email && (
                    <HelperText type="error" visible={touched.email && errors.email}>
                      {errors.email}
                    </HelperText>
                  )}
                  
                  <TextInput
                    label="Password"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    error={touched.password && errors.password}
                    secureTextEntry={secureTextEntry}
                    style={styles.input}
                    right={
                      <TextInput.Icon 
                        icon={secureTextEntry ? "eye" : "eye-off"} 
                        onPress={() => setSecureTextEntry(!secureTextEntry)}
                        color={theme.colors.primary}
                      />
                    }
                    left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
                    mode="outlined"
                    outlineColor={theme.colors.border}
                    activeOutlineColor={theme.colors.primary}
                    theme={{ roundness: 8 }}
                  />
                  {touched.password && errors.password && (
                    <HelperText type="error" visible={touched.password && errors.password}>
                      {errors.password}
                    </HelperText>
                  )}
                  
                  <Button 
                    mode="contained" 
                    onPress={handleSubmit}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    loading={loading}
                    disabled={loading}
                    color={theme.colors.primary}
                    labelStyle={styles.buttonLabel}
                  >
                    Sign In
                  </Button>
                </View>
              )}
            </Formik>
            
            <View style={styles.footer}>
              <Text style={{ color: theme.colors.textSecondary }}>Please contact an administrator to create an account.</Text>
            </View>
          </Card>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#475569',
    marginTop: 4,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    marginBottom: 24,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  button: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerButton: {
    marginLeft: 5,
  },
});

export default LoginScreen;