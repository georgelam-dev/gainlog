import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors } from '@/constants/theme';

function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

/** Monochrome dumbbell (emoji ignore the tab tint, and there's no plain-text dumbbell glyph). */
function DumbbellIcon({ color }: { color: ColorValue }) {
  const c = String(color);
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect x={1} y={9} width={2.5} height={6} rx={1} fill={c} />
      <Rect x={4.5} y={6} width={3.5} height={12} rx={1.2} fill={c} />
      <Rect x={8} y={10.75} width={8} height={2.5} rx={0.8} fill={c} />
      <Rect x={16} y={6} width={3.5} height={12} rx={1.2} fill={c} />
      <Rect x={20.5} y={9} width={2.5} height={6} rx={1} fill={c} />
    </Svg>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: 22 },
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarIcon: ({ color }) => <TabIcon glyph="▤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <DumbbellIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <TabIcon glyph="↗" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon glyph="⚙" color={color} />,
        }}
      />
    </Tabs>
  );
}
