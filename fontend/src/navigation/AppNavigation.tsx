// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/loginScreens/LoginScreen';
import { RootStackParamList } from './RootStackParamsList';
import AuthenticationScrees from '../screens/loginScreens/AuthenticationScrees';
import EnterEmailScreen from '../screens/forgot password/EnterEmailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const initialRoute: keyof RootStackParamList = 'LoginScreen';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator id="RootStack" initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="AuthenticationScreen" component={AuthenticationScrees} />
        <Stack.Screen name="EnterEmailScreen" component={EnterEmailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
