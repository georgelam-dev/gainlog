import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';

import { colors, radius, spacing, fonts } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { fromDateKey, shiftDateKey, todayKey } from '@/lib/date';
import { fmt, sumEntries } from '@/lib/nutrition';
import { storage } from '@/lib/storage';
import { Text } from '@/components/ui/Text';

const CHART_H = 150;
const TOP_PAD = 18; // room for the value labels above bars
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type Day = { date: string; kcal: number };

/** Monday-to-Sunday dates of the week containing `today`. */
function weekOf(today: string): string[] {
  const dow = (fromDateKey(today).getDay() + 6) % 7; // Monday = 0
  const monday = shiftDateKey(today, -dow);
  return Array.from({ length: 7 }, (_, i) => shiftDateKey(monday, i));
}

const loadWeek = (dates: string[]): Promise<Day[]> =>
  Promise.all(
    dates.map(async (date) => ({ date, kcal: sumEntries(await storage.loadLog(date)).kcal }))
  );

/** Bar chart of calories eaten each day this week against the daily goal. */
export function WeekCalories() {
  const { settings, entries, selectedDate, setSelectedDate } = useAppData();
  const today = todayKey();
  const [days, setDays] = useState<Day[]>([]);
  const [width, setWidth] = useState(0);

  // Re-read when the tab is shown and whenever the selected day's log changes.
  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadWeek(weekOf(today)).then((d) => {
        // The selected day's log is already in memory and may be newer than storage.
        const liveKcal = sumEntries(entries).kcal;
        if (live) setDays(d.map((x) => (x.date === selectedDate ? { ...x, kcal: liveKcal } : x)));
      });
      return () => {
        live = false;
      };
    }, [today, entries, selectedDate])
  );

  const goal = settings.calories;
  const logged = days.filter((d) => d.date <= today && d.kcal > 0);
  const avg = logged.length ? logged.reduce((a, d) => a + d.kcal, 0) / logged.length : 0;
  const maxVal = Math.max(goal * 1.15, ...days.map((d) => d.kcal), 1);

  const innerH = CHART_H - TOP_PAD;
  const slot = width / 7;
  const barW = Math.min(28, slot * 0.55);
  const y = (v: number) => TOP_PAD + innerH * (1 - v / maxVal);

  const openDay = (date: string) => {
    if (date > today) return;
    setSelectedDate(date);
    router.navigate('/');
  };

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.title}>Calories this week</Text>
        <Text style={styles.muted}>Goal {fmt(goal)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View>
          <Text style={styles.statValue}>{logged.length ? fmt(avg) : '—'}</Text>
          <Text style={styles.muted}>Daily average</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={[
              styles.statValue,
              logged.length > 0 && { color: avg > goal ? colors.caution : colors.good },
            ]}>
            {logged.length ? `${avg > goal ? '+' : '−'}${fmt(Math.abs(avg - goal))}` : '—'}
          </Text>
          <Text style={styles.muted}>vs goal</Text>
        </View>
      </View>

      <View style={{ height: CHART_H }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={CHART_H}>
            {days.map((d, i) => {
              const h = d.kcal > 0 ? Math.max(3, CHART_H - y(d.kcal)) : 0;
              const over = d.kcal > goal * 1.05;
              return (
                <Rect
                  key={d.date}
                  x={slot * i + (slot - barW) / 2}
                  y={CHART_H - h}
                  width={barW}
                  height={h}
                  rx={6}
                  fill={over ? colors.caution : colors.primary}
                  opacity={d.date === today ? 1 : 0.7}
                />
              );
            })}
            <Line
              x1={0}
              x2={width}
              y1={y(goal)}
              y2={y(goal)}
              stroke={colors.muted}
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          </Svg>
        )}
        {/* Value labels (Text renders crisper than SVG text). */}
        {width > 0 &&
          days.map((d, i) =>
            d.kcal > 0 ? (
              <Text
                key={d.date}
                style={[styles.barLabel, { left: slot * i, width: slot, top: Math.max(0, y(d.kcal) - 16) }]}>
                {fmt(d.kcal)}
              </Text>
            ) : null
          )}
      </View>

      <View style={styles.dayRow}>
        {weekOf(today).map((date, i) => (
          <Pressable
            key={date}
            style={styles.dayCell}
            disabled={date > today}
            onPress={() => openDay(date)}
            accessibilityLabel={`Open ${date}`}>
            <Text
              style={[
                styles.dayText,
                date === today && styles.dayToday,
                date > today && { opacity: 0.35 },
              ]}>
              {DAY_LETTERS[i]}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statValue: { fontFamily: fonts.display, fontSize: 28, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  barLabel: {
    position: 'absolute',
    textAlign: 'center',
    fontSize: 10,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  dayRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  dayToday: { color: colors.primary, fontWeight: '800' },
});
