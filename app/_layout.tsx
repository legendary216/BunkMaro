import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';

import { Colors } from '../constants/theme';
import { supabase } from '../utils/supabase';

// Setup Theme
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    onSurface: Colors.light.text,
  },
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // While checking login status, show nothing or a loading spinner
  if (isLoading) return null;

  const isLoggedIn = !!session;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }}>
          
          {/* Public: Login Screen 
              Guard: Only allowed if NOT logged in (!isLoggedIn)
          */}
          <Stack.Protected guard={!isLoggedIn}>
             <Stack.Screen name="auth" />
          </Stack.Protected>

          {/* Private: App Tabs 
              Guard: Only allowed if IS logged in (isLoggedIn)
          */}
          <Stack.Protected guard={isLoggedIn}>
             <Stack.Screen name="(tabs)" />
          </Stack.Protected>

          {/* Fallback for 404s */}
          {/* <Stack.Screen name="+not-found" /> */}
        </Stack>
        <StatusBar style="auto" />
      </PaperProvider>
    </SafeAreaProvider>
  );
}