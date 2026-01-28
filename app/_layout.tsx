import { Stack, useRouter, useSegments } from "expo-router";
import { PaperProvider, MD3DarkTheme } from "react-native-paper";
import {
  ThemeProvider,
  DarkTheme as NavDarkTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import * as SystemUI from "expo-system-ui"; // <--- 1. IMPORT THIS
import { Session } from "@supabase/supabase-js";

import { supabase } from "../utils/supabase";

// --- THEME SETUP ---
const paperTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#BB86FC",
    background: "#121212",
    card: "#1E1E1E",
    surface: "#1E1E1E",
    onSurface: "#E0E0E0",
  },
};

const navTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: "#BB86FC",
    background: "#121212",
    card: "#1E1E1E",
    text: "#E0E0E0",
    border: "#333333",
  },
};

// --- 2. PAINT THE NATIVE ROOT BLACK ---
// This runs before the component even mounts
SystemUI.setBackgroundColorAsync("#121212");

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === "auth";
    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    } else if (!session && !inAuthGroup) {
      router.replace("/auth");
    }
  }, [session, initialized, segments]);

  if (!initialized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#121212",
        }}
      >
        <ActivityIndicator size="large" color="#BB86FC" />
      </View>
    );
  }

  return (
    // 3. Ensure SafeAreaProvider also has the dark background
    <SafeAreaProvider style={{ backgroundColor: "#121212" }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
          <StatusBar style="light" backgroundColor="#121212" />
        </ThemeProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
