import React from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CostDashboardTabNavigator from '../../../navigation/CostDashboardTabNavigator';
import CostDashboardTopBar, {
  CostDashboardWelcomeBanner,
} from './components/CostDashboardTopBar';
import CostDashboardQuickActions from './components/CostDashboardQuickActions';
import { costDashboardStyles as styles } from './shared/costDashboardStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CostDashboard'>;

export default function CostDashboardScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[styles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <View style={styles.shell}>
          <CostDashboardTopBar
            onPressBack={() =>
              navigation.reset({ index: 0, routes: [{ name: 'PosMain' }] })
            }
            onPressSettings={() => navigation.navigate('Settings')}
          />
          <CostDashboardWelcomeBanner />
          <CostDashboardQuickActions />
          <CostDashboardTabNavigator />
        </View>
      </SafeAreaView>
    </>
  );
}
