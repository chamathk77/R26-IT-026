import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/fonts';
import { useTheme } from '../context/ThemeContext';
import { MainBottomTabParamList } from './MainBottomTabParamList';
import HomeScreen from '../screens/pos/HomeScreen';
import InventoryScreen from '../screens/pos/InventoryScreen';
import CartScreen from '../screens/pos/CartScreen';
import HistoryScreen from '../screens/pos/HistoryScreen';

const Tab = createBottomTabNavigator<MainBottomTabParamList>();

export default function MainBottomTabNavigator() {
  const { paperTheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      id="PosBottomTabs"
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const size = 26;
          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Inventory') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Cart') {
            iconName = focused ? 'cart' : 'cart-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else {
            iconName = 'help-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: paperTheme.colors.primary,
        tabBarInactiveTintColor: paperTheme.colors.outline,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.PoppinsRegular,
        },
        tabBarStyle: {
          backgroundColor: paperTheme.colors.secondary,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 68 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                textAlign: 'center',
                color: paperTheme.colors.primary,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Home
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                textAlign: 'center',
                color: paperTheme.colors.primary,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Inventory
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                textAlign: 'center',
                color: paperTheme.colors.primary,
                fontWeight: focused ? '700' : '400',
              }}
            >
              Cart
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                textAlign: 'center',
                color: paperTheme.colors.primary,
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
