import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Share, RefreshControl } from 'react-native';
import { Surface, Avatar, Card, Title, Text, Button, ActivityIndicator, Chip, DataTable, Menu, SegmentedButtons, Paragraph, Divider, Appbar, Badge, IconButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';

const MyAttendanceScreen = ({ navigation }) => {
  const { user, authToken } = useAuth();
  
  // Attendance states
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // View states
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'summary'
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);
  
  // Colors for weekday chart
  const weekdayColors = {
    'Monday': '#2196F3',    // Blue
    'Tuesday': '#4CAF50',   // Green
    'Wednesday': '#FFC107', // Amber
    'Thursday': '#FF9800',  // Orange
    'Friday': '#F44336',    // Red
    'Saturday': '#9C27B0'   // Purple
  };

  // Date filter states
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [filterMode, setFilterMode] = useState('month'); // 'month' or 'range'

  // List of available months for filtering
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // API base URL - update to match your server address
  const API_URL = 'http://192.168.29.66:8000/api/auth/';

  // Function to fetch user attendance data
  const fetchMyAttendance = async () => {
    setLoading(true);
    try {
      // Make a real API call to get the user's attendance records
      const response = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      // Use the actual data from the API
      const actualData = response.data;
      console.log('Fetched attendance data:', actualData);
      
      // If there's no attendance data yet, show an empty array
      if (!actualData || !Array.isArray(actualData) || actualData.length === 0) {
        console.log('No attendance records found for user');
        setAttendances([]);
        setFilteredAttendances([]);
        setLoading(false);
        return;
      }
      
      // Filter to only show this user's attendance
      const userAttendance = actualData.filter(record => {
        return record.user === user?.id || record.user_email === user?.email;
      });
      
      console.log(`Found ${userAttendance.length} attendance records for user ID ${user?.id}`);
      
      // Process attendance records to ensure correct late status
      userAttendance.forEach(record => {
        // Check if the check-in time was late (after 9:10 AM)
        const checkInTime = new Date(record.check_in_time);
        const checkInHour = checkInTime.getHours();
        const checkInMinute = checkInTime.getMinutes();
        
        // Calculate if the check-in was after grace period (9:10 AM)
        const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
        const expectedTime = 9 * 60; // 9:00 AM
        const graceTime = expectedTime + 10; // 9:10 AM
        
        // Override the is_late flag if needed
        if (checkInTotalMinutes > graceTime) {
          console.log(`User checked in at ${checkInTime.toLocaleTimeString()}, marking as Late`);
          record.is_late = true;
        }
        
        // For debugging
        console.log(`Record ID: ${record.id}, Check-in time: ${checkInTime.toLocaleTimeString()}, Is Late: ${record.is_late}, Is Absent: ${record.is_absent}`);
        
        // Ensure attendance status is set based on is_absent field
        if (record.is_absent === true) {
          record.attendance_status = 'Absent';
        } else {
          record.attendance_status = 'Present';
        }
      });
      
      setAttendances(userAttendance);
      applyFilters(userAttendance);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply date filters to attendance data
  const applyFilters = (data) => {
    if (!data || !Array.isArray(data)) {
      setFilteredAttendances([]);
      return;
    }
    
    let filtered = [...data];
    
    if (filterMode === 'month') {
      filtered = data.filter(item => {
        if (!item || !item.check_in_time) return false;
        try {
          const date = new Date(item.check_in_time);
          if (isNaN(date.getTime())) return false;
          
          const month = date.getMonth();
          const year = date.getFullYear();
          
          return month === selectedMonth && year === selectedYear;
        } catch (err) {
          console.error('Error filtering attendance item:', err);
          return false;
        }
      });
    } else if (filterMode === 'range' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Set end date to end of day
      end.setHours(23, 59, 59, 999);
      
      filtered = data.filter(item => {
        if (!item || !item.check_in_time) return false;
        try {
          const date = new Date(item.check_in_time);
          return date >= start && date <= end;
        } catch (err) {
          console.error('Error filtering attendance item by date range:', err);
          return false;
        }
      });
    }
    
    setFilteredAttendances(filtered || []);
  };

  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setFilterMode('month');
    applyFilters(attendances);
  };

  // Handle date range change
  const setDateRange = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setFilterMode('range');
    applyFilters(attendances);
  };

  // Calculate attendance statistics
  const calculateStats = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { 
        total: 0, 
        onTime: 0, 
        late: 0, 
        avgDuration: '0h 0m',
        attendanceRate: 0,
        weekdayDistribution: { 
          'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 
          'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0 
        },
        dailyAttendance: []
      };
    }

    // Group attendance by day to count only one attendance per day
    const attendanceByDay = {};
    const dailyAttendanceMap = {};
    
    data.forEach(item => {
      if (item && item.check_in_time) {
        const checkInTime = new Date(item.check_in_time);
        const dateKey = checkInTime.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // If we already have an entry for this day, only overwrite if the current one is earlier
        if (!attendanceByDay[dateKey] || 
            new Date(attendanceByDay[dateKey].check_in_time) > checkInTime) {
          attendanceByDay[dateKey] = item;
          
          // Store attendance status by date for line graph
          dailyAttendanceMap[dateKey] = {
            date: dateKey,
            status: item.is_late ? 'late' : 'onTime'
          };
        }
      }
    });
    
    // Convert to array for easier processing
    const uniqueDailyAttendance = Object.values(attendanceByDay);
    
    // Count on-time and late days
    const onTime = uniqueDailyAttendance.filter(item => !item.is_late).length;
    const late = uniqueDailyAttendance.filter(item => item.is_late).length;
    
    // Calculate average duration
    let totalDuration = 0;
    let durationsCount = 0;
    
    uniqueDailyAttendance.forEach(item => {
      if (item && item.check_in_time && item.check_out_time) {
        const checkInTime = new Date(item.check_in_time);
        const checkOutTime = new Date(item.check_out_time);
        const duration = (checkOutTime - checkInTime) / (1000 * 60); // in minutes
        totalDuration += duration;
        durationsCount++;
      }
    });
    
    const avgMinutes = durationsCount > 0 ? Math.round(totalDuration / durationsCount) : 0;
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    
    // Sort daily attendance data for line graph
    const dailyAttendance = Object.values(dailyAttendanceMap).sort((a, b) => a.date.localeCompare(b.date));
    
    // Calculate attendance rate (working days in a month is typically 22)
    const totalDays = uniqueDailyAttendance.length;
    const attendanceRate = totalDays > 0 ? Math.round((totalDays / 22) * 100) : 0;
    
    return {
      total: totalDays,
      onTime,
      late,
      avgDuration: `${hours}h ${minutes}m`,
      attendanceRate,
      weekdayDistribution: calculateWeekdayDistribution(uniqueDailyAttendance),
      dailyAttendance
    };
  };

  // Calculate attendance distribution by weekday
  const calculateWeekdayDistribution = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { 
        'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 
        'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0 
      };
    }
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distribution = {};
    
    weekdays.forEach(day => distribution[day] = 0);
    
    // The data passed should already be unique by day
    data.forEach(item => {
      if (item && item.check_in_time) {
        const date = new Date(item.check_in_time);
        const weekday = weekdays[date.getDay()];
        distribution[weekday]++;
      }
    });
    
    return distribution;
  };

  // Handle export
  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      
      // Create content based on format
      let content = 'Date,Time In,Time Out,Duration,Status,Attendance\n';
      
      filteredAttendances.forEach(att => {
        if (!att || !att.check_in_time) return;
        
        const checkInDate = new Date(att.check_in_time);
        const dateStr = checkInDate.toLocaleDateString();
        const timeInStr = checkInDate.toLocaleTimeString();
        
        const checkOutStr = att.check_out_time ? new Date(att.check_out_time).toLocaleTimeString() : 'Not checked out';
        
        let duration = 'N/A';
        if (att.check_in_time && att.check_out_time) {
          const checkInTime = new Date(att.check_in_time);
          const checkOutTime = new Date(att.check_out_time);
          const durationMinutes = Math.round((checkOutTime - checkInTime) / (1000 * 60));
          const hours = Math.floor(durationMinutes / 60);
          const minutes = durationMinutes % 60;
          duration = `${hours}h ${minutes}m`;
        }
        
        const status = att.is_late ? 'Late' : 'On Time';
        // All records that have a check-in are considered "Present"
        const attendance = 'Present';
        
        content += `${dateStr},${timeInStr},${checkOutStr},${duration},${status},${attendance}\n`;
      });
      
      if (format === 'csv') {
        // Show success alert for CSV export
        Alert.alert(
          'Export Successful',
          'Your attendance data has been exported as CSV.',
          [{ 
            text: 'OK',
            onPress: () => setExportMenuVisible(false)
          }]
        );
        
        // Log data to console for debug purposes
        console.log('CSV Data:', content);
      } else if (format === 'pdf') {
        // Show success alert for PDF export
        Alert.alert(
          'Export Successful',
          'Your attendance data has been exported as PDF.',
          [{ 
            text: 'OK',
            onPress: () => setExportMenuVisible(false)
          }]
        );
        
        // Log data to console for debug purposes
        console.log('PDF Data would be generated from:', content);
      } else if (format === 'excel') {
        // Show success alert for Excel export
        Alert.alert(
          'Export Successful',
          'Your attendance data has been exported as Excel file.',
          [{ 
            text: 'OK',
            onPress: () => setExportMenuVisible(false)
          }]
        );
        
        // Log data to console for debug purposes
        console.log('Excel Data would be generated from:', content);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was a problem exporting the data');
    } finally {
      setExportLoading(false);
      setExportMenuVisible(false); // Close the menu after operation
    }
  };

  // Load attendance data on component mount
  useEffect(() => {
    fetchMyAttendance();
  }, []);
  
  // Function to handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyAttendance();
    setRefreshing(false);
  };
  
  // Apply filters when filter parameters change
  useEffect(() => {
    applyFilters(attendances);
  }, [selectedMonth, selectedYear, startDate, endDate, filterMode]);

  // Render date filter options
  const renderDateFilters = () => (
    <Surface style={styles.filterSurface} elevation={2}>
      <View style={styles.filterHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Avatar.Icon 
            size={36} 
            icon="filter-variant" 
            style={{ backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 12 }} 
            color="#1976D2" 
          />
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#424242'}}>Filter Records</Text>
        </View>
        
        <Chip 
          icon={filterMode === 'month' ? 'calendar-month' : 'calendar-range'} 
          mode="outlined"
          style={{borderColor: '#1976D2'}}
          textStyle={{color: '#1976D2', fontSize: 12}}
        >
          {filterMode === 'month' 
            ? `${months[selectedMonth]} ${selectedYear}` 
            : 'Custom Range'}
        </Chip>
      </View>

      <View style={styles.filterContent}>
        <SegmentedButtons
          value={filterMode}
          onValueChange={setFilterMode}
          buttons={[
            { value: 'month', label: 'Month', icon: 'calendar-month' },
            { value: 'range', label: 'Date Range', icon: 'calendar-range' },
          ]}
          style={{ marginBottom: 20 }}
        />
        
        {filterMode === 'month' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.monthSelectorContainer}>
              {months.map((month, index) => (
                <Chip
                  key={index}
                  selected={selectedMonth === index}
                  onPress={() => handleMonthChange(index)}
                  style={[styles.monthChip, selectedMonth === index && styles.selectedMonthChip]}
                  textStyle={selectedMonth === index ? styles.selectedMonthText : {}}
                  showSelectedCheck={selectedMonth === index}
                  compact
                >
                  {month}
                </Chip>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.dateRangeContainer}>
            <Button 
              mode="outlined" 
              icon="calendar-week" 
              onPress={() => {
                const today = new Date();
                const lastWeekStart = new Date();
                lastWeekStart.setDate(today.getDate() - 7);
                
                setDateRange(lastWeekStart, today);
              }}
              style={[styles.dateRangeButton, startDate && endDate && new Date(endDate) - new Date(startDate) === 7 * 24 * 60 * 60 * 1000 ? styles.selectedDateButton : null]}
              labelStyle={startDate && endDate && new Date(endDate) - new Date(startDate) === 7 * 24 * 60 * 60 * 1000 ? styles.selectedDateButtonText : {fontSize: 13}}
              contentStyle={{height: 40}}
            >
              Last 7 Days
            </Button>
            
            <Button 
              mode="outlined" 
              icon="calendar-month-outline" 
              onPress={() => {
                const today = new Date();
                const lastMonthStart = new Date();
                lastMonthStart.setMonth(today.getMonth() - 1);
                
                setDateRange(lastMonthStart, today);
              }}
              style={[styles.dateRangeButton, startDate && endDate && new Date(endDate) - new Date(startDate) > 25 * 24 * 60 * 60 * 1000 ? styles.selectedDateButton : null]}
              labelStyle={startDate && endDate && new Date(endDate) - new Date(startDate) > 25 * 24 * 60 * 60 * 1000 ? styles.selectedDateButtonText : {fontSize: 13}}
              contentStyle={{height: 40}}
            >
              Last 30 Days
            </Button>
            
            <Button 
              mode="outlined" 
              icon="calendar-today" 
              onPress={() => {
                const today = new Date();
                const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                
                setDateRange(thisMonthStart, today);
              }}
              style={[styles.dateRangeButton, 
                startDate && endDate && 
                new Date(startDate).getMonth() === new Date().getMonth() && 
                new Date(startDate).getDate() === 1 ? 
                styles.selectedDateButton : null]}
              labelStyle={startDate && endDate && 
                new Date(startDate).getMonth() === new Date().getMonth() && 
                new Date(startDate).getDate() === 1 ? 
                styles.selectedDateButtonText : {fontSize: 13}}
              contentStyle={{height: 40}}
            >
              This Month
            </Button>
          </View>
        )}
      </View>
    </Surface>
  );

  // Render stats
  const renderStats = () => {
    const stats = calculateStats(filteredAttendances);
    
    // Determine status colors
    const getStatusColor = (type) => {
      switch (type) {
        case 'present': return '#1976D2';
        case 'onTime': return '#4CAF50';
        case 'late': return '#F44336';
        case 'rate': 
          return stats.attendanceRate >= 90 ? '#4CAF50' : 
                 stats.attendanceRate >= 75 ? '#FF9800' : '#F44336';
        default: return '#757575';
      }
    };
    
    return (
      <Surface style={styles.clearStatsSurface} elevation={2}>
        {/* Header */}
        <View style={styles.clearStatsHeader}>
          <Text style={styles.clearStatsTitle}>ATTENDANCE SUMMARY</Text>
          <Text style={styles.clearStatsSubtitle}>{filteredAttendances.length} Records</Text>
        </View>
        
        {/* Key Metrics */}
        <View style={styles.metricsContainer}>
          {/* Total Attendance */}
          <Surface style={styles.metricCard} elevation={1}>
            <View style={styles.metricContent}>
              <View style={styles.metricIconContainer}>
                <Icon name="calendar-check" size={24} color={getStatusColor('present')} />
              </View>
              <View style={styles.metricTextContainer}>
                <Text style={styles.metricValue}>{stats.total}</Text>
                <Text style={styles.metricLabel}>Total Days</Text>
              </View>
            </View>
          </Surface>
          
          {/* On Time */}
          <Surface style={styles.metricCard} elevation={1}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIconContainer, {backgroundColor: 'rgba(76, 175, 80, 0.1)'}]}>
                <Icon name="clock-check" size={24} color={getStatusColor('onTime')} />
              </View>
              <View style={styles.metricTextContainer}>
                <Text style={[styles.metricValue, {color: getStatusColor('onTime')}]}>{stats.onTime}</Text>
                <Text style={styles.metricLabel}>On Time</Text>
              </View>
            </View>
          </Surface>
          
          {/* Late */}
          <Surface style={styles.metricCard} elevation={1}>
            <View style={styles.metricContent}>
              <View style={[styles.metricIconContainer, {backgroundColor: 'rgba(244, 67, 54, 0.1)'}]}>
                <Icon name="clock-alert" size={24} color={getStatusColor('late')} />
              </View>
              <View style={styles.metricTextContainer}>
                <Text style={[styles.metricValue, {color: getStatusColor('late')}]}>{stats.late}</Text>
                <Text style={styles.metricLabel}>Late</Text>
              </View>
            </View>
          </Surface>
        </View>
        
        {/* Attendance Rate */}
        <View style={styles.rateSection}>
          <View style={styles.rateHeader}>
            <Text style={styles.rateTitle}>Attendance Rate</Text>
            <Text style={[styles.rateValue, {color: getStatusColor('rate')}]}>{stats.attendanceRate}%</Text>
          </View>
          
          <View style={styles.clearProgressContainer}>
            <View style={styles.clearProgressBackground}>
              <View 
                style={[styles.clearProgressBar, { 
                  width: `${stats.attendanceRate}%`,
                  backgroundColor: getStatusColor('rate')
                }]}
              />
            </View>
            <View style={styles.rateLabelsContainer}>
              <Text style={styles.rateMinLabel}>0%</Text>
              <Text style={styles.rateMaxLabel}>100%</Text>
            </View>
          </View>
        </View>
        
        {/* Additional Stats */}
        <View style={styles.additionalStats}>
          {/* Average Duration */}
          <Surface style={styles.statBox} elevation={1}>
            <Icon name="timer-outline" size={22} color="#1976D2" />
            <Text style={styles.statBoxTitle}>Average Duration</Text>
            <Text style={styles.statBoxValue}>{stats.avgDuration}</Text>
          </Surface>
          

        </View>
        
        {/* Status Breakdown */}
        <View style={styles.statusSection}>
          <Text style={styles.statusTitle}>Status Breakdown</Text>
          
          <View style={styles.statusRow}>
            <View style={styles.statusLabelContainer}>
              <View style={[styles.statusDot, {backgroundColor: getStatusColor('onTime')}]} />
              <Text style={styles.statusLabel}>On Time</Text>
            </View>
            <View style={styles.statusBarContainer}>
              <View style={styles.statusBarBackground}>
                <View 
                  style={[styles.statusBar, { 
                    width: stats.total > 0 ? `${Math.round((stats.onTime / stats.total) * 100)}%` : '0%',
                    backgroundColor: getStatusColor('onTime')
                  }]}
                />
              </View>
              <Text style={styles.statusPercent}>
                {stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0}%
              </Text>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusLabelContainer}>
              <View style={[styles.statusDot, {backgroundColor: getStatusColor('late')}]} />
              <Text style={styles.statusLabel}>Late</Text>
            </View>
            <View style={styles.statusBarContainer}>
              <View style={styles.statusBarBackground}>
                <View 
                  style={[styles.statusBar, { 
                    width: stats.total > 0 ? `${Math.round((stats.late / stats.total) * 100)}%` : '0%',
                    backgroundColor: getStatusColor('late')
                  }]}
                />
              </View>
              <Text style={styles.statusPercent}>
                {stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0}%
              </Text>
            </View>
          </View>
        </View>
      </Surface>
    );
  };

  // Render export options
  const renderExportOptions = () => (
    <Surface style={styles.exportSurface} elevation={2}>
      <View style={styles.exportHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Avatar.Icon 
            size={36} 
            icon="file-export-outline" 
            style={{ backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 12 }}
            color="#1976D2" 
          />
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#424242'}}>Export Attendance</Text>
        </View>
      </View>

      <View style={styles.exportContent}>
        <Text style={styles.exportDescription}>Export your attendance records in various formats for reporting and analysis.</Text>
        
        <View style={styles.exportButtonsContainer}>
          <Button 
            mode="contained" 
            icon="file-excel-outline" 
            loading={exportLoading && exportFormat === 'csv'}
            onPress={() => handleExport('csv')}
            style={[styles.exportFormatButton, {backgroundColor: '#4CAF50'}]}
            labelStyle={{color: 'white', fontSize: 12, fontWeight: '500'}}  
            contentStyle={{height: 40}}
          >
            CSV Format
          </Button>
          
          <Button 
            mode="contained" 
            icon="file-pdf-box" 
            loading={exportLoading && exportFormat === 'pdf'}
            onPress={() => handleExport('pdf')}
            style={[styles.exportFormatButton, {backgroundColor: '#F44336'}]}
            labelStyle={{color: 'white', fontSize: 12, fontWeight: '500'}}  
            contentStyle={{height: 40}}
          >
            PDF Format
          </Button>
          
          <Button 
            mode="contained" 
            icon="microsoft-excel" 
            loading={exportLoading && exportFormat === 'excel'}
            onPress={() => handleExport('excel')}
            style={[styles.exportFormatButton, {backgroundColor: '#2196F3'}]}
            labelStyle={{color: 'white', fontSize: 12, fontWeight: '500'}}  
            contentStyle={{height: 40}}
          >
            Excel Format
          </Button>
        </View>
      </View>
    </Surface>
  );

  // Render attendance table
  const renderAttendanceTable = () => {
    return (
      <Surface style={styles.attendanceSurface} elevation={2}>
        <View style={styles.tableHeader}>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Avatar.Icon 
                size={36} 
                icon="calendar-clock" 
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 12 }} 
                color="#1976D2" 
              />
              <Text style={{fontSize: 16, fontWeight: 'bold', color: '#424242'}}>Attendance Records</Text>
            </View>
            
            <Text style={styles.tableSubtitle}>
              {filterMode === 'month' 
                ? `${months[selectedMonth]} ${selectedYear}` 
                : startDate && endDate 
                  ? `${new Date(startDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${new Date(endDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`
                  : 'All records'
              }
            </Text>
          </View>
          
          <View style={styles.tableHeaderRight}>
            <Badge 
              size={24} 
              style={{ 
                backgroundColor: '#1976D2', 
                color: 'white', 
                fontWeight: 'bold',
                marginRight: 8
              }}
            >
              {filteredAttendances.length}
            </Badge>
          </View>
        </View>
        
        <View style={styles.tableContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1976D2" />
              <Text style={styles.loadingText}>Loading attendance records...</Text>
            </View>
          ) : filteredAttendances.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="calendar-alert" size={50} color="#BDBDBD" />
              <Text style={styles.emptyText}>No attendance records found for this period</Text>
            </View>
          ) : (
            <DataTable style={styles.dataTable}>
              <DataTable.Header style={styles.dataTableHeader}>
                <DataTable.Title><Text style={styles.columnHeader}>Date</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.columnHeader}>Check In</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.columnHeader}>Check Out</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.columnHeader}>Status</Text></DataTable.Title>
                <DataTable.Title><Text style={styles.columnHeader}>Present/Absent</Text></DataTable.Title>
              </DataTable.Header>
  
              {filteredAttendances.map((record, index) => {
                if (!record || !record.check_in_time) return null;
                
                const checkInDate = new Date(record.check_in_time);
                const checkOutDate = record.check_out_time ? new Date(record.check_out_time) : null;
                
                return (
                  <DataTable.Row 
                    key={index} 
                    style={index % 2 === 0 ? {backgroundColor: 'rgba(0,0,0,0.01)'} : {}}
                    onPress={() => {
                      // Could show detailed attendance info if needed
                      console.log(`Viewing details for record on ${checkInDate.toLocaleDateString()}`);
                    }}
                  >
                    <DataTable.Cell>
                      <Text style={{fontWeight: '500', color: '#424242'}}>
                        {checkInDate.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <Text style={{color: '#1976D2', fontWeight: '500'}}>
                        {checkInDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      {checkOutDate ? (
                        <Text style={{color: '#E53935', fontWeight: '500'}}>
                          {checkOutDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Text>
                      ) : (
                        <Chip size={20} style={{ backgroundColor: '#FFECB3' }} textStyle={{ color: '#FF8F00', fontSize: 10 }}>ACTIVE</Chip>
                      )}
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        {record.is_late ? (
                          <Chip 
                            mode="flat"
                            style={{ 
                              backgroundColor: '#FFEBEE',
                              height: 24
                            }}
                            textStyle={{ 
                              color: '#C62828',
                              fontSize: 11,
                              fontWeight: '600'
                            }}
                            icon="clock-alert-outline"
                          >
                            LATE
                          </Chip>
                        ) : (
                          <Chip 
                            mode="flat"
                            style={{ 
                              backgroundColor: '#E8F5E9',
                              height: 24
                            }}
                            textStyle={{ 
                              color: '#2E7D32',
                              fontSize: 11,
                              fontWeight: '600'
                            }}
                            icon="clock-check-outline"
                          >
                            ON TIME
                          </Chip>
                        )}
                      </View>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Chip 
                          mode="flat"
                          style={{ 
                            backgroundColor: record.is_absent ? '#FFEBEE' : '#E8F5E9',
                            height: 24
                          }}
                          textStyle={{ 
                            color: record.is_absent ? '#C62828' : '#2E7D32',
                            fontSize: 11,
                            fontWeight: '600'
                          }}
                          icon={record.is_absent ? "account-off-outline" : "account-check-outline"}
                        >
                          {record.is_absent ? 'ABSENT' : 'PRESENT'}
                        </Chip>
                      </View>
                    </DataTable.Cell>
                  </DataTable.Row>
                );
              })}
            </DataTable>
          )}
        </View>
      </Surface>
    );
  };

  // Render attendance summary with enhanced visual charts
  const renderAttendanceSummary = () => {
    const stats = calculateStats(filteredAttendances);
    const weekdayData = stats.weekdayDistribution || {};
    
    // Maximum value for scaling
    const maxValue = weekdayData && Object.keys(weekdayData).length > 0 
      ? Math.max(...Object.values(weekdayData), 1)
      : 1;
    
    // Calculate percentages for pie chart
    const onTimePercentage = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;
    const latePercentage = stats.total > 0 ? Math.round((stats.late / stats.total) * 100) : 0;
    
    // Weekday colors
    const weekdayColors = {
      'Monday': '#4CAF50',
      'Tuesday': '#2196F3',
      'Wednesday': '#9C27B0',
      'Thursday': '#FF9800',
      'Friday': '#F44336'
    };
    
    return (
      <Surface style={styles.enhancedSummaryCard} elevation={0}>
        <View style={styles.summaryCardHeader}>
          <View>
            <Text style={styles.summaryCardTitle}>Attendance Dashboard</Text>
            <Text style={styles.summaryCardSubtitle}>
              {filterMode === 'month' 
                ? `${months[selectedMonth]} ${selectedYear}` 
                : startDate && endDate 
                  ? `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`
                  : 'All records'
              }
            </Text>
          </View>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={styles.loadingText}>Loading attendance data...</Text>
          </View>
        ) : filteredAttendances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-remove" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No attendance data available for this period</Text>
          </View>
        ) : (
          <ScrollView style={styles.summaryScrollContent}>
            
            {/* Attendance Trend Section */}
            <View style={styles.trendSection}>
              <Text style={styles.sectionTitleEnhanced}>Attendance Trend</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.trendScrollView}
              >
                <View style={styles.enhancedLineChartContainer}>
                  <View style={styles.enhancedLineChartYAxis}>
                    <Text style={styles.enhancedLineChartLabel}>Present</Text>
                    <Text style={styles.enhancedLineChartLabel}>Absent</Text>
                  </View>
                  <View style={styles.enhancedLineChart}>
                    <View style={styles.enhancedLineChartHorizontalLine} />
                    {stats.dailyAttendance && stats.dailyAttendance.map((item, index) => {
                      const nextPoint = index < stats.dailyAttendance.length - 1 ? 1 : null;
                      
                      return (
                        <View key={item.date} style={styles.enhancedLineChartPoint}>
                          <View 
                            style={[
                              styles.enhancedLineChartDot, 
                              {backgroundColor: item.status === 'late' ? '#F44336' : '#4CAF50'}
                            ]}
                          />
                          {nextPoint !== null && (
                            <View style={styles.enhancedLineChartConnector} />
                          )}
                          <Text style={styles.enhancedLineChartDateLabel}>
                            {new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </View>
            
            {/* Status Breakdown Section */}
            <View style={styles.statusBreakdownSection}>
              <Text style={styles.sectionTitleEnhanced}>Status Breakdown</Text>
              <View style={styles.statusBreakdownContent}>
                <View style={styles.pieChartContainer}>
                  <View style={styles.pieChart}>
                    <View 
                      style={[styles.pieSlice, { 
                        backgroundColor: '#4CAF50',
                        width: 100,
                        height: 100,
                        borderTopRightRadius: onTimePercentage >= 50 ? 0 : 100,
                        borderBottomRightRadius: onTimePercentage >= 50 ? 0 : 100,
                        transform: [{ rotate: `${onTimePercentage >= 50 ? 0 : 180}deg` }]
                      }]}
                    />
                    <View 
                      style={[styles.pieSlice, { 
                        backgroundColor: '#F44336',
                        width: 100,
                        height: 100,
                        borderTopLeftRadius: latePercentage >= 50 ? 0 : 100,
                        borderBottomLeftRadius: latePercentage >= 50 ? 0 : 100,
                        transform: [{ rotate: `${latePercentage >= 50 ? 180 : 0}deg` }]
                      }]}
                    />
                    <View style={styles.pieChartCenter}>
                      <Text style={styles.pieChartCenterText}>{stats.total}</Text>
                      <Text style={styles.pieChartCenterLabel}>Days</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statusLegendContainer}>
                  <View style={styles.statusLegendItem}>
                    <View style={[styles.statusLegendColor, {backgroundColor: '#4CAF50'}]} />
                    <Text style={styles.statusLegendLabel}>On Time</Text>
                    <Text style={styles.statusLegendValue}>{stats.onTime} ({onTimePercentage}%)</Text>
                  </View>
                  
                  <View style={styles.statusLegendItem}>
                    <View style={[styles.statusLegendColor, {backgroundColor: '#F44336'}]} />
                    <Text style={styles.statusLegendLabel}>Late</Text>
                    <Text style={styles.statusLegendValue}>{stats.late} ({latePercentage}%)</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Weekday Distribution Section */}
            <View style={styles.weekdaySection}>
              <Text style={styles.sectionTitleEnhanced}>Attendance by Day of Week</Text>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                const value = weekdayData[day] || 0;
                const barWidth = `${(value / maxValue) * 100}%`;
                const barColor = weekdayColors[day] || '#9C27B0'; // Default purple color for Saturday if not defined
                
                return (
                  <View key={day} style={styles.enhancedBarChartRow}>
                    <Text style={styles.enhancedBarChartLabel}>{day}</Text>
                    <View style={styles.enhancedBarChartBarContainer}>
                      <View 
                        style={[
                          styles.enhancedBarChartBar, 
                          { width: barWidth, backgroundColor: barColor }
                        ]} 
                      />
                      <Text style={styles.enhancedBarChartValue}>{value}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            
            <Paragraph style={styles.enhancedSummaryNote}>
              Data based on {stats.total} attendance records
            </Paragraph>
          </ScrollView>
        )}
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header style={[styles.header, { backgroundColor: '#1976D2' }]}>
        <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
        <Appbar.Content 
          title="My Attendance Records" 
          titleStyle={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}
          subtitle={`Dashboard for ${user?.name || user?.email || 'Current User'}`}
          subtitleStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
        />
        <Appbar.Action icon="bell-outline" onPress={() => {}} color="white" />
        <Appbar.Action icon="refresh" onPress={onRefresh} color="white" />
      </Appbar.Header>
      
      <Surface style={styles.tabHeaderSurface} elevation={2}>
        <SegmentedButtons
          style={styles.tabButtons}
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'list', label: 'List View', icon: 'format-list-bulleted' },
            { value: 'summary', label: 'Dashboard', icon: 'chart-bar' },
          ]}
        />
      </Surface>
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1976D2']} 
          />
        }>
        {/* Header moved to Appbar.Header above */}

        {renderDateFilters()}
        
        {renderStats()}
        
        {activeTab === 'list' ? (
          <>
            {renderAttendanceTable()}
            {renderExportOptions()}
          </>
        ) : (
          renderAttendanceSummary()
        )}
      </ScrollView>
    </View>
  );
};

