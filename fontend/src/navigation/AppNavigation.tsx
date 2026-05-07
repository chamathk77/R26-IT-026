// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import SignUpScreen from '../screens/loginScreens/SignUpScreen';
import MainBottomTabNavigator from './MainBottomTabNavigator';
import { RootStackParamList } from './RootStackParamsList';



const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const initialRoute: keyof RootStackParamList = 'LoginScreen';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="RootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="PosMain" component={MainBottomTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
