import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { AppDataProvider } from '@/context/AppDataProvider';
import { WorkoutProvider } from '@/context/WorkoutProvider';

export default function RootLayout() {
  return (
    <AppDataProvider>
      <WorkoutProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.bg },
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="add-food" options={{ presentation: 'modal', title: 'Add food' }} />
          <Stack.Screen name="meal-editor" options={{ title: 'Meal' }} />
          <Stack.Screen name="nutrition" options={{ title: 'Nutrition' }} />
          <Stack.Screen name="food/[code]" options={{ title: 'Food details' }} />
          <Stack.Screen name="workout/active" options={{ title: 'Workout' }} />
          <Stack.Screen
            name="workout/exercise-picker"
            options={{ presentation: 'modal', title: 'Add exercises' }}
          />
          <Stack.Screen name="workout/routine-editor" options={{ title: 'Routine' }} />
          <Stack.Screen name="workout/history" options={{ title: 'History' }} />
          <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
          <Stack.Screen name="workout/exercise/[id]" options={{ title: 'Exercise' }} />
        </Stack>
      </WorkoutProvider>
    </AppDataProvider>
  );
}
