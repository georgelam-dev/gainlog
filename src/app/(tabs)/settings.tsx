import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import {
  fmt,
  gramsToPercent,
  kcalFromGrams,
  macroTargets,
  percentToGrams,
} from '@/lib/nutrition';
import type { MacroMode, Settings } from '@/lib/types';

type Draft = { calories: string; carbs: string; protein: string; fat: string };

const toDraft = (s: Settings): Draft => ({
  calories: String(s.calories),
  carbs: String(s.carbs),
  protein: String(s.protein),
  fat: String(s.fat),
});

const parse = (v: string) => {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const MACROS = [
  { key: 'carbs', label: 'Carbs', color: colors.carbs },
  { key: 'protein', label: 'Protein', color: colors.protein },
  { key: 'fat', label: 'Fat', color: colors.fat },
] as const;

export default function SettingsScreen() {
  const { settings, ready } = useAppData();
  if (!ready) return null;
  // Remount the form whenever stored settings change (initial load, after save).
  return <SettingsForm key={JSON.stringify(settings)} settings={settings} />;
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { saveSettings } = useAppData();
  const [mode, setMode] = useState<MacroMode>(settings.macroMode);
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));

  const calories = parse(draft.calories);
  const carbs = parse(draft.carbs);
  const protein = parse(draft.protein);
  const fat = parse(draft.fat);
  const allNumbers = [calories, carbs, protein, fat].every((n) => Number.isFinite(n) && n >= 0);

  const percentSum = carbs + protein + fat;
  const impliedKcal = kcalFromGrams(carbs || 0, protein || 0, fat || 0);
  const kcalMismatch = mode === 'grams' && Math.abs(impliedKcal - calories) > Math.max(25, calories * 0.03);

  let error: string | null = null;
  if (!allNumbers) error = 'Enter a valid number in every field.';
  else if (calories <= 0) error = 'Daily calories must be greater than 0.';
  else if (mode === 'percent' && Math.round(percentSum) !== 100)
    error = `Percentages must add up to 100% (currently ${fmt(percentSum)}%).`;

  const switchMode = (next: MacroMode) => {
    if (next === mode) return;
    if (allNumbers) {
      const converted =
        next === 'grams'
          ? percentToGrams(calories, carbs, protein, fat)
          : gramsToPercent(carbs, protein, fat);
      setDraft((d) => ({
        ...d,
        carbs: String(converted.carbs),
        protein: String(converted.protein),
        fat: String(converted.fat),
      }));
    }
    setMode(next);
  };

  const pending: Settings = { calories, macroMode: mode, carbs, protein, fat };
  const preview = !error ? macroTargets(pending) : null;
  const dirty =
    mode !== settings.macroMode ||
    calories !== settings.calories ||
    carbs !== settings.carbs ||
    protein !== settings.protein ||
    fat !== settings.fat;

  const onSave = async () => {
    if (error) return;
    await saveSettings(pending);
    Alert.alert('Saved', 'Your daily targets have been updated.');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily calories</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={draft.calories}
              onChangeText={(v) => setDraft((d) => ({ ...d, calories: v }))}
              keyboardType="number-pad"
              style={styles.input}
              accessibilityLabel="Daily calories"
            />
            <Text style={styles.unit}>kcal</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Macro distribution</Text>
          <View style={styles.segment}>
            {(['percent', 'grams'] as const).map((m) => (
              <Pressable
                key={m}
                style={[styles.segBtn, mode === m && styles.segBtnActive]}
                onPress={() => switchMode(m)}>
                <Text style={[styles.segText, mode === m && styles.segTextActive]}>
                  {m === 'percent' ? 'Percentage' : 'Grams'}
                </Text>
              </Pressable>
            ))}
          </View>

          {MACROS.map(({ key, label, color }) => (
            <View key={key} style={styles.macroRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.macroLabel}>{label}</Text>
              <TextInput
                value={draft[key]}
                onChangeText={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                keyboardType="decimal-pad"
                style={[styles.input, styles.macroInput]}
                accessibilityLabel={`${label} ${mode === 'percent' ? 'percent' : 'grams'}`}
              />
              <Text style={styles.unitSmall}>{mode === 'percent' ? '%' : 'g'}</Text>
              <Text style={styles.derived}>
                {preview
                  ? mode === 'percent'
                    ? `≈ ${fmt(preview[key])} g`
                    : `${fmt((parse(draft[key]) || 0) * (key === 'fat' ? 9 : 4))} kcal`
                  : ''}
              </Text>
            </View>
          ))}

          {mode === 'percent' ? (
            <Text style={[styles.note, Math.round(percentSum) !== 100 && { color: colors.danger }]}>
              Total: {Number.isFinite(percentSum) ? fmt(percentSum) : '–'}%
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              <Text style={[styles.note, kcalMismatch && { color: colors.danger }]}>
                These macros add up to {fmt(impliedKcal)} kcal
                {kcalMismatch ? `, which differs from your ${fmt(calories)} kcal goal.` : '.'}
              </Text>
              {kcalMismatch && (
                <Pressable
                  style={styles.linkBtn}
                  onPress={() => setDraft((d) => ({ ...d, calories: String(Math.round(impliedKcal)) }))}>
                  <Text style={styles.linkText}>Set calorie goal to {fmt(impliedKcal)} kcal</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.saveBtn, (!!error || !dirty) && { opacity: 0.4 }]}
          disabled={!!error || !dirty}
          onPress={onSave}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 12, paddingBottom: spacing * 3 },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: spacing, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
    color: colors.text,
  },
  unit: { fontSize: 16, color: colors.muted },
  segment: { flexDirection: 'row', backgroundColor: colors.track, borderRadius: radius, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius - 3 },
  segBtnActive: { backgroundColor: colors.primary },
  segText: { color: colors.muted, fontWeight: '600' },
  segTextActive: { color: colors.primaryText },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  macroLabel: { width: 64, fontSize: 15, color: colors.text, fontWeight: '600' },
  macroInput: { flex: 0, width: 80, fontSize: 16, textAlign: 'right' },
  unitSmall: { width: 16, color: colors.muted },
  derived: { flex: 1, textAlign: 'right', color: colors.muted, fontSize: 13 },
  note: { fontSize: 13, color: colors.muted },
  linkBtn: { alignSelf: 'flex-start' },
  linkText: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
});
