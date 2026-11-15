import * as Haptics from 'expo-haptics';
import { type ReactNode, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/constants/theme';

/** Height of a collapsed row while dragging, and the space between collapsed rows. */
const ROW_H = 52;
const ROW_GAP = 8;
const STEP = ROW_H + ROW_GAP;
const LONG_PRESS_MS = 350;

type Props<T> = {
  items: readonly T[];
  keyOf: (item: T, index: number) => string;
  /** Shown on each collapsed row while dragging. */
  titleOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  onReorder: (from: number, to: number) => void;
  /** How much of the top of each item starts a drag on long press (its header). */
  dragAreaHeight: number;
  /** Space between items when not dragging. */
  gap?: number;
  /** Lets the parent stop its ScrollView from scrolling mid-drag. */
  onDraggingChange?: (dragging: boolean) => void;
};

/**
 * A column of items you reorder by long-pressing an item's header and dragging.
 * While dragging, every item collapses to a one-line row so the whole list fits
 * on screen; the rows gather around your finger so nothing jumps away from it.
 */
export function ReorderableList<T>({
  items,
  keyOf,
  titleOf,
  renderItem,
  onReorder,
  dragAreaHeight,
  gap = 12,
  onDraggingChange,
}: Props<T>) {
  /** The dragged item, plus the container height captured at drag start so the page doesn't shrink under the finger. */
  const [drag, setDrag] = useState<{ index: number; height: number } | null>(null);
  const expandedHeight = useRef(0);
  const dragging = drag !== null;

  const tops = useSharedValue<number[]>([]);
  const slots = useSharedValue<number[]>([]);
  const dragIndex = useSharedValue(-1);
  const dragTop = useSharedValue(0);
  const startTop = useSharedValue(0);
  const pad = useSharedValue(0);
  const containerH = useSharedValue(0);

  const begin = (index: number) => {
    setDrag({ index, height: expandedHeight.current });
    onDraggingChange?.(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  const tick = () => Haptics.selectionAsync();
  const finish = (from: number, to: number) => {
    // Clear the drag on the UI thread first so the expanded layout never renders with a leftover offset.
    dragIndex.set(-1);
    if (from !== to) onReorder(from, to);
    setDrag(null);
    onDraggingChange?.(false);
  };

  return (
    <View
      style={drag ? { height: drag.height } : { gap }}
      onLayout={(e: LayoutChangeEvent) => {
        if (dragging) return;
        expandedHeight.current = e.nativeEvent.layout.height;
        containerH.set(e.nativeEvent.layout.height);
      }}>
      {items.map((item, i) => (
        <Row
          key={keyOf(item, i)}
          index={i}
          count={items.length}
          collapsed={dragging}
          lifted={drag?.index === i}
          title={titleOf(item)}
          dragAreaHeight={dragAreaHeight}
          shared={{ tops, slots, dragIndex, dragTop, startTop, pad, containerH }}
          onBegin={begin}
          onTick={tick}
          onFinish={finish}>
          {renderItem(item, i)}
        </Row>
      ))}
    </View>
  );
}

type Shared = {
  tops: SharedValue<number[]>;
  slots: SharedValue<number[]>;
  dragIndex: SharedValue<number>;
  dragTop: SharedValue<number>;
  startTop: SharedValue<number>;
  pad: SharedValue<number>;
  containerH: SharedValue<number>;
};

function Row({
  index,
  count,
  collapsed,
  lifted,
  title,
  dragAreaHeight,
  shared,
  onBegin,
  onTick,
  onFinish,
  children,
}: {
  index: number;
  count: number;
  collapsed: boolean;
  /** This row is the one being dragged. */
  lifted: boolean;
  title: string;
  dragAreaHeight: number;
  shared: Shared;
  onBegin: (index: number) => void;
  onTick: () => void;
  onFinish: (from: number, to: number) => void;
  children: ReactNode;
}) {
  const { tops, slots, dragIndex, dragTop, startTop, pad, containerH } = shared;

  const pan = usePanGesture({
    activateAfterLongPress: LONG_PRESS_MS,
    // Only the header starts a drag, so inputs further down the card keep working.
    hitSlop: { top: 0, height: dragAreaHeight },
    onActivate: (e) => {
      'worklet';
      if (dragIndex.get() !== -1) return;
      const fingerY = (tops.get()[index] ?? 0) + e.y;
      // Gather the collapsed rows so this one lands under the finger, kept inside the held space.
      const maxPad = Math.max(0, containerH.get() - (count * STEP - ROW_GAP));
      pad.set(Math.min(maxPad, Math.max(0, fingerY - ROW_H / 2 - index * STEP)));
      slots.set(Array.from({ length: count }, (_, k) => k));
      startTop.set(fingerY - ROW_H / 2);
      dragTop.set(startTop.get());
      dragIndex.set(index);
      scheduleOnRN(onBegin, index);
    },
    onUpdate: (e) => {
      'worklet';
      if (dragIndex.get() !== index) return;
      dragTop.set(startTop.get() + e.translationY);
      const target = Math.min(count - 1, Math.max(0, Math.round((dragTop.get() - pad.get()) / STEP)));
      const cur = slots.get()[index];
      if (target === cur) return;
      slots.set(
        slots.get().map((s, k) => {
          if (k === index) return target;
          if (cur < target && s > cur && s <= target) return s - 1;
          if (cur > target && s < cur && s >= target) return s + 1;
          return s;
        })
      );
      scheduleOnRN(onTick);
    },
    onDeactivate: () => {
      'worklet';
      if (dragIndex.get() !== index) return;
      const to = slots.get()[index];
      dragTop.set(
        withTiming(pad.get() + to * STEP, { duration: 140 }, () => {
          scheduleOnRN(onFinish, index, to);
        })
      );
    },
  });

  const animated = useAnimatedStyle(() => {
    const isDragged = dragIndex.get() === index;
    if (!collapsed) {
      // The frame or two before the list collapses: just follow the finger.
      return { top: 0, zIndex: isDragged ? 10 : 0, transform: [{ translateY: isDragged ? dragTop.get() - startTop.get() : 0 }] };
    }
    return {
      top: isDragged ? dragTop.get() : withTiming(pad.get() + (slots.get()[index] ?? index) * STEP, { duration: 160 }),
      zIndex: isDragged ? 10 : 0,
      transform: [{ translateY: 0 }, { scale: withTiming(isDragged ? 1.03 : 1, { duration: 120 }) }],
    };
  }, [collapsed, index]);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[collapsed && styles.floating, animated]}
        onLayout={(e) => {
          if (collapsed) return;
          const next = tops.get().slice();
          next[index] = e.nativeEvent.layout.y;
          tops.set(next);
        }}>
        {collapsed ? (
          <View style={[styles.compact, lifted && styles.compactDragged]}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.grip}>≡</Text>
          </View>
        ) : (
          children
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', left: 0, right: 0, height: ROW_H },
  compact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  compactDragged: { borderColor: colors.primary, backgroundColor: colors.cardAlt },
  compactTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  grip: { fontSize: 20, color: colors.muted },
});
