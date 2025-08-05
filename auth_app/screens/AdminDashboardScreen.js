import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  StatusBar,
  FlatList,
  ImageBackground,
  Dimensions
} from 'react-native';
import { 
  Text, 
  Title, 
  Button, 
  Avatar, 
  Card, 
  ActivityIndicator,
  Divider,
  Appbar,
  Badge,
  IconButton,
  useTheme,
  Surface,
  Chip,
  Headline,
  Subheading,
  Caption,
  ProgressBar,
  Searchbar,
  FAB,
  Paragraph
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const { getUsers, user } = useAuth();
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState({
    total: 0,
    active: 0,
    admins: 0,
    newThisMonth: 0
  });
  
  // Format dates properly with error handling
  const formatDate = (dateString) => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date string:', dateString);
        return null;
      }
      
      // Format date in DD/MM/YYYY format
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.log('Error formatting date:', error);
      return null;
    }
  };

  const calculateUserStats = (usersData) => {
    if (!usersData || !usersData.length) return;
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const active = usersData.filter(user => user.is_active).length;
    const admins = usersData.filter(user => user.is_staff).length;
    const newUsers = usersData.filter(user => {
      if (!user.date_joined) return false;
      const joinDate = new Date(user.date_joined);
      return joinDate >= startOfMonth;
    }).length;
    
    setUserStats({
      total: usersData.length,
      active: active,
      admins: admins,
      newThisMonth: newUsers
    });
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const usersData = await getUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);
      calculateUserStats(usersData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const onChangeSearch = query => setSearchQuery(query);

  const viewUserDetails = (user) => {
    navigation.navigate('UserDetail', { userId: user.id });
  };

  const getInitials = (firstName, lastName) => {
    let initials = '';
    if (firstName) initials += firstName.charAt(0).toUpperCase();
    if (lastName) initials += lastName.charAt(0).toUpperCase();
    return initials || '?';
  };

  const getRecentUsers = () => {
    // Get 5 most recently joined users
    return [...users]
      .sort((a, b) => {
        const dateA = a.date_joined ? new Date(a.date_joined) : new Date(0);
        const dateB = b.date_joined ? new Date(b.date_joined) : new Date(0);
        return dateB - dateA;
      })
      .slice(0, 5);
  };

  const renderUserItem = ({ item }) => {
    const userInitials = getInitials(item.first_name, item.last_name);
    const hasName = item.first_name || item.last_name;
    
    return (
      <Surface style={styles.userCard}>
        <TouchableOpacity onPress={() => viewUserDetails(item)}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              {item.profile?.profile_picture ? (
                <Avatar.Image 
                  size={50} 
                  source={{ uri: item.profile.profile_picture }} 
                />
              ) : (
                <Avatar.Text 
                  size={50} 
                  label={userInitials}
                  color="#ffffff"
                  style={{ backgroundColor: item.is_staff ? theme.colors.primary : theme.colors.accent }}
                />
              )}
              {item.is_staff && (
                <Badge
                  style={styles.adminBadge}
                  size={18}
                >
                  <Icon name="shield" size={10} color="#fff" />
                </Badge>
              )}
            </View>

            <View style={styles.userInfo}>
              <Title style={styles.userTitle}>
                {hasName ? `${item.first_name || ''} ${item.last_name || ''}`.trim() : 'No name provided'}
              </Title>
              <Paragraph style={styles.userEmail}>{item.email}</Paragraph>
              
              <View style={styles.chipContainer}>
                <Chip 
                  style={[styles.statusChip, { 
                    backgroundColor: item.is_active ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)' 
                  }]} 
                  textStyle={{ 
                    color: item.is_active ? theme.colors.success : theme.colors.error,
                    fontWeight: '600'
                  }}
                  icon={item.is_active ? 'check-circle' : 'cancel'}
                >
                  {item.is_active ? 'Active' : 'Inactive'}
                </Chip>
                
                <Chip 
                  style={[styles.roleChip, {
                    backgroundColor: item.is_staff ? 'rgba(37, 99, 235, 0.1)' : 'rgba(107, 114, 128, 0.1)'
                  }]} 
                  textStyle={{ 
                    color: item.is_staff ? theme.colors.primary : '#424242',
                    fontWeight: '600'
                  }}
                  icon={item.is_staff ? 'shield-account' : 'account'}
                >
                  {item.is_staff ? 'Admin' : 'User'}
                </Chip>
              </View>
            </View>
            
            <TouchableOpacity onPress={() => viewUserDetails(item)} style={styles.detailButton}>
              <Icon name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Icon name="calendar" size={16} color={theme.colors.primary} />
              <Text style={styles.detailLabel}>Joined</Text>
              <Text style={styles.detailValue}>
                {item.date_joined ? formatDate(item.date_joined) : 'Not available'}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Icon name="clock" size={16} color={theme.colors.primary} />
              <Text style={styles.detailLabel}>Last Login</Text>
              <Text style={styles.detailValue}>
                {item.last_login ? formatDate(item.last_login) : 'Never'}
              </Text>
            </View>
            
            {item.phone_number && (
              <View style={styles.detailItem}>
                <Icon name="phone" size={16} color={theme.colors.primary} />
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{item.phone_number}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  const renderRecentUserItem = (user, index) => {
    const userInitials = getInitials(user.first_name, user.last_name);
    const hasName = user.first_name || user.last_name;
    
    return (
      <TouchableOpacity 
        key={user.id} 
        style={styles.recentUserItem}
        onPress={() => viewUserDetails(user)}
      >
        <View style={styles.recentUserAvatar}>
          {user.profile?.profile_picture ? (
            <Avatar.Image 
              size={40} 
              source={{ uri: user.profile.profile_picture }} 
            />
          ) : (
            <Avatar.Text 
              size={40} 
              label={userInitials}
              color="#ffffff"
              style={{ backgroundColor: user.is_staff ? theme.colors.primary : theme.colors.accent }}
            />
          )}
          {user.is_staff && (
            <Badge
              style={styles.recentAdminBadge}
              size={14}
            >
              <Icon name="shield" size={8} color="#fff" />
            </Badge>
          )}
        </View>
        <View style={styles.recentUserInfo}>
          <Text style={styles.recentUserName}>
            {hasName ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'No name provided'}
          </Text>
          <Text style={styles.recentUserDate}>
            Joined: {user.date_joined ? formatDate(user.date_joined) : 'Unknown'}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      
      {/* Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <Appbar.Header style={styles.header}>
          <Appbar.Content 
            title="Admin Dashboard" 
            subtitle={`${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'numeric', day: 'numeric' })}`} 
            titleStyle={styles.headerTitle} 
            subtitleStyle={styles.headerSubtitle} 
          />
          <Appbar.Action icon="bell-outline" color="white" onPress={() => {}} />
          <Appbar.Action icon="account-circle" color="white" onPress={() => navigation.navigate('Profile')} />
        </Appbar.Header>
      </LinearGradient>
      
      <ScrollView 
        style={styles.scrollContent} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.surface}
          />
        }>
        
        {/* Welcome Card with Gradient */}
        <Surface style={styles.welcomeCard}>
          <LinearGradient
            colors={['#4c669f', '#3b5998', '#192f6a']}
            style={styles.welcomeGradient}
          >
            <View style={styles.welcomeCardContent}>
              <View style={styles.welcomeHeader}>
                <View>
                  <Headline style={styles.welcomeTitle}>
                    Welcome, {user?.first_name || 'Admin'}
                  </Headline>
                  <Subheading style={styles.welcomeSubtitle}>
                    Manage your users and system
                  </Subheading>
                </View>
                <Avatar.Text 
                  size={56} 
                  label={(user?.first_name?.[0] || 'A') + (user?.last_name?.[0] || '')} 
                  color="#ffffff"
                  style={styles.avatar}
                  backgroundColor="rgba(255, 255, 255, 0.2)" 
                />
              </View>
              
              <View style={styles.welcomeStatsRow}>
                <View style={styles.welcomeStatItem}>
                  <Text style={styles.welcomeStatValue}>{userStats.total}</Text>
                  <Text style={styles.welcomeStatLabel}>Total Users</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Surface>
        
        {/* User Statistics */}
        <Surface style={styles.statsCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="chart-bar" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>User Statistics</Title>
              </View>
            </View>
            
            <View style={styles.statsGrid}>
              <View style={[styles.statItem, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                <MaterialCommunityIcons name="account-group" size={28} color={theme.colors.primary} />
                <Text style={styles.statValue}>{userStats.total}</Text>
                <Text style={styles.statLabel}>Total Users</Text>
              </View>
              
              <View style={[styles.statItem, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <MaterialCommunityIcons name="shield-account" size={28} color={theme.colors.secondary} />
                <Text style={[styles.statValue, { color: theme.colors.secondary }]}>{userStats.admins}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
            </View>
          </View>
        </Surface>
        
        {/* Recent Users */}
        <Surface style={styles.recentUsersCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="account-clock" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>Recent Users</Title>
              </View>
              <Button 
                mode="text" 
                icon="account-group"
                onPress={() => {}} 
                color={theme.colors.primary}
                uppercase={false}
                labelStyle={{ fontSize: 14 }}
              >
                View All
              </Button>
            </View>
            
            <Surface style={styles.recentUsersContainer}>
              {getRecentUsers().length > 0 ? (
                getRecentUsers().map((user, index) => renderRecentUserItem(user, index))
              ) : (
                <Text style={styles.noRecentUsers}>No recent users found</Text>
              )}
            </Surface>
          </View>
        </Surface>
        
        {/* User List */}
        <Surface style={styles.usersListCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="account-group" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>All Users</Title>
              </View>
              <Text style={styles.userCount}>{filteredUsers.length} users</Text>
            </View>
            
            <Searchbar
              placeholder="Search users"
              onChangeText={onChangeSearch}
              value={searchQuery}
              style={styles.searchBar}
              iconColor={theme.colors.primary}
            />
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button mode="contained" onPress={fetchUsers} style={styles.retryButton}>
                  Retry
                </Button>
              </View>
            ) : (
              <View style={styles.userListContainer}>
                {filteredUsers.length > 0 ? (
                  <FlatList
                    data={filteredUsers}
                    renderItem={renderUserItem}
                    keyExtractor={item => item.id.toString()}
                    scrollEnabled={false}
                    nestedScrollEnabled={true}
                    ListEmptyComponent={
                      <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                          {searchQuery ? 'No users match your search' : 'No users found'}
                        </Text>
                      </View>
                    }
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'No users match your search' : 'No users found'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Surface>
        
        <View style={{ height: 20 }} />
      </ScrollView>
      
      {/* Floating Action Button - Only visible to admins, not supervisors */}
      {user && user.is_staff && (
        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="account-plus"
          onPress={() => navigation.navigate('Register')}
          color="#fff"
          label="Register New User"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Main layout
  container: {
    flex: 1,
  },
  headerGradient: {
    elevation: 4,
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 20,
    color: 'white',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 20,
  },
  
  // Welcome card with gradient
  welcomeCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
  welcomeGradient: {
    borderRadius: 16,
  },
  welcomeCardContent: {
    padding: 24,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.3,
    color: '#ffffff',
  },
  welcomeSubtitle: {
    fontSize: 16,
    marginTop: 6,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  avatar: {
    elevation: 2,
  },
  welcomeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  welcomeStatItem: {
    alignItems: 'center',
  },
  welcomeStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  welcomeStatLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  
  // Card common styles
  cardContent: {
    padding: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  
  // Stats card
  statsCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  
  // Activity chart
  activityContainer: {
    marginTop: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  activityHeader: {
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#475569',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  
  // Recent users card
  recentUsersCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  recentUsersContainer: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    elevation: 1,
    overflow: 'hidden',
  },
  recentUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentUserAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  recentAdminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f39c12',
  },
  recentUserInfo: {
    flex: 1,
  },
  recentUserName: {
    fontSize: 14,
    fontWeight: '600',
  },
  recentUserDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noRecentUsers: {
    padding: 16,
    textAlign: 'center',
    color: '#666',
  },
  
  // Quick actions
  quickActionsCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  
  // Users list card
  usersListCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  userCount: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  userListContainer: {
    marginTop: 8,
  },
  userCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
    padding: 16,
    overflow: 'hidden',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  adminBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f39c12',
  },
  userInfo: {
    flex: 1,
  },
  userTitle: {
    fontSize: 16,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusChip: {
    height: 24,
    marginRight: 8,
  },
  roleChip: {
    height: 24,
  },
  detailButton: {
    padding: 8,
  },
  divider: {
    marginVertical: 10,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  
  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    elevation: 5,
    borderRadius: 28,
  },
});

export default AdminDashboardScreen;