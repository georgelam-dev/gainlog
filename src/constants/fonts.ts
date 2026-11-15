import { useFonts } from 'expo-font';

import { fonts } from '@/constants/theme';

/** Loads every face used in the app. Returns true once ready (or if loading failed). */
export function useAppFonts() {
  const [loaded, error] = useFonts([
    {
      // Body and display share one family; display just runs at heavier weights.
      fontFamily: fonts.body,
      fontDefinitions: [
        { path: require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'), weight: 400 },
        { path: require('@expo-google-fonts/nunito/500Medium/Nunito_500Medium.ttf'), weight: 500 },
        { path: require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'), weight: 600 },
        { path: require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'), weight: 700 },
        { path: require('@expo-google-fonts/nunito/800ExtraBold/Nunito_800ExtraBold.ttf'), weight: 800 },
        { path: require('@expo-google-fonts/nunito/900Black/Nunito_900Black.ttf'), weight: 900 },
      ],
    },
  ]);
  return loaded || error !== null;
}
