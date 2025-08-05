import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Avatar, Text, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

const NewAdminScreen = ({ navigation }) => {
  const { user } = useAuth();
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content style={styles.headerContent}>
          <Title style={styles.headerTitle}>NEW ADMIN DASHBOARD</Title>
          <View style={styles.headerRow}>
            <Icon name="shield-account" size={24} color="#fff" />
            <Paragraph style={styles.headerSubtitle}>User Management Portal</Paragraph>
          </View>
          <Text style={styles.headerTimestamp}>Accessed on: {new Date().toLocaleString()}</Text>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Current Admin</Title>
          <View style={styles.adminInfo}>
            <Avatar.Text 
              size={60} 
              label={user?.first_name?.charAt(0) || 'A'}
              style={styles.adminAvatar}
            />
            <View style={styles.adminDetails}>
              <Text style={styles.adminName}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.adminEmail}>{user?.email}</Text>
              <View style={styles.adminBadge}>
                <Icon name="shield" size={12} color="#fff" />
                <Text style={styles.adminBadgeText}>Administrator</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <Divider style={styles.divider} />
          
          <View style={styles.actionItem}>
            <Icon name="account-group" size={28} color="#3498db" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Manage Users</Text>
              <Text style={styles.actionDescription}>View and edit user accounts</Text>
            </View>
            <Button 
              mode="contained" 
              style={styles.actionButton}
              onPress={() => navigation.navigate('AdminDashboard')}
            >
              View
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.actionItem}>
            <Icon name="chart-bar" size={28} color="#9b59b6" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>Attendance Reports</Text>
              <Text style={styles.actionDescription}>Monitor user attendance data</Text>
            </View>
            <Button 
              mode="contained" 
              style={[styles.actionButton, { backgroundColor: '#9b59b6' }]}
              onPress={() => alert('Reports feature coming soon')}
            >
              View
            </Button>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.actionItem}>
            <Icon name="cog" size={28} color="#f39c12" />
            <View style={styles.actionTextContainer}>
              <Text style={styles.actionTitle}>System Settings</Text>
              <Text style={styles.actionDescription}>Configure app parameters</Text>
            </View>
            <Button 
              mode="contained" 
              style={[styles.actionButton, { backgroundColor: '#f39c12' }]}
              onPress={() => alert('Settings feature coming soon')}
            >
              View
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Admin Panel v2.0</Text>
        <Text style={styles.copyrightText}>© 2025 Auth App</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
    backgroundColor: '#2c3e50',
  },
  headerContent: {
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    color: '#ecf0f1',
    marginLeft: 8,
    fontSize: 16,
  },
  headerTimestamp: {
    color: '#bdc3c7',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#34495e',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  adminAvatar: {
    backgroundColor: '#3498db',
  },
  adminDetails: {
    marginLeft: 16,
  },
  adminName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  adminEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 6,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  actionDescription: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  actionButton: {
    backgroundColor: '#3498db',
  },
  versionContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#95a5a6',
    fontWeight: 'bold',
  },
  copyrightText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
});

export default NewAdminScreen;
