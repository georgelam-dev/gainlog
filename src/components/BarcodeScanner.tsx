import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

type Props = {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
};

/** Product barcodes only (EAN/UPC) — what Open Food Facts indexes. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export function BarcodeScanner({ visible, onScanned, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open: only one camera preview may be active at a time. */}
      {visible && <ScannerBody onScanned={onScanned} onClose={onClose} />}
    </Modal>
  );
}

function ScannerBody({ onScanned, onClose }: Omit<Props, 'visible'>) {
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
  // onBarcodeScanned fires repeatedly while a code is in view; report only the first.
  const done = useRef(false);

  const handleScan = ({ data }: BarcodeScanningResult) => {
    if (done.current || !data) return;
    done.current = true;
    onScanned(data);
  };

  const closeBtn = (
    <Pressable
      style={[styles.closeBtn, { top: insets.top + 8 }]}
      onPress={onClose}
      hitSlop={10}
      accessibilityLabel="Close scanner">
      <Text style={styles.closeText}>✕</Text>
    </Pressable>
  );

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        {closeBtn}
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.body}>Gainlog uses the camera to scan food barcodes.</Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryText}>Allow camera</Text>
          </Pressable>
        ) : (
          <Text style={styles.body}>Enable camera access for Gainlog in your phone&apos;s settings.</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={handleScan}
      />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Point the camera at a barcode</Text>
      </View>
      {closeBtn}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing * 2, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  primaryText: { color: colors.primaryText, fontWeight: '700', fontSize: 16 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  frame: {
    width: '75%',
    aspectRatio: 1.6,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
  },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600' },
  closeBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
