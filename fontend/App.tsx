import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/context/ThemeContext';
import { PaperProvider } from 'react-native-paper';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { customFonts } from "./src/constants/fonts";
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigation';
import { navigationRef } from './src/navigation/RootNavigation';
import { DummySessionProvider } from './src/context/DummySessionContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppErrorBoundary from './src/components/AppErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash already hidden (e.g. fast reload) — safe to ignore.
});

function ThemedApp() {
  const { paperTheme } = useTheme();

  const exitToLogin = () => {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: 'OnboardingScreen' }],
      });
    }
  };

  return (
    <PaperProvider theme={paperTheme}>
      <DummySessionProvider onExitToLogin={exitToLogin}>
        <AppNavigator />
      </DummySessionProvider>
    </PaperProvider>
  );
}


export default function App() {
  useFonts(customFonts);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <ThemeProvider>
              <ThemedApp />
            </ThemeProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
  );
}

