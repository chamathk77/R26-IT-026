import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HistoryStackParamList } from './HistoryStackParamList';
import HistoryScreen from '../screens/pos/HistoryScreens/HistoryScreen';
import HistoryDetailsScreen from '../screens/pos/HistoryScreens/HistoryDetailsScreen';

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export default function HistoryStackNavigator() {
  return (
    <Stack.Navigator
      id="HistoryStack"
      initialRouteName="HistoryList"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="HistoryList" component={HistoryScreen} />
      <Stack.Screen name="HistoryDetails" component={HistoryDetailsScreen} />
    </Stack.Navigator>
  );
}
