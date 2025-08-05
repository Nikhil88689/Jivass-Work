import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, List, Switch, Text, Divider, Avatar, Chip, Banner } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const UserDetailScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const { getUserDetails } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const userData = await getUserDetails(userId);
      setUser(userData);
      setLoading(false);
    } catch (err) {
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
          onPress: () => {
            // This would be implemented with an API call in a real app
            Alert.alert('Feature Coming Soon', 'User deletion will be available in the next update.');
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
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
          <Card style={styles.profileCard}>
            <Card.Content>
              <View style={styles.profileHeader}>
                <Avatar.Text 
                  size={80} 
                  label={`${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`}
                  style={styles.avatar}
                />
                <View style={styles.profileInfo}>
                  <Title style={styles.userName}>{user.first_name} {user.last_name}</Title>
                  <View style={styles.badgeContainer}>
                    <Chip 
                      style={[styles.badge, { backgroundColor: user.is_active ? '#e3fcef' : '#fee2e2' }]}
                      textStyle={{ color: user.is_active ? '#16a34a' : '#dc2626' }}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Chip>
                    {user.is_admin && (
                      <Chip 
                        style={[styles.badge, { backgroundColor: '#e0f2fe' }]}
                        textStyle={{ color: '#0284c7' }}
                        icon="shield-account"
                      >
                        Admin
                      </Chip>
                    )}
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Contact information */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Contact Information</Title>
              
              <List.Item
                title="Email"
                description={user.email}
                left={props => <List.Icon {...props} icon="email" color="#3498db" />}
                right={props => (
                  <Button
                    mode="text"
                    onPress={() => Linking.openURL(`mailto:${user.email}`)}
                    style={{ marginRight: -10 }}
                  >
                    <Icon name="open-in-new" size={20} color="#3498db" />
                  </Button>
                )}
                style={styles.listItem}
              />
              
              {user.phone && (
                <List.Item
                  title="Phone"
                  description={user.phone}
                  left={props => <List.Icon {...props} icon="phone" color="#3498db" />}
                  right={props => (
                    <Button
                      mode="text"
                      onPress={() => Linking.openURL(`tel:${user.phone}`)}
                      style={{ marginRight: -10 }}
                    >
                      <Icon name="open-in-new" size={20} color="#3498db" />
                    </Button>
                  )}
                  style={styles.listItem}
                />
              )}
            </Card.Content>
          </Card>

          {/* Account information */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Account Information</Title>
              
              <List.Item
                title="User ID"
                description={user.id}
                left={props => <List.Icon {...props} icon="identifier" color="#3498db" />}
                style={styles.listItem}
              />
              
              <List.Item
                title="Date Joined"
                description={new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                left={props => <List.Icon {...props} icon="calendar" color="#3498db" />}
                style={styles.listItem}
              />
              
              <List.Item
                title="Last Login"
                description={user.last_login ? new Date(user.last_login).toLocaleString('en-US') : 'Never'}
                left={props => <List.Icon {...props} icon="login" color="#3498db" />}
                style={styles.listItem}
              />
            </Card.Content>
          </Card>
          
          {/* Profile information */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Profile Information</Title>
              
              <List.Section>
                {user.bio && (
                  <List.Item
                    title="Bio"
                    description={user.bio}
                    left={props => <List.Icon {...props} icon="card-account-details" color="#3498db" />}
                    style={styles.listItem}
                  />
                )}
                
                {user.address && (
                  <List.Item
                    title="Address"
                    description={user.address}
                    left={props => <List.Icon {...props} icon="map-marker" color="#3498db" />}
                    style={styles.listItem}
                  />
                )}
                
                {user.website && (
                  <List.Item
                    title="Website"
                    description={user.website}
                    left={props => <List.Icon {...props} icon="web" color="#3498db" />}
                    right={props => (
                      <Button
                        mode="text"
                        onPress={() => Linking.openURL(user.website)}
                        style={{ marginRight: -10 }}
                      >
                        <Icon name="open-in-new" size={20} color="#3498db" />
                      </Button>
                    )}
                    style={styles.listItem}
                  />
                )}
              </List.Section>
            </Card.Content>
          </Card>
          
          {/* Attendance section */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Attendance Records</Title>
              <Paragraph style={styles.sectionDescription}>View, filter, and analyze attendance data</Paragraph>
              
              <Button 
                mode="contained" 
                icon="calendar-check" 
                onPress={() => navigation.navigate('UserAttendance', { 
                  userId: userId, 
                  userName: user ? `${user.first_name} ${user.last_name}` : 'User' 
                })}
                style={styles.attendanceButton}
              >
                View Attendance
              </Button>
            </Card.Content>
          </Card>
          
          {/* Admin actions */}
          {user?.is_admin && (
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Admin Actions</Title>
                <View style={styles.adminActionsContainer}>
                  <Button 
                    mode="contained" 
                    icon="account-cancel" 
                    onPress={handleToggleActive}
                    style={[styles.adminActionButton, { backgroundColor: user?.is_active ? '#e74c3c' : '#27ae60' }]}
                  >
                    {user?.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  
                  <Button 
                    mode="contained" 
                    icon="shield-account" 
                    onPress={handleToggleAdmin}
                    style={[styles.adminActionButton, { backgroundColor: user?.is_admin ? '#e74c3c' : '#3498db' }]}
                  >
                    {user?.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </Button>
                  
                  <Button 
                    mode="contained" 
                    icon="lock-reset" 
                    onPress={handleResetPassword}
                    style={[styles.adminActionButton, { backgroundColor: '#f39c12' }]}
                  >
                    Reset Password
                  </Button>
                  
                  <Button 
                    mode="contained" 
                    icon="delete" 
                    onPress={handleDeleteUser}
                    style={[styles.adminActionButton, { backgroundColor: '#c0392b' }]}
                  >
                    Delete User
                  </Button>
                </View>
              </Card.Content>
            </Card>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
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
  },
  profileCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#3498db',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  badge: {
    marginRight: 8,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#34495e',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 16,
  },
  listItem: {
    paddingLeft: 0,
    paddingRight: 0,
  },
  adminActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  adminActionButton: {
    width: '48%',
    marginBottom: 10,
  },
  attendanceButton: {
    backgroundColor: '#3498db',
    marginVertical: 10,
  }
});

export default UserDetailScreen;
