import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme, type Theme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { Tabs } from './src/navigation/Tabs';
import { LocationPermissionSheet } from './src/components/LocationPermissionSheet';
import { colors } from './src/theme/colors';

const navTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.controlBorder,
    primary: colors.turquoise,
  },
};

/** First-run location gate, rendered above the whole app. */
function LocationGate() {
  const { permission, requestAndStart, useManual } = useApp();
  return (
    <LocationPermissionSheet
      visible={permission === 'undetermined'}
      onEnable={requestAndStart}
      onManual={useManual}
    />
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <Tabs />
        </NavigationContainer>
        <LocationGate />
        <StatusBar style="light" />
      </AppProvider>
    </SafeAreaProvider>
  );
}
