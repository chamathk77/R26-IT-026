// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/loginScreens/OnboardingScreen';
import OnboardOwnerScreen from '../screens/loginScreens/OnboardOwnerScreen';
import SelectFeaturesScreen from '../screens/loginScreens/SelectFeaturesScreen';
import CreatePasswordScreen from '../screens/loginScreens/CreatePasswordScreen';
import OtpValidationScreen from '../screens/loginScreens/OtpValidationScreen';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import SignUpScreen from '../screens/loginScreens/SignUpScreen';
import MainBottomTabNavigator from './MainBottomTabNavigator';

import CostDashboardScreen from '../screens/cost/dashboard/CostDashboardScreen';
import ManageCostCategoriesScreen from '../screens/cost/categories/ManageCostCategoriesScreen';
import CostCategoryFormScreen from '../screens/cost/categories/CostCategoryFormScreen';
import AddCostExpenseScreen from '../screens/cost/dashboard/addExpenses/AddCostExpenseScreen';

import SettingsScreen from '../screens/settings/hub/SettingsScreen';
import ProfileDetailsScreen from '../screens/settings/account/ProfileDetailsScreen';
import ShopDetailsScreen from '../screens/settings/account/ShopDetailsScreen';
import ManageAccountScreen from '../screens/settings/account/ManageAccountScreen';
import ManageUserFormScreen from '../screens/settings/account/ManageUserFormScreen';
import ThemePreferenceScreen from '../screens/settings/preferences/ThemePreferenceScreen';
import SubscriptionPaymentsScreen from '../screens/settings/payments/SubscriptionPaymentsScreen';
import PayNowScreen from '../screens/settings/payments/PayNowScreen';
import ManageCatogoryScreen from '../screens/pos/ManageCatogory/ManageCatogoryScreen';
import CreateCatogoryScreen from '../screens/pos/ManageCatogory/CreateCatogoryScreen';
import ManageInventoryScreen from '../screens/pos/ManageInventory/ManageInventoryScreen';
import { AddProductScreen, EditProductScreen } from '../screens/pos/ManageInventory/ProductFormScreen';
import ManageEmployeesScreen from '../screens/pos/ManageEmployes/ManageEmployeesScreen';
import AddEmployeeScreen from '../screens/pos/ManageEmployes/AddEmployeeScreen';
import { RootStackParamList } from './RootStackParamsList';



const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const initialRoute: keyof RootStackParamList = 'OnboardingScreen';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="RootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="OnboardOwnerScreen" component={OnboardOwnerScreen} />
        <Stack.Screen name="SelectFeaturesScreen" component={SelectFeaturesScreen} />
        <Stack.Screen name="CreatePasswordScreen" component={CreatePasswordScreen} />
        <Stack.Screen name="OtpValidationScreen" component={OtpValidationScreen} />
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="PosMain" component={MainBottomTabNavigator} />
        <Stack.Screen name="ManageCatogory" component={ManageCatogoryScreen} />
        <Stack.Screen name="ManageInventory" component={ManageInventoryScreen} />
        <Stack.Screen name="ManageEmployees" component={ManageEmployeesScreen} />
        <Stack.Screen name="AddEmployee" component={AddEmployeeScreen} />
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} />
        <Stack.Screen name="CreateCatogory" component={CreateCatogoryScreen} />
        <Stack.Screen name="CostDashboard" component={CostDashboardScreen} />
        <Stack.Screen name="ManageCostCategories" component={ManageCostCategoriesScreen} />
        <Stack.Screen name="CostCategoryForm" component={CostCategoryFormScreen} />
        <Stack.Screen name="AddCostExpense" component={AddCostExpenseScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ProfileDetails" component={ProfileDetailsScreen} />
        <Stack.Screen name="ShopDetails" component={ShopDetailsScreen} />
        <Stack.Screen name="ManageAccount" component={ManageAccountScreen} />
        <Stack.Screen name="ManageUserForm" component={ManageUserFormScreen} />
        <Stack.Screen name="ThemePreference" component={ThemePreferenceScreen} />
        <Stack.Screen name="SubscriptionPayments" component={SubscriptionPaymentsScreen} />
        <Stack.Screen name="PayNow" component={PayNowScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
