import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  TextInput, 
  Button, 
  Text, 
  Title, 
  HelperText, 
  Surface,
  Checkbox
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { Formik } from 'formik';
import * as Yup from 'yup';

// Validation schema
const RegisterSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required'),
  password2: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Confirm password is required'),
  first_name: Yup.string()
    .required('First name is required'),
  last_name: Yup.string()
    .required('Last name is required'),
  phone_number: Yup.string()
    .nullable(),
  date_of_birth: Yup.date()
    .nullable(),
  terms_agreement: Yup.boolean()
    .oneOf([true], 'You must accept the terms and conditions')
    .required('You must accept the terms and conditions')
});

const RegisterScreen = ({ navigation }) => {
  const { register, error, loading } = useAuth();
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureTextEntry2, setSecureTextEntry2] = useState(true);

  const handleRegister = async (values) => {
    try {
      const result = await register(values);
      
      // Check if the user is an admin (registering a new user from admin dashboard)
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'admin') {
        // Navigate back to admin dashboard after successful registration
        navigation.navigate('AdminDashboard');
      }
    } catch (error) {
      console.log('Registration error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Surface style={styles.surface}>
            <Title style={styles.title}>Create Account</Title>
            <Text style={styles.subtitle}>Please fill in the form to register</Text>
            
            {error && (
              <HelperText type="error" visible={true}>
                {error}
              </HelperText>
            )}
            
            <Formik
              initialValues={{ 
                email: '', 
                password: '', 
                password2: '', 
                first_name: '', 
                last_name: '', 
                phone_number: '', 
                date_of_birth: null,
                terms_agreement: false
              }}
              validationSchema={RegisterSchema}
              onSubmit={handleRegister}
            >
              {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
                <View style={styles.form}>
                  <View style={styles.row}>
                    <TextInput
                      label="First Name"
                      value={values.first_name}
                      onChangeText={handleChange('first_name')}
                      onBlur={handleBlur('first_name')}
                      error={touched.first_name && errors.first_name}
                      style={[styles.input, styles.halfInput]}
                      left={<TextInput.Icon icon="account" />}
                    />
                    <TextInput
                      label="Last Name"
                      value={values.last_name}
                      onChangeText={handleChange('last_name')}
                      onBlur={handleBlur('last_name')}
                      error={touched.last_name && errors.last_name}
                      style={[styles.input, styles.halfInput]}
                      left={<TextInput.Icon icon="account" />}
                    />
                  </View>
                  
                  {touched.first_name && errors.first_name && (
                    <HelperText type="error" visible={touched.first_name && errors.first_name}>
                      {errors.first_name}
                    </HelperText>
                  )}
                  
                  {touched.last_name && errors.last_name && (
                    <HelperText type="error" visible={touched.last_name && errors.last_name}>
                      {errors.last_name}
                    </HelperText>
                  )}
                  
                  <TextInput
                    label="Email"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    error={touched.email && errors.email}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    left={<TextInput.Icon icon="email" />}
                  />
                  
                  {touched.email && errors.email && (
                    <HelperText type="error" visible={touched.email && errors.email}>
                      {errors.email}
                    </HelperText>
                  )}
                  
                  <TextInput
                    label="Phone Number (Optional)"
                    value={values.phone_number}
                    onChangeText={handleChange('phone_number')}
                    onBlur={handleBlur('phone_number')}
                    error={touched.phone_number && errors.phone_number}
                    style={styles.input}
                    keyboardType="phone-pad"
                    left={<TextInput.Icon icon="phone" />}
                  />
                  
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
                      />
                    }
                    left={<TextInput.Icon icon="lock" />}
                  />
                  
                  {touched.password && errors.password && (
                    <HelperText type="error" visible={touched.password && errors.password}>
                      {errors.password}
                    </HelperText>
                  )}
                  
                  <TextInput
                    label="Confirm Password"
                    value={values.password2}
                    onChangeText={handleChange('password2')}
                    onBlur={handleBlur('password2')}
                    error={touched.password2 && errors.password2}
                    secureTextEntry={secureTextEntry2}
                    style={styles.input}
                    right={
                      <TextInput.Icon 
                        icon={secureTextEntry2 ? "eye" : "eye-off"} 
                        onPress={() => setSecureTextEntry2(!secureTextEntry2)}
                      />
                    }
                    left={<TextInput.Icon icon="lock" />}
                  />
                  
                  {touched.password2 && errors.password2 && (
                    <HelperText type="error" visible={touched.password2 && errors.password2}>
                      {errors.password2}
                    </HelperText>
                  )}
                  
                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      status={values.terms_agreement ? 'checked' : 'unchecked'}
                      onPress={() => setFieldValue('terms_agreement', !values.terms_agreement)}
                    />
                    <Text style={styles.termsText}>
                      I agree to the Terms and Conditions
                    </Text>
                  </View>
                  
                  {touched.terms_agreement && errors.terms_agreement && (
                    <HelperText type="error" visible={touched.terms_agreement && errors.terms_agreement}>
                      {errors.terms_agreement}
                    </HelperText>
                  )}
                  
                  <Button 
                    mode="contained" 
                    onPress={handleSubmit}
                    style={styles.button}
                    loading={loading}
                    disabled={loading}
                  >
                    Register
                  </Button>
                </View>
              )}
            </Formik>
            
            <View style={styles.footer}>
              <Text>Already have an account?</Text>
              <Button 
                mode="text" 
                onPress={() => navigation.navigate('Login')}
                style={styles.loginButton}
              >
                Login
              </Button>
            </View>
          </Surface>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  surface: {
    padding: 20,
    borderRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  form: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    marginBottom: 10,
  },
  halfInput: {
    width: '48%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  termsText: {
    marginLeft: 8,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    marginLeft: 5,
  },
});

export default RegisterScreen;