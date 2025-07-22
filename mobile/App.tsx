import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';

// Custom theme to match web Material UI colors
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976d2',
    primaryContainer: '#e3f2fd',
    secondary: '#dc004e',
    secondaryContainer: '#fce4ec',
    surface: '#ffffff',
    surfaceVariant: '#f8f9fa',
    background: '#f8f9fa',
    error: '#d32f2f',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onSurface: '#333333',
    onSurfaceVariant: '#666666',
    outline: '#e0e0e0',
    outlineVariant: '#f0f0f0',
  },
  roundness: 8,
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}
