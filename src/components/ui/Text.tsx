import type { ComponentProps } from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** Drop-in for RN `Text` that sets the body family; caller styles still win. */
export function Text({ style, ...rest }: ComponentProps<typeof RNText>) {
  return <RNText style={[base.text, style]} {...rest} />;
}

/** Drop-in for RN `TextInput` with the body family and an accent-coloured caret. */
export function TextInput({
  style,
  selectionColor = colors.primary,
  cursorColor = colors.primary,
  ...rest
}: ComponentProps<typeof RNTextInput>) {
  return (
    <RNTextInput
      style={[base.text, style]}
      selectionColor={selectionColor}
      cursorColor={cursorColor}
      {...rest}
    />
  );
}

const base = StyleSheet.create({ text: { fontFamily: fonts.body } });
