import {
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import "../global.css";
import { Platform } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const defaultMedications = [
  { id: "1", name: "Testosterone Enanthate 300", halfLifeDescription: "4 days", halfLifeMinutes: 5760, concentration: 300 },
  { id: "2", name: "Testosterone Cypionate 200", halfLifeDescription: "8 days", halfLifeMinutes: 11520, concentration: 200 },
  { id: "3", name: "Testosterone Cypionate 250", halfLifeDescription: "8 days", halfLifeMinutes: 11520, concentration: 250 },
  { id: "4", name: "Testosterone Propionate", halfLifeDescription: "2 days", halfLifeMinutes: 2880, concentration: 100 }
];

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Initialize default medications if none exist
  useEffect(() => {
    const initializeMedications = async () => {
      try {
        const stored = await AsyncStorage.getItem('medications');
        if (!stored) {
          await AsyncStorage.setItem('medications', JSON.stringify(defaultMedications));
        }
      } catch (error) {
      }
    };
    initializeMedications();
  }, []);

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_TEMPO && Platform.OS === "web") {
      const { TempoDevtools } = require("tempo-devtools");
      TempoDevtools.init();
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="light" backgroundColor="#111827" />
      <Stack
        screenOptions={({ route }) => ({
          headerShown: !route.name.startsWith("tempobook"),
        })}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
