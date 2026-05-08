// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import SignUpScreen from '../screens/loginScreens/SignUpScreen';
import MainBottomTabNavigator from './MainBottomTabNavigator';
import ModuleHubScreen from '../screens/hub/ModuleHubScreen';
import CostManagementScreen from '../screens/cost/CostManagementScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileDetailsScreen from '../screens/settings/ProfileDetailsScreen';
import ManageAccountScreen from '../screens/settings/ManageAccountScreen';
import EditUserScreen from '../screens/settings/EditUserScreen';
import ThemePreferenceScreen from '../screens/settings/ThemePreferenceScreen';
import { RootStackParamList } from './RootStackParamsList';



const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const initialRoute: keyof RootStackParamList = 'LoginScreen';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="RootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="ModuleHub" component={ModuleHubScreen} />
        <Stack.Screen name="PosMain" component={MainBottomTabNavigator} />
        <Stack.Screen name="CostManagementMain" component={CostManagementScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
        <Stack.Screen name="ManageAccount" component={ManageAccountScreen} />
        <Stack.Screen name="EditUser" component={EditUserScreen} />
        <Stack.Screen name="ThemePreference" component={ThemePreferenceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
