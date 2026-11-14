import { useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';

import { formatDuration } from '@/lib/workout';

/** Live "12:34" since `since` (epoch ms). */
export function Elapsed({ since, style }: { since: number; style?: TextStyle }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{formatDuration(now - since)}</Text>;
}
