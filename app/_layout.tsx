import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Import database singleton to trigger initialisation on app start
import '@/src/db/database';
import { syncOrchestrator } from '@/src/sync/SyncOrchestrator';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    // Start listening for network reconnection → auto sync
    syncOrchestrator.startNetworkListener();
    // Trigger initial sync on app startup
    syncOrchestrator.triggerSync();

    return () => {
      syncOrchestrator.stopNetworkListener();
    };
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="todo/[id]"
          options={{ presentation: 'card', title: 'Todo Detail' }}
        />
        <Stack.Screen
          name="create"
          options={{ presentation: 'modal', title: 'New Todo' }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
