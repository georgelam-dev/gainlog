import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';
import { useAppData } from '@/context/AppDataProvider';
import { useWorkout } from '@/context/WorkoutProvider';
import { todayKey } from '@/lib/date';
import { exportAll, importAll, parseBackup, type Backup } from '@/lib/storage';

/** Export everything to a JSON file via the share sheet, or restore from one. */
export function BackupCard() {
  const { reloadAll } = useAppData();
  const { reload: reloadWorkouts } = useWorkout();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const onExport = async () => {
    setBusy('export');
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Sharing unavailable', 'This device cannot share files.');
        return;
      }
      const backup = await exportAll();
      const file = new File(Paths.cache, `gainlog-backup-${todayKey()}.json`);
      file.create({ overwrite: true });
      await file.write(JSON.stringify(backup));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Save Gainlog backup',
        UTI: 'public.json',
      });
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const restore = async (backup: Backup) => {
    setBusy('import');
    try {
      await importAll(backup);
      await Promise.all([reloadAll(), reloadWorkouts()]);
      Alert.alert('Backup restored', 'Your data has been replaced with the backup.');
    } catch (e) {
      Alert.alert('Import failed', `Your existing data was kept.\n\n${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(null);
    }
  };

  const onImport = async () => {
    let backup: Backup;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        // Some Android file managers don't tag .json files, so accept anything and validate.
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const text = await new File(result.assets[0].uri).text();
      backup = parseBackup(JSON.parse(text));
    } catch (e) {
      const msg = e instanceof SyntaxError ? 'That file is not valid JSON.' : e instanceof Error ? e.message : String(e);
      Alert.alert('Can’t import this file', msg);
      return;
    }

    const days = Object.keys(backup.data).filter((k) => k.startsWith('log:')).length;
    const when = new Date(backup.exportedAt).toLocaleString();
    Alert.alert(
      'Replace all data?',
      `This backup from ${when} has ${days} logged day${days === 1 ? '' : 's'}. Everything currently on this phone will be replaced. This can’t be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => restore(backup) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Backup</Text>
      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.primary]} disabled={!!busy} onPress={onExport}>
          {busy === 'export' ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryText}>Export</Text>
          )}
        </Pressable>
        <Pressable style={[styles.btn, styles.secondary]} disabled={!!busy} onPress={onImport}>
          {busy === 'import' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryText}>Import</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  primary: { backgroundColor: colors.primary },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: colors.primary },
  secondaryText: { color: colors.primary, fontWeight: '700', fontSize: 15 },
});
