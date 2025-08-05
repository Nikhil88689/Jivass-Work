import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
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
  ProgressBar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const { user, getUserProfile, loading, authToken } = useAuth();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [todaysAttendance, setTodaysAttendance] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    onTime: 0,
    late: 0
  });
  
  // Calculate on-time percentage for progress bar
  const onTimePercentage = attendanceSummary.total > 0 
    ? (attendanceSummary.onTime / attendanceSummary.total) 
    : 0;
  
  // API base URL
  const API_URL = 'http://192.168.29.66:8000/api/auth/';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await loadUserProfile();
    await loadAttendanceSummary();
    await checkTodaysAttendance();
  };

  const loadUserProfile = async () => {
    try {
      await getUserProfile();
    } catch (error) {
      console.log('Error loading profile:', error);
    }
  };

  const loadAttendanceSummary = async () => {
    try {
      console.log('Fetching attendance summary for user:', user?.id);
      
      // Get all attendance records for the current user
      const response = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Filter to get only this user's records
      const userAttendances = response.data.filter(record => 
        record.user === user?.id || record.user_email === user?.email
      );
      
      console.log(`Found ${userAttendances.length} attendance records`);
      
      if (!userAttendances.length) {
        setAttendanceSummary({
          thisWeek: 0,
          thisMonth: 0,
          total: 0,
          onTime: 0,
          late: 0
        });
        return;
      }
      
      // Calculate attendance summary
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Count records
      const thisWeekCount = userAttendances.filter(record => {
        const recordDate = new Date(record.check_in_time);
        return recordDate >= startOfWeek;
      }).length;
      
      const thisMonthCount = userAttendances.filter(record => {
        const recordDate = new Date(record.check_in_time);
        return recordDate >= startOfMonth;
      }).length;
      
      // Process each attendance record to ensure late status is correctly calculated
      userAttendances.forEach(record => {
        // Check if the check-in time was after 9:10 AM
        if (record.check_in_time) {
          const checkInTime = new Date(record.check_in_time);
          const checkInHour = checkInTime.getHours();
          const checkInMinute = checkInTime.getMinutes();
          
          // Calculate if the check-in was after grace period (9:10 AM)
          const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
          const expectedTime = 9 * 60; // 9:00 AM
          const graceTime = expectedTime + 10; // 9:10 AM
          
          // Update is_late flag if needed
          if (checkInTotalMinutes > graceTime) {
            console.log(`Record ${record.id} has check-in time ${checkInTime.toLocaleTimeString()}, marking as Late`);
            record.is_late = true;
          }
        }
      });
      
      // Now count late and on-time records using the updated flags
      const onTimeCount = userAttendances.filter(record => !record.is_late).length;
      const lateCount = userAttendances.filter(record => record.is_late).length;
      
      console.log(`After processing: On-time count: ${onTimeCount}, Late count: ${lateCount}`);
      
      setAttendanceSummary({
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        total: userAttendances.length,
        onTime: onTimeCount,
        late: lateCount
      });
      
      console.log('Attendance summary calculated:', {
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        total: userAttendances.length,
        onTime: onTimeCount,
        late: lateCount
      });
    } catch (error) {
      console.error('Error loading attendance summary:', error);
    }
  };

  const checkTodaysAttendance = async () => {
    try {
      console.log('Checking today\'s attendance status for user:', user?.id);
      
      // Get all attendance records for the current user
      const response = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Get today's date (at start of day in local time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      console.log('Today date (local):', today.toISOString());
      
      // Filter to find any active check-in (without checkout) or today's attendance for this user
      const userAttendances = response.data.filter(record => 
        (record.user === user?.id || record.user_email === user?.email)
      );
      
      console.log(`Found ${userAttendances.length} total attendance records for this user`);
      
      // First check for any active attendance (no check-out time)
      const activeAttendance = userAttendances.find(record => !record.check_out_time);
      
      if (activeAttendance) {
        console.log('Found active attendance record:', activeAttendance);
        
        // Calculate if this check-in was late
        const checkInTime = new Date(activeAttendance.check_in_time);
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();
        
        // Check if check-in was after 9:10 AM
        const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
        const expectedTime = 9 * 60; // 9:00 AM
        const graceTime = expectedTime + 10; // 9:10 AM
        
        const isLate = checkInTotalMinutes > graceTime;
        
        // Format the active attendance data
        setTodaysAttendance({
          date: new Date(activeAttendance.check_in_time),
          checkedIn: true,
          checkInTime: new Date(activeAttendance.check_in_time),
          checkOutTime: null,
          isLate: isLate || activeAttendance.is_late
        });
        
        console.log('Today\'s attendance set from active record, is_late:', isLate);
        return;
      }
      
      // If no active attendance, check for any attendance from today
      const todaysRecord = userAttendances.find(record => {
        const recordDate = new Date(record.check_in_time);
        const recordDay = recordDate.getDate();
        const recordMonth = recordDate.getMonth();
        const recordYear = recordDate.getFullYear();
        
        const todayDay = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();
        
        return recordDay === todayDay && 
               recordMonth === todayMonth && 
               recordYear === todayYear;
      });
      
      console.log('Today\'s attendance record:', todaysRecord);
      
      if (!todaysRecord) {
        // No attendance record for today
        setTodaysAttendance({
          date: today,
          checkedIn: false,
          checkInTime: null,
          checkOutTime: null,
          isLate: false
        });
        return;
      }
      
      // Format the attendance data
      setTodaysAttendance({
        date: today,
        checkedIn: true,
        checkInTime: new Date(todaysRecord.check_in_time),
        checkOutTime: todaysRecord.check_out_time ? new Date(todaysRecord.check_out_time) : null,
        isLate: todaysRecord.is_late
      });
    } catch (error) {
      console.error('Error checking today\'s attendance:', error);
      setTodaysAttendance(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatTime = (date) => {
    if (!date) return 'Not available';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const QuickActionButton = ({ icon, label, onPress, color = '#3498db' }) => (
    <TouchableOpacity 
      style={[styles.quickActionButton, { backgroundColor: color + '15' }]}
      onPress={onPress}
    >
      <MaterialCommunityIcons name={icon} size={28} color={color} style={styles.actionIcon} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      <Appbar.Header style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Appbar.Content 
          title="Dashboard" 
          subtitle="Welcome back" 
          titleStyle={styles.headerTitle} 
          subtitleStyle={styles.headerSubtitle} 
        />
        <Appbar.Action icon="bell-outline" color="white" onPress={() => {}} />
        <Appbar.Action icon="account-circle" color="white" onPress={() => navigation.navigate('Profile')} />
      </Appbar.Header>
      
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
        
        <Surface style={styles.welcomeCard}>
          <View style={styles.welcomeCardContent}>
            <View style={styles.welcomeHeader}>
              <View>
                <Headline style={styles.welcomeTitle}>
                  Hello, {user?.first_name || 'User'}
                </Headline>
                <Subheading style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Subheading>
              </View>
              <Avatar.Text 
                size={56} 
                label={(user?.first_name?.[0] || 'U') + (user?.last_name?.[0] || '')} 
                color={theme.colors.surface}
                style={styles.avatar}
                backgroundColor={theme.colors.primary} 
              />
            </View>
          </View>
        </Surface>

        {/* Today's Attendance Status */}
        <Surface style={styles.attendanceCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="calendar-today" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>Today's Status</Title>
              </View>
              {todaysAttendance?.checkedIn && !todaysAttendance?.checkOutTime && (
                <Chip 
                  mode="outlined" 
                  textStyle={{ color: theme.colors.success, fontWeight: '600' }}
                  style={{ borderColor: theme.colors.success, backgroundColor: 'rgba(22, 163, 74, 0.1)' }}
                >
                  Active
                </Chip>
              )}
            </View>

            {todaysAttendance ? (
              <Surface style={styles.todayStatus}>
                <View style={styles.statusRow}>
                  <View style={styles.statusIconContainer}>
                    <MaterialCommunityIcons name="login" size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={styles.statusLabel}>Check-in Time</Text>
                    <Text style={styles.statusValue}>
                      {todaysAttendance.checkInTime ? formatTime(todaysAttendance.checkInTime) : 'Not available'}
                      {todaysAttendance.isLate && (
                        <Text style={{ color: theme.colors.error }}> (Late)</Text>
                      )}
                    </Text>
                  </View>
                </View>
                
                <Divider style={styles.statusDivider} />
                
                <View style={styles.statusRow}>
                  <View style={styles.statusIconContainer}>
                    <MaterialCommunityIcons name="logout" size={20} color={todaysAttendance.checkOutTime ? theme.colors.success : theme.colors.textSecondary} />
                  </View>
                  <View style={styles.statusTextContainer}>
                    <Text style={styles.statusLabel}>Check-out Time</Text>
                    <Text style={[styles.statusValue, !todaysAttendance.checkOutTime && { color: theme.colors.textSecondary }]}>
                      {todaysAttendance.checkOutTime ? formatTime(todaysAttendance.checkOutTime) : 'Not checked out yet'}
                    </Text>
                  </View>
                </View>
              </Surface>
            ) : (
              <Surface style={styles.notCheckedInContainer}>
                <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.colors.warning} style={{ marginBottom: 12 }} />
                <Text style={styles.notCheckedInText}>You haven't checked in today</Text>
                <Button 
                  mode="contained" 
                  icon="login-variant"
                  style={[styles.checkinButton, { backgroundColor: theme.colors.success }]}
                  labelStyle={{ fontSize: 14, fontWeight: '500', letterSpacing: 0.5 }}
                  contentStyle={{ paddingVertical: 6 }}
                  onPress={() => navigation.navigate('Attendance')}
                >
                  Check In Now
                </Button>
              </Surface>
            )}
          </View>
        </Surface>

        {/* Attendance Summary */}
        <Surface style={styles.summaryCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>Attendance Summary</Title>
              </View>
              <Button 
                mode="text" 
                icon="chart-box-outline"
                onPress={() => navigation.navigate('My Dashboard')} 
                color={theme.colors.primary}
                uppercase={false}
                labelStyle={{ fontSize: 14 }}
              >
                Details
              </Button>
            </View>

            <Surface style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>{attendanceSummary.thisWeek}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>This Week</Text>
              </View>
              
              <Divider style={styles.verticalDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>{attendanceSummary.thisMonth}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>This Month</Text>
              </View>
              
              <Divider style={styles.verticalDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>{attendanceSummary.total}</Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Days</Text>
              </View>
            </Surface>

            <Divider style={styles.divider} />
            
            <View style={styles.onTimeContainer}>
                <View style={styles.onTimeStat}>
                  <Text style={[styles.onTimeValue, { color: theme.colors.success }]}>{attendanceSummary.onTime}</Text>
                  <Text style={[styles.onTimeLabel, { color: theme.colors.textSecondary }]}>On Time</Text>
                </View>
                
                <View style={[styles.onTimeStat, styles.lateStat]}>
                  <Text style={[styles.onTimeValue, { color: theme.colors.error }]}>{attendanceSummary.late}</Text>
                  <Text style={[styles.onTimeLabel, { color: theme.colors.textSecondary }]}>Late</Text>
                </View>
              </View>
          </View>
        </Surface>

        {/* Quick Actions */}
        <Surface style={styles.quickActionsCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <View style={styles.cardTitleContainer}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color={theme.colors.primary} />
                <Title style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Actions</Title>
              </View>
            </View>

            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]} 
                onPress={() => navigation.navigate('My Dashboard')}
              >
                <MaterialCommunityIcons name="chart-box-outline" size={26} color={theme.colors.primary} style={styles.actionIcon} />
                <Text style={styles.actionLabel}>Reports</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(6, 182, 212, 0.1)' }]} 
                onPress={() => navigation.navigate('My Dashboard')}
              >
                <MaterialCommunityIcons name="download-outline" size={26} color={theme.colors.accent} style={styles.actionIcon} />
                <Text style={styles.actionLabel}>Export</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]} 
                onPress={() => navigation.navigate('Profile')}
              >
                <MaterialCommunityIcons name="account-outline" size={26} color={theme.colors.secondary} style={styles.actionIcon} />
                <Text style={styles.actionLabel}>Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: 'rgba(22, 163, 74, 0.1)' }]} 
                onPress={() => navigation.navigate('Attendance')}
              >
                <MaterialCommunityIcons name="calendar-check-outline" size={26} color={theme.colors.success} style={styles.actionIcon} />
                <Text style={styles.actionLabel}>Check In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Surface>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} size="large" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Main layout
  container: {
    flex: 1,
  },
  header: {
    elevation: 4,
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
    padding: 20,
    paddingTop: 24,
  },
  
  // Welcome card
  welcomeCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
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
  },
  welcomeSubtitle: {
    fontSize: 16,
    marginTop: 6,
  },
  avatar: {
    elevation: 2,
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
  
  // Attendance card
  attendanceCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  todayStatus: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#475569',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDivider: {
    marginBottom: 16,
    height: 1,
  },
  notCheckedInContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  notCheckedInText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
    textAlign: 'center',
  },
  checkinButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  
  // Summary card
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    height: '100%',
  },
  divider: {
    marginVertical: 20,
  },
  attendanceProgressContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  progressTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  onTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  onTimeStat: {
    alignItems: 'center',
  },
  onTimeValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  onTimeLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  lateStat: {
    marginLeft: 40,
  },
  
  // Quick actions
  quickActionsCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
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
  
  // Loading
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#475569',
  },
});

export default HomeScreen;
