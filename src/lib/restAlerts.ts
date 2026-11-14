import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

const CHANNEL_ID = 'rest-timer';

// This handler only runs while the app is in the foreground. The in-app beeps
// already cover that case, so the system notification is silenced to avoid a double alert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let setupDone: Promise<boolean> | null = null;

/**
 * Create the Android channel (it must exist before Android 13 shows the permission
 * prompt), then ask for notification permission once. Resolves to whether it's granted.
 */
export function ensureRestAlerts(): Promise<boolean> {
  if (!setupDone) {
    setupDone = (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            name: 'Rest timer',
            description: 'Alerts you when a rest period between sets ends',
            importance: AndroidImportance.HIGH,
            sound: 'default',
            vibrationPattern: [0, 300, 150, 300],
          });
        }
        const existing = await Notifications.getPermissionsAsync();
        if (existing.granted) return true;
        if (!existing.canAskAgain) return false;
        return (await Notifications.requestPermissionsAsync()).granted;
      } catch (e) {
        console.warn('Rest alerts unavailable', e);
        return false;
      }
    })();
  }
  return setupDone;
}

/** Schedule the "rest over" notification; resolves to its id (null if it couldn't be scheduled). */
export async function scheduleRestEnd(endsAt: number): Promise<string | null> {
  if (!(await ensureRestAlerts())) return null;
  const seconds = Math.max(1, Math.round((endsAt - Date.now()) / 1000));
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Rest over', body: 'Time for your next set 💪', sound: 'default' },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: CHANNEL_ID,
      },
    });
  } catch (e) {
    console.warn('Could not schedule rest alert', e);
    return null;
  }
}

export async function cancelRestEnd(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already delivered or gone; nothing to do.
  }
}
