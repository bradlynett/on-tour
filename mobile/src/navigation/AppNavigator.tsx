import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import OnboardingFlow from '../screens/OnboardingFlow';
import DashboardScreen from '../screens/DashboardScreen';

export type RootStackParamList = {
  Landing: undefined;
  Login: undefined;
  Onboarding: undefined;
  Dashboard: undefined;
  // Add more screens here as needed
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => (
  <Stack.Navigator initialRouteName="Landing">
    <Stack.Screen 
      name="Landing" 
      component={LandingScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="Login" 
      component={LoginScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="Onboarding" 
      component={OnboardingFlow} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ headerShown: false }} 
    />
    {/* Add more screens here */}
  </Stack.Navigator>
);

export default AppNavigator; 