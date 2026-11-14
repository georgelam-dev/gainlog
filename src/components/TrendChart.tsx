import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { formatDateLabel, fromDateKey } from '@/lib/date';

export type TrendPoint = {
  /** YYYY-MM-DD */
  date: string;
  value: number;
};

const CHART_H = 160;
const PAD = { top: 12, bottom: 12, left: 8, right: 8 };
const DAY_MS = 86_400_000;

type Props = {
  points: TrendPoint[];
  format: (v: number) => string;
  emptyText: string;
  /** Smallest value range drawn, so tiny changes don't look dramatic. */
  minSpan?: number;
};

/** Line chart of values over time (bodyweight, exercise strength). Points must be sorted by date. */
export function TrendChart({ points, format, emptyText, minSpan = 1 }: Props) {
  const [width, setWidth] = useState(0);

  if (points.length < 2) {
    return (
      <View style={[styles.empty, { height: CHART_H }]}>
        <Text style={styles.muted}>{emptyText}</Text>
      </View>
    );
  }

  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < minSpan) {
    const mid = (max + min) / 2;
    min = mid - minSpan / 2;
    max = mid + minSpan / 2;
  }
  const t0 = fromDateKey(points[0].date).getTime();
  const t1 = fromDateKey(points[points.length - 1].date).getTime();
  const span = Math.max(t1 - t0, DAY_MS);
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = CHART_H - PAD.top - PAD.bottom;

  // Same-day points (e.g. two sessions in a day) are spread out evenly instead of stacking.
  const sameSpan = t1 === t0;
  const pts = points.map((p, i) => ({
    x:
      PAD.left +
      (sameSpan ? i / (points.length - 1) : (fromDateKey(p.date).getTime() - t0) / span) * innerW,
    y: PAD.top + (1 - (p.value - min) / (max - min)) * innerH,
  }));
  const last = pts[pts.length - 1];

  return (
    <View>
      <Text style={styles.axis}>{format(max)}</Text>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: CHART_H }}>
        {width > 0 && (
          <Svg width={width} height={CHART_H}>
            <Line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={PAD.top}
              y2={PAD.top}
              stroke={colors.border}
              strokeDasharray="4 4"
            />
            <Line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={CHART_H - PAD.bottom}
              y2={CHART_H - PAD.bottom}
              stroke={colors.border}
              strokeDasharray="4 4"
            />
            <Polyline
              points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.length <= 40 &&
              pts.map((p, i) => <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={colors.primary} />)}
            <Circle cx={last.x} cy={last.y} r={5} fill={colors.primary} stroke={colors.card} strokeWidth={2} />
          </Svg>
        )}
      </View>
      <Text style={styles.axis}>{format(min)}</Text>
      <View style={styles.dates}>
        <Text style={styles.axis}>{formatDateLabel(points[0].date)}</Text>
        <Text style={styles.axis}>{formatDateLabel(points[points.length - 1].date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 13, color: colors.muted },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axis: { fontSize: 11, color: colors.muted },
});
