import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CostAnalysisTabParamList } from './CostAnalysisTabParamList';
import { fonts } from '../constants/fonts';
import {
  BehaviorTabScreen,
  DemandTabScreen,
  PerformanceTabScreen,
} from '../screens/cost/CostAnalysisTabScreens';

const Tab = createBottomTabNavigator<CostAnalysisTabParamList>();

const TAB_BAR_BG = '#1c1917';
const TAB_ICON_ACTIVE = '#ffffff';
const TAB_ICON_INACTIVE = 'rgba(255, 255, 255, 0.52)';
const TAB_LABEL_ACTIVE = '#ffffff';
const TAB_LABEL_INACTIVE = 'rgba(255, 255, 255, 0.55)';

export default function CostAnalysisTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="CostAnalysisBottomTabs"
      initialRouteName="Performance"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const size = 24;
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Performance') {
            iconName = focused ? 'speedometer' : 'speedometer-outline';
          } else if (route.name === 'Demand') {
            iconName = focused ? 'pie-chart' : 'pie-chart-outline';
          } else {
            iconName = focused ? 'people' : 'people-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: TAB_ICON_ACTIVE,
        tabBarInactiveTintColor: TAB_ICON_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.PoppinsRegular,
        },
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
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
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen
        name="Performance"
        component={PerformanceTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Performance
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Demand"
        component={DemandTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Demand
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Behavior"
        component={BehaviorTabScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Behavior
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
