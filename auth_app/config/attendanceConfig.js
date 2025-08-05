// Attendance time configuration
export const ATTENDANCE_CONFIG = {
  // Check-in time configuration
  checkInTime: {
    hour: 9,      // 9 AM
    minute: 0,
    gracePeriodMinutes: 10  // 10 minute grace period
  },
  
  // Check-out time configuration
  checkOutTime: {
    hour: 17,     // 5 PM
    minute: 0
  }
};

// Helper function to determine if a check-in is late
export const isCheckInLate = (checkInDate) => {
  const date = new Date(checkInDate);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Convert to total minutes for easier comparison
  const checkInTimeInMinutes = hours * 60 + minutes;
  const expectedTimeInMinutes = ATTENDANCE_CONFIG.checkInTime.hour * 60 + ATTENDANCE_CONFIG.checkInTime.minute;
  const graceTimeInMinutes = expectedTimeInMinutes + ATTENDANCE_CONFIG.checkInTime.gracePeriodMinutes;
  
  // Check if the check-in time is after the grace period
  return checkInTimeInMinutes > graceTimeInMinutes;
};

// Helper function to determine if a check-out is early
export const isCheckOutEarly = (checkOutDate) => {
  const date = new Date(checkOutDate);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // Convert to total minutes for easier comparison
  const checkOutTimeInMinutes = hours * 60 + minutes;
  const expectedTimeInMinutes = ATTENDANCE_CONFIG.checkOutTime.hour * 60 + ATTENDANCE_CONFIG.checkOutTime.minute;
  
  // Check if the check-out time is before the expected time
  return checkOutTimeInMinutes < expectedTimeInMinutes;
};

// Format the attendance time requirements as a string for display
export const getAttendanceTimeRequirements = () => {
  const checkInHour = ATTENDANCE_CONFIG.checkInTime.hour;
  const checkInMinute = ATTENDANCE_CONFIG.checkInTime.minute;
  const gracePeriod = ATTENDANCE_CONFIG.checkInTime.gracePeriodMinutes;
  const checkOutHour = ATTENDANCE_CONFIG.checkOutTime.hour;
  const checkOutMinute = ATTENDANCE_CONFIG.checkOutTime.minute;
  
  // Format times to AM/PM format
  const checkInTime = `${checkInHour % 12 || 12}:${checkInMinute.toString().padStart(2, '0')} ${checkInHour >= 12 ? 'PM' : 'AM'}`;
  const graceTime = `${checkInHour % 12 || 12}:${(checkInMinute + gracePeriod).toString().padStart(2, '0')} ${checkInHour >= 12 ? 'PM' : 'AM'}`;
  const checkOutTime = `${checkOutHour % 12 || 12}:${checkOutMinute.toString().padStart(2, '0')} ${checkOutHour >= 12 ? 'PM' : 'AM'}`;
  
  return `Check-in by ${checkInTime} (grace period until ${graceTime})\nCheck-out after ${checkOutTime}`;
};
