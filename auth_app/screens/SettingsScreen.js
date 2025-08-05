import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card, Title, Paragraph, Switch, Divider, List, Text } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';

const SettingsScreen = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [biometricLogin, setBiometricLogin] = useState(false);
  
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  };
  
  const handleChangePassword = () => {
    // Navigate to change password screen
    Alert.alert('Feature Coming Soon', 'Change password functionality will be available in the next update.');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Account Settings</Title>
          <Paragraph>Manage your account preferences</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <List.Section>
            <List.Item
              title="Email"
              description={user?.email || 'Not available'}
              left={props => <List.Icon {...props} icon="email" />}
            />
            
            <Divider />
            
            <List.Item
              title="Change Password"
              left={props => <List.Icon {...props} icon="lock-reset" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleChangePassword}
            />
          </List.Section>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>App Settings</Title>
          
          <List.Item
            title="Dark Mode"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={() => {
                  setDarkMode(!darkMode);
                  Alert.alert('Feature Coming Soon', 'Dark mode will be available in the next update.');
                }}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Notifications"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={() => setNotifications(!notifications)}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Biometric Login"
            left={props => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={biometricLogin}
                onValueChange={() => {
                  setBiometricLogin(!biometricLogin);
                  Alert.alert('Feature Coming Soon', 'Biometric login will be available in the next update.');
                }}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>About</Title>
          <List.Item
            title="App Version"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
          
          <Divider />
          
          <List.Item
            title="Terms of Service"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Terms of Service', 'Terms of service content will be available soon.')}
          />
          
          <Divider />
          
          <List.Item
            title="Privacy Policy"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content will be available soon.')}
          />
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  card: {
    marginBottom: 15,
    elevation: 2,
  },
  buttonContainer: {
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
});

export default SettingsScreen; 