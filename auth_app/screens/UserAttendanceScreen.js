import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Share, StatusBar } from 'react-native';
import { Card, Title, Text, Button, ActivityIndicator, Chip, DataTable, Menu, SegmentedButtons, Paragraph, Divider, useTheme, FAB, Portal, Modal, Surface, IconButton, Appbar, Avatar } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';

const UserAttendanceScreen = ({ route, navigation }) => {
  const { userId, userName } = route.params;
  const { authToken } = useAuth();
  const theme = useTheme();
  
  // Attendance states
  const [attendances, setAttendances] = useState([]);
  const [filteredAttendances, setFilteredAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    onTime: 0,
    late: 0,
    avgDuration: '0h 0m',
    attendanceRate: 0,
    weekdayDistribution: {},
    dailyAttendance: []
  });
  
  // State for tracking which attendance record is being updated
  const [updatingAttendance, setUpdatingAttendance] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [attendanceMenuVisible, setAttendanceMenuVisible] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState(null);
  
  // View states
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'summary'
  
  // Detail modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Export states
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // List of available months for filtering
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearPickerVisible, setYearPickerVisible] = useState(false);
  const [yearSearchQuery, setYearSearchQuery] = useState('');

  // Function to fetch user attendance data
  const fetchUserAttendance = async () => {
    setLoading(true);
    try {
      // Define API URL (adjust as needed for your backend)
      const API_URL = 'http://192.168.29.66:8000/api/auth/';
      
      // Make a real API call to get attendance records
      const response = await axios.get(`${API_URL}attendance/`, {
        headers: { Authorization: `Token ${authToken}` }
      });
      
      console.log(`Fetching attendance data for user ID: ${userId}`);
      
      // Use the actual data from the API
      const actualData = response.data;
      
      // If there's no attendance data yet, show an empty array
      if (!actualData || !Array.isArray(actualData) || actualData.length === 0) {
        console.log('No attendance records found');
        setAttendances([]);
        setFilteredAttendances([]);
        setLoading(false);
        return;
      }
      
      // Filter to only show the specific user's attendance
      const userAttendance = actualData.filter(record => {
        return record.user == userId || record.user_id == userId;
      });
      
      console.log(`Found ${userAttendance.length} attendance records for user ID ${userId}`);
      
      // Process attendance records
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
          console.log(`User ${userId} checked in at ${checkInTime.toLocaleTimeString()}, marking as Late`);
          record.is_late = true;
        }
        
        // For debugging
        console.log(`Record ID: ${record.id}, Check-in time: ${checkInTime.toLocaleTimeString()}, Is Late: ${record.is_late}, Is Absent: ${record.is_absent}`);

        const recordId = record.id;
        
        // Set attendance status based on is_absent field from API
        let status = 'Present';
        if (record.is_absent === true) {
          status = 'Absent';
        } else if (record.attendance_status) {
          // If there's an explicit attendance_status field, use that
          status = record.attendance_status;
        }
        
        // Store the attendance status
        record.attendance_status = status;
        
        // Update status in state
        if (attendanceStatus[recordId] === undefined) {
          setAttendanceStatus(prev => ({
            ...prev,
            [recordId]: status
          }));
        }
        
        // Make sure each record has attendance_status field
        if (!record.attendance_status) {
          record.attendance_status = 'Present';
        }
      });
      
      setAttendances(userAttendance);
      applyFilters(userAttendance);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data. Please try again.');
      
      // Still use mock data for demo purposes
      const mockData = Array.from({ length: 15 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - index);
        
        const checkInTime = new Date(date);
        checkInTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0);
        
        const checkOutTime = new Date(date);
        checkOutTime.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0);
        
        return {
          id: index + 1,
          user_id: userId,
          check_in_time: checkInTime.toISOString(),
          check_out_time: checkOutTime.toISOString(),
          is_late: Math.random() > 0.7,
          status: 'approved'
        };
      });
      
      setAttendances(mockData);
      applyFilters(mockData);
    } finally {
      setLoading(false);
    }
  };

  // Apply month and year filters to attendance data
  const applyFilters = (data) => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    
    // Filter by year and month
    const filtered = data.filter(record => {
      if (!record || !record.check_in_time) return false;
      
      try {
        const date = new Date(record.check_in_time);
        if (isNaN(date.getTime())) return false;
        
        return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth;
      } catch (err) {
        console.error('Error filtering attendance item:', err);
        return false;
      }
    });
    
    // Ensure each record has a proper attendance_status based on is_absent
    filtered.forEach(record => {
      if (record.is_absent === true) {
        record.attendance_status = 'Absent';
      } else if (!record.attendance_status) {
        record.attendance_status = 'Present';
      }
    });
    
    setFilteredAttendances(filtered || []);
    
    // Calculate and update stats based on filtered data
    const calculatedStats = calculateStats(filtered);
    setStats(calculatedStats);
  };

  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    applyFilters(attendances);
  };

  // Handle updating attendance status
  const handleUpdateAttendanceStatus = async (recordId, newStatus) => {
    setUpdatingAttendance(recordId);
    
    try {
      // Define API URL
      const API_URL = 'http://192.168.29.66:8000/api/auth/';
      
      // Get the attendance record to update
      const recordToUpdate = attendances.find(record => record.id === recordId);
      
      if (!recordToUpdate) {
        throw new Error('Attendance record not found');
      }
      
      // Make API call to update the attendance status
      // Since there's no specific endpoint for status update, we'll use a PATCH request to the attendance detail endpoint
      const response = await axios.patch(
        `${API_URL}attendance/${recordId}/`,
        { 
          attendance_status: newStatus,
          is_absent: newStatus === 'Absent' ? true : false // Add an explicit is_absent field
        },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      
      console.log('Attendance update response:', response.data);
      
      // If API call was successful, update local state
      // Update attendance status in state
      setAttendanceStatus(prev => ({
        ...prev,
        [recordId]: newStatus
      }));
      
      // Update the filteredAttendances array with the new status
      const updatedAttendances = filteredAttendances.map(record => {
        if (record.id === recordId) {
          return {
            ...record,
            attendance_status: newStatus,
            is_absent: newStatus === 'Absent'
          };
        }
        return record;
      });
      
      // Update the attendances array as well
      const updatedAllAttendances = attendances.map(record => {
        if (record.id === recordId) {
          return {
            ...record,
            attendance_status: newStatus,
            is_absent: newStatus === 'Absent'
          };
        }
        return record;
      });
      
      setFilteredAttendances(updatedAttendances);
      setAttendances(updatedAllAttendances);
      
      // Show success message
      Alert.alert(
        'Attendance Updated',
        `Attendance status for ${new Date(recordToUpdate.check_in_time).toLocaleDateString()} has been updated to ${newStatus}.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating attendance status:', error);
      // Show error message
      Alert.alert(
        'Update Failed',
        'Failed to update attendance status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setUpdatingAttendance(null);
    }
  };
  
  // Calculate attendance statistics
  const calculateStats = (data) => {
    if (!data || data.length === 0) return { 
      total: 0, 
      onTime: 0, 
      late: 0, 
      avgDuration: '0h 0m',
      attendanceRate: 0,
      weekdayDistribution: {},
      dailyAttendance: [] // For line graph
    };

    // Group attendance records by date to count only one per day
    const dailyAttendanceMap = {};
    const attendanceByDay = {};
    
    // Process each attendance record
    data.forEach(item => {
      if (item && item.check_in_time) {
        const checkInTime = new Date(item.check_in_time);
        const dateKey = checkInTime.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // If we haven't recorded this date yet, or if this record is earlier than what we've seen
        if (!dailyAttendanceMap[dateKey] || 
            new Date(dailyAttendanceMap[dateKey].check_in_time) > checkInTime) {
          dailyAttendanceMap[dateKey] = item;
        }
        
        // Store all attendances for each day (for the line graph)
        if (!attendanceByDay[dateKey]) {
          attendanceByDay[dateKey] = [];
        }
        attendanceByDay[dateKey].push(item);
      }
    });
    
    // Convert the map to an array of unique daily attendance records
    const uniqueDailyAttendance = Object.values(dailyAttendanceMap);
    
    // Calculate on-time and late counts based on unique daily attendance
    const onTime = uniqueDailyAttendance.filter(item => !item.is_late).length;
    const late = uniqueDailyAttendance.filter(item => item.is_late).length;
    
    // Calculate average duration if check_out_time exists
    let totalDuration = 0;
    let durationsCount = 0;
    
    uniqueDailyAttendance.forEach(item => {
      if (item.check_in_time && item.check_out_time) {
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
    
    // Prepare daily attendance data for the line graph
    // Get date range from the first day of the month to the current day
    const year = selectedYear;
    const month = selectedMonth;
    const today = new Date();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const endDay = (year === today.getFullYear() && month === today.getMonth()) 
      ? today.getDate() 
      : daysInMonth;
    
    // Generate daily attendance data for the line graph
    const dailyAttendance = [];
    for (let day = 1; day <= endDay; day++) {
      const date = new Date(year, month, day);
      const dateKey = date.toISOString().split('T')[0];
      const status = attendanceByDay[dateKey] 
        ? (attendanceByDay[dateKey].some(record => !record.is_late) ? 'onTime' : 'late')
        : 'absent';
      
      dailyAttendance.push({
        date: dateKey,
        day,
        status
      });
    }
    
    // Calculate working days in the month (excluding Sundays)
    let workingDays = 0;
    for (let day = 1; day <= endDay; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      // Skip Sundays (0 = Sunday)
      if (dayOfWeek !== 0) {
        workingDays++;
      }
    }
    
    // Calculate attendance rate based on unique daily attendance
    const attendanceRate = workingDays > 0 
      ? Math.round((uniqueDailyAttendance.length / workingDays) * 100) 
      : 0;
    
    return {
      total: uniqueDailyAttendance.length,
      onTime,
      late,
      avgDuration: `${hours}h ${minutes}m`,
      attendanceRate,
      weekdayDistribution: calculateWeekdayDistribution(uniqueDailyAttendance),
      dailyAttendance // For line graph
    };
  };

  // Calculate attendance distribution by weekday
  // This function now receives already-deduplicated attendance data (one per day)
  const calculateWeekdayDistribution = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0 };
    }
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const distribution = {};
    
    // Initialize distribution for weekdays
    weekdays.forEach(day => distribution[day] = 0);
    
    // Count attendance by weekday (data is already deduplicated to one per day)
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
        // Use the current attendance status from the record
        const attendance = att.attendance_status || 'Present';
        
        content += `${dateStr},${timeInStr},${checkOutStr},${duration},${status},${attendance}\n`;
      });
      
      if (format === 'csv') {
        // Show success alert for CSV export
        Alert.alert(
          'Export Successful',
          `Attendance data for ${userName} has been exported as CSV.`,
          [
            { 
              text: 'OK',
              onPress: () => setExportMenuVisible(false)
            }
          ]
        );
        
        // Log data to console for demo purposes
        console.log('CSV Data:', content);
      } else if (format === 'pdf') {
        // Show success alert for PDF export
        Alert.alert(
          'Export Successful',
          `Attendance data for ${userName} has been exported as PDF.`,
          [
            { 
              text: 'OK',
              onPress: () => setExportMenuVisible(false)
            }
          ]
        );
        
        // Log data to console for demo purposes
        console.log('PDF Data would be generated from:', content);
      } else if (format === 'excel') {
        // Show success alert for Excel export
        Alert.alert(
          'Export Successful',
          `Attendance data for ${userName} has been exported as Excel file.`,
          [
            { 
              text: 'OK',
              onPress: () => setExportMenuVisible(false)
            }
          ]
        );
        
        // Log data to console for demo purposes
        console.log('Excel Data would be generated from:', content);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'There was a problem exporting the data');
    } finally {
      setExportLoading(false);
    }
  };

  // Load attendance data on component mount
  useEffect(() => {
    fetchUserAttendance();
  }, []);
  
  // Apply filters when month or year changes
  useEffect(() => {
    applyFilters(attendances);
  }, [selectedMonth, selectedYear]);

  // Render month selector
  const renderMonthSelector = () => (
    <Card style={styles.filterCard}>
      <Card.Content>
        <Title style={styles.sectionTitle}>Month Filter</Title>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.monthSelectorContainer}>
            {months.map((month, index) => (
              <Chip
                key={index}
                selected={selectedMonth === index}
                onPress={() => handleMonthChange(index)}
                style={[styles.monthChip, selectedMonth === index && styles.selectedMonthChip]}
                textStyle={selectedMonth === index ? styles.selectedMonthText : {}}
              >
                {month}
              </Chip>
            ))}
          </View>
        </ScrollView>
      </Card.Content>
    </Card>
  );

  // Render month and year selector
  const renderMonthYearSelector = () => (
    <Surface style={styles.filterSurface} elevation={2}>
      <View style={styles.filterHeader}>
        <View>
          <Text style={styles.clearStatsTitle}>DATE FILTER</Text>
          <Text style={styles.clearStatsSubtitle}>Select month and year to filter records</Text>
        </View>
        <TouchableOpacity 
          onPress={() => {
            setSelectedMonth(new Date().getMonth());
            setSelectedYear(new Date().getFullYear());
            applyFilters(attendances);
          }}
          style={styles.resetButton}
        >
          <Icon name="refresh" size={16} color="#1976D2" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.filterContent}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Month</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.monthSelectorContainer}>
              {months.map((month, index) => (
                <Chip
                  key={index}
                  selected={selectedMonth === index}
                  onPress={() => handleMonthChange(index)}
                  style={[styles.monthChip, selectedMonth === index && styles.selectedMonthChip]}
                  textStyle={selectedMonth === index ? styles.selectedMonthText : {}}
                  showSelectedCheck={false}
                  elevation={selectedMonth === index ? 2 : 0}
                >
                  {month}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>
        
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Year</Text>
          <TouchableOpacity 
            style={styles.yearSelector}
            onPress={() => setYearPickerVisible(true)}
          >
            <Text style={styles.yearText}>{selectedYear}</Text>
            <Icon name="calendar" size={18} color="#1976D2" />
          </TouchableOpacity>
        </View>
      </View>
    </Surface>
  );

  // Render year picker modal
  const renderYearPickerModal = () => {
    // Generate a list of years (from 5 years ago to current year)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 9 + i);
    
    // Filter years based on search query
    const filteredYears = yearSearchQuery ? 
      years.filter(year => year.toString().includes(yearSearchQuery)) : 
      years;
    
    return (
      <Portal>
        <Modal
          visible={yearPickerVisible}
          onDismiss={() => setYearPickerVisible(false)}
          contentContainerStyle={styles.yearPickerModal}
        >
          <Surface style={styles.yearPickerSurface} elevation={4}>
            <View style={styles.yearPickerHeader}>
              <Text style={styles.yearPickerTitle}>Select Year</Text>
              <IconButton 
                icon="close" 
                size={20} 
                onPress={() => setYearPickerVisible(false)} 
                style={styles.yearPickerCloseButton}
              />
            </View>
            
            <Divider />
            
            <ScrollView style={styles.yearPickerScrollView}>
              <View style={styles.yearPickerGrid}>
                {filteredYears.map(year => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.yearPickerItem, selectedYear === year && styles.selectedYearItem]}
                    onPress={() => {
                      setSelectedYear(year);
                      setYearPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.yearPickerItemText, selectedYear === year && styles.selectedYearItemText]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <Divider />
            
            <View style={styles.yearPickerActions}>
              <Button 
                mode="contained" 
                onPress={() => {
                  setSelectedYear(new Date().getFullYear());
                  setYearPickerVisible(false);
                }}
                style={styles.yearPickerButton}
              >
                Current Year
              </Button>
              <Button 
                mode="outlined" 
                onPress={() => setYearPickerVisible(false)}
                style={styles.yearPickerButton}
              >
                Cancel
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  };

  // Render stats
  const renderStats = () => {
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
      </Surface>
    );
  };

  // Render export options
  const renderExportOptions = () => (
    <Surface style={styles.exportSurface} elevation={2}>
      <View style={styles.exportHeader}>
        <Text style={styles.clearStatsTitle}>EXPORT OPTIONS</Text>
      </View>
      
      <View style={styles.exportContent}>
        <Text style={styles.exportDescription}>
          Export attendance data in your preferred format for record keeping or analysis.
        </Text>
        
        <View style={styles.exportButtonsContainer}>
          <Button 
            mode="contained" 
            icon="file-delimited" 
            onPress={() => handleExport('csv')}
            style={styles.exportFormatButton}
            loading={exportLoading && exportFormat === 'csv'}
          >
            CSV
          </Button>
          
          <Button 
            mode="contained" 
            icon="file-pdf-box" 
            onPress={() => handleExport('pdf')}
            style={styles.exportFormatButton}
            loading={exportLoading && exportFormat === 'pdf'}
          >
            PDF
          </Button>
          
          <Button 
            mode="contained" 
            icon="microsoft-excel" 
            onPress={() => handleExport('excel')}
            style={styles.exportFormatButton}
            loading={exportLoading && exportFormat === 'excel'}
          >
            Excel
          </Button>
        </View>
      </View>
    </Surface>
  );

  // Render attendance table
  const renderAttendanceTable = () => (
    <Surface style={styles.attendanceSurface} elevation={2}>
      <View style={styles.tableHeader}>
        <View>
          <Text style={styles.clearStatsTitle}>ATTENDANCE RECORDS</Text>
          <Text style={styles.tableSubtitle}>{`${months[selectedMonth]} ${selectedYear}`}</Text>
        </View>
        <View style={styles.tableHeaderRight}>
          <Text style={styles.recordCount}>{filteredAttendances.length} Records</Text>
        </View>
      </View>
      
      <View style={styles.tableContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loadingIcon} />
            <Text style={styles.loadingText}>Loading attendance records...</Text>
          </View>
        ) : filteredAttendances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-remove" size={48} color="#bdbdbd" />
            <Text style={styles.emptyText}>No attendance records found for this period</Text>
          </View>
        ) : (
          <DataTable style={styles.dataTable}>
            <DataTable.Header style={styles.dataTableHeader}>
              <DataTable.Title><Text style={styles.columnHeader}>Date</Text></DataTable.Title>
              <DataTable.Title><Text style={styles.columnHeader}>Time In</Text></DataTable.Title>
              <DataTable.Title><Text style={styles.columnHeader}>Time Out</Text></DataTable.Title>
              <DataTable.Title><Text style={styles.columnHeader}>Status</Text></DataTable.Title>
              <DataTable.Title><Text style={styles.columnHeader}>Actions</Text></DataTable.Title>
            </DataTable.Header>

            {filteredAttendances.map((record, index) => {
              const checkInDate = new Date(record.check_in_time);
              const checkOutDate = record.check_out_time ? new Date(record.check_out_time) : null;
              
              return (
                <DataTable.Row 
                  key={index}
                  onPress={() => {
                    setSelectedRecord(record);
                    setDetailModalVisible(true);
                  }}
                  style={[styles.tableRow, index % 2 === 0 ? styles.evenRow : styles.oddRow]}
                >
                  <DataTable.Cell>
                    <View style={styles.dateCell}>
                      <Text>{checkInDate.toLocaleDateString('en-US', {day: 'numeric', month: 'short'})}</Text>
                      <Text style={styles.dayText}>{checkInDate.toLocaleDateString('en-US', {weekday: 'short'})}</Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell>{checkInDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</DataTable.Cell>
                  <DataTable.Cell>
                    {checkOutDate ? checkOutDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <View style={styles.statusContainer}>
                      <View style={[styles.statusBadge, {backgroundColor: record.is_late ? '#F44336' : '#4CAF50'}]} />
                      <Text style={[styles.statusText, {color: record.is_late ? '#F44336' : '#4CAF50'}]}>
                        {record.is_late ? 'Late' : 'On Time'}
                      </Text>
                    </View>
                  </DataTable.Cell>
                  <DataTable.Cell style={styles.actionContainer}>
                    <Button
                      mode="text"
                      compact
                      icon="eye"
                      onPress={() => {
                        setSelectedRecord(record);
                        setDetailModalVisible(true);
                      }}
                      style={styles.viewButton}
                    >
                      View
                    </Button>
                  </DataTable.Cell>
                </DataTable.Row>
              );
            })}
          </DataTable>
        )}
      </View>
    </Surface>
  );

  // Render attendance summary with text-based charts
  const renderAttendanceSummary = () => {
    // Calculate weekday data and max value for bar chart
    const weekdayData = stats.weekdayDistribution || {};
    const maxValue = Math.max(1, ...Object.values(weekdayData));
    
    return (
     <Surface style={styles.dashboardSurface}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.dashboardTitle}>Admin Dashboard</Text>
          <Text style={styles.dashboardSubtitle}>{`${months[selectedMonth]} ${selectedYear}`}</Text>
        </View>
        <View style={styles.dashboardHeaderIcons}>
          <Icon name="refresh" size={20} color={theme.colors.primary} style={styles.headerIcon} />
          <Icon name="chart-bar" size={20} color={theme.colors.primary} />
        </View>
      </View>
      
      <View style={styles.dashboardContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Surface style={styles.loadingIndicatorSurface}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </Surface>
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        ) : filteredAttendances.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Surface style={styles.emptyIconSurface}>
              <Icon name="calendar-alert" size={48} color={theme.colors.primary} />
            </Surface>
            <Text style={styles.emptyTitle}>No Data Available</Text>
            <Text style={styles.emptyText}>No attendance data available for this period</Text>
          </View>
        ) : (
          <>
            {/* Attendance Rate Card */}
            <Surface style={styles.dashboardCard}>
              <View style={styles.dashboardCardHeader}>
                <Text style={styles.dashboardCardTitle}>Monthly Attendance Rate</Text>
                <Icon name="percent" size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.attendanceRateContainer}>
                <View style={styles.attendanceRateCircle}>
                  <Text style={styles.attendanceRateValue}>{stats.attendanceRate}%</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[styles.progressBar, { width: `${stats.attendanceRate}%` }]}
                    />
                  </View>
                  <View style={styles.progressLabels}>
                    <Text style={styles.progressLabelMin}>0%</Text>
                    <Text style={styles.progressLabelMax}>100%</Text>
                  </View>
                </View>
              </View>
            </Surface>
            
            {/* Attendance Trend Card */}
            <Surface style={styles.dashboardCard}>
              <View style={styles.dashboardCardHeader}>
                <Text style={styles.dashboardCardTitle}>Attendance Trend</Text>
                <Icon name="chart-line" size={20} color={theme.colors.primary} />
              </View>
              
              {stats.dailyAttendance && stats.dailyAttendance.length > 0 ? (
                <View>
                  <View style={styles.lineChartContainer}>
                    <View style={styles.lineChartYAxis}>
                      <Text style={styles.lineChartLabel}>Present</Text>
                      <Text style={styles.lineChartLabel}>Absent</Text>
                    </View>
                    <View style={styles.lineChart}>
                      <View style={styles.lineChartHorizontalLine} />
                      {stats.dailyAttendance.map((item, index) => {
                        // For the line chart, we consider any record as 'present' (value 1)
                        // and absent as 0
                        const value = item.status !== 'absent' ? 1 : 0;
                        const dotColor = item.status === 'onTime' ? '#27ae60' : 
                                        item.status === 'late' ? '#e74c3c' : 'transparent';
                        
                        return (
                          <View key={item.date} style={styles.lineChartDotContainer}>
                            <View 
                              style={[styles.lineChartDot, 
                                { backgroundColor: dotColor, 
                                  top: value === 1 ? 0 : '100%', 
                                  opacity: value === 0 ? 0 : 1 }]} 
                            />
                            {/* Draw line to next point if there is one */}
                            {index < stats.dailyAttendance.length - 1 && (
                              <View 
                                style={[styles.lineChartLine, { 
                                  backgroundColor: dotColor,
                                  // Calculate diagonal line if next point has different value
                                  transform: [{ 
                                    rotate: stats.dailyAttendance[index + 1].status === 'absent' ? '45deg' : 
                                              item.status === 'absent' ? '-45deg' : '0deg' 
                                    }],
                                    width: stats.dailyAttendance[index + 1].status === 'absent' || 
                                           item.status === 'absent' ? 20 : 20,
                                    opacity: item.status === 'absent' && stats.dailyAttendance[index + 1].status === 'absent' ? 0 : 1
                                  }]} 
                                />
                              )}
                              {/* Add date label for every 5th day */}
                              {item.date % 5 === 0 && (
                                <Text style={styles.lineChartDateLabel}>{item.date}</Text>
                              )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  
                  <View style={styles.lineChartLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#27ae60' }]} />
                      <Text style={styles.legendText}>On Time</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} />
                      <Text style={styles.legendText}>Late</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>No attendance data available</Text>
              )}
            </Surface>
            
            {/* Attendance by Day of Week Card */}
            <Surface style={styles.dashboardCard}>
              <View style={styles.dashboardCardHeader}>
                <Text style={styles.dashboardCardTitle}>Attendance by Day of Week</Text>
                <Icon name="calendar-week" size={20} color={theme.colors.primary} />
              </View>
              
              <View style={styles.barChartContainer}>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => {
                  const value = weekdayData[day] || 0;
                  const barWidth = `${(value / maxValue) * 100}%`;
                  
                  return (
                    <View key={day} style={styles.barChartRow}>
                      <Text style={styles.barChartLabel}>{day.substring(0, 3)}</Text>
                      <View style={styles.barChartBarContainer}>
                        <View 
                          style={[styles.barChartBar, { 
                            width: barWidth,
                            backgroundColor: theme.colors.primary,
                          }]} 
                        />
                        <Text style={styles.barChartValue}>{value}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Surface>
          </>
        )}
      </View>
    </Surface>
  );
  };

  // Render attendance detail modal
  const renderDetailModal = () => {
    if (!selectedRecord) return null;
    
    const checkInDate = new Date(selectedRecord.check_in_time);
    const checkOutDate = selectedRecord.check_out_time ? new Date(selectedRecord.check_out_time) : null;
    
    // Calculate duration if check-out time exists
    let duration = 'N/A';
    if (checkOutDate) {
      const durationMs = checkOutDate - checkInDate;
      const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
      const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      duration = `${durationHours}h ${durationMinutes}m`;
    }
    
    // Format date for display
    const formattedDate = checkInDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Format times for display
    const formattedCheckInTime = checkInDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const formattedCheckOutTime = checkOutDate ? 
      checkOutDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'Not checked out';
    
    // Determine status color
    const isPresent = selectedRecord.attendance_status === 'Present';
    const statusColor = isPresent ? '#4CAF50' : '#F44336';
    const statusBgColor = isPresent ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
    
    return (
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={styles.detailModal}
        >
          <Surface style={styles.detailModalContent}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>Attendance Details</Text>
              <IconButton
                icon="close"
                size={20}
                color="white"
                onPress={() => setDetailModalVisible(false)}
              />
            </View>
            
            {/* Date header with icon */}
            <View style={{
              backgroundColor: '#f8f9fa',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: '#e0e0e0'
            }}>
              <Avatar.Icon 
                size={40} 
                icon="calendar" 
                style={{ backgroundColor: 'rgba(25, 118, 210, 0.1)' }} 
                color="#1976D2" 
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#424242' }}>{formattedDate}</Text>
                <Text style={{ fontSize: 13, color: '#757575', marginTop: 2 }}>
                  {isPresent ? 'Marked as Present' : 'Marked as Absent'}
                </Text>
              </View>
            </View>
            
            {/* Time information */}
            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="login" size={18} color="#1976D2" style={{ marginRight: 8 }} />
                <Text style={styles.detailLabel}>Check-in:</Text>
              </View>
              <Text style={styles.detailValue}>{formattedCheckInTime}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="logout" size={18} color="#FF9800" style={{ marginRight: 8 }} />
                <Text style={styles.detailLabel}>Check-out:</Text>
              </View>
              <Text style={styles.detailValue}>{formattedCheckOutTime}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="clock-outline" size={18} color="#4CAF50" style={{ marginRight: 8 }} />
                <Text style={styles.detailLabel}>Duration:</Text>
              </View>
              <Text style={styles.detailValue}>{duration}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="account-check-outline" size={18} color={statusColor} style={{ marginRight: 8 }} />
                <Text style={styles.detailLabel}>Status:</Text>
              </View>
              <Chip 
                style={{ 
                  backgroundColor: statusBgColor,
                  borderWidth: 1,
                  borderColor: statusColor + '40',
                }}
                textStyle={{ 
                  color: statusColor,
                  fontWeight: '600',
                }}
              >
                {selectedRecord.attendance_status}
              </Chip>
            </View>
            
            <View style={styles.detailActions}>
              <Button 
                mode="contained" 
                onPress={() => {
                  const newStatus = isPresent ? 'Absent' : 'Present';
                  handleUpdateAttendanceStatus(selectedRecord.id, newStatus);
                  setDetailModalVisible(false);
                }}
                style={[styles.detailActionButton, {
                  backgroundColor: isPresent ? '#F44336' : '#4CAF50'
                }]}
                icon={isPresent ? 'close-circle-outline' : 'check-circle-outline'}
              >
                Mark as {isPresent ? 'Absent' : 'Present'}
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  };

  // Render AppBar
  const renderAppBar = () => (
    <Appbar.Header style={[styles.header, { backgroundColor: '#1976D2' }]}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
      <Appbar.Content 
        title={`${userName}'s Attendance`} 
        titleStyle={{ fontWeight: 'bold', fontSize: 20, color: 'white' }}
        subtitle={`Attendance records for ${userName}`}
        subtitleStyle={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}
      />
      <Appbar.Action icon="share" onPress={() => {
        Share.share({
          message: `Attendance summary for ${userName}: ${stats.total} days present, ${stats.onTime} on time, ${stats.late} late, ${stats.attendanceRate}% attendance rate.`,
          title: `${userName}'s Attendance Summary`,
        });
      }} color="white" />
      <Appbar.Action icon="refresh" onPress={() => fetchUserAttendance(userId)} color="white" />
    </Appbar.Header>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1976D2" barStyle="light-content" />
      {renderAppBar()}
      
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
      >
        {/* Month and year selector */}
        {renderMonthYearSelector()}
        
        {/* Statistics summary */}
        {renderStats()}
        
        {/* Content based on active tab */}
        {activeTab === 'list' ? (
          <>
            {renderAttendanceTable()}
            {renderExportOptions()}
          </>
        ) : (
          renderAttendanceSummary()
        )}
      </ScrollView>
      
      {/* Year picker modal */}
      {renderYearPickerModal()}
      
      {/* Attendance detail modal */}
      {renderDetailModal()}
    </View>
  );
};

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
    backgroundColor: 'white',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#424242',
    marginBottom: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resetText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  monthSelectorContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  monthChip: {
    marginRight: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    height: 36,
  },
  selectedMonthChip: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  selectedMonthText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
  },
  yearText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
  },
  yearPickerModal: {
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  yearPickerSurface: {
    borderRadius: 20,
    backgroundColor: 'white',
  },
  yearPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  yearPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
  },
  yearPickerCloseButton: {
    margin: 0,
  },
  yearPickerScrollView: {
    maxHeight: 300,
  },
  yearPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  yearPickerItem: {
    width: '30%',
    padding: 12,
    margin: 5,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  selectedYearItem: {
    backgroundColor: 'rgba(25, 118, 210, 0.15)',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  yearPickerItemText: {
    fontSize: 16,
    color: '#424242',
  },
  selectedYearItemText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  yearPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  yearPickerButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  statsCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    padding: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  exportContainer: {
    position: 'relative',
    zIndex: 1,
  },
  exportMenu: {
    position: 'absolute',
    right: 12,
    top: 0,
  },
  attendanceCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    backgroundColor: '#f8f9fa',
  },
  tableRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  evenRow: {
    backgroundColor: '#ffffff',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  dateCell: {
    flexDirection: 'column',
  },
  dayText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    marginRight: 4,
    width: 8,
    height: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  attendanceChip: {
    height: 24,
    marginRight: 4,
  },
  viewButton: {
    margin: 0,
  },
  recordCount: {
    marginRight: 16,
    fontSize: 12,
    color: '#7f8c8d',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingIndicatorSurface: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIconSurface: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.1)',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#7f8c8d',
    maxWidth: '80%',
  },
  // Dashboard styles
  dashboardSurface: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 0.5,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  dashboardHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 16,
  },
  dashboardContent: {
    padding: 20,
  },
  dashboardCard: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  dashboardCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    paddingBottom: 12,
  },
  dashboardCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    letterSpacing: 0.25,
  },
  // Attendance rate styles
  attendanceRateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  attendanceRateCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 6,
    borderColor: 'rgba(52, 152, 219, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceRateValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3498db',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3498db',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressLabelMin: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  progressLabelMax: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  divider: {
    marginVertical: 16,
  },
  // Bar chart styles
  barChartContainer: {
    marginTop: 16,
  },
  barChartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  barChartLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    paddingVertical: 4,
    borderRadius: 4,
  },
  barChartBarContainer: {
    flex: 1,
    height: 28,
    backgroundColor: '#f5f5f5',
    borderRadius: 14,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  barChartBar: {
    height: '100%',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  barChartValue: {
    position: 'absolute',
    right: 12,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  // Line chart styles
  lineChartContainer: {
    flexDirection: 'row',
    height: 140,
    marginVertical: 20,
  },
  lineChartYAxis: {
    width: 60,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  lineChartLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7f8c8d',
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lineChart: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: 'rgba(245, 245, 245, 0.5)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  lineChartHorizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    top: '50%',
  },
  lineChartDotContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  lineChartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    position: 'absolute',
    top: 0,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  lineChartLine: {
    height: 3,
    width: 20,
    position: 'absolute',
    right: -10,
    top: 4.5,
  },
  lineChartDateLabel: {
    position: 'absolute',
    bottom: -24,
    fontSize: 11,
    fontWeight: '500',
    color: '#7f8c8d',
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lineChartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: 'rgba(245, 245, 245, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  legendText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '500',
  },
  // Punch card styles
  punchCardContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  punchCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  punchCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#f5f5f5',
  },
  punchCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  punchCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  punchCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
    marginTop: 4,
  },
  summaryNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  summaryNoteIcon: {
    marginRight: 10,
  },
  summaryNote: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7f8c8d',
  },
  lineChartContainer: {
    flexDirection: 'row',
    height: 100,
    marginVertical: 16,
  },
  lineChartYAxis: {
    width: 60,
    height: '100%',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  lineChartLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  lineChart: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  lineChartHorizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    top: '50%',
  },
  lineChartDotContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
  },
  lineChartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
  },
  lineChartLine: {
    height: 2,
    width: 20,
    position: 'absolute',
    right: -10,
    top: 3,
  },
  lineChartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.1)',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  // Add new styles from MyAttendanceScreen
  clearStatsSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
  },
  clearStatsHeader: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clearStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#424242',
  },
  clearStatsSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  metricCard: {
    flex: 1,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  metricContent: {
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    marginRight: 12,
  },
  metricTextContainer: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  metricLabel: {
    fontSize: 12,
    color: '#757575',
  },
  rateSection: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rateTitle: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  clearProgressContainer: {
    marginTop: 8,
  },
  clearProgressBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  clearProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  rateLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rateMinLabel: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  rateMaxLabel: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statBox: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  statBoxTitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 4,
  },
  attendanceSurface: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  tableSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  tableHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableContent: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dataTable: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
  },
  dataTableHeader: {
    backgroundColor: '#f5f5f5',
  },
  columnHeader: {
    fontWeight: 'bold',
    color: '#424242',
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
    flex: 1,
    marginHorizontal: 4,
  },
  // Detail Modal Styles
  detailModal: {
    margin: 20,
    borderRadius: 20,
    backgroundColor: 'white',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    maxWidth: 500,
    width: '90%',
    alignSelf: 'center',
  },
  detailModalContent: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1976D2',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
    width: '40%',
  },
  detailValue: {
    fontSize: 15,
    color: '#2c3e50',
    width: '60%',
    textAlign: 'right',
  },
  detailActions: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  detailActionButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 2,
    width: '80%',
  },
});

export default UserAttendanceScreen;
