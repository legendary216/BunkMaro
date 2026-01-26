import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// Import your central theme file
import { Colors } from '../constants/theme';

// Create the Paper theme using your constants
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // Map your "tint" color to Paper's "primary"
    primary: Colors.light.tint,
    // Map your background
    background: Colors.light.background,
    // Map your text color to "onSurface" (standard for text on background)
    onSurface: Colors.light.text,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}