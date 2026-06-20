import React, { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { CostDashboardTabParamList } from '../../../navigation/CostDashboardTabParamList';
import { useTheme } from '../../../context/ThemeContext';
import CostDashboardTabNavigator from '../../../navigation/CostDashboardTabNavigator';
import CostDashboardTopBar from './components/CostDashboardTopBar';
import { costDashboardStyles as styles } from './shared/costDashboardStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'CostDashboard'>;

const TAB_TITLES: Record<keyof CostDashboardTabParamList, string> = {
  CostDashboardHome: 'Cost Management',
  CostSummary: 'Summary',
  CostHistory: 'History',
};

export default function CostDashboardScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] =
    useState<keyof CostDashboardTabParamList>('CostDashboardHome');

  const handleActiveTabChange = useCallback((tab: keyof CostDashboardTabParamList) => {
    setActiveTab(tab);
  }, []);

  const showBackButton = activeTab === 'CostDashboardHome';

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
            title={TAB_TITLES[activeTab]}
            onPressBack={
              showBackButton
                ? () => navigation.reset({ index: 0, routes: [{ name: 'PosMain' }] })
                : undefined
            }
            onPressSettings={() => navigation.navigate('Settings')}
          />
          <CostDashboardTabNavigator onActiveTabChange={handleActiveTabChange} />
        </View>
      </SafeAreaView>
    </>
  );
}
