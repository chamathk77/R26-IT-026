import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/fonts';
import { MainBottomTabParamList } from './MainBottomTabParamList';
import HomeScreen from '../screens/pos/HomeScreen';
import InventoryScreen from '../screens/pos/InventoryScreen';
import CartScreen from '../screens/pos/CartScreen';
import HistoryScreen from '../screens/pos/HistoryScreen';

const Tab = createBottomTabNavigator<MainBottomTabParamList>();

const TAB_BAR_BG = '#1c1917';
const TAB_ICON_ACTIVE = '#ffffff';
const TAB_ICON_INACTIVE = 'rgba(255, 255, 255, 0.52)';
const TAB_LABEL_ACTIVE = '#ffffff';
const TAB_LABEL_INACTIVE = 'rgba(255, 255, 255, 0.55)';

export default function MainBottomTabNavigator() {
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
        tabBarActiveTintColor: TAB_ICON_ACTIVE,
        tabBarInactiveTintColor: TAB_ICON_INACTIVE,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fonts.PoppinsRegular,
        },
        tabBarStyle: {
          backgroundColor: TAB_BAR_BG,
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
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: ({ focused }) => (
            <Text
              style={{
                fontSize: 11,
                fontFamily: fonts.PoppinsRegular,
                textAlign: 'center',
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
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
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
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
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
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
                color: focused ? TAB_LABEL_ACTIVE : TAB_LABEL_INACTIVE,
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
