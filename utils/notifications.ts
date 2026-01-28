import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';

// 1. Configure how notifications appear when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, // <--- Added
    shouldShowList: true,   // <--- Added
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});
// 2. Main Function: Request Permission & Schedule
export async function scheduleDailyReminder() {
  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  // Cancel any existing notifications so we don't get duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  // Schedule for 9:00 PM every day
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "📝 Attendance Check",
      body: "Did you Bunk or Attend today? Mark it now to keep your stats safe!",
    },
    trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: 21, // 21 = 9 PM
      minute: 0,
      repeats: true,
    },
  });

  Alert.alert("Reminder Set", "I'll remind you every day at 9 PM.");
}

// 3. Helper: Request Permissions
async function requestPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    Alert.alert('Permission Required', 'Please enable notifications in settings to get reminders.');
    return false;
  }
  return true;
}

// 4. Helper: Turn off reminders
export async function cancelReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  Alert.alert("Stopped", "Daily reminders turned off.");
}