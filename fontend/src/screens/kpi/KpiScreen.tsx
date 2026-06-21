import React, { useCallback, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootStackParamsList';
import { KpiTabParamList } from '../../navigation/KpiTabParamList';
import { useTheme } from '../../context/ThemeContext';
import KpiTabNavigator from '../../navigation/KpiTabNavigator';
import KpiTopBar from './components/KpiTopBar';
import { kpiStyles } from './shared/kpiStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'KpiDashboard'>;

const TAB_TITLES: Record<keyof KpiTabParamList, string> = {
  KpiSummary: 'KPI Summary',
  KpiHistorySummary: 'History Summary',
};

export default function KpiScreen({ navigation }: Props) {
  const { paperTheme, resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<keyof KpiTabParamList>('KpiSummary');

  const handleActiveTabChange = useCallback((tab: keyof KpiTabParamList) => {
    setActiveTab(tab);
  }, []);

  return (
    <>
      <StatusBar
        barStyle={resolvedTheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={paperTheme.colors.background}
      />
      <SafeAreaView
        style={[kpiStyles.safe, { backgroundColor: paperTheme.colors.background }]}
        edges={['top']}
      >
        <View style={kpiStyles.shell}>
          <KpiTopBar
            title={TAB_TITLES[activeTab]}
            onPressBack={() => navigation.goBack()}
            onPressSettings={() => navigation.navigate('Settings')}
          />
          <KpiTabNavigator onActiveTabChange={handleActiveTabChange} />
        </View>
      </SafeAreaView>
    </>
  );
}
