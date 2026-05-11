// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import SignUpScreen from '../screens/loginScreens/SignUpScreen';
import MainBottomTabNavigator from './MainBottomTabNavigator';
import ModuleHubScreen from '../screens/hub/ModuleHubScreen';
import CostModuleHubScreen from '../screens/cost/CostModuleHubScreen';
import CostAnalysisScreen from '../screens/cost/CostAnalysisScreen';
import CostManagementScreen from '../screens/cost/CostManagementScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileDetailsScreen from '../screens/settings/ProfileDetailsScreen';
import ManageAccountScreen from '../screens/settings/ManageAccountScreen';
import EditUserScreen from '../screens/settings/EditUserScreen';
import ThemePreferenceScreen from '../screens/settings/ThemePreferenceScreen';
import ManageCatogoryScreen from '../screens/pos/ManageCatogory/ManageCatogoryScreen';
import CreateCatogoryScreen from '../screens/pos/ManageCatogory/CreateCatogoryScreen';
import ManageInventoryScreen from '../screens/pos/ManageInventory/ManageInventoryScreen';
import { AddProductScreen, EditProductScreen } from '../screens/pos/ManageInventory/ProductFormScreen';
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
        <Stack.Screen name="ManageCatogory" component={ManageCatogoryScreen} />
        <Stack.Screen name="ManageInventory" component={ManageInventoryScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} />
        <Stack.Screen name="CreateCatogory" component={CreateCatogoryScreen} />
        <Stack.Screen name="CostModuleHub" component={CostModuleHubScreen} />
        <Stack.Screen name="CostAnalysis" component={CostAnalysisScreen} />
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
