import React from 'react';
import { ScrollView, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/RootStackParamsList';
import { useTheme } from '../../../context/ThemeContext';
import CommonHeader from '../../../components/CommonHeader/CommonHeader';
import { SettingsHeroCard } from '../shared/SettingsDetailComponents';
import RecommendationsSection from './novelty04RecommendationSystem/RecommendationsSection';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 4,
  },
});

type Props = NativeStackScreenProps<RootStackParamList, 'Recommendations'>;

export default function RecommendationsScreen({ navigation }: Props) {
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
          title="Recommendations"
          titleColor={paperTheme.colors.onBackground}
          iconColor={paperTheme.colors.onBackground}
          onPressLeftBtn={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <SettingsHeroCard
            paperTheme={paperTheme}
            resolvedTheme={resolvedTheme}
            icon="sparkles-outline"
            title="Smart product recommendations"
            subtitle="The buy-together patterns mined from your completed orders — what customers get suggested at checkout, and the evidence behind each suggestion."
          />

          <RecommendationsSection />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
