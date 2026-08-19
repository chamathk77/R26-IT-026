import React from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { SettingsHeroCard } from '../shared/SettingsDetailComponents';
import CustomerBehaviorSection from './novelty02CustomerBehavior/CustomerBehaviorSection';
import { userBehaviorStyles as styles } from './userBehaviorStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'UserBehavior'>;

export default function UserBehaviorScreen({ navigation }: Props) {
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
        <CommonHeader
          title="User behavior"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SettingsHeroCard
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            icon="analytics-outline"
            title="Customer behavior & sales insights"
            subtitle="Peak hours, top products, weekend trends and customer purchasing patterns — learned from your sales history."
          />

          <CustomerBehaviorSection />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
