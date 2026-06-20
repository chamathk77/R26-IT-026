import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';
import { CostDashboardTabParamList } from './CostDashboardTabParamList';
import DashboardTabScreen from '../screens/cost/dashboard/tabs/dashboard/DashboardTabScreen';
import SummaryTabScreen from '../screens/cost/dashboard/tabs/summary/SummaryTabScreen';
import HistoryTabScreen from '../screens/cost/dashboard/tabs/history/HistoryTabScreen';

const Tab = createBottomTabNavigator<CostDashboardTabParamList>();

type Props = {
  onActiveTabChange?: (tab: keyof CostDashboardTabParamList) => void;
};

export default function CostDashboardTabNavigator({ onActiveTabChange }: Props) {
  const insets = useSafeAreaInsets();
  const { paperTheme, resolvedTheme } = useTheme();

  const tabBarBg =
    resolvedTheme === 'dark' ? paperTheme.colors.surface : '#1e1b4b';
  const activeColor = '#ffffff';
  const inactiveColor = 'rgba(255, 255, 255, 0.55)';

  return (
    <Tab.Navigator
      id="CostDashboardTabs"
      initialRouteName="CostDashboardHome"
      screenListeners={{
        state: (event) => {
          const route = event.data.state.routes[event.data.state.index];
          onActiveTabChange?.(route.name as keyof CostDashboardTabParamList);
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'grid-outline';
          if (route.name === 'CostDashboardHome') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'CostSummary') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'CostHistory') {
            iconName = focused ? 'time' : 'time-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.PoppinsRegular,
        },
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 68 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.22,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen
        name="CostDashboardHome"
        component={DashboardTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? activeColor : inactiveColor,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Dashboard
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="CostSummary"
        component={SummaryTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? activeColor : inactiveColor,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Summary
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="CostHistory"
        component={HistoryTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? activeColor : inactiveColor,
                fontWeight: focused ? '700' : '400',
              }}
            >
              History
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