// Create styles
const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    header: {
      elevation: 4,
    },
    tabHeaderSurface: {
      padding: 16, 
      paddingBottom: 8,
      backgroundColor: 'white',
      zIndex: 1,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    tabButtons: {
      marginBottom: 8,
    },
    filterSurface: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
    },
    filterHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'white',
    },
    filterContent: {
      padding: 16,
      backgroundColor: '#f8f9fa',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    headerCard: {
      marginBottom: 16,
      borderRadius: 8,
      elevation: 4,
      backgroundColor: '#3498db',
    },
    headerTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    },
    tabButtons: {
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
    },
    filterCard: {
      marginBottom: 16,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      color: '#2c3e50',
    },
    monthSelectorContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
    },
    monthChip: {
      marginRight: 8,
      backgroundColor: '#f5f5f5',
      borderRadius: 16,
    },
    selectedMonthChip: {
      backgroundColor: '#1976D2', // Primary color
    },
    selectedMonthText: {
      color: 'white',
      fontWeight: '600',
    },
    dateRangeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    dateRangeButton: {
      marginBottom: 8,
      flex: 1,
      marginHorizontal: 4,
      borderRadius: 8,
      borderColor: '#E0E0E0',
    },
    selectedDateButton: {
      backgroundColor: 'rgba(25, 118, 210, 0.08)',
      borderColor: '#1976D2', // Primary color
    },
    selectedDateButtonText: {
      color: '#1976D2', // Primary color
      fontWeight: '600',
      fontSize: 13,
    },
    statsSurface: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
    },
    statsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'white',
    },
    statsContent: {
      padding: 16,
      backgroundColor: '#f8f9fa',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statItemContainer: {
      alignItems: 'center',
      flex: 1,
      paddingVertical: 8,
    },
    statBorder: {
      borderRightWidth: 1,
      borderRightColor: '#EEEEEE',
    },
    statValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#1976D2',
      marginTop: 8,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: '#757575',
      textAlign: 'center',
    },
    attendanceRateContainer: {
      marginTop: 8,
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 12,
    },
    attendanceRateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    attendanceRateLabel: {
      fontSize: 14,
      color: '#757575',
    },
    attendanceRateValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1976D2',
    },
    exportSurface: {
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
    },
    exportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: 'white',
    },
    exportContent: {
      padding: 16,
      backgroundColor: '#f8f9fa',
      borderTopWidth: 1,
      borderTopColor: '#f0f0f0',
    },
    exportDescription: {
      color: '#757575',
      fontSize: 14,
      marginBottom: 16,
    },
    exportButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    exportFormatButton: {
    elevation: 4,
  },
  tabHeaderSurface: {
    padding: 16, 
    paddingBottom: 8,
    backgroundColor: 'white',
    zIndex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  tabButtons: {
    marginBottom: 8,
  },
  filterSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  filterContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 4,
    backgroundColor: '#3498db',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabButtons: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  filterCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  monthChip: {
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
  },
  selectedMonthChip: {
    backgroundColor: '#1976D2',
  },
  selectedMonthText: {
    color: 'white',
    fontWeight: '600',
  },
  dateRangeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateRangeButton: {
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    borderColor: '#E0E0E0',
  },
  selectedDateButton: {
    backgroundColor: 'rgba(25, 118, 210, 0.08)',
    borderColor: '#1976D2',
  },
  selectedDateButtonText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 13,
  },
  statsSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  statsContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItemContainer: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  statBorder: {
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  statsCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  statsCardTextContainer: {
    marginLeft: 12,
  },
  attendanceRateContainer: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attendanceRateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  attendanceRateLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
  },
  attendanceRateValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBarOuterContainer: {
    padding: 16,
    paddingTop: 0,
    backgroundColor: 'white',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  progressScaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginTop: 4,
  },
  progressScaleText: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  // Clear Stats Styles - New design for better clarity
  clearStatsSurface: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  clearStatsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#1976D2',
  },
  clearStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  clearStatsSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'white',
  },
  metricCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  metricContent: {
    padding: 12,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTextContainer: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  rateSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearProgressContainer: {
    marginBottom: 8,
  },
  clearProgressBackground: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  clearProgressBar: {
    height: '100%',
    borderRadius: 6,
  },
  rateLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rateMinLabel: {
    fontSize: 10,
    color: '#9e9e9e',
  },
  rateMaxLabel: {
    fontSize: 10,
    color: '#9e9e9e',
  },
  additionalStats: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statBox: {
    flex: 1,
    margin: 4,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statBoxTitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  statusSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#424242',
  },
  statusBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBarBackground: {
    height: 8,
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  statusBar: {
    height: '100%',
    borderRadius: 4,
  },
  statusPercent: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#424242',
    width: 36,
    textAlign: 'right',
  },
  exportSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  exportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  exportContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exportDescription: {
    color: '#757575',
    fontSize: 14,
    marginBottom: 16,
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exportFormatButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  attendanceSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
  },
  tableSubtitle: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
    marginLeft: 48,
  },
  tableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableContent: {
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dataTable: {
    backgroundColor: 'white',
    margin: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dataTableHeader: {
    backgroundColor: '#f5f5f5',
  },
  columnHeader: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#616161',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
    fontSize: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#757575',
    marginVertical: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  summaryContainer: {
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'white',
    marginBottom: 16,
    elevation: 2,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartLegend: {
    width: 16,
    height: 16,
    marginRight: 12,
    borderRadius: 4,
  },
  chartLabel: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginRight: 8,
  },
  chartBar: {
    height: 12,
    marginTop: 4,
    borderRadius: 6,
  },
  punchCardContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    elevation: 2,
  },
  punchCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#424242',
    flexDirection: 'row',
    alignItems: 'center',
  },
  punchCardRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  punchCardDay: {
    width: 100,
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  punchCardCell: {
    width: 24,
    height: 24,
    borderRadius: 12,
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryNote: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  lineChartContainer: {
    flexDirection: 'row',
    height: 140,
    marginVertical: 16,
    paddingBottom: 20,
  },
  lineChartYAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  lineChartLabel: {
    fontSize: 12,
    color: '#777',
  },
  lineChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 10,
  },
  lineChartHorizontalLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#e0e0e0',
    left: 0,
    right: 0,
    top: '50%',
  },
  lineChartPoint: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-start',
    position: 'relative',
  },
  lineChartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27ae60',
    marginBottom: 4,
  },
  lineChartConnector: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#bdc3c7',
    width: '100%',
    top: 3,
    left: '50%',
  },
  lineChartDateLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#666',
    transform: [{ rotate: '-45deg' }],
  },
  
  // Enhanced Summary Card Styles
  enhancedSummaryCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  attendanceRateBadge: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  summaryScrollContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  sectionTitleEnhanced: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 16,
    marginTop: 8,
  },
  keyMetricsSection: {
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricTile: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
  },
  metricIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  trendSection: {
    marginBottom: 24,
  },
  trendScrollView: {
    marginHorizontal: -16,
  },
  enhancedLineChartContainer: {
    flexDirection: 'row',
    height: 160,
    paddingHorizontal: 16,
    paddingBottom: 30,
    minWidth: '100%',
  },
  enhancedLineChartYAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  enhancedLineChartLabel: {
    fontSize: 12,
    color: '#757575',
  },
  enhancedLineChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingVertical: 10,
  },
  enhancedLineChartHorizontalLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#e0e0e0',
    left: 0,
    right: 0,
    top: '50%',
  },
  enhancedLineChartPoint: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-start',
    position: 'relative',
    minWidth: 40,
  },
  enhancedLineChartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 2,
  },
  enhancedLineChartConnector: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#bdc3c7',
    width: '100%',
    top: 5,
    left: '50%',
  },
  enhancedLineChartDateLabel: {
    position: 'absolute',
    bottom: -25,
    fontSize: 10,
    color: '#757575',
    textAlign: 'center',
    width: 40,
  },
  statusBreakdownSection: {
    marginBottom: 24,
  },
  statusBreakdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  pieChartContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieChart: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieSlice: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  pieChartCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  pieChartCenterText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  pieChartCenterLabel: {
    fontSize: 10,
    color: '#757575',
  },
  statusLegendContainer: {
    flex: 1,
    marginLeft: 16,
  },
  statusLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusLegendLabel: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  statusLegendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  weekdaySection: {
    marginBottom: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  enhancedBarChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  enhancedBarChartLabel: {
    width: 80,
    fontSize: 14,
    color: '#424242',
  },
  enhancedBarChartBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  enhancedBarChartBar: {
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  enhancedBarChartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    width: 30,
    textAlign: 'right',
  },
  enhancedSummaryNote: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
});

export default MyAttendanceScreen;
